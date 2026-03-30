import {prisma} from "@/lib/prisma";

const existsById = async (id: string) => {
  return prisma.laundry.findUnique({
    where: {id},
    select: {id: true},
  });
};

export const LaundryRepository = {
  existsById,
};
