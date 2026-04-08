import httpStatus from "http-status";

import ApiError from "@/utils/api-error";
import type {OrderStatus} from "../../../generated/prisma/enums";
import {CustomerRepository} from "../customer/customer.repository";
import {LaundryRepository} from "../laundry/laundry.repository";

import {OrderRepository} from "./order.repository";
import type {ICreateOrder} from "./order.validation";

const createOrder = async (data: ICreateOrder) => {
  const laundry = await LaundryRepository.existsById({id: data.laundryId});
  if (!laundry) {
    throw new ApiError(httpStatus.NOT_FOUND, "Laundry not found");
  }

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
  const laundry = await LaundryRepository.existsById({id: laundryId});
  if (!laundry) {
    throw new ApiError(httpStatus.NOT_FOUND, "Laundry not found");
  }

  return OrderRepository.findManyByLaundryId(laundryId, status);
};

const updateOrder = async (
  id: string,
  laundryId: string,
  patch: {status?: OrderStatus; isPaid?: boolean; totalAmount?: number},
) => {
  const order = await OrderRepository.findById(id);
  if (!order || order.laundryId !== laundryId) {
    throw new ApiError(httpStatus.NOT_FOUND, "Order not found");
  }

  return OrderRepository.updateOrder(id, patch);
};

export const OrderService = {
  getOrder,
  listOrders,
  createOrder,
  updateOrder,
};
