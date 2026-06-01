import config from "@/config/config";
import logger from "@/utils/logger";
import {isValidPhoneNumber} from "libphonenumber-js";
import FLOW_CONFIG from "./flow-config";
import {inboundWaFromToE164, toE164, toLocalE164} from "@/utils/phone";
import {LaundryStatus} from "generated/prisma/enums";
import {LaundryRepository} from "@/modules/laundry/laundry.repository";
import {CustomerRepository} from "@/modules/customer/customer.repository";
import {OrderService} from "@/modules/order/order.service";
import {MessagingService} from "@/modules/messaging/messaging.service";
import {uploadMedia} from "@/integrations/gupshup/media-ops";

export type FlowHandler = (args: {
  from: string;
  screen: string;
  response: Record<string, unknown>;
}) => Promise<void>;

const handleSignupFlow: FlowHandler = async (args) => {
  const data = args.response as {
    laundry_name: string;
    contact_email?: string;
    contact_number: string;
  };

  const whatsappNumber = toLocalE164(data.contact_number);
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

  MessagingService.sendText({
    to: inboundWaFromToE164(args.from),
    message:
      "🎉 You're all set Champ! Welcome to Ezar.\n\n" +
      "To get started, simply send your first order message. Example:\n" +
      "Record 3 shirts and 2 trousers for John, totalling 5000. Pickup Saturday.\n" +
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

type OrderFlowItem = {itemName: string; quantity: number};

const handleRecordOrderFlow: FlowHandler = async (args) => {
  const data = args.response as {
    customer_name: string;
    customer_phone: string;
    pickup_date: string;
    total_amount: string;
    items_json: string;
  };

  const customerE164 = toE164(data.customer_phone);
  if (!isValidPhoneNumber(customerE164)) {
    logger("[flow-record-order] invalid customer phone", {
      customer_phone: data.customer_phone,
    });
    return;
  }

  const items: OrderFlowItem[] = (() => {
    try {
      return JSON.parse(data.items_json) as OrderFlowItem[];
    } catch {
      return [];
    }
  })();

  if (items.length === 0) {
    logger("[flow-record-order] no items in submission", {data});
    return;
  }

  const fromE164 = inboundWaFromToE164(args.from);
  const laundry = await LaundryRepository.findByContact(fromE164);
  if (!laundry) {
    logger("[flow-record-order] no laundry found for", {from: args.from});
    return;
  }

  let customer = await CustomerRepository.findByLaundryAndPhoneNumber(
    laundry.id,
    customerE164,
  );
  if (!customer) {
    customer = await CustomerRepository.createCustomer({
      laundryId: laundry.id,
      phoneNumber: customerE164,
      name: data.customer_name || undefined,
    });
  }

  const totalAmount = data.total_amount
    ? Number.parseFloat(data.total_amount)
    : undefined;

  const order = await OrderService.createOrder({
    laundryId: laundry.id,
    customerId: customer.id,
    pickupDate: data.pickup_date || undefined,
    totalAmount: Number.isFinite(totalAmount) ? totalAmount : undefined,
    orderItems: items.map((it) => ({
      itemName: it.itemName,
      quantity: it.quantity,
    })),
  });

  const shortId = order.id.slice(0, 8);
  const itemSummary = order.orderItems
    .map((it) => `${it.quantity} ${it.itemName}`)
    .join(", ");

  await MessagingService.sendText({
    to: fromE164,
    message:
      `Recorded order ${shortId} for ${customer.phoneNumber}. ` +
      `Items: ${itemSummary}` +
      (data.pickup_date ? `. Pickup: ${data.pickup_date}` : ""),
  });
};

export const flowHandlers: Record<string, FlowHandler> = {
  [FLOW_CONFIG.SIGN_UP.id]: handleSignupFlow,
  [FLOW_CONFIG.RECORD_ORDER.id]: handleRecordOrderFlow,
};
