import httpStatus from "http-status";
import ApiError from "@/utils/api-error";
import {type ICreateCustomer} from "./customer.validation";
import {CustomerRepository} from "./customer.repository";
import {LaundryRepository} from "../laundry/laundry.repository";

const createCustomer = async (data: ICreateCustomer) => {
  const laundry = await LaundryRepository.existsById({id: data.laundryId});
  if (!laundry) {
    throw new ApiError(httpStatus.NOT_FOUND, "Laundry not found");
  }
  return CustomerRepository.createCustomer(data);
};

export const CustomerService = {
  createCustomer,
};
