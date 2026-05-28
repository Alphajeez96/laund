import logger from "@/utils/logger";
import FLOW_CONFIG from "./flow-config";
import {toLocalE164} from "@/utils/phone";
import {LaundryStatus} from "generated/prisma/enums";
import {LaundryRepository} from "@/modules/laundry/laundry.repository";

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

  // TODO: create Gupshup app + generate embed link for WABA onboarding
  // TODO: send welcome message with embed link via MessagingService.sendText
};

export const flowHandlers: Record<string, FlowHandler> = {
  [FLOW_CONFIG.SIGN_UP.id]: handleSignupFlow,
};
