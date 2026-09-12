"use client";
import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

let reader: any = null;
export function getReader(): any {
  if (!reader) reader = createClient({ chain: testnetBradbury });
  return reader;
}

function provider(): any {
  if (typeof window === "undefined") return null;
  const w = window as any;
  if (!w.ethereum) return null;
  const list = w.ethereum.providers?.length ? w.ethereum.providers : [w.ethereum];
  return list.find((p: any) => p.isMetaMask) ?? list[0];
}

export function getSigner(address: string): any {
  const p = provider();
  if (!p) throw new Error("No wallet provider");
  return createClient({ chain: testnetBradbury, account: address.toLowerCase() as any, provider: p });
}

export async function readView(address: string, functionName: string, args: any[] = []): Promise<any> {
  const raw = await getReader().readContract({ address, functionName, args });
  try { return typeof raw === "string" ? JSON.parse(raw) : raw; } catch { return raw; }
}

export async function writeTx(address: string, signerAddr: string, functionName: string, args: any[] = [], value: bigint = 0n): Promise<string> {
  const signer = getSigner(signerAddr);
  const hash = await signer.writeContract({ address, functionName, args, value });
  await signer.waitForTransactionReceipt({ hash, status: TransactionStatus.ACCEPTED, retries: 60 });
  return hash;
}
