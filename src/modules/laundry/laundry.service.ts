import httpStatus from "http-status";
import ApiError from "@/utils/api-error";
import {type ICreateLaundry, type IUpdateLaundry} from "./laundry.validation";
import {LaundryRepository} from "../laundry/laundry.repository";

const getLaundry = async (id: string) => {
  const laundry = await LaundryRepository.existsById({id, full: true});
  if (!laundry) throw new ApiError(httpStatus.NOT_FOUND, "Laundry not found");
  return laundry;
};

const createLaundry = async (data: ICreateLaundry) => {
  const existingLaundry = await LaundryRepository.findByWhatsappNumber(
    data.whatsappNumber,
  );
  if (existingLaundry) {
    throw new ApiError(httpStatus.CONFLICT, "Laundry already exists");
  }
  return LaundryRepository.createLaundry(data);
};

const updateLaundry = async (id: string, data: IUpdateLaundry) => {
  const existing = await LaundryRepository.existsById({id, full: true});
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

  return LaundryRepository.updateLaundry(id, data);
};

export const LaundryService = {
  getLaundry,
  createLaundry,
  updateLaundry,
};
