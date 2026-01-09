-- CreateEnum
CREATE TYPE "EndorsementTargetType" AS ENUM ('PROFILE', 'ACHIEVEMENT', 'BADGE', 'SKILL');

-- CreateEnum
CREATE TYPE "EndorsementStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateTable
CREATE TABLE "SkillTag" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkillTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSkill" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skillTagId" TEXT NOT NULL,
    "proficiency" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Endorsement" (
    "id" TEXT NOT NULL,
    "endorserUserId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "targetType" "EndorsementTargetType" NOT NULL,
    "targetId" TEXT,
    "message" TEXT,
    "status" "EndorsementStatus" NOT NULL DEFAULT 'ACTIVE',
    "endorserCredibilityScore" INTEGER NOT NULL,
    "endorserRiskScore" INTEGER NOT NULL,
    "computedWeight" INTEGER NOT NULL,
    "weightVersion" TEXT NOT NULL DEFAULT '1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "Endorsement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SkillTag_slug_key" ON "SkillTag"("slug");

-- CreateIndex
CREATE INDEX "SkillTag_displayName_idx" ON "SkillTag"("displayName");

-- CreateIndex
CREATE INDEX "UserSkill_userId_idx" ON "UserSkill"("userId");

-- CreateIndex
CREATE INDEX "UserSkill_skillTagId_idx" ON "UserSkill"("skillTagId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSkill_userId_skillTagId_key" ON "UserSkill"("userId", "skillTagId");

-- CreateIndex
CREATE INDEX "Endorsement_targetUserId_targetType_targetId_idx" ON "Endorsement"("targetUserId", "targetType", "targetId");

-- CreateIndex
CREATE INDEX "Endorsement_createdAt_idx" ON "Endorsement"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Endorsement_endorserUserId_targetUserId_targetType_targetId_key" ON "Endorsement"("endorserUserId", "targetUserId", "targetType", "targetId");
