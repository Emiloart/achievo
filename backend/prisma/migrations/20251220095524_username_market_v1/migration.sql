-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrderStatus" ADD VALUE 'RESERVED';
ALTER TYPE "OrderStatus" ADD VALUE 'EXPIRED';

-- AlterTable
ALTER TABLE "UsernameOrder" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ALTER COLUMN "price" SET DATA TYPE BIGINT,
ALTER COLUMN "currency" SET DEFAULT 'NATIVE';

-- CreateTable
CREATE TABLE "UsernameTrade" (
    "id" TEXT NOT NULL,
    "usernameNormalized" TEXT NOT NULL,
    "sellerAchusrId" TEXT NOT NULL,
    "buyerAchusrId" TEXT NOT NULL,
    "price" BIGINT NOT NULL,
    "currency" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsernameTrade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UsernameTrade_usernameNormalized_idx" ON "UsernameTrade"("usernameNormalized");

-- CreateIndex
CREATE INDEX "UsernameTrade_sellerAchusrId_idx" ON "UsernameTrade"("sellerAchusrId");

-- CreateIndex
CREATE INDEX "UsernameTrade_buyerAchusrId_idx" ON "UsernameTrade"("buyerAchusrId");
