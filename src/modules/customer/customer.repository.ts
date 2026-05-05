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

const findByLaundryAndPhoneNumber = async (
  laundryId: string,
  phoneNumber: string,
) => {
  return prisma.customer.findUnique({
    where: {
      laundryId_phoneNumber: {laundryId, phoneNumber},
    },
  });
};

export const CustomerRepository = {
  findById,
  createCustomer,
  findManyByLaundryId,
  findByLaundryAndPhoneNumber,
};
