import {prisma} from "@/lib/prisma";
import type {ICreateLaundry, IUpdateLaundry} from "./laundry.validation";

type LaundryLookup =
  | {id: string; appId?: never; full?: boolean}
  | {appId: string; id?: never; full?: boolean};

const createLaundry = async (data: ICreateLaundry) => {
  return prisma.laundry.create({data});
};

const existsById = async (args: LaundryLookup) => {
  const where = "id" in args ? {id: args.id} : {appId: args.appId};
  return prisma.laundry.findUnique({
    where,
    ...(args.full ? {} : {select: {id: true, appId: true}}),
  });
};

const findByWhatsappNumber = async (whatsappNumber: string) => {
  return prisma.laundry.findUnique({
    where: {whatsappNumber},
    select: {id: true},
  });
};

const updateLaundry = async (id: string, data: IUpdateLaundry) => {
  return prisma.laundry.update({
    where: {id},
    data,
  });
};

export const LaundryRepository = {
  existsById,
  createLaundry,
  updateLaundry,
  findByWhatsappNumber,
};
