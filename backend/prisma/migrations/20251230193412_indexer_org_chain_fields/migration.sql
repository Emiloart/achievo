-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "chainId" INTEGER,
ADD COLUMN     "creationTxHash" TEXT,
ADD COLUMN     "handleHash" TEXT,
ADD COLUMN     "onchainCreator" TEXT,
ADD COLUMN     "onchainCreatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ChainCursor" (
    "id" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "latestProcessedBlock" INTEGER NOT NULL,
    "latestProcessedBlockHash" TEXT,
    "latestFinalizedBlock" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChainCursor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChainLog" (
    "id" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "blockNumber" INTEGER NOT NULL,
    "blockHash" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "logIndex" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "topic0" TEXT NOT NULL,
    "topic1" TEXT,
    "topic2" TEXT,
    "topic3" TEXT,
    "data" TEXT NOT NULL,
    "removed" BOOLEAN NOT NULL DEFAULT false,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChainLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DecodedEvent" (
    "id" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "contractKey" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "blockNumber" INTEGER NOT NULL,
    "txHash" TEXT NOT NULL,
    "logIndex" INTEGER NOT NULL,
    "args" JSONB NOT NULL,
    "eventId" TEXT NOT NULL,
    "removed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DecodedEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectionCursor" (
    "id" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "projectorKey" TEXT NOT NULL,
    "lastProcessedBlock" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectionCursor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegacyBadgeOwnership" (
    "id" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "ownerAddress" TEXT NOT NULL,
    "lastUpdatedEventId" TEXT NOT NULL,
    "removed" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegacyBadgeOwnership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegacyOwnerBadgeToken" (
    "id" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "ownerAddress" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegacyOwnerBadgeToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegacyGoal" (
    "id" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "creatorAddress" TEXT NOT NULL,
    "goalCid" TEXT,
    "evidenceCid" TEXT,
    "level" INTEGER,
    "approvals" INTEGER,
    "verified" BOOLEAN,
    "badgeMinted" BOOLEAN,
    "peersRestricted" BOOLEAN,
    "autoVerifier" TEXT,
    "autoDataHash" TEXT,
    "autoVerifiedAt" TIMESTAMP(3),
    "createdAtBlock" INTEGER,
    "createdAtTxHash" TEXT,
    "createdAt" TIMESTAMP(3),
    "lastUpdatedEventId" TEXT,
    "removed" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegacyGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegacyGoalEvidence" (
    "id" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "evidenceCid" TEXT NOT NULL,
    "submitter" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "blockNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "eventId" TEXT NOT NULL,
    "removed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "LegacyGoalEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegacyGoalApproval" (
    "id" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "approver" TEXT NOT NULL,
    "approvals" INTEGER NOT NULL,
    "txHash" TEXT NOT NULL,
    "blockNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "eventId" TEXT NOT NULL,
    "removed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "LegacyGoalApproval_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_handleHash_key" ON "Organization"("handleHash");

-- CreateIndex
CREATE INDEX "Organization_creationTxHash_idx" ON "Organization"("creationTxHash");

-- CreateIndex
CREATE UNIQUE INDEX "ChainCursor_chainId_key" ON "ChainCursor"("chainId");

-- CreateIndex
CREATE UNIQUE INDEX "ChainLog_chainId_txHash_logIndex_key" ON "ChainLog"("chainId", "txHash", "logIndex");

-- CreateIndex
CREATE INDEX "ChainLog_chainId_blockNumber_idx" ON "ChainLog"("chainId", "blockNumber");

-- CreateIndex
CREATE INDEX "ChainLog_chainId_address_idx" ON "ChainLog"("chainId", "address");

-- CreateIndex
CREATE UNIQUE INDEX "DecodedEvent_eventId_key" ON "DecodedEvent"("eventId");

-- CreateIndex
CREATE INDEX "DecodedEvent_chainId_contractKey_eventName_blockNumber_idx" ON "DecodedEvent"("chainId", "contractKey", "eventName", "blockNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectionCursor_chainId_projectorKey_key" ON "ProjectionCursor"("chainId", "projectorKey");

-- CreateIndex
CREATE UNIQUE INDEX "LegacyBadgeOwnership_chainId_contractAddress_tokenId_key" ON "LegacyBadgeOwnership"("chainId", "contractAddress", "tokenId");

-- CreateIndex
CREATE INDEX "LegacyBadgeOwnership_ownerAddress_idx" ON "LegacyBadgeOwnership"("ownerAddress");

-- CreateIndex
CREATE UNIQUE INDEX "LegacyOwnerBadgeToken_chainId_contractAddress_ownerAddress_tokenId_key" ON "LegacyOwnerBadgeToken"("chainId", "contractAddress", "ownerAddress", "tokenId");

-- CreateIndex
CREATE INDEX "LegacyOwnerBadgeToken_ownerAddress_idx" ON "LegacyOwnerBadgeToken"("ownerAddress");

-- CreateIndex
CREATE INDEX "LegacyOwnerBadgeToken_tokenId_idx" ON "LegacyOwnerBadgeToken"("tokenId");

-- CreateIndex
CREATE UNIQUE INDEX "LegacyGoal_chainId_contractAddress_goalId_key" ON "LegacyGoal"("chainId", "contractAddress", "goalId");

-- CreateIndex
CREATE INDEX "LegacyGoal_creatorAddress_idx" ON "LegacyGoal"("creatorAddress");

-- CreateIndex
CREATE UNIQUE INDEX "LegacyGoalEvidence_eventId_key" ON "LegacyGoalEvidence"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "LegacyGoalApproval_eventId_key" ON "LegacyGoalApproval"("eventId");

-- CreateIndex
CREATE INDEX "LegacyGoalApproval_goalId_idx" ON "LegacyGoalApproval"("goalId");

-- CreateIndex
CREATE INDEX "LegacyGoalApproval_approver_idx" ON "LegacyGoalApproval"("approver");
