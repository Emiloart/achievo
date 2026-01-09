// deployments/index.mjs (ESM)
// Directly export addresses and ABIs for ESM-based frontends (Vite/Next.js ESM).

import AchievoIdentity from "./abi/AchievoIdentity.json" assert { type: "json" };
import AchievoCore from "./abi/AchievoCore.json" assert { type: "json" };
import BadgeSBT from "./abi/BadgeSBT.json" assert { type: "json" };

// Duplicated here for convenience; keep in sync with index.ts
export const addresses = {
  baseSepolia: {
    AchievoIdentity: "",
    AchievoCore: "0xAdBf86ec7Acef2921e038883c6c04166851f0a16",
    BadgeSBT: "0x5E04f674BDa4b9429c408935C9D6aE0655eE7055",
  },
};

export const abi = {
  AchievoIdentity,
  AchievoCore,
  BadgeSBT,
};
