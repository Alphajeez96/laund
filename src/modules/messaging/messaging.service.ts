import {requestAppJson} from "@/utils/catch-async";
import {toWhatsAppRecipientDigits} from "@/utils/phone";

interface OutboundMessage {
  to: string;
  appId: string;
  message: string;
}

const sendText = async ({to, message, appId}: OutboundMessage) => {
  const payload = {
    type: "text",
    text: {body: message},
    recipient_type: "individual",
    messaging_product: "whatsapp",
    to: toWhatsAppRecipientDigits(to),
  };

  requestAppJson(appId, `app/${appId}/v3/message`, {
    method: "POST",
    context: "send text",
    body: JSON.stringify(payload),
  });
};

export const MessagingService = {
  sendText,
};
