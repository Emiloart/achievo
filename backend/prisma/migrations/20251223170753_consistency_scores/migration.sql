-- CreateEnum
CREATE TYPE "ActivityEventType" AS ENUM ('CHECKIN', 'TASK_STARTED', 'TASK_COMPLETED', 'BADGE_MINTED', 'PROOF_ADDED', 'VALIDATION_APPROVED', 'VALIDATION_REJECTED');

-- CreateTable
CREATE TABLE "UserActivityEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ActivityEventType" NOT NULL,
    "refId" TEXT,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserActivityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserConsistencyScore" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scoreVersion" TEXT NOT NULL DEFAULT '1',
    "streakDays" INTEGER NOT NULL DEFAULT 0,
    "bestStreakDays" INTEGER NOT NULL DEFAULT 0,
    "streakScore" INTEGER NOT NULL DEFAULT 0,
    "reliabilityScore" INTEGER NOT NULL DEFAULT 0,
    "anomalyScore" INTEGER NOT NULL DEFAULT 0,
    "credibilityScore" INTEGER NOT NULL DEFAULT 0,
    "lastActiveDay" TIMESTAMP(3),
    "computedAt" TIMESTAMP(3) NOT NULL,
    "explanations" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserConsistencyScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserActivityEvent_userId_occurredAt_idx" ON "UserActivityEvent"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "UserActivityEvent_userId_type_occurredAt_idx" ON "UserActivityEvent"("userId", "type", "occurredAt");

-- CreateIndex
CREATE INDEX "UserActivityEvent_refId_idx" ON "UserActivityEvent"("refId");

-- CreateIndex
CREATE UNIQUE INDEX "UserConsistencyScore_userId_key" ON "UserConsistencyScore"("userId");

-- CreateIndex
CREATE INDEX "UserConsistencyScore_userId_idx" ON "UserConsistencyScore"("userId");
