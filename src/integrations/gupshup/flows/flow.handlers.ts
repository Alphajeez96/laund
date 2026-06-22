import logger from "@/utils/logger";
import {prisma} from "@/lib/prisma";
import {toE164} from "@/utils/phone";
import {type Laundry} from "generated/prisma/client";
import {LaundryStatus} from "generated/prisma/enums";
import {OrderService} from "@/modules/order/order.service";
import {FLOW_CONFIG, INTERACTIVE_BUTTON} from "./flow-config";
import {OrderRepository} from "@/modules/order/order.repository";
import {MessagingService} from "@/modules/messaging/messaging.service";
import {LaundryRepository} from "@/modules/laundry/laundry.repository";
import {CustomerRepository} from "@/modules/customer/customer.repository";
// import {uploadMedia} from "@/integrations/gupshup/media-ops";

export type FlowHandler = (args: {
  from: string;
  screen: string;
  laundry: Laundry;
  response: Record<string, unknown>;
}) => Promise<void>;

const handleSignupFlow: FlowHandler = async (args) => {
  const data = args.response as {
    laundry_name: string;
    contact_email?: string;
    contact_number: string;
  };

  const whatsappNumber = toE164(data.contact_number);
  const existing = await LaundryRepository.findByContact(whatsappNumber);

  if (existing) {
    logger("[flow-signup] laundry already exists", {
      whatsappNumber,
      laundryId: existing.id,
    });
    // TODO: send Text message notifying them to carry out an action instead
    return;
  }

  const laundry = await LaundryRepository.createLaundry({
    whatsappNumber,
    name: data.laundry_name,
    status: LaundryStatus.live,
    email: data?.contact_email ?? "",
  });

  logger("[flow-signup] laundry created from flow", {
    whatsappNumber,
    laundryId: laundry.id,
    submittedBy: args.from,
    name: data.laundry_name,
  });

  // add send option to suggest them seting up their inventory stock together with this,
  MessagingService.sendText({
    to: args.from,
    message:
      "🎉 You're all set Champ! Welcome to Ezar.\n\n" +
      "To get started, simply send your first order message. Example:\n" +
      "Record 3 shirts and 2 trousers for John, totalling 10000 naira. Pickup Saturday.\n" +
      "or simply send a voice note detailing what you'd want",
  });

  // const gifId = await uploadMedia({
  //   appId: config.residentAppId,
  //   filePath: "assets/welcome.gif",
  //   mediaType: "image",
  // });

  // await MessagingService.sendMedia({
  //   to: args.from,
  //   appId: config.residentAppId,
  //   mediaType: "image",
  //   id: gifId,
  //   caption: "Welcome to LaundryOps!",
  // });

  // TODO: create Gupshup app + generate embed link for WABA onboarding
};

const handleRecordOrderFlow: FlowHandler = async (args) => {
  const data = args.response as {
    items_json: string;
    pickup_date: string;
    total_amount: string;
    customer_name: string;
    customer_phone: string;
    time_slot: string | null;
  };

  const customerDigits = toE164(data.customer_phone);
  const totalAmount = Number.parseFloat(data.total_amount);

  if (!customerDigits) {
    logger("[flow-record-order] invalid customer phone", {
      customer_phone: data.customer_phone,
    });
    return;
  }

  const items =
    (JSON.parse(data.items_json) as {
      itemName: string;
      quantity: number;
    }[]) || [];

  if (items.length === 0) {
    logger("[flow-record-order] no items in submission", {data});
    return;
  }

  const laundryId = args.laundry.id;
  const fromDigits = toE164(args.from);

  let customer = await CustomerRepository.findByLaundryAndPhoneNumber(
    laundryId,
    customerDigits,
  );

  if (!customer) {
    customer = await CustomerRepository.createCustomer({
      laundryId: laundryId,
      phoneNumber: customerDigits,
      name: data.customer_name || undefined,
    });
  }

  const {invoiceRef} = await prisma.laundry.update({
    where: {id: laundryId},
    data: {invoiceRef: {increment: 1}},
  });

  // generate / send invoice
  const invoicePayload = {
    customer,
    totalAmount,
    orderItems: items,
    reference: invoiceRef,
    createdAt: new Date(),
    pickupDate: data.pickup_date,
  };

  const orderPayload = {
    laundryId,
    customerId: customer.id,
    pickupDate: data.pickup_date || undefined,
    totalAmount: Number.isFinite(totalAmount) ? totalAmount : undefined,
    orderItems: items.map(({itemName, quantity}) => ({
      itemName,
      quantity,
    })),
  };

  const [invoiceResult, orderResult] = await Promise.allSettled([
    OrderService.generateInvoice(invoicePayload, args.laundry),
    OrderService.createOrder(orderPayload),
  ]);

  if (orderResult.status === "rejected") throw orderResult.reason;

  const order = orderResult.value;
  const invoiceId =
    invoiceResult.status === "fulfilled" ? invoiceResult.value : "";

  // generate receipt,
  // send tips to user?

  const itemSummary = order.orderItems
    .map(({quantity, itemName}) => `${quantity} ${itemName}`)
    .join(", ");

  const timeInfo = data.pickup_date
    ? `Pickup: ${data.pickup_date}${data.time_slot ? ` @ ${data.time_slot}` : ""}`
    : "";

  const message =
    `New entry added for ${(data.customer_name || customer?.name) ?? data.customer_phone}. ` +
    `Items: ${itemSummary}\n` +
    `${timeInfo}`;

  await MessagingService.sendInteractiveMessage({
    to: fromDigits,
    body: message,
    footer:
      "Click to have the invoice sent to the user or simply forward the attached document yourself",
    header: {
      type: "document",
      document: {id: invoiceId},
    },
    buttons: [
      {
        title: "Send Invoice",
        id: `${INTERACTIVE_BUTTON.SEND_INVOICE}:${JSON.stringify({phoneNumber: customer.phoneNumber, invoiceMediaId: invoiceId})}`,
      },
    ],
  });

  OrderRepository.updateOrder(order.id, {invoiceMediaId: invoiceId});
};

export const flowHandlers: Record<string, FlowHandler> = {
  [FLOW_CONFIG.SIGN_UP.id]: handleSignupFlow,
  [FLOW_CONFIG.RECORD_ORDER.id]: handleRecordOrderFlow,
};
