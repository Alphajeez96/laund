import httpStatus from "http-status";

import catchAsync from "@/utils/catch-async";
import zParse from "@/utils/z-parse";

import {CustomerService} from "./customer.service";
import * as customerSchema from "./customer.validation";

const createCustomer = catchAsync(async (req) => {
  const {body: data} = await zParse(customerSchema.createCustomerSchema, req);
  const customer = await CustomerService.createCustomer(data);

  return {
    data: customer,
    statusCode: httpStatus.CREATED,
    message: "Customer created successfully",
  };
});

const listCustomers = catchAsync(async (req) => {
  const {query} = await zParse(customerSchema.listCustomersQuerySchema, req);
  const customers = await CustomerService.listCustomers(query.laundryId);

  return {
    data: customers,
    statusCode: httpStatus.OK,
    message: "Customers fetched successfully",
  };
});

const getCustomer = catchAsync(async (req) => {
  const {params, query} = await zParse(customerSchema.getCustomerSchema, req);
  const customer = await CustomerService.getCustomer(params.id, query.laundryId);

  return {
    data: customer,
    statusCode: httpStatus.OK,
    message: "Customer fetched successfully",
  };
});

export const CustomerController = {
  createCustomer,
  getCustomer,
  listCustomers,
};
