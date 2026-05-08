/*
  Warnings:

  - A unique constraint covering the columns `[appId]` on the table `Laundry` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Laundry_appId_key" ON "Laundry"("appId");
