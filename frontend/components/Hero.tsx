"use client";
import { CHAIN, IS_DEPLOYED, DEPLOYMENT, CONTRACT_ADDRESS } from "@/lib/config";
import { shortAddr } from "@/lib/utils";

export function Hero({ address, onConnect }: { address: string | null; onConnect: () => void }) {
  const repo = "https://github.com/Artem1981777/genlayer-escrow-dapp";
  return (
    <section className="container pt-16 pb-14 text-center">
      <div className="mx-auto mb-5 w-fit rounded-full border border-white/10 px-3 py-1 text-xs text-[var(--color-muted)]">
        Trust-minimized escrow - powered by GenLayer Intelligent Contracts
      </div>
      <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight sm:text-6xl">
        AI-arbitrated <span className="gradient-text">escrow</span> for on-chain deals
      </h1>
      <p className="mx-auto mt-5 max-w-2xl text-base text-[var(--color-muted)] sm:text-lg">
        Lock funds in native GEN. When a dispute happens, an LLM arbiter reads the terms and evidence, verifies web sources, and returns a verdict validated by GenLayer's Equivalence Principle across independent validators.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button onClick={onConnect} className="btn-primary">{address ? shortAddr(address) : "Connect Wallet"}</button>
        <a className="btn-ghost" href={repo} target="_blank" rel="noreferrer">View source</a>
        {CONTRACT_ADDRESS && <a className="btn-ghost" href={CHAIN.explorer + "/address/" + CONTRACT_ADDRESS} target="_blank" rel="noreferrer">Contract</a>}
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs">
        <span className="rounded-full border border-white/10 px-3 py-1 text-[var(--color-muted)]">{CHAIN.name}</span>
        {IS_DEPLOYED
          ? <span className="rounded-full px-3 py-1" style={{ color: "var(--color-ok)", background: "color-mix(in srgb, var(--color-ok) 15%, transparent)" }}>v3 live</span>
          : <span className="rounded-full px-3 py-1" style={{ color: "var(--color-warn)", background: "color-mix(in srgb, var(--color-warn) 15%, transparent)" }}>v3 {DEPLOYMENT.status ?? "pending"}</span>}
      </div>
    </section>
  );
}
