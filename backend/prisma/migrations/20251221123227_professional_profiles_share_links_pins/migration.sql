-- CreateEnum
CREATE TYPE "Availability" AS ENUM ('OPEN_TO_WORK', 'OPEN_TO_COLLAB', 'NOT_AVAILABLE', 'UNSPECIFIED');

-- CreateEnum
CREATE TYPE "ShareLinkVisibility" AS ENUM ('PUBLIC', 'UNLISTED', 'DISABLED');

-- CreateEnum
CREATE TYPE "ShareLinkTheme" AS ENUM ('AUTO', 'LIGHT', 'DARK');

-- CreateEnum
CREATE TYPE "ProfilePinType" AS ENUM ('GOAL', 'BADGE', 'PARTY', 'CASE_STUDY');

-- CreateTable
CREATE TABLE "ProfessionalProfile" (
    "id" TEXT NOT NULL,
    "achusrId" TEXT NOT NULL,
    "headline" TEXT,
    "currentRole" TEXT,
    "currentOrg" TEXT,
    "location" TEXT,
    "timezone" TEXT,
    "bioShort" TEXT,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "industries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "availability" "Availability" NOT NULL DEFAULT 'UNSPECIFIED',
    "hourlyRateMin" DECIMAL(65,30),
    "hourlyRateMax" DECIMAL(65,30),
    "currency" TEXT,
    "websiteUrl" TEXT,
    "githubUrl" TEXT,
    "linkedinUrl" TEXT,
    "xUrl" TEXT,
    "portfolioUrl" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessionalProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileShareLink" (
    "id" TEXT NOT NULL,
    "achusrId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "visibility" "ShareLinkVisibility" NOT NULL DEFAULT 'UNLISTED',
    "sections" JSONB NOT NULL,
    "theme" "ShareLinkTheme" NOT NULL DEFAULT 'AUTO',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileShareLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfilePin" (
    "id" TEXT NOT NULL,
    "achusrId" TEXT NOT NULL,
    "type" "ProfilePinType" NOT NULL,
    "ref" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfilePin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalProfile_achusrId_key" ON "ProfessionalProfile"("achusrId");

-- CreateIndex
CREATE INDEX "ProfessionalProfile_achusrId_idx" ON "ProfessionalProfile"("achusrId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileShareLink_slug_key" ON "ProfileShareLink"("slug");

-- CreateIndex
CREATE INDEX "ProfileShareLink_achusrId_idx" ON "ProfileShareLink"("achusrId");

-- CreateIndex
CREATE INDEX "ProfilePin_achusrId_idx" ON "ProfilePin"("achusrId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfilePin_achusrId_type_ref_key" ON "ProfilePin"("achusrId", "type", "ref");
