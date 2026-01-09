-- CreateEnum
CREATE TYPE "OrgOnchainStatus" AS ENUM ('PENDING_CONFIRMATIONS', 'CONFIRMED', 'DROPPED_REORG', 'FAILED');

-- CreateEnum
CREATE TYPE "ChainActionType" AS ENUM ('ORG_CREATE', 'ANCHOR_PROOF', 'ANCHOR_VALIDATION', 'ANCHOR_EXPORT', 'ANCHOR_SUBMISSION', 'OTHER');

-- CreateEnum
CREATE TYPE "ChainActionStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED', 'DROPPED_REORG');

-- AlterTable
ALTER TABLE "Organization"
ADD COLUMN     "onchainChainId" INTEGER,
ADD COLUMN     "onchainCreationTxHash" TEXT,
ADD COLUMN     "onchainHandleHash" TEXT,
ADD COLUMN     "onchainStatus" "OrgOnchainStatus",
ADD COLUMN     "onchainBlockNumber" INTEGER,
ADD COLUMN     "onchainBlockHash" TEXT,
ADD COLUMN     "onchainConfirmedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ChainActionReceipt" (
    "id" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "type" "ChainActionType" NOT NULL,
    "txHash" TEXT NOT NULL,
    "status" "ChainActionStatus" NOT NULL,
    "fromAddress" TEXT,
    "toAddress" TEXT,
    "blockNumber" INTEGER,
    "blockHash" TEXT,
    "logIndex" INTEGER,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "finalizedAt" TIMESTAMP(3),
    "confirmationsRequired" INTEGER NOT NULL,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChainActionReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Organization_onchainCreationTxHash_idx" ON "Organization"("onchainCreationTxHash");

-- CreateIndex
CREATE UNIQUE INDEX "ChainActionReceipt_chainId_type_txHash_key" ON "ChainActionReceipt"("chainId", "type", "txHash");

-- CreateIndex
CREATE INDEX "ChainActionReceipt_status_chainId_idx" ON "ChainActionReceipt"("status", "chainId");

-- CreateIndex
CREATE INDEX "ChainActionReceipt_chainId_blockNumber_idx" ON "ChainActionReceipt"("chainId", "blockNumber");
