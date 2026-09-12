"use client";
import { shortAddr } from "@/lib/utils";
import { IS_DEPLOYED, DEPLOYMENT, CHAIN } from "@/lib/config";

export function Header({ address, onConnect }: { address: string | null; onConnect: () => void }) {
  const okBg = "color-mix(in srgb, var(--color-ok) 15%, transparent)";
  const warnBg = "color-mix(in srgb, var(--color-warn) 15%, transparent)";
  return (
    <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
      <div className="flex items-center gap-3">
        <div className="text-lg font-bold tracking-tight">AI<span style={{ color: "var(--color-accent2)" }}>Escrow</span>Arbiter</div>
        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-[var(--color-muted)]">{CHAIN.name}</span>
        {IS_DEPLOYED
          ? <span className="rounded-full px-2 py-0.5 text-[11px]" style={{ color: "var(--color-ok)", background: okBg }}>v3 live</span>
          : <span className="rounded-full px-2 py-0.5 text-[11px]" style={{ color: "var(--color-warn)", background: warnBg }}>v3 {DEPLOYMENT.status ?? "not deployed"}</span>}
      </div>
      <button onClick={onConnect} className="rounded-lg px-4 py-2 text-sm font-semibold" style={{ background: address ? "transparent" : "var(--color-accent)", border: "1px solid var(--color-accent)" }}>
        {address ? shortAddr(address) : "Connect Wallet"}
      </button>
    </header>
  );
}
