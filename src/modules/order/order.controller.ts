import httpStatus from "http-status";

import catchAsync from "@/utils/catch-async";
import zParse from "@/utils/z-parse";

import {OrderService} from "./order.service";
import * as orderSchema from "./order.validation";

const createOrder = catchAsync(async (req) => {
  const {body: data} = await zParse(orderSchema.createOrderSchema, req);
  const order = await OrderService.createOrder(data);

  return {
    data: order,
    statusCode: httpStatus.CREATED,
    message: "Order created successfully",
  };
});

const listOrders = catchAsync(async (req) => {
  const {query} = await zParse(orderSchema.listOrdersQuerySchema, req);
  const orders = await OrderService.listOrders(query.laundryId, query.status);

  return {
    data: orders,
    statusCode: httpStatus.OK,
    message: "Orders fetched successfully",
  };
});

const getOrder = catchAsync(async (req) => {
  const {params, query} = await zParse(orderSchema.getOrderParamsSchema, req);
  const order = await OrderService.getOrder(params.id, query.laundryId);

  return {
    data: order,
    statusCode: httpStatus.OK,
    message: "Order fetched successfully",
  };
});

const updateOrder = catchAsync(async (req) => {
  const {params, query, body} = await zParse(orderSchema.updateOrderSchema, req);
  const order = await OrderService.updateOrder(params.id, query.laundryId, body);

  return {
    data: order,
    statusCode: httpStatus.OK,
    message: "Order updated successfully",
  };
});

export const OrderController = {
  createOrder,
  getOrder,
  listOrders,
  updateOrder,
};
