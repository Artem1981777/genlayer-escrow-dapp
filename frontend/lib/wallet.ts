"use client";
import { CHAIN } from "./config";

export type WalletState = { address: string | null; chainId: string | null };

function eth(): any {
  if (typeof window === "undefined") return null;
  return (window as any).ethereum ?? null;
}
export function hasWallet(): boolean { return !!eth(); }

export async function connectWallet(): Promise<string> {
  const e = eth();
  if (!e) throw new Error("No EVM wallet found. Install MetaMask.");
  const accounts: string[] = await e.request({ method: "eth_requestAccounts" });
  await ensureChain();
  return accounts[0];
}

export async function ensureChain(): Promise<void> {
  const e = eth();
  if (!e) return;
  try {
    await e.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CHAIN.hexId }] });
  } catch (err: any) {
    if (err?.code === 4902) {
      await e.request({ method: "wallet_addEthereumChain", params: [{ chainId: CHAIN.hexId, chainName: CHAIN.name, rpcUrls: [CHAIN.rpc], nativeCurrency: CHAIN.currency, blockExplorerUrls: [CHAIN.explorer] }] });
    } else { throw err; }
  }
}

export function onWalletEvents(cb: (s: WalletState) => void): void {
  const e = eth();
  if (!e?.on) return;
  e.on("accountsChanged", (a: string[]) => cb({ address: a[0] ?? null, chainId: null }));
  e.on("chainChanged", (c: string) => cb({ address: null, chainId: c }));
}
