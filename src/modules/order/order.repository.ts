import {prisma} from "@/lib/prisma";

import type {OrderStatus} from "../../../generated/prisma/enums";

import type {ICreateOrder} from "./order.validation";

const createOrder = async (data: ICreateOrder) => {
  const totalAmount = data.orderItems.reduce((sum, item) => sum + item.totalPrice, 0);

  const pickupDate =
    data.pickupDate !== undefined
      ? new Date(`${data.pickupDate}T00:00:00.000Z`)
      : undefined;

  return prisma.order.create({
    data: {
      laundryId: data.laundryId,
      customerId: data.customerId,
      pickupDate,
      totalAmount,
      orderItems: {
        create: data.orderItems.map((item) => ({
          itemName: item.itemName,
          quantity: item.quantity,
          totalPrice: item.totalPrice,
        })),
      },
    },
    include: {
      orderItems: true,
      customer: true,
    },
  });
};

const findById = async (id: string) => {
  return prisma.order.findUnique({
    where: {id},
    include: {orderItems: true, customer: true},
  });
};

const findManyByLaundryId = async (
  laundryId: string,
  status?: OrderStatus,
) => {
  return prisma.order.findMany({
    where: {
      laundryId,
      ...(status ? {status} : {}),
    },
    include: {orderItems: true, customer: true},
    orderBy: {createdAt: "desc"},
  });
};

const updateOrder = async (
  id: string,
  data: {
    status?: OrderStatus;
    isPaid?: boolean;
    totalAmount?: number;
  },
) => {
  return prisma.order.update({
    where: {id},
    data,
    include: {orderItems: true, customer: true},
  });
};

export const OrderRepository = {
  createOrder,
  findById,
  findManyByLaundryId,
  updateOrder,
};
