import {prisma} from "@/lib/prisma";
import {type ICreateLaundry} from "./laundry.validation";

const createLaundry = async (data: ICreateLaundry) => {
  return prisma.laundry.create({data});
};

const existsById = async ({id, full = false}: {id: string; full?: boolean}) => {
  return prisma.laundry.findUnique({
    where: {id},
    ...(full ? {} : {select: {id: true}}),
  });
};

const findByWhatsappNumber = async (whatsappNumber: string) => {
  return prisma.laundry.findUnique({
    where: {whatsappNumber},
    select: {id: true},
  });
};

export const LaundryRepository = {
  existsById,
  createLaundry,
  findByWhatsappNumber,
};
