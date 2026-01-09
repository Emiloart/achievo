-- CreateEnum
CREATE TYPE "RiskSignalType" AS ENUM ('VELOCITY_BURST', 'REPETITIVE_ACTIONS', 'PROOF_REUSE', 'VALIDATION_COLLUSION', 'DEVICE_FINGERPRINT_MISMATCH', 'IP_CLUSTER', 'ACCOUNT_AGE_LOW', 'USERNAME_FLIP_ABUSE', 'DISPUTE_ABUSE', 'OTHER');

-- CreateEnum
CREATE TYPE "VisibilityLevel" AS ENUM ('PUBLIC', 'UNLISTED', 'PRIVATE');

-- CreateEnum
CREATE TYPE "RedactionMode" AS ENUM ('NONE', 'METADATA_ONLY', 'FULL');

-- CreateTable
CREATE TABLE "UserPrivacySettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "defaultProfileVisibility" "VisibilityLevel" NOT NULL DEFAULT 'PUBLIC',
    "showConsistency" BOOLEAN NOT NULL DEFAULT true,
    "defaultProofVisibility" "VisibilityLevel" NOT NULL DEFAULT 'PUBLIC',
    "defaultValidationVisibility" "VisibilityLevel" NOT NULL DEFAULT 'PUBLIC',
    "defaultAchievementVisibility" "VisibilityLevel" NOT NULL DEFAULT 'PUBLIC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPrivacySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentVisibilityOverride" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "visibility" "VisibilityLevel" NOT NULL,
    "redaction" "RedactionMode" NOT NULL DEFAULT 'NONE',
    "unlistedPublicId" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentVisibilityOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRiskProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "riskVersion" TEXT NOT NULL DEFAULT '1',
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "riskLevel" TEXT NOT NULL,
    "signals" JSONB NOT NULL,
    "lastEvaluatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserRiskProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskSignalEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "RiskSignalType" NOT NULL,
    "severity" INTEGER NOT NULL,
    "evidence" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskSignalEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserPrivacySettings_userId_key" ON "UserPrivacySettings"("userId");

-- CreateIndex
CREATE INDEX "UserPrivacySettings_userId_idx" ON "UserPrivacySettings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentVisibilityOverride_unlistedPublicId_key" ON "ContentVisibilityOverride"("unlistedPublicId");

-- CreateIndex
CREATE INDEX "ContentVisibilityOverride_ownerUserId_idx" ON "ContentVisibilityOverride"("ownerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentVisibilityOverride_ownerUserId_contentType_contentId_key" ON "ContentVisibilityOverride"("ownerUserId", "contentType", "contentId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRiskProfile_userId_key" ON "UserRiskProfile"("userId");

-- CreateIndex
CREATE INDEX "UserRiskProfile_userId_idx" ON "UserRiskProfile"("userId");

-- CreateIndex
CREATE INDEX "UserRiskProfile_riskScore_idx" ON "UserRiskProfile"("riskScore");

-- CreateIndex
CREATE INDEX "RiskSignalEvent_userId_type_createdAt_idx" ON "RiskSignalEvent"("userId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "RiskSignalEvent_type_idx" ON "RiskSignalEvent"("type");
