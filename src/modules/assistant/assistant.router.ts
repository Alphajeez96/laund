import httpStatus from "http-status";
import {isValidPhoneNumber} from "libphonenumber-js";
import ApiError from "@/utils/api-error";
import {toE164} from "@/utils/phone";
import {prisma} from "@/lib/prisma";
import {CustomerRepository} from "@/modules/customer/customer.repository";
import {OrderRepository} from "@/modules/order/order.repository";
import {OrderService} from "@/modules/order/order.service";
import {
  FinancialReportArgsSchema,
  GetOrderArgsSchema,
  ListOrdersArgsSchema,
  MarkOrderPaidArgsSchema,
  RecordOrderArgsSchema,
  SendCustomerMessageArgsSchema,
  ScheduleReminderArgsSchema,
  UpdateOrderStatusArgsSchema,
  type LlmEnvelope,
  ASSISTANT_INTENTS,
} from "./assistant.validation";

export type AssistantExecutionResult = {
  replyText: string;
};

type AssistantContext = {
  laundry: {id: string; name: string; appId: string; whatsappNumber: string};
  fromE164: string;
  text: string;
};

function isIsoDate(v: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}

// function parseOrderItemsFallback(
//   text: string,
// ): Array<{itemName: string; quantity: number}> {
//   // Minimal MVP parser:
//   // - extract patterns like "3 shirts", "2 trousers"
//   // - ignore if nothing matches -> caller decides
//   const items: Array<{itemName: string; quantity: number}> = [];
//   const re = /(?:^|,|\s)(\d{1,3})\s+([a-zA-Z][a-zA-Z ]{1,40})/g;
//   for (const m of text.matchAll(re)) {
//     const qty = Number(m[1]);
//     const name = m[2].trim().replace(/\s+/g, " ");
//     if (Number.isFinite(qty) && qty > 0 && name.length > 0) {
//       items.push({itemName: name.slice(0, 500), quantity: qty});
//     }
//   }
//   return items;
// }

async function resolveOrderId(args: {
  laundryId: string;
  orderIdOrPrefix: string;
}): Promise<string | null> {
  const raw = args.orderIdOrPrefix.trim();
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw);
  if (isUuid) return raw;

  const prefix = raw.replace(/[^0-9a-f-]/gi, "");
  if (prefix.length < 8) return null;

  // Order IDs are UUIDs (native UUID column), so we can't use `startsWith` in Prisma filters.
  // For operator ergonomics, scan a small recent slice in JS.
  const recent = await prisma.order.findMany({
    where: {laundryId: args.laundryId},
    select: {id: true},
    orderBy: {createdAt: "desc"},
    take: 50,
  });
  return recent.find((o) => o.id.startsWith(prefix))?.id ?? null;
}

function formatMoney(v: unknown): string {
  if (v === null || v === undefined) return "0";
  const n =
    typeof v === "number"
      ? v
      : typeof v === "string"
        ? Number(v)
        : // Prisma Decimal-like
          Number((v as {toString?: () => string}).toString?.());
  if (!Number.isFinite(n)) return String(v);
  return n.toFixed(2);
}

