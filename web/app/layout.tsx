import "../styles/globals.css";
import { ReactNode } from "react";
import { Web3Provider } from "../components/Web3Provider";
import { Toaster } from "react-hot-toast";
import { PageLayout } from "../components/layout/PageLayout";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">
        <Web3Provider>
          <PageLayout>{children}</PageLayout>
        </Web3Provider>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
