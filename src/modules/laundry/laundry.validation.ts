import {z} from "zod";
import {isValidPhoneNumber} from "libphonenumber-js";

export const getLaundryParamsSchema = z.object({
  params: z.object({
    id: z.uuid("ID must be a valid UUID"),
  }),
});

export const createLaundrySchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required").max(100),
    whatsappNumber: z
      .string()
      .refine((v) => isValidPhoneNumber(v), "Invalid phone number"),
  }),
});

export type ICreateLaundry = z.infer<typeof createLaundrySchema>["body"];
