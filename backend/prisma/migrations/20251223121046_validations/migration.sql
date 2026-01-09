-- CreateEnum
CREATE TYPE "ValidationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ValidatorType" AS ENUM ('INDIVIDUAL', 'ORGANIZATION');

-- CreateTable
CREATE TABLE "ValidatorProfile" (
    "id" TEXT NOT NULL,
    "type" "ValidatorType" NOT NULL,
    "displayName" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "userId" TEXT,
    "bio" TEXT,
    "website" TEXT,
    "verifiedByAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ValidatorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValidationRequest" (
    "id" TEXT NOT NULL,
    "claimantUserId" TEXT NOT NULL,
    "achievementId" TEXT,
    "badgeTokenId" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "evidenceLinks" JSONB,
    "requestedValidatorWallet" TEXT NOT NULL,
    "status" "ValidationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ValidationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValidationAttestation" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "validatorWallet" TEXT NOT NULL,
    "validatorProfileId" TEXT,
    "status" "ValidationStatus" NOT NULL,
    "message" TEXT,
    "score" INTEGER,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "domainName" TEXT NOT NULL DEFAULT 'Achievo',
    "domainVersion" TEXT NOT NULL DEFAULT '1',
    "chainId" INTEGER NOT NULL,
    "verifyingContract" TEXT,
    "nonce" TEXT NOT NULL,
    "typedData" JSONB NOT NULL,
    "signature" TEXT NOT NULL,
    "signerRecovered" TEXT NOT NULL,
    "attestationHash" TEXT,
    "anchorTxHash" TEXT,
    "anchorContract" TEXT,
    "anchoredAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ValidationAttestation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ValidatorProfile_walletAddress_key" ON "ValidatorProfile"("walletAddress");

-- CreateIndex
CREATE INDEX "ValidatorProfile_userId_idx" ON "ValidatorProfile"("userId");

-- CreateIndex
CREATE INDEX "ValidationRequest_claimantUserId_createdAt_idx" ON "ValidationRequest"("claimantUserId", "createdAt");

-- CreateIndex
CREATE INDEX "ValidationRequest_requestedValidatorWallet_status_idx" ON "ValidationRequest"("requestedValidatorWallet", "status");

-- CreateIndex
CREATE INDEX "ValidationRequest_badgeTokenId_idx" ON "ValidationRequest"("badgeTokenId");

-- CreateIndex
CREATE INDEX "ValidationRequest_achievementId_idx" ON "ValidationRequest"("achievementId");

-- CreateIndex
CREATE INDEX "ValidationAttestation_validatorWallet_idx" ON "ValidationAttestation"("validatorWallet");

-- CreateIndex
CREATE INDEX "ValidationAttestation_attestationHash_idx" ON "ValidationAttestation"("attestationHash");

-- CreateIndex
CREATE UNIQUE INDEX "ValidationAttestation_requestId_version_key" ON "ValidationAttestation"("requestId", "version");

-- AddForeignKey
ALTER TABLE "ValidationAttestation" ADD CONSTRAINT "ValidationAttestation_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ValidationRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
