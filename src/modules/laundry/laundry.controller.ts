import httpStatus from "http-status";
import zParse from "@/utils/z-parse";
import catchAsync from "@/utils/catch-async";
import {LaundryService} from "./laundry.service";
import * as laundrySchema from "./laundry.validation";

const createLaundry = catchAsync(async (req) => {
  const {body: data} = await zParse(laundrySchema.createLaundrySchema, req);
  const laundry = await LaundryService.createLaundry(data);

  return {
    data: laundry,
    statusCode: httpStatus.CREATED,
    message: "Laundry created successfully",
  };
});

export const LaundryController = {
  createLaundry,
};
