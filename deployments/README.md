# Deployments and ABIs

This repo now uses shared packages for contract addresses and ABIs:

- `packages/achievo-config` (addresses + RPC)
- `packages/achievo-abi` (ABIs)

The `deployments/` folder is retained for legacy reference only.

## Base Sepolia (v1.1)

- AchievoCoreV11: `0x4c3397505Ebc1d517237B5336610951e42209656`
- AchievoBadgeV11: `0x13Dd9D0DF3b84A70D7E0CE449aDEBFb308215aC7`
- AchievoIdentity: `0x5BE61bF52AE08790355232F7114f4DBD2dd0848d`
- AchievoUsernameRegistryV1: `0x386CddDf734008f836437dE968D275f702565437`

## Usage (Backend/Frontend)

```ts
import {
  BASE_SEPOLIA_RPC,
  ACHIEVO_CORE_V11_ADDRESS,
  ACHIEVO_BADGE_V11_ADDRESS,
  ACHIEVO_IDENTITY_ADDRESS,
  ACHIEVO_USERNAME_REGISTRY_ADDRESS,
} from "packages/achievo-config";

import {
  achievoCoreV11Abi,
  achievoBadgeV11Abi,
  achievoUsernameRegistryV1Abi,
} from "packages/achievo-abi";
```

If you need to refresh ABI files for the shared package, regenerate them from the Hardhat artifacts and update `packages/achievo-abi`.
