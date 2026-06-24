import config from "@/config/config";
import logger from "@/utils/logger";
import type {Laundry} from "generated/prisma/client";
import {toE164, toNationalDigits} from "@/utils/phone";
import {MessagingService} from "../messaging/messaging.service";
import {MSG_TYPE, type GupshupV3WebhookBody} from "./gupshup.types";
import {FLOW_CONFIG} from "@/integrations/gupshup/flows/flow-config";
import {LaundryRepository} from "@/modules/laundry/laundry.repository";
import {assistantIntentHandlers} from "../assistant/assistant.handler";
import {flowHandlers} from "@/integrations/gupshup/flows/flow.handlers";
import {interactiveHandlers} from "@/integrations/gupshup/interactive.handlers";
import {
  transcribe,
  interpretMessage,
} from "@/modules/assistant/assistant.service";

type IngestInput = {
  receivedAtMs: number;
  body: GupshupV3WebhookBody;
  headers: Record<string, unknown>;
};

// type IngestInput = GupshupV3WebhookBody | GupshupSystemEventBody;

const sendSignupFlow = async (to: string, contactName?: string) => {
  await MessagingService.sendFlow({
    to,
    cta: "Get started",
    flowId: FLOW_CONFIG.SIGN_UP.id,
    screen: FLOW_CONFIG.SIGN_UP.screen,
    header: {type: "text", text: `Hi ${contactName ?? "Champ"}!`},
    body:
      "🧺 Meet Ezar — your laundry's new right hand.\n\n" +
      "• Track orders\n" +
      "• Remember pickup dates\n" +
      "• Send customer reminders\n" +
      "• and Keep an eye on revenue without jugglig notebooks and spreadsheets\n\n" +
      "You handle the cleaning. We'll help handle the operations.\n" +
      "Let's get you set up. ✨",
    screenData: {
      laundry_name: contactName ?? "",
      contact_number: toNationalDigits(to),
    },
  });
};

const handleFlowResponse = async (args: {
  from: string;
  flowId: string;
  screen: string;
  laundry: Laundry;
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
    laundry: args.laundry,
    response: args.response,
  });
};

const handleTextMessage = async (args: {
  from: string;
  text: string;
  laundry: Laundry;
}) => {
  const envelope = await interpretMessage(args.text);
  logger("ENVELOPE", envelope);

  // if (envelope.reply) {
  //   MessagingService.sendText({
  //     to: fromE164,
  //     message: envelope.reply,
  //     appId: config.residentAppId,
  //   });
  // }

  const handler = assistantIntentHandlers[envelope.intent];

  if (!handler) {
    logger("Unhandled intent", {args, envelope});
  }

  const result = await handler(
    {laundry: args.laundry, fromE164: args.from, text: args.text},
    envelope,
  );

  if (result.replyText) {
    MessagingService.sendText({
      to: args.from,
      message: result.replyText,
    });
  }

  // Outbound reply via the resident app is not implemented yet; keep the logs rich.
  console.info("[assistant] reply", {
    from: args.from,
    laundryId: args.laundry.id,
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

const handleInteractiveResponse = async (
  args: {id: string; title: string},
  laundry: Laundry,
) => {
  const deconstruct = args.id.split(":");
  const data = JSON.parse(deconstruct[1]);
  const handler = interactiveHandlers[deconstruct[0]];

  if (!handler) {
    logger("[webhook] no handler for InteractiveResponse", {data, laundry});
    return;
  }

  await handler({...data, laundry});
};

const handleV3 = async (body: GupshupV3WebhookBody) => {
  const appId = body.gs_app_id;

  // Caters to our internal system for now.
  const adminLaundry = await LaundryRepository.existsById({appId});
  if (!adminLaundry) {
    console.warn("[gupshup-webhook] no adminLaundry for gs_app_id", appId);
    return;
  }

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      // META ONBOARDING EVENT HERE, commented out in the while

      // if (
      //   change.field === "account-event" &&
      //   change?.value?.payload?.status === "ACCOUNT_VERIFIED"
      // ) {
      //   await LaundryService.updateLaundry(
      //     {appId},
      //     {status: LaundryStatus.live, wabaId: entry.id},
      //   );
      // }

      if (appId === config.residentAppId)
        if (change.field !== "messages") continue;

      logger("BODY_ENTRY 2", entry);
      logger("ENTRY_CHANGE 2", change);

      const value = change.value;

      // WE NEED TO GET THE FROM CONTACT HERE THAT WOUKD BE THE LAUNDRY.
      const contactName = value?.contacts?.[0]?.profile?.name ?? "";
      for (const msg of value?.messages ?? []) {
        if (msg.from) {
          // const fromDigits = toE164(msg.from);
          const fromDigits = "2348030000011";
          const laundry = await LaundryRepository.findByContact(fromDigits);

          if (!laundry) {
            await sendSignupFlow(fromDigits, contactName);
            continue;
          }

          // Handle Texts
          if (msg.type === MSG_TYPE.TEXT && msg.text?.body) {
            handleTextMessage({
              laundry,
              from: fromDigits,
              text: msg.text.body,
            });
          }

          // Handle Flow messages
          if (msg.type === MSG_TYPE.FLOW) {
            handleFlowResponse({
              laundry,
              from: msg.from,
              flowId: msg?.flow?.flow_id ?? "",
              screen: msg?.flow?.data?.screen ?? "",
              response: msg?.flow?.data?.response ?? {},
            });
          }

          // Handle Interactive Replies
          if (
            msg.type === MSG_TYPE.INTERACTIVE &&
            msg.interactive?.button_reply?.id
          ) {
            handleInteractiveResponse(msg.interactive?.button_reply, laundry);
          }

          if (msg.type === MSG_TYPE.AUDIO && msg.audio?.url) {
            try {
              const transcript = await transcribe(msg.audio.url);
              logger("[webhook] audio transcribed", {transcript});

              // const envelope = await interpretMessage(transcript);
              // const handler = assistantIntentHandlers[envelope.intent];

              // if (handler) {
              //   const result = await handler(
              //     {laundry, fromE164: fromDigits, text: transcript},
              //     envelope,
              //   );
              //   if (result.replyText) {
              //     MessagingService.sendText({
              //       to: fromDigits,
              //       message: result.replyText,
              //     });
              //   }
              // }
            } catch (err) {
              logger("[webhook] audio processing failed", {error: err});
            }
          }
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
