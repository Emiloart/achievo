-- CreateEnum
CREATE TYPE "OperationalAlertSeverity" AS ENUM ('INFO', 'WARN', 'CRITICAL');

-- CreateEnum
CREATE TYPE "OperationalAlertType" AS ENUM ('STUCK_CHAIN_ACTIONS', 'INDEXER_LAG', 'ANCHOR_BACKLOG', 'REORG_SPIKE', 'RPC_DOWN', 'CONFIG_MISMATCH');

-- CreateEnum
CREATE TYPE "ProjectionRebuildStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "ChainActionReceipt" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "AdminRequestNonce" (
    "id" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "ts" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminRequestNonce_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationalAlert" (
    "id" TEXT NOT NULL,
    "severity" "OperationalAlertSeverity" NOT NULL,
    "type" "OperationalAlertType" NOT NULL,
    "message" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperationalAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectionRebuildRun" (
    "id" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "fromBlock" INTEGER NOT NULL,
    "toBlock" INTEGER NOT NULL,
    "projectorKeys" JSONB,
    "status" "ProjectionRebuildStatus" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "stats" JSONB,

    CONSTRAINT "ProjectionRebuildRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminRequestNonce_nonce_key" ON "AdminRequestNonce"("nonce");

-- CreateIndex
CREATE INDEX "OperationalAlert_type_createdAt_idx" ON "OperationalAlert"("type", "createdAt");

-- CreateIndex
CREATE INDEX "OperationalAlert_severity_createdAt_idx" ON "OperationalAlert"("severity", "createdAt");
