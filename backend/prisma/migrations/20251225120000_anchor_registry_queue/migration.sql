-- CreateEnum
CREATE TYPE "AnchorJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED');

-- AlterTable
ALTER TABLE "ValidationAttestation" ADD COLUMN     "hashAlgo" TEXT NOT NULL DEFAULT 'EIP712_KECCAK256';

-- AlterTable
ALTER TABLE "MilestoneSubmission" ADD COLUMN     "chainId" INTEGER;

-- CreateTable
CREATE TABLE "AnchorJob" (
    "id" TEXT NOT NULL,
    "kind" INTEGER NOT NULL,
    "hash" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "status" "AnchorJobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "nextRunAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "anchorTxHash" TEXT,
    "anchorContract" TEXT,
    "anchoredAt" TIMESTAMP(3),
    "chainId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnchorJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AnchorJob_entityType_entityId_kind_hash_key" ON "AnchorJob"("entityType", "entityId", "kind", "hash");

-- CreateIndex
CREATE INDEX "AnchorJob_status_nextRunAt_idx" ON "AnchorJob"("status", "nextRunAt");

-- CreateIndex
CREATE INDEX "AnchorJob_kind_hash_idx" ON "AnchorJob"("kind", "hash");

-- CreateIndex
CREATE INDEX "AnchorJob_entityType_entityId_idx" ON "AnchorJob"("entityType", "entityId");
