-- CreateEnum
CREATE TYPE "QuestType" AS ENUM ('DAILY', 'WEEKLY', 'MILESTONE');

-- CreateEnum
CREATE TYPE "QuestEventType" AS ENUM ('DAILY_LOGIN', 'GOAL_CREATED', 'GOAL_VERIFIED', 'BADGE_MINTED');

-- CreateEnum
CREATE TYPE "UserQuestStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CLAIMED', 'EXPIRED');

-- CreateTable
CREATE TABLE "QuestTemplate" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "QuestType" NOT NULL,
    "triggerEvent" "QuestEventType" NOT NULL,
    "targetCount" INTEGER NOT NULL,
    "xpReward" INTEGER NOT NULL,
    "isUniquePerUser" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserQuest" (
    "id" TEXT NOT NULL,
    "achusrId" TEXT NOT NULL,
    "questTemplateId" TEXT NOT NULL,
    "periodKey" TEXT,
    "currentCount" INTEGER NOT NULL DEFAULT 0,
    "targetCount" INTEGER NOT NULL,
    "status" "UserQuestStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "claimedAt" TIMESTAMP(3),
    "lastProgressAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserQuest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserStreak" (
    "id" TEXT NOT NULL,
    "achusrId" TEXT NOT NULL,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastActiveDate" TIMESTAMP(3),
    "lastBreakDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserStreak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StreakMilestone" (
    "id" TEXT NOT NULL,
    "achusrId" TEXT NOT NULL,
    "threshold" INTEGER NOT NULL,
    "xpReward" INTEGER NOT NULL,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StreakMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestEventLog" (
    "id" TEXT NOT NULL,
    "achusrId" TEXT NOT NULL,
    "eventType" "QuestEventType" NOT NULL,
    "refType" TEXT NOT NULL,
    "refId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestEventLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuestTemplate_slug_key" ON "QuestTemplate"("slug");

-- CreateIndex
CREATE INDEX "UserQuest_achusrId_idx" ON "UserQuest"("achusrId");

-- CreateIndex
CREATE INDEX "UserQuest_questTemplateId_idx" ON "UserQuest"("questTemplateId");

-- CreateIndex
CREATE INDEX "UserQuest_periodKey_idx" ON "UserQuest"("periodKey");

-- CreateIndex
CREATE UNIQUE INDEX "UserQuest_achusrId_questTemplateId_periodKey_key" ON "UserQuest"("achusrId", "questTemplateId", "periodKey");

-- CreateIndex
CREATE UNIQUE INDEX "UserStreak_achusrId_key" ON "UserStreak"("achusrId");

-- CreateIndex
CREATE INDEX "StreakMilestone_achusrId_idx" ON "StreakMilestone"("achusrId");

-- CreateIndex
CREATE UNIQUE INDEX "StreakMilestone_achusrId_threshold_key" ON "StreakMilestone"("achusrId", "threshold");

-- CreateIndex
CREATE INDEX "QuestEventLog_achusrId_idx" ON "QuestEventLog"("achusrId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestEventLog_achusrId_eventType_refType_refId_key" ON "QuestEventLog"("achusrId", "eventType", "refType", "refId");

-- AddForeignKey
ALTER TABLE "UserQuest" ADD CONSTRAINT "UserQuest_questTemplateId_fkey" FOREIGN KEY ("questTemplateId") REFERENCES "QuestTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed quest templates
INSERT INTO "QuestTemplate" (
    "id",
    "slug",
    "title",
    "description",
    "type",
    "triggerEvent",
    "targetCount",
    "xpReward",
    "isUniquePerUser",
    "active",
    "sortOrder",
    "createdAt",
    "updatedAt"
) VALUES
  (
    'b6807515-0b4b-4671-ae8c-fa3cf23bd140',
    'daily-checkin',
    'Daily Check-in',
    'Open Achievo today to keep your streak alive.',
    'DAILY',
    'DAILY_LOGIN',
    1,
    10,
    false,
    true,
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    '0c12d1f8-8ca7-4919-9934-23a6e9cee348',
    'daily-log-goal-progress',
    'Log Goal Progress',
    'Create a new goal today to move your progress forward.',
    'DAILY',
    'GOAL_CREATED',
    1,
    12,
    false,
    true,
    2,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    '0c0fc847-2ef4-497a-b8eb-a805b7deda31',
    'weekly-complete-3-goals',
    'Weekly Momentum',
    'Get three goals verified this week.',
    'WEEKLY',
    'GOAL_VERIFIED',
    3,
    50,
    false,
    true,
    3,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'f36a5704-1eb6-4bd5-822c-b646d27ad41c',
    'milestone-first-verified-goal',
    'First Verified Goal',
    'Verify your first goal on-chain.',
    'MILESTONE',
    'GOAL_VERIFIED',
    1,
    100,
    true,
    true,
    4,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("slug") DO NOTHING;
