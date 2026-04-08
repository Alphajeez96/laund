import {z} from "zod";
import {isValidPhoneNumber} from "libphonenumber-js";

export const createCustomerSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    laundryId: z.uuid("Laundry ID must be a valid UUID"),
    phoneNumber: z
      .string()
      .refine((v) => isValidPhoneNumber(v), "Invalid phone number"),
  }),
});

export const listCustomersQuerySchema = z.object({
  query: z.object({
    laundryId: z.uuid("Laundry ID must be a valid UUID"),
  }),
});

export const getCustomerSchema = z.object({
  params: z.object({
    id: z.uuid("Customer ID must be a valid UUID"),
  }),
  query: z.object({
    laundryId: z.uuid("Laundry ID must be a valid UUID"),
  }),
});

export type ICreateCustomer = z.infer<typeof createCustomerSchema>["body"];
