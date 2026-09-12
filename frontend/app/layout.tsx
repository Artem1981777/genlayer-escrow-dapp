import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AIEscrowArbiter - Trust-minimized AI Escrow on GenLayer",
  description: "On-chain escrow holding native GEN, disputes resolved by a validator-run LLM under the GenLayer Equivalence Principle.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
