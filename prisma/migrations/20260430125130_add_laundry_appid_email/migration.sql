/*
  Warnings:

  - Added the required column `appId` to the `Laundry` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Laundry" ADD COLUMN     "appId" TEXT NOT NULL,
ADD COLUMN     "email" TEXT;
