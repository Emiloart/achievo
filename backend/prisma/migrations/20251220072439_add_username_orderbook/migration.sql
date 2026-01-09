-- CreateEnum
CREATE TYPE "UsernameStatus" AS ENUM ('ACTIVE', 'LOCKED');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('ASK', 'BID');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('OPEN', 'CANCELLED', 'FILLED');

-- CreateTable
CREATE TABLE "Username" (
    "id" TEXT NOT NULL,
    "achusrId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "usernameNormalized" TEXT NOT NULL,
    "status" "UsernameStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Username_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsernameOrder" (
    "id" TEXT NOT NULL,
    "usernameNormalized" TEXT NOT NULL,
    "type" "OrderType" NOT NULL,
    "makerAchusrId" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'DEMO',
    "status" "OrderStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsernameOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Username_usernameNormalized_key" ON "Username"("usernameNormalized");

-- CreateIndex
CREATE INDEX "Username_achusrId_idx" ON "Username"("achusrId");

-- CreateIndex
CREATE INDEX "Username_walletAddress_idx" ON "Username"("walletAddress");

-- CreateIndex
CREATE INDEX "UsernameOrder_usernameNormalized_idx" ON "UsernameOrder"("usernameNormalized");

-- CreateIndex
CREATE INDEX "UsernameOrder_makerAchusrId_idx" ON "UsernameOrder"("makerAchusrId");
