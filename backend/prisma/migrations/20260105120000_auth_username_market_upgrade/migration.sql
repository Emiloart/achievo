-- Create enums for signed username marketplace
CREATE TYPE "UsernameOrderType" AS ENUM ('ASK', 'BID', 'OFFER');
CREATE TYPE "UsernameOrderStatus" AS ENUM ('OPEN', 'RESERVED', 'CANCELLED', 'CANCELED', 'FILLED', 'EXPIRED', 'INVALID');
CREATE TYPE "SettlementStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED', 'DROPPED_REORG');

-- Auth sessions + nonces
CREATE TABLE "AuthSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "refreshTokenFamilyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "ip" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuthNonce" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthNonce_pkey" PRIMARY KEY ("id")
);

-- Username ownership projection
CREATE TABLE "UsernameOwnership" (
    "id" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "handleHash" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "ownerAddress" TEXT NOT NULL,
    "updatedAtBlock" INTEGER,
    "txHash" TEXT,
    "removed" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsernameOwnership_pkey" PRIMARY KEY ("id")
);

-- Update username order enum types + add signed order fields
ALTER TABLE "UsernameOrder" ADD COLUMN     "normalized" TEXT,
ADD COLUMN     "handleHash" TEXT,
ADD COLUMN     "makerUserId" TEXT,
ADD COLUMN     "makerAddress" TEXT,
ADD COLUMN     "takerAddress" TEXT,
ADD COLUMN     "priceWei" TEXT,
ADD COLUMN     "nonce" TEXT,
ADD COLUMN     "salt" TEXT,
ADD COLUMN     "orderHash" TEXT,
ADD COLUMN     "typedData" JSONB,
ADD COLUMN     "signature" TEXT,
ADD COLUMN     "signerRecovered" TEXT;

ALTER TABLE "UsernameOrder" ALTER COLUMN "type" TYPE "UsernameOrderType" USING ("type"::text::"UsernameOrderType");
ALTER TABLE "UsernameOrder" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "UsernameOrder" ALTER COLUMN "status" TYPE "UsernameOrderStatus" USING ("status"::text::"UsernameOrderStatus");
ALTER TABLE "UsernameOrder" ALTER COLUMN "status" SET DEFAULT 'OPEN';

-- Update username trade for settlement tracking
ALTER TABLE "UsernameTrade" ADD COLUMN     "normalized" TEXT,
ADD COLUMN     "handleHash" TEXT,
ADD COLUMN     "askOrderId" TEXT,
ADD COLUMN     "bidOrderId" TEXT,
ADD COLUMN     "offerOrderId" TEXT,
ADD COLUMN     "sellerAddress" TEXT,
ADD COLUMN     "buyerAddress" TEXT,
ADD COLUMN     "priceWei" TEXT,
ADD COLUMN     "status" "SettlementStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "chainId" INTEGER,
ADD COLUMN     "blockNumber" INTEGER,
ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "UsernameTrade" ALTER COLUMN "txHash" DROP NOT NULL;

-- Indexes
CREATE INDEX "AuthSession_userId_idx" ON "AuthSession"("userId");
CREATE INDEX "AuthSession_walletAddress_idx" ON "AuthSession"("walletAddress");
CREATE INDEX "AuthSession_refreshTokenFamilyId_idx" ON "AuthSession"("refreshTokenFamilyId");
CREATE UNIQUE INDEX "AuthSession_refreshTokenHash_key" ON "AuthSession"("refreshTokenHash");
CREATE UNIQUE INDEX "AuthNonce_walletAddress_key" ON "AuthNonce"("walletAddress");
CREATE INDEX "AuthNonce_expiresAt_idx" ON "AuthNonce"("expiresAt");

CREATE UNIQUE INDEX "UsernameOwnership_chainId_handleHash_key" ON "UsernameOwnership"("chainId", "handleHash");
CREATE INDEX "UsernameOwnership_ownerAddress_idx" ON "UsernameOwnership"("ownerAddress");
CREATE INDEX "UsernameOwnership_normalized_idx" ON "UsernameOwnership"("normalized");

CREATE INDEX "UsernameOrder_handleHash_status_type_idx" ON "UsernameOrder"("handleHash", "status", "type");
CREATE INDEX "UsernameOrder_makerAddress_status_idx" ON "UsernameOrder"("makerAddress", "status");
CREATE UNIQUE INDEX "UsernameOrder_makerAddress_nonce_key" ON "UsernameOrder"("makerAddress", "nonce");

CREATE INDEX "UsernameTrade_handleHash_createdAt_idx" ON "UsernameTrade"("handleHash", "createdAt");
CREATE INDEX "UsernameTrade_status_createdAt_idx" ON "UsernameTrade"("status", "createdAt");

-- Drop legacy enums
DROP TYPE "OrderType";
DROP TYPE "OrderStatus";