export async function executeAssistantIntent(
  ctx: AssistantContext,
  envelope: LlmEnvelope,
): Promise<AssistantExecutionResult> {
  if (envelope.intent === ASSISTANT_INTENTS.HELP) {
    return {
      replyText:
        "Try:\n" +
        '- "record a new order for 08023... 2 shirts, 3 shorts, pickup tomorrow"\n' +
        '- "list pending orders"\n' +
        // '- "mark order <id> as ready"\n' +
        '- "revenue today"',
    };
  }

  if (envelope.intent === ASSISTANT_INTENTS.UNKNOWM) {
    return {
      replyText:
        envelope.reply ||
        "What would you like to do? For example: record an order, list orders, or get a revenue report.",
    };
  }

  if (envelope.intent === ASSISTANT_INTENTS.RECORD_ORDER) {
    const parsed = RecordOrderArgsSchema.safeParse(envelope.args);
    const args = parsed.success
      ? parsed.data
      : {
          notes: null,
          items: null,
          pickupDate: null,
          totalAmount: null,
          customerName: null,
          customerPhone: null,
        };

    const missing: string[] = [];

    const customerE164 = args.customerPhone ? toE164(args.customerPhone) : null;
    const validCustomerPhone =
      customerE164 && isValidPhoneNumber(customerE164) ? customerE164 : null;

    if (!validCustomerPhone) missing.push("customerPhone");

    const items = args.items && args.items.length > 0 ? args.items : null;
    if (!items || items.length === 0) missing.push("items");

    const pickupDate =
      args.pickupDate && isIsoDate(args.pickupDate) ? args.pickupDate : null;

    //WE should send a flow message here with the details, this way user can fill in whats missing and/or confirm to create order

    if (missing.length > 0) {
      return {
        replyText:
          envelope.reply ||
          `I can help with that. Please provide: ${missing.join(", ")}.`,
      };
    }

    // Find-or-create customer (unique is (laundryId, phoneNumber) in schema).
    let customer = await CustomerRepository.findByLaundryAndPhoneNumber(
      ctx.laundry.id,
      validCustomerPhone!,
    );
    if (!customer) {
      customer = await CustomerRepository.createCustomer({
        laundryId: ctx.laundry.id,
        phoneNumber: validCustomerPhone!,
        name: args.customerName ?? undefined,
      });
    }

    const order = await OrderService.createOrder({
      laundryId: ctx.laundry.id,
      customerId: customer.id,
      pickupDate: pickupDate ?? undefined,
      totalAmount: args.totalAmount ?? undefined,
      orderItems: (items ?? []).map((it) => ({
        itemName: it.itemName,
        quantity: it.quantity,
      })),
    });

    const shortId = order.id.slice(0, 8);
    const itemSummary = order.orderItems
      .map((it) => `${it.quantity} ${it.itemName}`)
      .join(", ");

    return {
      replyText:
        `Recorded order ${shortId} for ${customer.phoneNumber}. ` +
        `Items: ${itemSummary}` +
        (pickupDate ? `. Pickup: ${pickupDate}` : ""),
    };
  }

  if (envelope.intent === "list_orders") {
    const parsed = ListOrdersArgsSchema.safeParse(envelope.args);
    const args = parsed.success ? parsed.data : {status: null, limit: null};
    const limit = args.limit ?? 10;

    const orders = await OrderService.listOrders(
      ctx.laundry.id,
      args.status ?? undefined,
    );

    if (orders.length === 0) {
      return {replyText: "No orders found."};
    }

    const lines = orders.slice(0, limit).map((o) => {
      const shortId = o.id.slice(0, 8);
      const amount = formatMoney(o.totalAmount);
      return `${shortId} | ${o.status} | ${o.customer.phoneNumber} | ₦${amount}`;
    });

    return {
      replyText:
        `Recent orders${args.status ? ` (${args.status})` : ""}:\n` +
        lines.join("\n"),
    };
  }

  if (envelope.intent === "get_order") {
    const parsed = GetOrderArgsSchema.safeParse(envelope.args);
    const rawOrderId = parsed.success ? parsed.data.orderId : "";
    const resolvedId = rawOrderId
      ? await resolveOrderId({
          laundryId: ctx.laundry.id,
          orderIdOrPrefix: rawOrderId,
        })
      : null;
    if (!resolvedId) {
      return {replyText: envelope.reply || "Please provide the order ID."};
    }

    const order = await OrderRepository.findById(resolvedId);
    if (!order || order.laundryId !== ctx.laundry.id) {
      return {replyText: "Order not found."};
    }

    const items = order.orderItems
      .map((it) => `${it.quantity} ${it.itemName}`)
      .join(", ");
    const amount = formatMoney(order.totalAmount);

    return {
      replyText:
        `Order ${order.id.slice(0, 8)}\n` +
        `Status: ${order.status}\n` +
        `Customer: ${order.customer.phoneNumber}\n` +
        `Items: ${items}\n` +
        `Total: ₦${amount}`,
    };
  }

  if (envelope.intent === "update_order_status") {
    const parsed = UpdateOrderStatusArgsSchema.safeParse(envelope.args);
    if (!parsed.success) {
      return {
        replyText: envelope.reply || "Please provide the order ID and status.",
      };
    }

    const resolvedId = await resolveOrderId({
      laundryId: ctx.laundry.id,
      orderIdOrPrefix: parsed.data.orderId,
    });
    if (!resolvedId) {
      return {
        replyText:
          "Please provide the full order ID (or at least the first 8 characters).",
      };
    }

    const updated = await OrderService.updateOrder(resolvedId, ctx.laundry.id, {
      status: parsed.data.status,
    });

    return {
      replyText: `Updated order ${updated.id.slice(0, 8)} to ${updated.status}.`,
    };
  }

  if (envelope.intent === "mark_order_paid") {
    const parsed = MarkOrderPaidArgsSchema.safeParse(envelope.args);
    if (!parsed.success) {
      return {
        replyText:
          envelope.reply ||
          "Please provide the order ID and whether it is paid.",
      };
    }

    const resolvedId = await resolveOrderId({
      laundryId: ctx.laundry.id,
      orderIdOrPrefix: parsed.data.orderId,
    });
    if (!resolvedId) {
      return {
        replyText:
          "Please provide the full order ID (or at least the first 8 characters).",
      };
    }

    const updated = await OrderService.updateOrder(resolvedId, ctx.laundry.id, {
      isPaid: parsed.data.isPaid,
      ...(parsed.data.totalAmount !== null
        ? {totalAmount: parsed.data.totalAmount}
        : {}),
    });

    return {
      replyText:
        `Order ${updated.id.slice(0, 8)} marked ` +
        (updated.isPaid ? "paid" : "unpaid") +
        (parsed.data.totalAmount !== null
          ? ` (₦${formatMoney(updated.totalAmount)})`
          : "") +
        ".",
    };
  }

  if (envelope.intent === "financial_report") {
    const parsed = FinancialReportArgsSchema.safeParse(envelope.args);
    const args = parsed.success
      ? parsed.data
      : {period: "today" as const, from: null, to: null};

    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);
    const startOfToday = new Date(`${todayIso}T00:00:00.000Z`);
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setUTCDate(startOfTomorrow.getUTCDate() + 1);

    let from = startOfToday;
    let to = startOfTomorrow;

    if (args.period === "week") {
      from = new Date(startOfToday);
      from.setUTCDate(from.getUTCDate() - 6);
    } else if (args.period === "month") {
      from = new Date(startOfToday);
      from.setUTCDate(from.getUTCDate() - 29);
    } else if (args.period === "custom") {
      if (
        !args.from ||
        !args.to ||
        !isIsoDate(args.from) ||
        !isIsoDate(args.to)
      ) {
        return {
          replyText:
            envelope.reply ||
            "Please provide a custom date range as from YYYY-MM-DD to YYYY-MM-DD.",
        };
      }
      from = new Date(`${args.from}T00:00:00.000Z`);
      to = new Date(`${args.to}T00:00:00.000Z`);
      to.setUTCDate(to.getUTCDate() + 1);
    }

    const agg = await prisma.order.aggregate({
      where: {laundryId: ctx.laundry.id, createdAt: {gte: from, lt: to}},
      _sum: {totalAmount: true},
      _count: {id: true},
    });

    const amount = formatMoney(agg._sum.totalAmount);
    const count = agg._count.id;
    const label =
      args.period === "today"
        ? "today"
        : args.period === "week"
          ? "last 7 days"
          : args.period === "month"
            ? "last 30 days"
            : `${args.from} to ${args.to}`;

    return {
      replyText: `Revenue (${label}): ₦${amount} across ${count} orders.`,
    };
  }

  if (envelope.intent === "send_customer_message") {
    const parsed = SendCustomerMessageArgsSchema.safeParse(envelope.args);
    if (!parsed.success) {
      return {
        replyText:
          envelope.reply ||
          "Please provide the customer phone number and the message to send.",
      };
    }

    const customerE164 = toE164(parsed.data.customerPhone);
    if (!isValidPhoneNumber(customerE164)) {
      return {
        replyText:
          "That phone number doesn't look valid. Please send it in E.164 format, e.g. +234...",
      };
    }

    // Outbound messaging per-laundry app is not wired yet.
    return {
      replyText:
        "Outbound messaging is not wired up yet in this build. " +
        `I captured your request to message ${customerE164}.`,
    };
  }

  if (envelope.intent === "schedule_reminder") {
    const parsed = ScheduleReminderArgsSchema.safeParse(envelope.args);
    if (!parsed.success) {
      return {
        replyText:
          envelope.reply ||
          "Please provide the reminder time and target (orderId or phone).",
      };
    }

    // Reminder scheduling isn’t implemented yet, but keep the response helpful.
    return {
      replyText:
        "Reminder scheduling is not implemented yet in this build. " +
        "For now, you can record an order and I will add reminders next.",
    };
  }

  // Exhaustive check (should never happen).
  throw new ApiError(
    httpStatus.INTERNAL_SERVER_ERROR,
    `Unhandled intent: ${(envelope as {intent?: string}).intent ?? "unknown"}`,
  );
}
