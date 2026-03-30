import {prisma} from "@/lib/prisma";
import {type ICreateCustomer} from "./customer.validation";

const createCustomer = async (data: ICreateCustomer) => {
  return prisma.customer.create({data});
};

export const CustomerRepository = {
  createCustomer,
};
