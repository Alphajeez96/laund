import {LaundryRepository} from "@/modules/laundry/laundry.repository";
import {CustomerRepository} from "@/modules/customer/customer.repository";
import {OrderRepository} from "@/modules/order/order.repository";
import {MessagingService} from "@/modules/messaging/messaging.service";
import {
  // isGupshupSystemEventBody,
  // isGupshupV3WebhookBody,
  type GupshupSystemEventBody,
  type GupshupV3WebhookBody,
} from "./gupshup.types";

type IngestInput = {
  receivedAtMs: number;
  body: GupshupV3WebhookBody;
  headers: Record<string, unknown>;
};

// type IngestInput = GupshupV3WebhookBody | GupshupSystemEventBody;

// const normalizePhone = (raw?: string): string | null => {
//   if (!raw) return null;
//   const v = String(raw).trim();
//   if (!v) return null;
//   if (v.startsWith("+")) return v;
//   // Gupshup samples show numbers without '+', e.g. "9199..." ([partner-docs.gupshup.io](https://partner-docs.gupshup.io/docs/set-callback-url-1))
//   if (/^\d+$/.test(v)) return `+${v}`;
//   return v;
// };

// const parseOrderItems = (
//   text: string,
// ): Array<{itemName: string; quantity: number}> => {
//   // Minimal MVP parser:
//   // - extract patterns like "3 shirts", "2 trousers"
//   // - ignore if nothing matches -> fallback handled by caller
//   const items: Array<{itemName: string; quantity: number}> = [];
//   const re = /(?:^|,|\s)(\d{1,3})\s+([a-zA-Z][a-zA-Z ]{1,40})/g;
//   for (const m of text.matchAll(re)) {
//     const qty = Number(m[1]);
//     const name = m[2].trim().replace(/\s+/g, " ");
//     if (Number.isFinite(qty) && qty > 0 && name.length > 0) {
//       items.push({itemName: name.slice(0, 500), quantity: qty});
//     }
//   }
//   return items;
// };

// const handleIncomingTextMessage = async (args: {
//   laundryId: string;
//   from: string;
//   contactName?: string;
//   text: string;
// }) => {
//   const fromE164 = normalizePhone(args.from);
//   if (!fromE164) return;

//   // Find-or-create customer (unique is (laundryId, phoneNumber) in schema).
//   let customer = await CustomerRepository.findByLaundryAndPhoneNumber(
//     args.laundryId,
//     fromE164,
//   );

//   if (!customer) {
//     customer = await CustomerRepository.createCustomer({
//       laundryId: args.laundryId,
//       phoneNumber: fromE164,
//       name: args.contactName,
//     });
//   }

//   // Create an order (must have >= 1 item in current validation).
//   const parsedItems = parseOrderItems(args.text);
//   const orderItems =
//     parsedItems.length > 0
//       ? parsedItems
//       : [{itemName: args.text.slice(0, 500), quantity: 1}];

//   const order = await OrderRepository.createOrder({
//     laundryId: args.laundryId,
//     customerId: customer.id,
//     orderItems,
//   });

//   // Optional: confirmation message (your MessagingService is currently a stub).
//   await MessagingService.sendText(fromE164, `Order received: ${order.id}`);

//   return order;
// };

// const handleSystemEvent = async (body: GupshupSystemEventBody) => {
//   // System events may come in as V2-style payloads, and include appId. ([partner-docs.gupshup.io](https://partner-docs.gupshup.io/docs/system-events))
//   const appId = body.appId;
//   if (!appId) {
//     console.warn("[gupshup-webhook] system-event missing appId", body.type);
//     return;
//   }

//   const laundry = await LaundryRepository.findByAppId(appId);
//   if (!laundry) {
//     console.warn("[gupshup-webhook] no laundry for system event appId", appId);
//     return;
//   }

//   if (body.type === "onboarding-event") {
//     // Go-Live comes as onboarding-event with waId + namespace. ([partner-docs.gupshup.io](https://partner-docs.gupshup.io/docs/system-events))
//     console.info("[gupshup-webhook] onboarding-event", {laundryId: laundry.id, body});
//     // TODO: persist (wabaId/namespace/phone/live status) once those columns exist.
//     return;
//   }

//   if (body.type === "template-event") {
//     // Template approval/rejection events. ([partner-docs.gupshup.io](https://partner-docs.gupshup.io/docs/system-events))
//     console.info("[gupshup-webhook] template-event", {laundryId: laundry.id, body});
//     // TODO: persist template statuses once you add a Template table.
//     return;
//   }

//   if (body.type === "account-event") {
//     console.info("[gupshup-webhook] account-event", {laundryId: laundry.id, body});
//     return;
//   }

//   console.info("[gupshup-webhook] unknown system event", {
//     laundryId: laundry.id,
//     type: body.type,
//   });
// };

const handleV3 = async (body: GupshupV3WebhookBody) => {
  const appId = body.gs_app_id;

  console.log("handleV3:::", body);
  const laundry = await LaundryRepository.findByAppId(appId);
  if (!laundry) {
    console.warn("[gupshup-webhook] no laundry for gs_app_id", appId);
    return;
  }

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages") continue;

      const value = change.value;

      // Inbound messages (V3). ([partner-docs.gupshup.io](https://partner-docs.gupshup.io/docs/set-callback-url-1))
      const contactName = value?.contacts?.[0]?.profile?.name;
      // for (const msg of value?.messages ?? []) {
      //   if (msg.type === "text" && msg.text?.body && msg.from) {
      //     await handleIncomingTextMessage({
      //       laundryId: laundry.id,
      //       from: msg.from,
      //       contactName,
      //       text: msg.text.body,
      //     });
      //   }
      // }

      // Status updates (V3). ([partner-docs.gupshup.io](https://partner-docs.gupshup.io/docs/set-callback-url-1))
      // for (const st of value?.statuses ?? []) {
      //   // For MVP, log only; later: persist against an OutboundMessage table.
      //   console.info("[gupshup-webhook] status", {
      //     laundryId: laundry.id,
      //     status: st.status,
      //     recipient: st.recipient_id
      //       ? normalizePhone(st.recipient_id)
      //       : undefined,
      //     waMessageId: st.id,
      //     gsId: st.gs_id,
      //     ts: st.timestamp,
      //   });
      // }
    }
  }
};

const ingest = async ({body}: IngestInput) => {
  if (body?.gs_app_id) {
    console.log("ENTRY V3:::", body);
    await handleV3(body); // handle whatsapp events - V3
    // return;
  } else {
    console.log("ENTRY V2:::", body);
    // await handleSystemEvent(body); // handle system events - v2
  }

  return;
};

export const GupshupWebhookService = {ingest};
