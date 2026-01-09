/**
 * EIP-712 builder and verifier for username market orders.
 *
 * Ensures typed data is deterministic and signature recovery is stable across clients.
 */
import { BadRequestException, Injectable } from "@nestjs/common";
import { getAddress, hashTypedData, keccak256, recoverTypedDataAddress, toBytes } from "viem";
import { UsernamesChainService } from "./username-chain.service";

const DOMAIN_NAME = "AchievoUsernameMarket";
const DOMAIN_VERSION = "1";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const CURRENCY_HASH = keccak256(toBytes("ETH"));

const ORDER_TYPES = {
  Order: [
    { name: "orderType", type: "uint8" },
    { name: "maker", type: "address" },
    { name: "taker", type: "address" },
    { name: "handleHash", type: "bytes32" },
    { name: "priceWei", type: "uint256" },
    { name: "currencyHash", type: "bytes32" },
    { name: "nonce", type: "uint256" },
    { name: "salt", type: "uint256" },
    { name: "expiresAt", type: "uint64" },
  ],
};

const CANCEL_TYPES = {
  Cancel: [
    { name: "orderHash", type: "bytes32" },
    { name: "maker", type: "address" },
    { name: "nonce", type: "uint256" },
  ],
};

type OrderParams = {
  orderType: number;
  maker: string;
  taker?: string | null;
  handleHash: string;
  priceWei: bigint;
  currencyHash?: string | null;
  nonce: bigint;
  salt: bigint;
  expiresAt: bigint;
};

type CancelParams = {
  orderHash: string;
  maker: string;
  nonce: bigint;
};

function normalizeHash(raw: string) {
  const value = raw.startsWith("0x") ? raw : `0x${raw}`;
  return value.toLowerCase();
}

function toUint(value: string | number | bigint) {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(Math.floor(value));
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!/^\d+$/.test(trimmed)) throw new BadRequestException("INVALID_UINT");
    return BigInt(trimmed);
  }
  throw new BadRequestException("INVALID_UINT");
}

@Injectable()
/** Builds and verifies EIP-712 typed data for username orders. */
export class UsernameEip712Service {
  constructor(private readonly chain: UsernamesChainService) {}

  getDomain() {
    return {
      name: DOMAIN_NAME,
      version: DOMAIN_VERSION,
      chainId: this.chain.getChainId(),
      verifyingContract: this.chain.getRegistryAddress(),
    };
  }

  getCurrencyHash() {
    return CURRENCY_HASH.toLowerCase();
  }

  buildOrderTypedData(params: OrderParams) {
    const maker = getAddress(params.maker);
    const taker = params.taker ? getAddress(params.taker) : ZERO_ADDRESS;
    const handleHash = normalizeHash(params.handleHash);
    const currencyHash = normalizeHash(params.currencyHash || CURRENCY_HASH);
    if (currencyHash !== CURRENCY_HASH.toLowerCase()) {
      throw new BadRequestException("INVALID_CURRENCY");
    }

    return {
      domain: this.getDomain(),
      types: ORDER_TYPES,
      primaryType: "Order",
      message: {
        orderType: params.orderType,
        maker,
        taker,
        handleHash,
        priceWei: params.priceWei.toString(),
        currencyHash,
        nonce: params.nonce.toString(),
        salt: params.salt.toString(),
        expiresAt: params.expiresAt.toString(),
      },
    };
  }

  buildCancelTypedData(params: CancelParams) {
    const maker = getAddress(params.maker);
    const orderHash = normalizeHash(params.orderHash);
    return {
      domain: this.getDomain(),
      types: CANCEL_TYPES,
      primaryType: "Cancel",
      message: {
        orderHash,
        maker,
        nonce: params.nonce.toString(),
      },
    };
  }

  toHashable(typedData: any) {
    if (!typedData?.message) throw new BadRequestException("INVALID_TYPED_DATA");
    const message = { ...typedData.message };
    if (message.priceWei !== undefined) message.priceWei = toUint(message.priceWei);
    if (message.nonce !== undefined) message.nonce = toUint(message.nonce);
    if (message.salt !== undefined) message.salt = toUint(message.salt);
    if (message.expiresAt !== undefined) message.expiresAt = toUint(message.expiresAt);
    return {
      domain: typedData.domain,
      types: typedData.types,
      primaryType: typedData.primaryType,
      message,
    };
  }

  recoverSigner(typedData: any, signature: `0x${string}`) {
    const hashable = this.toHashable(typedData);
    return recoverTypedDataAddress({
      domain: hashable.domain,
      types: hashable.types,
      primaryType: hashable.primaryType,
      message: hashable.message,
      signature,
    });
  }

  hashTypedData(typedData: any) {
    const hashable = this.toHashable(typedData);
    return hashTypedData({
      domain: hashable.domain,
      types: hashable.types,
      primaryType: hashable.primaryType,
      message: hashable.message,
    });
  }
}
