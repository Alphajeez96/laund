import config from "@/config/config";
import logger from "@/utils/logger";
import {requestAppJson} from "@/utils/catch-async";
import {toWhatsAppRecipientDigits} from "@/utils/phone";
import type {MediaType} from "@/integrations/gupshup/types";

interface OutboundMessage {
  to: string;
  appId?: string;
  message: string;
}

type OutboundFlowMessage = {
  to: string;
  cta: string;
  body: string;
  appId?: string;
  flowId: string;
  header?: string;
  footer?: string;
  fallbackText?: string;
} & (
  | {screen?: never; screenData?: never}
  | {screen: string; screenData: Record<string, unknown>}
);

type OutboundMediaMessage = {
  to: string;
  appId?: string;
  caption: string;
  mediaType?: MediaType;
} & ({id: string; link?: never} | {id?: never; link: string});

const sendText = async ({
  to,
  message,
  appId = config.residentAppId,
}: OutboundMessage) => {
  const payload = {
    type: "text",
    text: {body: message},
    recipient_type: "individual",
    messaging_product: "whatsapp",
    to: toWhatsAppRecipientDigits(to),
  };

  try {
    return await handleSendAction({appId, payload, context: "send text"});
  } catch {
    logger("send Text failed", payload);
  }
};

const sendFlow = async ({
  appId = config.residentAppId,
  ...data
}: OutboundFlowMessage) => {
  const params: Record<string, unknown> = {
    flow_cta: data.cta,
    flow_id: data.flowId,
    flow_action: "navigate",
    flow_message_version: config.gupshup.apiVersion,
    ...(data.screen && {
      flow_action_payload: {
        screen: data.screen,
        ...(data.screenData ? {data: JSON.stringify(data.screenData)} : {}),
      },
    }),
  };

  const payload = {
    type: "interactive",
    recipient_type: "individual",
    messaging_product: "whatsapp",
    to: toWhatsAppRecipientDigits(data.to),
    interactive: {
      type: "flow",
      body: {text: data.body},
      action: {name: "flow", parameters: params},
      ...(data?.footer ? {footer: {text: data.footer}} : {}),
      ...(data?.header ? {header: {type: "text", text: data.header}} : {}),
    },
  };

  try {
    return await handleSendAction({
      appId,
      payload,
      context: "send flow",
    });
  } catch {
    logger("sendFlow failed, falling back to text", payload);
    return sendText({
      appId,
      to: data.to,
      message:
        data?.fallbackText ?? "Hi Champ, Please retry your previous request!",
    });
  }
};

const handleSendAction = async ({
  appId,
  context,
  payload,
}: {
  appId: string;
  context: string;
  payload: unknown;
}) => {
  return requestAppJson(appId, `app/${appId}/v3/message`, {
    context,
    method: "POST",
    body: JSON.stringify(payload),
  });
};

const sendMedia = async ({
  mediaType = "image",
  appId = config.residentAppId,
  ...data
}: OutboundMediaMessage) => {
  const payload = {
    type: mediaType,
    recipient_type: "individual",
    messaging_product: "whatsapp",
    to: toWhatsAppRecipientDigits(data.to),
    [mediaType]: {
      caption: data.caption,
      ...(data?.id ? {id: data.id} : {}),
      ...(data?.link ? {link: data.link} : {}),
    },
  };

  try {
    return await handleSendAction({
      appId,
      payload,
      context: `send ${mediaType}`,
    });
  } catch {
    logger("sendMedia failed", {appId, payload});
  }
};

export const MessagingService = {
  sendText,
  sendFlow,
  sendMedia,
};
