import "../styles/globals.css";
import { ReactNode, Suspense } from "react";
import { Web3Provider } from "../components/Web3Provider";
import { Toaster } from "react-hot-toast";
import { PageLayout } from "../components/layout/PageLayout";
import { LayoutInvariant } from "../components/layout/LayoutInvariant";
import { PolicyProvider } from "../components/policy/PolicyProvider";
import { CommandPalette } from "../components/command/CommandPalette";
import { SpotlightController } from "../components/theme/SpotlightController";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="theme-cinematic" data-theme="dark">
      <body className="font-sans theme-cinematic">
        <Web3Provider>
          <PolicyProvider>
            <Suspense fallback={null}>
              <PageLayout>{children}</PageLayout>
              <SpotlightController />
              <CommandPalette />
              <LayoutInvariant />
            </Suspense>
          </PolicyProvider>
        </Web3Provider>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
