import httpStatus from "http-status";
import zParse from "@/utils/z-parse";
import catchAsync from "@/utils/catch-async";
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

export const PostController = {
  createCustomer,
};
