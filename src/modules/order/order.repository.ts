import {prisma} from "@/lib/prisma";
import type {ICreateOrder} from "./order.validation";
import type {OrderStatus} from "generated/prisma/enums";

const createOrder = async (data: ICreateOrder) => {
  const totalAmount = data.orderItems.reduce(
    (sum, item) => sum + (item?.totalPrice ?? 0),
    0,
  );

  const pickupDate =
    data.pickupDate !== undefined
      ? new Date(`${data.pickupDate}T00:00:00.000Z`)
      : undefined;

  return prisma.order.create({
    data: {
      pickupDate,
      laundryId: data.laundryId,
      customerId: data.customerId,
      totalAmount: data.totalAmount ?? totalAmount,
      orderItems: {
        create: data.orderItems.map((item) => ({
          itemName: item.itemName,
          quantity: item.quantity,
          totalPrice: item?.totalPrice ?? 0, // likely defunct, left in the while
        })),
      },
    },
    include: {
      customer: true,
      orderItems: true,
    },
  });
};

const findById = async (id: string) => {
  return prisma.order.findUnique({
    where: {id},
    include: {orderItems: true, customer: true},
  });
};

const findManyByLaundryId = async (laundryId: string, status?: OrderStatus) => {
  return prisma.order.findMany({
    where: {
      laundryId,
      ...(status ? {status} : {}),
    },
    orderBy: {createdAt: "desc"},
    include: {orderItems: true, customer: true},
  });
};

const updateOrder = async (
  id: string,
  data: {
    isPaid?: boolean;
    status?: OrderStatus;
    totalAmount?: number;
    invoiceMediaId?: string;
  },
) => {
  return prisma.order.update({
    data,
    where: {id},
    include: {orderItems: true, customer: true},
  });
};

export const OrderRepository = {
  findById,
  createOrder,
  updateOrder,
  findManyByLaundryId,
};
