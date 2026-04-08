import {z} from "zod";
import {OrderStatus} from "../../../generated/prisma/enums";

const orderStatusValues = [
  OrderStatus.ready,
  OrderStatus.pending,
  OrderStatus.delivered,
  OrderStatus.picked_up,
  OrderStatus.in_progress,
] as const;

export const createOrderSchema = z.object({
  body: z.object({
    laundryId: z.uuid("Laundry ID must be a valid UUID"),
    customerId: z.uuid("Customer ID must be a valid UUID"),
    pickupDate: z.iso.date().optional(),
    orderItems: z
      .array(
        z.object({
          itemName: z.string().min(1).max(500),
          quantity: z.number().int().positive(),
          totalPrice: z.number().nonnegative(),
        }),
      )
      .min(1, "At least one order item is required"),
  }),
});

export const listOrdersQuerySchema = z.object({
  query: z.object({
    laundryId: z.uuid("Laundry ID must be a valid UUID"),
    status: z.enum(orderStatusValues).optional(),
  }),
});

export const getOrderParamsSchema = z.object({
  params: z.object({
    id: z.uuid("Order ID must be a valid UUID"),
  }),
  query: z.object({
    laundryId: z.uuid("Laundry ID must be a valid UUID"),
  }),
});

export const updateOrderSchema = z.object({
  params: z.object({
    id: z.uuid("Order ID must be a valid UUID"),
  }),
  query: z.object({
    laundryId: z.uuid("Laundry ID must be a valid UUID"),
  }),
  body: z
    .object({
      status: z.enum(orderStatusValues).optional(),
      isPaid: z.boolean().optional(),
      totalAmount: z.number().nonnegative().optional(),
    })
    .refine(
      (b) =>
        b.status !== undefined ||
        b.isPaid !== undefined ||
        b.totalAmount !== undefined,
      {message: "At least one field is required"},
    ),
});

export type ICreateOrder = z.infer<typeof createOrderSchema>["body"];
