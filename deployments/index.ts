// deployments/index.ts
// Lightweight exports for addresses and ABI locations for frontend usage.

export type ContractNames = "AchievoIdentity" | "AchievoCore" | "BadgeSBT";

export type AddressBook = {
  [network: string]: Partial<Record<ContractNames, string>>;
};

// Known deployments. Update if you redeploy.
export const addresses: AddressBook = {
  baseSepolia: {
    AchievoIdentity: "",
    AchievoCore: "0xAdBf86ec7Acef2921e038883c6c04166851f0a16",
    BadgeSBT: "0x5E04f674BDa4b9429c408935C9D6aE0655eE7055",
  },
};

// ABI JSON file paths relative to project root.
export const abiPaths: Record<ContractNames, string> = {
  AchievoIdentity: "deployments/abi/AchievoIdentity.json",
  AchievoCore: "deployments/abi/AchievoCore.json",
  BadgeSBT: "deployments/abi/BadgeSBT.json",
};

export function getIdentityAddress(network: string): string | undefined {
  return addresses[network]?.AchievoIdentity;
}

export function getCoreAddress(network: string): string | undefined {
  return addresses[network]?.AchievoCore;
}

export function getBadgeAddress(network: string): string | undefined {
  return addresses[network]?.BadgeSBT;
}
