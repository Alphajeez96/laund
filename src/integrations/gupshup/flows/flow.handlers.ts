import logger from "@/utils/logger";
import {toE164} from "@/utils/phone";
import FLOW_CONFIG from "./flow-config";
import {type Laundry} from "generated/prisma/client";
import {LaundryStatus} from "generated/prisma/enums";
import {OrderService} from "@/modules/order/order.service";
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

  const totalAmount = Number.parseFloat(data.total_amount);

  const order = await OrderService.createOrder({
    laundryId,
    customerId: customer.id,
    pickupDate: data.pickup_date || undefined,
    totalAmount: Number.isFinite(totalAmount) ? totalAmount : undefined,
    orderItems: items.map(({itemName, quantity}) => ({
      itemName,
      quantity,
    })),
  });

  // generate receipt,
  // send tips to user?

  const shortId = order.id.slice(0, 8);
  const itemSummary = order.orderItems
    .map((it) => `${it.quantity} ${it.itemName}`)
    .join(", ");

  const timeInfo = data.pickup_date
    ? `Pickup: ${data.pickup_date}${data.time_slot ? ` @ ${data.time_slot}` : ""}`
    : "";

  //condense into one with the interactive message
  await MessagingService.sendText({
    to: fromDigits,
    message:
      `Recorded order ${shortId} for ${(data.customer_name || customer?.name) ?? data.customer_phone}. ` +
      `Items: ${itemSummary}\n` +
      `${timeInfo}`,
  });

  const message =
    `Recorded order ${shortId} for ${(data.customer_name || customer?.name) ?? data.customer_phone}. ` +
    `Items: ${itemSummary}\n` +
    `${timeInfo}`;

  await MessagingService.sendInteractiveMessage({
    to: fromDigits,
    body: message,
    footer:
      "Click to have us send the invoice to the user or simply forward the attached document yourself",
    header: {
      type: "document",
      document: {id: "media-id-here"},
    },
    buttons: [{id: "send-invoice", title: "Send Invoice"}],
  });
};

export const flowHandlers: Record<string, FlowHandler> = {
  [FLOW_CONFIG.SIGN_UP.id]: handleSignupFlow,
  [FLOW_CONFIG.RECORD_ORDER.id]: handleRecordOrderFlow,
};
