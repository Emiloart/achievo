/**
 * Indexer contract registry.
 *
 * Resolves contract addresses and ABIs for v1, v1.1, and optional registries.
 */
import AchievoCore from "../../../deployments/abi/AchievoCore.json";
import BadgeSBT from "../../../deployments/abi/BadgeSBT.json";
import {
  achievoCoreV11Abi,
  achievoBadgeV11Abi,
  achievoUsernameRegistryV1Abi,
  achievoOrgRegistryAbi,
  achievoAnchorRegistryAbi,
} from "../../../packages/achievo-abi";
import { ACHIEVO_CORE_ADDRESS, ACHIEVO_BADGE_ADDRESS } from "../config";
import { readAnchorRegistryDeployment, readDeploymentFile } from "../common/deployments";
import type { ContractConfig } from "./log.decoder";

function normalizeAddress(raw?: string | null): `0x${string}` | null {
  if (!raw) return null;
  const value = raw.startsWith("0x") ? raw : `0x${raw}`;
  return value as `0x${string}`;
}

function loadV11Address(envKey: string, fallbackFile: string): `0x${string}` | null {
  const env = normalizeAddress(process.env[envKey]);
  if (env) return env;
  const deployment = readDeploymentFile(fallbackFile);
  if (deployment?.address) return normalizeAddress(deployment.address);
  return null;
}

/** Loads contract configurations for indexer log decoding. */
export function loadIndexerContracts() {
  const contracts: ContractConfig[] = [];

  const coreV1 = normalizeAddress(process.env.CORE_ADDRESS || ACHIEVO_CORE_ADDRESS);
  const badgeV1 = normalizeAddress(process.env.BADGE_ADDRESS || ACHIEVO_BADGE_ADDRESS);
  if (coreV1) {
    contracts.push({ key: "core_v1", address: coreV1, abi: (AchievoCore as any).abi as any[] });
  }
  if (badgeV1) {
    contracts.push({ key: "badge_v1", address: badgeV1, abi: (BadgeSBT as any).abi as any[] });
  }

  const coreV11 = loadV11Address("NEXT_PUBLIC_ACHIEVO_CORE_V11_ADDRESS", "achievoCore.json");
  const badgeV11 = loadV11Address("NEXT_PUBLIC_ACHIEVO_BADGE_V11_ADDRESS", "achievoBadge.json");
  if (coreV11) {
    contracts.push({ key: "core_v11", address: coreV11, abi: achievoCoreV11Abi as any[] });
  }
  if (badgeV11) {
    contracts.push({ key: "badge_v11", address: badgeV11, abi: achievoBadgeV11Abi as any[] });
  }

  const orgRegistry = normalizeAddress(process.env.ORG_REGISTRY_ADDRESS) ||
    loadV11Address("ORG_REGISTRY_ADDRESS", "orgRegistry.json");
  if (orgRegistry) {
    contracts.push({ key: "org_registry", address: orgRegistry, abi: achievoOrgRegistryAbi as any[] });
  }

  const anchorDeployment = readAnchorRegistryDeployment();
  const anchorRegistry = normalizeAddress(process.env.ANCHOR_REGISTRY_ADDRESS) ||
    normalizeAddress(anchorDeployment?.address);
  if (anchorRegistry) {
    contracts.push({ key: "anchor_registry", address: anchorRegistry, abi: achievoAnchorRegistryAbi as any[] });
  }

  const usernameRegistry =
    normalizeAddress(process.env.USERNAME_REGISTRY_ADDRESS) ||
    normalizeAddress(process.env.ACHIEVO_USERNAME_REGISTRY_ADDRESS) ||
    normalizeAddress(process.env.NEXT_PUBLIC_ACHIEVO_USERNAME_REGISTRY_ADDRESS);
  if (usernameRegistry) {
    contracts.push({ key: "username_registry", address: usernameRegistry, abi: achievoUsernameRegistryV1Abi as any[] });
  }

  return contracts;
}
