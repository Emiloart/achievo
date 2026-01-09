"use client";
import { ReactNode, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { config } from "../lib/wagmi";

const queryClient = new QueryClient();

export function Web3Provider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Preload RainbowKit fonts/styles if needed
  }, []);
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
