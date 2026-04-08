import {prisma} from "@/lib/prisma";
import {type ICreateCustomer} from "./customer.validation";

const createCustomer = async (data: ICreateCustomer) => {
  return prisma.customer.create({data});
};

const findById = async (id: string) => {
  return prisma.customer.findUnique({
    where: {id},
  });
};

const findManyByLaundryId = async (laundryId: string) => {
  return prisma.customer.findMany({
    where: {laundryId},
    orderBy: {createdAt: "desc"},
  });
};

export const CustomerRepository = {
  createCustomer,
  findById,
  findManyByLaundryId,
};
