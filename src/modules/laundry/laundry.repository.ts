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

const findByAppId = async (appId: string) => {
  return prisma.laundry.findFirst({
    where: {appId},
    select: {id: true, appId: true},
  });
};

const updateLaundry = async (
  id: string,
  data: {name?: string; whatsappNumber?: string},
) => {
  return prisma.laundry.update({
    where: {id},
    data,
  });
};

export const LaundryRepository = {
  existsById,
  findByAppId,
  createLaundry,
  updateLaundry,
  findByWhatsappNumber,
};
