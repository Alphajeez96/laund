import httpStatus from "http-status";
import ApiError from "@/utils/api-error";
import {CustomerRepository} from "./customer.repository";
import {type ICreateCustomer} from "./customer.validation";
import {LaundryRepository} from "../laundry/laundry.repository";

const createCustomer = async (data: ICreateCustomer) => {
  const laundry = await LaundryRepository.existsById({id: data.laundryId});
  if (!laundry) {
    throw new ApiError(httpStatus.NOT_FOUND, "Laundry not found");
  }
  return CustomerRepository.createCustomer(data);
};

const getCustomer = async (id: string, laundryId: string) => {
  const laundry = await LaundryRepository.existsById({id: laundryId});
  if (!laundry) {
    throw new ApiError(httpStatus.NOT_FOUND, "Laundry not found");
  }

  const customer = await CustomerRepository.findById(id);
  if (!customer || customer.laundryId !== laundryId) {
    throw new ApiError(httpStatus.NOT_FOUND, "Customer not found");
  }
  return customer;
};

const listCustomers = async (laundryId: string) => {
  const laundry = await LaundryRepository.existsById({id: laundryId});
  if (!laundry) {
    throw new ApiError(httpStatus.NOT_FOUND, "Laundry not found");
  }

  return CustomerRepository.findManyByLaundryId(laundryId);
};

export const CustomerService = {
  getCustomer,
  listCustomers,
  createCustomer,
};
