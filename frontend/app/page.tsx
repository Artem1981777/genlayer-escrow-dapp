"use client";
import { useCallback, useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { StatsBar } from "@/components/StatsBar";
import { EscrowCard } from "@/components/EscrowCard";
import { CreateEscrow } from "@/components/CreateEscrow";
import { CONTRACT_ADDRESS, IS_DEPLOYED, DEPLOYMENT } from "@/lib/config";
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
    <main className="mx-auto max-w-5xl px-4 pb-20">
      <Header address={address} onConnect={connect} />
      {!IS_DEPLOYED && (
        <div className="mt-4 rounded-xl border p-4 text-sm" style={{ borderColor: "var(--color-warn)", color: "var(--color-warn)", background: "color-mix(in srgb, var(--color-warn) 10%, transparent)" }}>
          v3 contract status: <b>{DEPLOYMENT.status ?? "not deployed"}</b>. Bradbury validators are not finalizing transactions yet; the dashboard will go live automatically once deployments.json holds the v3 address.
        </div>
      )}
      <div className="mt-6"><StatsBar stats={stats} /></div>
      {address && addr && <div className="mt-6"><CreateEscrow busy={busy} onCreate={create} /></div>}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {escrows.map((e) => (
          <EscrowCard key={String(e.id)} e={e} address={address} busy={busy} onAction={run} onEvidence={onEvidence} />
        ))}
      </div>
      {addr && escrows.length === 0 && (
        <div className="mt-6 text-center text-sm text-[var(--color-muted)]">No escrows yet. Create the first one above.</div>
      )}
      {msg && (
        <div className="fixed inset-x-0 bottom-4 mx-auto w-fit max-w-[90vw] truncate rounded-lg border border-white/10 bg-[var(--color-panel2)] px-4 py-2 text-xs" onClick={() => setMsg("")}>{msg}</div>
      )}
    </main>
  );
}
