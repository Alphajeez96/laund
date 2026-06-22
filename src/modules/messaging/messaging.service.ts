import config from "@/config/config";
import logger from "@/utils/logger";
import {toE164} from "@/utils/phone";
import {requestAppJson} from "@/utils/catch-async";
import type {MediaType} from "@/integrations/gupshup/types";

const defaults = {
  recipient_type: "individual",
  messaging_product: "whatsapp",
};

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
  header?: Record<string, unknown>;
  footer?: string;
  fallbackText?: string;
} & (
  | {screen?: never; screenData?: never}
  | {screen: string; screenData: Record<string, unknown>}
);

type OutboundMediaMessage = {
  to: string;
  appId?: string;
  caption?: string;
  fileName?: string;
  mediaType?: MediaType;
} & ({id: string; link?: never} | {id?: never; link: string});

type OutboundInteractiveMessage = {
  to: string;
  body: string;
  appId?: string;
  footer?: string;
  header?: Record<string, unknown>;
  buttons: {id: string; title: string}[];
};

const handleSendAction = async ({
  appId,
  context,
  payload,
}: {
  appId: string;
  context: string;
  payload: Record<string, any>;
}) => {
  return requestAppJson(appId, `app/${appId}/v3/message`, {
    context,
    method: "POST",
    body: JSON.stringify({...payload, to: toE164(payload.to)}),
  });
};

const sendText = async ({
  to,
  message,
  appId = config.residentAppId,
}: OutboundMessage) => {
  const payload = {
    to,
    ...defaults,
    type: "text",
    text: {body: message},
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
    ...defaults,
    to: data.to,
    type: "interactive",
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

const sendMedia = async ({
  mediaType = "image",
  appId = config.residentAppId,
  ...data
}: OutboundMediaMessage) => {
  const payload = {
    ...defaults,
    to: data.to,
    type: mediaType,
    [mediaType]: {
      ...(data?.id ? {id: data.id} : {}),
      ...(data?.link ? {link: data.link} : {}),
      ...(data?.caption && {caption: data?.caption}),
      ...(data?.fileName && {filename: data?.fileName}),
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

const sendInteractiveMessage = async ({
  appId = config.residentAppId,
  ...data
}: OutboundInteractiveMessage) => {
  const payload = {
    ...defaults,
    to: data.to,
    type: "interactive",
    interactive: {
      type: "button",
      body: {text: data.body},
      action: {
        buttons: data.buttons.map(({id, title}) => ({
          type: "reply",
          reply: {id, title},
        })),
      },
      ...(data?.header ? {header: data.header} : {}),
      ...(data?.footer ? {footer: {text: data.footer}} : {}),
    },
  };

  try {
    return await handleSendAction({
      appId,
      payload,
      context: "send interactive message",
    });
  } catch {
    logger("sendInteractiveMessage failed", {appId, ...payload});
  }
};

export const MessagingService = {
  sendText,
  sendFlow,
  sendMedia,
  sendInteractiveMessage,
};
