import httpStatus from "http-status";
import zParse from "@/utils/z-parse";
import catchAsync from "@/utils/catch-async";
import {LaundryService} from "./laundry.service";
import * as laundrySchema from "./laundry.validation";

const createLaundry = catchAsync(async (req) => {
  const {body: data} = await zParse(laundrySchema.createLaundrySchema, req);
  const laundry = await LaundryService.createLaundry(
    data as laundrySchema.ICreateLaundry,
  );

  return {
    data: laundry,
    statusCode: httpStatus.CREATED,
    message: "Laundry created successfully",
  };
});

const getLaundry = catchAsync(async (req) => {
  const {params} = await zParse(laundrySchema.getLaundryParamsSchema, req);
  const laundry = await LaundryService.getLaundry(params.id);

  return {
    data: laundry,
    statusCode: httpStatus.OK,
    message: "Laundry fetched successfully",
  };
});

const updateLaundry = catchAsync(async (req) => {
  const {params, body: data} = await zParse(
    laundrySchema.updateLaundrySchema,
    req,
  );
  const laundry = await LaundryService.updateLaundry(params.id, data);

  return {
    data: laundry,
    statusCode: httpStatus.OK,
    message: "Laundry updated successfully",
  };
});

export const LaundryController = {
  getLaundry,
  createLaundry,
  updateLaundry,
};
