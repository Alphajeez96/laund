import httpStatus from "http-status";
import ApiError from "@/utils/api-error";
import {type ICreateLaundry} from "./laundry.validation";
import {LaundryRepository} from "../laundry/laundry.repository";

const createLaundry = async (data: ICreateLaundry) => {
  const existingLaundry = await LaundryRepository.findByWhatsappNumber(
    data.whatsappNumber,
  );
  if (existingLaundry) {
    throw new ApiError(httpStatus.CONFLICT, "Laundry already exists");
  }
  return LaundryRepository.createLaundry(data);
};

export const LaundryService = {
  createLaundry,
};
