import {z} from "zod";
import {OrderStatus} from "generated/prisma/enums";

export const ASSISTANT_INTENTS = {
  HELP: "help",
  GET_ORDER: "get_order",
  LIST_ORDERS: "list_orders",
  RECORD_ORDER: "record_order",
  SEND_REMINDER: "send_reminder",
  MARK_ORDER_PAID: "mark_order_paid",
  FINANCIAL_REPORT: "financial_report",
  SCHEDULE_REMINDER: "schedule_reminder",
  UPDATE_ORDER_STATUS: "update_order_status",
  SEND_CUSTOMER_MESSAGE: "send_customer_message",
  UNKNOWN: "unknown",
};

export type AssistantIntentName = typeof ASSISTANT_INTENTS;

const orderStatusValues = [
  OrderStatus.ready,
  OrderStatus.pending,
  OrderStatus.picked_up,
  OrderStatus.in_progress,
  OrderStatus.delivered,
] as const;

/**
 * What we ask the LLM to return (always).
 *
 * Note: `args` is validated per-intent after parsing this envelope.
 */
export const LlmEnvelopeSchema = z
  .object({
    reply: z.string(),
    missing: z.array(z.string()),
    intent: z.enum(ASSISTANT_INTENTS),
    args: z.record(z.string(), z.unknown()),
    confidence: z.coerce.number().min(0).max(1),
  })
  .strict();

export type LlmEnvelope = z.infer<typeof LlmEnvelopeSchema>;

export const RecordOrderArgsSchema = z.object({
  customerPhone: z.string().nullable(),
  customerName: z.string().nullable(),
  pickupDate: z.string().nullable(), // Prefer YYYY-MM-DD
  items: z
    .array(
      z.object({
        itemName: z.string().min(1).max(500),
        quantity: z.coerce.number().int().positive(),
      }),
    )
    .nullable(),
  totalAmount: z.coerce.number().nonnegative().nullable(),
  notes: z.string().nullable(),
  timeSlot: z.string().nullable(),
});

export type RecordOrderArgs = z.infer<typeof RecordOrderArgsSchema>;

export const ListOrdersArgsSchema = z.object({
  status: z.enum(orderStatusValues).nullable(),
  limit: z.coerce.number().int().positive().max(50).nullable(),
});

export type ListOrdersArgs = z.infer<typeof ListOrdersArgsSchema>;

export const GetOrderArgsSchema = z.object({
  orderId: z.string().min(1),
});

export type GetOrderArgs = z.infer<typeof GetOrderArgsSchema>;

export const UpdateOrderStatusArgsSchema = z.object({
  orderId: z.string().min(1),
  status: z.enum(orderStatusValues),
});

export type UpdateOrderStatusArgs = z.infer<typeof UpdateOrderStatusArgsSchema>;

export const MarkOrderPaidArgsSchema = z.object({
  orderId: z.string().min(1),
  isPaid: z.union([z.boolean(), z.stringbool()]),
  totalAmount: z.coerce.number().nonnegative().nullable(),
});

export type MarkOrderPaidArgs = z.infer<typeof MarkOrderPaidArgsSchema>;

export const FinancialReportArgsSchema = z.object({
  period: z.enum(["today", "week", "month", "custom"]),
  from: z.string().nullable(), // YYYY-MM-DD
  to: z.string().nullable(), // YYYY-MM-DD
});

export type FinancialReportArgs = z.infer<typeof FinancialReportArgsSchema>;

export const SendCustomerMessageArgsSchema = z.object({
  customerPhone: z.string().min(1),
  text: z.string().min(1),
});

export type SendCustomerMessageArgs = z.infer<
  typeof SendCustomerMessageArgsSchema
>;

export const ScheduleReminderArgsSchema = z.object({
  orderId: z.string().nullable(),
  customerPhone: z.string().nullable(),
  when: z.string().nullable(), // YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ
  text: z.string().nullable(),
});

export type ScheduleReminderArgs = z.infer<typeof ScheduleReminderArgsSchema>;

export const SendReminderArgsSchema = z.object({
  orderId: z.string().min(1),
  customerPhone: z.string().nullable(),
  when: z.string().nullable(), // YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ
  text: z.string().nullable(),
});

export type SendReminderArgs = z.infer<typeof SendReminderArgsSchema>;
