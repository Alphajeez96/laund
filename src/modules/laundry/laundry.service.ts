import httpStatus from "http-status";
import ApiError from "@/utils/api-error";
import {
  createApp,
  generateEmbedLink,
  setContactDetails,
} from "@/integrations/gupshup/onboarding-ops";
import {LaundryRepository} from "../laundry/laundry.repository";
import {setSubscription} from "@/integrations/gupshup/subscription-ops";
import {type ICreateLaundry, type IUpdateLaundry} from "./laundry.validation";

type LaundryLookup = Parameters<typeof LaundryRepository.existsById>[0];

const getLaundry = async (id: string) => {
  const laundry = await LaundryRepository.existsById({id, full: true});
  if (!laundry) throw new ApiError(httpStatus.NOT_FOUND, "Laundry not found");
  return laundry;
};

const createLaundry = async (data: ICreateLaundry) => {
  const {whatsappNumber, name: rawName, email} = data;
  const itExists = await LaundryRepository.findByWhatsappNumber(whatsappNumber);

  if (itExists) {
    throw new ApiError(httpStatus.CONFLICT, "Laundry already exists");
  }

  const name = rawName.replace(/\s+/g, "");

  const {appId = ""} = await createApp(name);
  await setSubscription({name, appId});
  const {link = ""} = await generateEmbedLink({user: name, appId});
  console.log("RESP::GENERATED-LINK::", link);
  // send link to user via chat?

  //getAppAccessToken
  // setwebhook
  // call gupshup update contact endpoint -> we should be updating just contactEmail now
  // generate empbed link,
  // wait for webhook and then push wabaId, namespace and co to DB

  return LaundryRepository.createLaundry({...data, appId});
};

const updateLaundry = async (lookup: LaundryLookup, data: IUpdateLaundry) => {
  const existing = await LaundryRepository.existsById({...lookup, full: true});
  if (!existing) {
    throw new ApiError(httpStatus.NOT_FOUND, "Laundry not found");
  }

  if (
    data.whatsappNumber !== undefined &&
    data.whatsappNumber !== existing.whatsappNumber
  ) {
    const taken = await LaundryRepository.findByWhatsappNumber(
      data.whatsappNumber,
    );
    if (taken) {
      throw new ApiError(httpStatus.CONFLICT, "Laundry already exists");
    }
  }

  return LaundryRepository.updateLaundry(existing.id, data);
};

export const LaundryService = {
  getLaundry,
  createLaundry,
  updateLaundry,
};
