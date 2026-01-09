-- CreateEnum
CREATE TYPE "ExportFormat" AS ENUM ('JSON', 'JSONLD', 'PDF');

-- CreateTable
CREATE TABLE "ProfileExport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "format" "ExportFormat" NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1',
    "snapshot" JSONB NOT NULL,
    "snapshotHash" TEXT NOT NULL,
    "signatureType" TEXT NOT NULL,
    "signerAddress" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "storageProvider" "ProofStorageProvider" NOT NULL DEFAULT 'NONE',
    "storageKey" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "chainId" INTEGER,
    "anchorTxHash" TEXT,
    "anchorContract" TEXT,
    "anchoredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileExport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProfileExport_publicId_key" ON "ProfileExport"("publicId");

-- CreateIndex
CREATE INDEX "ProfileExport_userId_createdAt_idx" ON "ProfileExport"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ProfileExport_snapshotHash_idx" ON "ProfileExport"("snapshotHash");

-- AddForeignKey
ALTER TABLE "ProfileExport" ADD CONSTRAINT "ProfileExport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;
