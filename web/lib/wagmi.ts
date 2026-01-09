/**
 * Wagmi client configuration for web wallet connectivity.
 */
import { createConfig, http } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";

const baseRpc = process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";

/** Wagmi config used by the web wallet provider. */
export const config = createConfig({
  chains: [baseSepolia],
  connectors: [injected({ shimDisconnect: true })],
  transports: { [baseSepolia.id]: http(baseRpc) },
  ssr: false,
});
