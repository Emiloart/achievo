import "../styles/globals.css";
import { ReactNode } from "react";
import { Web3Provider } from "../components/Web3Provider";
import { Toaster } from "react-hot-toast";
import { PageLayout } from "../components/layout/PageLayout";
import { LayoutInvariant } from "../components/layout/LayoutInvariant";
import { PolicyProvider } from "../components/policy/PolicyProvider";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">
        <Web3Provider>
          <PolicyProvider>
            <PageLayout>{children}</PageLayout>
            <LayoutInvariant />
          </PolicyProvider>
        </Web3Provider>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
