import {z} from "zod";
import {toE164} from "@/utils/phone";
import {LaundryStatus} from "generated/prisma/enums";

export const getLaundryParamsSchema = z.object({
  params: z.object({
    id: z.uuid("ID must be a valid UUID"),
  }),
});

export const createLaundrySchema = z.object({
  body: z.object({
    name: z.string().min(6, "Name is required").max(100),
    email: z.email().optional(),
    status: z.enum(LaundryStatus).optional(),
    whatsappNumber: z
      .string()
      .refine((v) => !!toE164(v), "Invalid phone number"),
  }),
});

export type ICreateLaundry = z.infer<typeof createLaundrySchema>["body"] & {
  appId?: string;
};

export const updateLaundrySchema = z.object({
  params: z.object({
    id: z.uuid("ID must be a valid UUID"),
  }),
  body: z
    .object({
      name: z.string().min(1).max(100).optional(),
      email: z.email().optional(),
      whatsappNumber: z
        .string()
        .refine((v) => !!toE164(v), "Invalid phone number")
        .optional(),
      namespace: z.string().optional(),
      status: z.enum(LaundryStatus).optional(),
      wabaId: z.string().optional(),
      contactName: z.string().optional(),
      contactNumber: z
        .string()
        .refine((v) => !!toE164(v), "Invalid phone number")
        .optional(),
    })
    .refine((b) => Object.values(b).some((v) => v !== undefined), {
      message: "At least one field must be provided",
    }),
});

export type IUpdateLaundry = z.infer<typeof updateLaundrySchema>["body"];
