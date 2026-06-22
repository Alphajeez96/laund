import {format} from "date-fns";
import {Laundry} from "generated/prisma/client";
import {INTERACTIVE_BUTTON} from "./flows/flow-config";
import {MessagingService} from "@/modules/messaging/messaging.service";

export type InteractiveHandler<T extends Record<string, unknown>> = (
  args: T & {laundry: Laundry},
) => Promise<void>;

const sendInvoice: InteractiveHandler<{
  customer: string;
  invoiceMediaId: string;
}> = async (data) => {
  MessagingService.sendMedia({
    to: data.customer,
    mediaType: "document",
    id: data.invoiceMediaId,
    fileName: `Invoice from ${data.laundry.name}-${format(new Date(), "dd/MM/yyyy")}`,
  });
};

export const interactiveHandlers: Record<string, InteractiveHandler<any>> = {
  [INTERACTIVE_BUTTON.SEND_INVOICE]: sendInvoice,
};
