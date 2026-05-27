import config from "@/config/config";
import logger from "@/utils/logger";
import {requestAppJson} from "@/utils/catch-async";
import {toWhatsAppRecipientDigits} from "@/utils/phone";

interface OutboundMessage {
  to: string;
  appId: string;
  message: string;
}

type OutboundFlowMessage = {
  to: string;
  cta: string;
  body: string;
  appId: string;
  flowId: string;
  header?: string;
  footer?: string;
  fallbackText?: string;
} & (
  | {screen?: never; screenData?: never}
  | {screen: string; screenData: Record<string, unknown>}
);

const sendText = async ({to, message, appId}: OutboundMessage) => {
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

const sendFlow = async (data: OutboundFlowMessage) => {
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
      payload,
      appId: data.appId,
      context: "send flow",
    });
  } catch {
    logger("sendFlow failed, falling back to text", payload);
    return sendText({
      to: data.to,
      appId: data.appId,
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

export const MessagingService = {
  sendText,
  sendFlow,
};
