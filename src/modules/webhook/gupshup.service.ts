import config from "@/config/config";
import logger from "@/utils/logger";
import {LaundryRepository} from "@/modules/laundry/laundry.repository";
import {
  // isGupshupSystemEventBody,
  // isGupshupV3WebhookBody,
  type GupshupSystemEventBody,
  type GupshupV3WebhookBody,
} from "./gupshup.types";
import {LaundryService} from "../laundry/laundry.service";
import {LaundryStatus} from "generated/prisma/enums";
import {MessagingService} from "../messaging/messaging.service";
import FLOW_CONFIG from "@/integrations/gupshup/flows/flow-config";
import {flowHandlers} from "@/integrations/gupshup/flows/flow.handlers";
import {inboundWaFromToE164, toNationalDigits} from "@/utils/phone";
import {interpretMessage} from "@/modules/assistant/assistant.service";
import {executeAssistantIntent} from "@/modules/assistant/assistant.router";

type IngestInput = {
  receivedAtMs: number;
  body: GupshupV3WebhookBody;
  headers: Record<string, unknown>;
};

// type IngestInput = GupshupV3WebhookBody | GupshupSystemEventBody;

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

const handleFlowResponse = async (args: {
  from: string;
  flowId: string;
  screen: string;
  response: Record<string, unknown>;
}) => {
  const handler = flowHandlers[args.flowId];

  if (!handler) {
    logger("[webhook] no handler for flow", {flowId: args.flowId});
    return;
  }

  await handler({
    from: args.from,
    screen: args.screen,
    response: args.response,
  });
};

const handleTextMessage = async (args: {
  from: string;
  text: string;
  contactName?: string;
}) => {
  // check if laundry exists, else send a help form to register.
  // parse message

  const fromE164 = inboundWaFromToE164(args.from);
  const laundry = await LaundryRepository.findByWhatsappNumber(fromE164);

  if (!laundry) {
    const payload = {
      to: fromE164,
      cta: "Get started",
      flowId: FLOW_CONFIG.SIGN_UP.id,
      screen: FLOW_CONFIG.SIGN_UP.screen,
      header: `Hi ${args?.contactName ?? "Champ"}!`,
      body:
        "🧺 Meet Ezar — your laundry's new right hand.\n\n" +
        "• Track orders\n" +
        "• Remember pickup dates\n" +
        "• Send customer reminders\n" +
        "• and Keep an eye on revenue without jugglig notebooks and spreadsheets\n\n" +
        "You handle the cleaning. We'll help handle the operations.\n" +
        "Let's get you set up. ✨",
      screenData: {
        laundry_name: args?.contactName ?? "",
        contact_number: toNationalDigits(fromE164),
      },
    };

    return await MessagingService.sendFlow(payload);
  }

  const envelope = await interpretMessage(args.text);
  logger("ENVELOPE", envelope);

  // if (envelope.reply) {
  //   MessagingService.sendText({
  //     to: fromE164,
  //     message: envelope.reply,
  //     appId: config.residentAppId,
  //   });
  // }

  const result = await executeAssistantIntent(
    {laundry, fromE164, text: args.text},
    envelope,
  );

  // Outbound reply via the resident app is not implemented yet; keep the logs rich.
  console.info("[assistant] reply", {
    laundryId: laundry.id,
    from: fromE164,
    intent: envelope.intent,
    confidence: envelope.confidence,
    missing: envelope.missing,
    // replyText: result.replyText,
  });

  // const fromE164 = normalizePhone(args.from);
  // if (!fromE164) return;
  // // Find-or-create customer (unique is (laundryId, phoneNumber) in schema).
  // let customer = await CustomerRepository.findByLaundryAndPhoneNumber(
  //   args.laundryId,
  //   fromE164,
  // );
  // if (!customer) {
  //   customer = await CustomerRepository.createCustomer({
  //     laundryId: args.laundryId,
  //     phoneNumber: fromE164,
  //     name: args.contactName,
  //   });
  // }
  // // Create an order (must have >= 1 item in current validation).
  // const parsedItems = parseOrderItems(args.text);
  // const orderItems =
  //   parsedItems.length > 0
  //     ? parsedItems
  //     : [{itemName: args.text.slice(0, 500), quantity: 1}];
  // const order = await OrderRepository.createOrder({
  //   laundryId: args.laundryId,
  //   customerId: customer.id,
  //   orderItems,
  // });
  // // Optional: confirmation message (your MessagingService is currently a stub).
  // await MessagingService.sendText(fromE164, `Order received: ${order.id}`);
  // return order;
};

// const handleSystemEvent = async (body: GupshupSystemEventBody) => {
//   // System events may come in as V2-style payloads, and include appId. ([partner-docs.gupshup.io](https://partner-docs.gupshup.io/docs/system-events))
//   const appId = body.appId;
//   if (!appId) {
//     console.warn("[gupshup-webhook] system-event missing appId", body.type);
//     return;
//   }

// const laundry = await LaundryRepository.existsById({appId});
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
  const laundry = await LaundryRepository.existsById({appId});
  if (!laundry) {
    console.warn("[gupshup-webhook] no laundry for gs_app_id", appId);
    return;
  }

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      // META ONBOARDING EVENT HERE
      if (
        change.field === "account-event" &&
        change?.value?.payload?.status === "ACCOUNT_VERIFIED"
      ) {
        await LaundryService.updateLaundry(
          {appId},
          {status: LaundryStatus.live, wabaId: entry.id},
        );
      }

      if (appId === config.residentAppId)
        if (change.field !== "messages") continue;

      logger("BODY_ENTRY 2", entry);
      logger("ENTRY_CHANGE 2", change);

      const value = change.value;

      // Inbound messages (V3). ([partner-docs.gupshup.io](https://partner-docs.gupshup.io/docs/set-callback-url-1))
      // WE NEED TO GET THE FROM CONTACT HERE THAT WOUKD BE THE LAUNDRY.
      const contactName = value?.contacts?.[0]?.profile?.name;
      for (const msg of value?.messages ?? []) {
        if (msg.type === "text" && msg.text?.body && msg.from) {
          await handleTextMessage({
            contactName,
            // from: msg.from,
            from: "2348030000011",
            text: msg.text.body,
          });
        }

        if (msg.type === "flow" && msg.from) {
          await handleFlowResponse({
            from: msg.from,
            flowId: msg?.flow?.flow_id ?? "",
            screen: msg?.flow?.data?.screen ?? "",
            response: msg?.flow?.data?.response ?? {},
          });
        }
      }

      // pseudo
      // if (msg.type === "audio" && msg.audio?.url) {
      //   const audioBytes = await fetch(msg.audio.url).then(r => r.arrayBuffer());
      //   const transcript = await SpeechToTextService.transcribe(audioBytes);
      //   const envelope = await interpretLaundryOperatorMessage({ text: transcript });
      //   const result = await executeAssistantIntent({ laundry, fromE164, text: transcript }, envelope);
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
    await handleV3(body);
  }

  return;
};

export const GupshupWebhookService = {ingest};
