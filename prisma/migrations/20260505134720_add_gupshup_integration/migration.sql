-- CreateTable
CREATE TABLE "GupshupIntegration" (
    "id" UUID NOT NULL,
    "laundryId" UUID NOT NULL,
    "subscriptionId" TEXT,
    "callbackUrl" TEXT,
    "tag" TEXT,
    "modes" TEXT,
    "version" INTEGER,
    "lastWebhookReceivedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GupshupIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GupshupIntegration_laundryId_key" ON "GupshupIntegration"("laundryId");

-- AddForeignKey
ALTER TABLE "GupshupIntegration" ADD CONSTRAINT "GupshupIntegration_laundryId_fkey" FOREIGN KEY ("laundryId") REFERENCES "Laundry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
