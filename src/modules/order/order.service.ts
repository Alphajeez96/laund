import httpStatus from "http-status";
import ApiError from "@/utils/api-error";
import {OrderRepository} from "./order.repository";
import type {ICreateOrder} from "./order.validation";
import type {OrderStatus} from "generated/prisma/enums";
import {LaundryRepository} from "../laundry/laundry.repository";
import {CustomerRepository} from "../customer/customer.repository";

const createOrder = async (data: ICreateOrder) => {
  await checkLaundryExists(data.laundryId);

  const customer = await CustomerRepository.findById(data.customerId);
  if (!customer || customer.laundryId !== data.laundryId) {
    throw new ApiError(httpStatus.NOT_FOUND, "Customer not found");
  }

  return OrderRepository.createOrder(data);
};

const getOrder = async (id: string, laundryId: string) => {
  const order = await OrderRepository.findById(id);
  if (!order || order.laundryId !== laundryId) {
    throw new ApiError(httpStatus.NOT_FOUND, "Order not found");
  }
  return order;
};

const listOrders = async (laundryId: string, status?: OrderStatus) => {
  await checkLaundryExists(laundryId);
  return OrderRepository.findManyByLaundryId(laundryId, status);
};

const updateOrder = async (
  id: string,
  laundryId: string,
  patch: {status?: OrderStatus; isPaid?: boolean; totalAmount?: number},
) => {
  await getOrder(id, laundryId);
  return OrderRepository.updateOrder(id, patch);
};

const checkLaundryExists = async (id: string) => {
  const laundry = await LaundryRepository.existsById({id});
  if (!laundry) {
    throw new ApiError(httpStatus.NOT_FOUND, "Laundry not found");
  }
  return laundry;
};

const generateInvoice = (data) => {};

export const OrderService = {
  getOrder,
  listOrders,
  createOrder,
  updateOrder,
  generateInvoice,
};
