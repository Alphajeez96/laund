/**
 * Outbound WhatsApp via Gupshup (not implemented yet).
 * Inbound will use Gupshup subscription callback URLs.
 */
const sendText = async (_toE164: string, _text: string) => {
  // throw new Error(
  //   "WhatsApp outbound not implemented: use Gupshup messaging API when ready",
  // );
};

export const MessagingService = {
  sendText,
};
