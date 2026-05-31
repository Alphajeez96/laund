import config from "@/config/config";
import logger from "@/utils/logger";
import FLOW_CONFIG from "./flow-config";
import {inboundWaFromToE164, toLocalE164} from "@/utils/phone";
import {LaundryStatus} from "generated/prisma/enums";
import {LaundryRepository} from "@/modules/laundry/laundry.repository";
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
  const existing = await LaundryRepository.findByWhatsappNumber(whatsappNumber);

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

export const flowHandlers: Record<string, FlowHandler> = {
  [FLOW_CONFIG.SIGN_UP.id]: handleSignupFlow,
};
