-- CreateEnum
CREATE TYPE "ProofKind" AS ENUM ('FILE', 'URL', 'TEXT');

-- CreateEnum
CREATE TYPE "ProofStorageProvider" AS ENUM ('S3', 'LOCAL', 'NONE');

-- CreateTable
CREATE TABLE "ProofArtifact" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "achievementId" TEXT,
    "badgeTokenId" TEXT,
    "kind" "ProofKind" NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "sourceUrl" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "storageProvider" "ProofStorageProvider" NOT NULL DEFAULT 'NONE',
    "storageKey" TEXT,
    "sha256" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "chainId" INTEGER,
    "anchorTxHash" TEXT,
    "anchorContract" TEXT,
    "anchoredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProofArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProofArtifact_userId_createdAt_idx" ON "ProofArtifact"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ProofArtifact_sha256_idx" ON "ProofArtifact"("sha256");

-- CreateIndex
CREATE INDEX "ProofArtifact_badgeTokenId_idx" ON "ProofArtifact"("badgeTokenId");

-- CreateIndex
CREATE INDEX "ProofArtifact_achievementId_idx" ON "ProofArtifact"("achievementId");

-- AddForeignKey
ALTER TABLE "ProofArtifact" ADD CONSTRAINT "ProofArtifact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;
