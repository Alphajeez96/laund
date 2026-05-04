/*
  Warnings:

  - Added the required column `contactName` to the `Laundry` table without a default value. This is not possible if the table is not empty.
  - Added the required column `namespace` to the `Laundry` table without a default value. This is not possible if the table is not empty.
  - Added the required column `wabaId` to the `Laundry` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "LaundryStatus" AS ENUM ('live', 'sandbox');

-- AlterTable
ALTER TABLE "Laundry" ADD COLUMN     "contactName" TEXT NOT NULL,
ADD COLUMN     "contactNumber" TEXT,
ADD COLUMN     "namespace" TEXT NOT NULL,
ADD COLUMN     "status" "LaundryStatus" NOT NULL DEFAULT 'sandbox',
ADD COLUMN     "wabaId" TEXT NOT NULL;
