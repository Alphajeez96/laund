import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {format} from "date-fns";
import Handlebars from "handlebars";
import puppeteer from "puppeteer";
import httpStatus from "http-status";
import {Prisma, type Customer, type OrderItem} from "generated/prisma/client";
import ApiError from "@/utils/api-error";
import {OrderRepository} from "./order.repository";
import type {ICreateOrder} from "./order.validation";
import type {OrderStatus} from "generated/prisma/enums";
import {LaundryRepository} from "../laundry/laundry.repository";
import {CustomerRepository} from "../customer/customer.repository";
import {uploadMedia} from "@/integrations/gupshup/media-ops";
import config from "@/config/config";

type InvoicePayload = {
  createdAt: Date;
  reference: number;
  pickupDate: string;
  totalAmount: number;
  customer: Pick<Customer, "name" | "phoneNumber">;
  orderItems: Pick<OrderItem, "itemName" | "quantity">[];
};

const TEMPLATE_PATH = path.resolve(process.cwd(), "src/templates/invoice.hbs");

const createOrder = async (data: ICreateOrder) => {
  await checkLaundryExists(data.laundryId);

  const customer = await CustomerRepository.findById(data.customerId);
  if (!customer || customer.laundryId !== data.laundryId) {
    throw new ApiError(httpStatus.NOT_FOUND, "Customer not found");
  }

  return OrderRepository.createOrder(data);
};

const getOrder = async (id: string, laundryId: string) => {
  const order = await OrderRepository.findById(id);
  if (!order || order.laundryId !== laundryId) {
    throw new ApiError(httpStatus.NOT_FOUND, "Order not found");
  }
  return order;
};

const listOrders = async (laundryId: string, status?: OrderStatus) => {
  await checkLaundryExists(laundryId);
  return OrderRepository.findManyByLaundryId(laundryId, status);
};

const updateOrder = async (
  id: string,
  laundryId: string,
  patch: {status?: OrderStatus; isPaid?: boolean; totalAmount?: number},
) => {
  await getOrder(id, laundryId);
  return OrderRepository.updateOrder(id, patch);
};

const checkLaundryExists = async (id: string) => {
  const laundry = await LaundryRepository.existsById({id});
  if (!laundry) {
    throw new ApiError(httpStatus.NOT_FOUND, "Laundry not found");
  }
  return laundry;
};

const generateInvoice = async (
  order: InvoicePayload,
  laundry: {name: string; whatsappNumber: string},
) => {
  const template = fs.readFileSync(TEMPLATE_PATH, "utf-8");
  const compiled = Handlebars.compile(template);

  const invoiceRef = String(order.reference).padStart(5, "0");

  const html = compiled({
    invoiceRef,
    laundryName: laundry.name,
    createdAt: format(order.createdAt, "do MMMM, yyyy"),
    customerName: order.customer.name,
    customerPhone: order.customer.phoneNumber,
    items: order.orderItems.map(({itemName, quantity}) => ({
      itemName,
      quantity,
      // total: Number(totalPrice).toLocaleString(),
    })),
    totalAmount: Number(order.totalAmount).toLocaleString(),
    pickupDate: order.pickupDate
      ? format(order.pickupDate, "do MMMM, yyyy")
      : null,
  });

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent(html);

  const tmpFile = path.join(os.tmpdir(), `invoice-${invoiceRef}.pdf`);
  await page.pdf({
    path: tmpFile,
    format: "A4",
    margin: {top: "20px", bottom: "20px"},
  });
  await browser.close();

  const mediaId = await uploadMedia({
    appId: config.residentAppId,
    filePath: tmpFile,
    mediaType: "document",
  });

  fs.unlinkSync(tmpFile);

  if (!mediaId) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to upload invoice PDF",
    );
  }

  return mediaId;
};

export const OrderService = {
  getOrder,
  listOrders,
  createOrder,
  updateOrder,
  generateInvoice,
};
