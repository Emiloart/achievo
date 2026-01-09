-- CreateEnum
CREATE TYPE "PartyVisibility" AS ENUM ('PUBLIC', 'INVITE_ONLY', 'PRIVATE');

-- CreateEnum
CREATE TYPE "PartyMemberRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "PartyMemberStatus" AS ENUM ('ACTIVE', 'LEFT', 'KICKED');

-- CreateEnum
CREATE TYPE "PartyInviteStatus" AS ENUM ('ACTIVE', 'REVOKED', 'USED');

-- CreateEnum
CREATE TYPE "FollowStatus" AS ENUM ('ACTIVE', 'MUTED');

-- CreateEnum
CREATE TYPE "PartyFeedItemType" AS ENUM ('QUEST_CLAIMED', 'GOAL_VERIFIED', 'BADGE_MINTED', 'STREAK_MILESTONE');

-- CreateTable
CREATE TABLE "Party" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ownerAchusrId" TEXT NOT NULL,
    "visibility" "PartyVisibility" NOT NULL DEFAULT 'PUBLIC',
    "avatarUrl" TEXT,
    "bannerUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Party_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartyMember" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "achusrId" TEXT NOT NULL,
    "role" "PartyMemberRole" NOT NULL,
    "status" "PartyMemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartyMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartyInvite" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "creatorAchusrId" TEXT NOT NULL,
    "status" "PartyInviteStatus" NOT NULL DEFAULT 'ACTIVE',
    "maxUses" INTEGER,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "PartyInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFollow" (
    "id" TEXT NOT NULL,
    "followerAchusrId" TEXT NOT NULL,
    "followedAchusrId" TEXT NOT NULL,
    "status" "FollowStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserFollow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartyFeedItem" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "achusrId" TEXT NOT NULL,
    "type" "PartyFeedItemType" NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartyFeedItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserActivity" (
    "id" TEXT NOT NULL,
    "achusrId" TEXT NOT NULL,
    "type" "PartyFeedItemType" NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Party_slug_key" ON "Party"("slug");

-- CreateIndex
CREATE INDEX "Party_ownerAchusrId_idx" ON "Party"("ownerAchusrId");

-- CreateIndex
CREATE INDEX "PartyMember_partyId_idx" ON "PartyMember"("partyId");

-- CreateIndex
CREATE INDEX "PartyMember_achusrId_idx" ON "PartyMember"("achusrId");

-- CreateIndex
CREATE UNIQUE INDEX "PartyMember_partyId_achusrId_key" ON "PartyMember"("partyId", "achusrId");

-- CreateIndex
CREATE UNIQUE INDEX "PartyInvite_token_key" ON "PartyInvite"("token");

-- CreateIndex
CREATE INDEX "PartyInvite_partyId_idx" ON "PartyInvite"("partyId");

-- CreateIndex
CREATE INDEX "PartyInvite_creatorAchusrId_idx" ON "PartyInvite"("creatorAchusrId");

-- CreateIndex
CREATE INDEX "UserFollow_followerAchusrId_idx" ON "UserFollow"("followerAchusrId");

-- CreateIndex
CREATE INDEX "UserFollow_followedAchusrId_idx" ON "UserFollow"("followedAchusrId");

-- CreateIndex
CREATE UNIQUE INDEX "UserFollow_followerAchusrId_followedAchusrId_key" ON "UserFollow"("followerAchusrId", "followedAchusrId");

-- CreateIndex
CREATE INDEX "PartyFeedItem_partyId_createdAt_idx" ON "PartyFeedItem"("partyId", "createdAt");

-- CreateIndex
CREATE INDEX "PartyFeedItem_achusrId_idx" ON "PartyFeedItem"("achusrId");

-- CreateIndex
CREATE INDEX "UserActivity_achusrId_idx" ON "UserActivity"("achusrId");

-- AddForeignKey
ALTER TABLE "PartyMember" ADD CONSTRAINT "PartyMember_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyInvite" ADD CONSTRAINT "PartyInvite_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyFeedItem" ADD CONSTRAINT "PartyFeedItem_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
