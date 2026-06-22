-- AlterTable
ALTER TABLE "Laundry" ADD COLUMN     "invoiceRef" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "invoiceRef" INTEGER;
