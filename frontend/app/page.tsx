"use client";
import { useCallback, useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { HowItWorks } from "@/components/HowItWorks";
import { LivePanel } from "@/components/LivePanel";
import { Footer } from "@/components/Footer";
import { StatsBar } from "@/components/StatsBar";
import { EscrowCard } from "@/components/EscrowCard";
import { CreateEscrow } from "@/components/CreateEscrow";
import { CONTRACT_ADDRESS, DEPLOYMENT, CHAIN } from "@/lib/config";
import { connectWallet, onWalletEvents } from "@/lib/wallet";
import { readView, writeTx } from "@/lib/gl";

export default function Page() {
  const [address, setAddress] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [escrows, setEscrows] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");
  const addr = CONTRACT_ADDRESS;

  const refresh = useCallback(async () => {
    if (!addr) return;
    try {
      setStats(await readView(addr, "get_stats", []));
      const list = await readView(addr, "list_escrows", []);
      setEscrows(Array.isArray(list?.items) ? list.items : []);
    } catch (e: any) { setMsg("Load failed: " + (e?.message || e)); }
  }, [addr]);

  useEffect(() => { refresh(); onWalletEvents((w) => setAddress(w.address)); }, [refresh]);

  const connect = async () => {
    try { setAddress(await connectWallet()); } catch (e: any) { setMsg(e?.message || String(e)); }
  };

  const run = async (label: string, fn: string, args: any[], value: bigint = 0n) => {
    if (!addr) return;
    if (!address) { setMsg("Connect your wallet first"); return; }
    setBusy(true); setMsg(label + "...");
    try {
      const hash = await writeTx(addr, address, fn, args, value);
      setMsg(label + " OK: " + hash);
      await refresh();
    } catch (e: any) { setMsg(label + " failed: " + (e?.message || e)); }
    finally { setBusy(false); }
  };

  const onEvidence = async (id: number) => {
    const content = window.prompt("Evidence text (facts, <=2000 chars):", "");
    if (content == null) return;
    const url = window.prompt("Optional source URL (empty to skip):", "") || "";
    await run("Submit evidence", "submit_evidence", [id, content, url]);
  };

  const create = async (args: any[]) => { await run("Create escrow", "create_escrow", args, 0n); };

  return (
    <>
      <Header address={address} onConnect={connect} />
      <Hero address={address} onConnect={connect} />
      <Features />
      <HowItWorks />
      <section id="app" className="container py-16">
        <h2 className="text-center text-3xl font-bold">Escrow dashboard</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-[var(--color-muted)]">Create and manage escrows directly against the on-chain contract.</p>
        {!addr ? (
          <div className="card mt-10 p-8 text-center">
            <div className="text-lg font-semibold" style={{ color: "var(--color-warn)" }}>dApp activates when v3 is live</div>
            <p className="mx-auto mt-2 max-w-xl text-sm text-[var(--color-muted)]">The v3 contract deploy is {DEPLOYMENT.status ?? "pending"} on {CHAIN.name}. Once the address is recorded, this dashboard becomes fully interactive - the site does not need a redeploy.</p>
          </div>
        ) : (
          <>
            <div className="mt-10"><StatsBar stats={stats} /></div>
            {address
              ? <div className="mt-6"><CreateEscrow busy={busy} onCreate={create} /></div>
              : <div className="card mt-6 p-6 text-center text-sm text-[var(--color-muted)]">Connect your wallet to create an escrow.</div>}
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {escrows.map((e) => (
                <EscrowCard key={String(e.id)} e={e} address={address} busy={busy} onAction={run} onEvidence={onEvidence} />
              ))}
            </div>
            {escrows.length === 0 && <div className="mt-6 text-center text-sm text-[var(--color-muted)]">No escrows yet. Create the first one above.</div>}
          </>
        )}
      </section>
      <LivePanel />
      <Footer />
      {msg && (
        <div className="fixed inset-x-0 bottom-4 mx-auto w-fit max-w-[90vw] truncate rounded-lg border border-white/10 bg-[var(--color-panel2)] px-4 py-2 text-xs" onClick={() => setMsg("")}>{msg}</div>
      )}
    </>
  );
}
