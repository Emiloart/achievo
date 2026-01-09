/**
 * Client-side contract address and ABI registry.
 *
 * Reads addresses from NEXT_PUBLIC_* to avoid runtime secret access in the browser.
 */
import AchievoIdentity from "../../deployments/abi/AchievoIdentity.json" assert { type: "json" };
import type { Abi } from "viem";

// Use shared ABIs from the package and resolve addresses from NEXT_PUBLIC_* at build/runtime.
const {
  achievoCoreV11Abi,
  achievoBadgeV11Abi,
  achievoUsernameRegistryV1Abi,
  achievoOrgRegistryAbi,
} = require("../../packages/achievo-abi/index.cjs");

/** Identity contract address (NEXT_PUBLIC_IDENTITY_ADDRESS). */
export const identityAddress = (process.env.NEXT_PUBLIC_IDENTITY_ADDRESS || "") as `0x${string}`;
/** Core contract address (NEXT_PUBLIC_ACHIEVO_CORE_V11_ADDRESS). */
export const coreAddress = (process.env.NEXT_PUBLIC_ACHIEVO_CORE_V11_ADDRESS || "") as `0x${string}`;
/** Badge contract address (NEXT_PUBLIC_ACHIEVO_BADGE_V11_ADDRESS). */
export const badgeAddress = (process.env.NEXT_PUBLIC_ACHIEVO_BADGE_V11_ADDRESS || "") as `0x${string}`;
/** Username registry address (NEXT_PUBLIC_ACHIEVO_USERNAME_REGISTRY_ADDRESS). */
export const usernameRegistryAddress = (process.env.NEXT_PUBLIC_ACHIEVO_USERNAME_REGISTRY_ADDRESS ||
  "") as `0x${string}`;
/** Org registry address (NEXT_PUBLIC_ACHIEVO_ORG_REGISTRY_ADDRESS). */
export const orgRegistryAddress = (process.env.NEXT_PUBLIC_ACHIEVO_ORG_REGISTRY_ADDRESS || "") as `0x${string}`;

/** Identity ABI used for profile reads/writes. */
export const identityAbi = AchievoIdentity.abi as Abi;
/** Achievo core ABI for goal operations. */
export const coreAbi = achievoCoreV11Abi as Abi;
/** Badge ABI for badge reads. */
export const badgeAbi = achievoBadgeV11Abi as Abi;
/** Username registry ABI for handle operations. */
export const usernameRegistryAbi = achievoUsernameRegistryV1Abi as Abi;
/** Org registry ABI for on-chain org creation. */
export const orgRegistryAbi = achievoOrgRegistryAbi as Abi;
