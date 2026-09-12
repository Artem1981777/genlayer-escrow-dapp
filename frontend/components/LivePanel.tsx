import { CHAIN, IS_DEPLOYED, DEPLOYMENT, CONTRACT_ADDRESS } from "@/lib/config";
import { shortAddr } from "@/lib/utils";

export function LivePanel() {
  const rows = [
    { k: "Network", v: CHAIN.name + " (chain " + CHAIN.id + ")" },
    { k: "Contract", v: CONTRACT_ADDRESS ? shortAddr(CONTRACT_ADDRESS) : "pending deploy" },
    { k: "Deploy status", v: DEPLOYMENT.status ?? "pending" },
    { k: "RPC", v: CHAIN.rpc },
  ];
  const explorerHref = CONTRACT_ADDRESS ? CHAIN.explorer + "/address/" + CONTRACT_ADDRESS : CHAIN.explorer;
  return (
    <section id="live" className="container py-16">
      <div className="card glow p-8">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-bold">Live contract</h2>
          <span className="rounded-full px-3 py-1 text-xs" style={IS_DEPLOYED ? { color: "var(--color-ok)", background: "color-mix(in srgb, var(--color-ok) 15%, transparent)" } : { color: "var(--color-warn)", background: "color-mix(in srgb, var(--color-warn) 15%, transparent)" }}>{IS_DEPLOYED ? "v3 live" : "v3 " + (DEPLOYMENT.status ?? "pending")}</span>
        </div>
        {!IS_DEPLOYED && (
          <p className="mt-3 text-sm text-[var(--color-warn)]">Bradbury validators are not finalizing transactions yet. The dApp below activates automatically once the v3 address is recorded - no code change needed.</p>
        )}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {rows.map((r) => (
            <div key={r.k} className="rounded-xl border border-white/10 bg-[var(--color-panel2)] p-4">
              <div className="text-xs text-[var(--color-muted)]">{r.k}</div>
              <div className="mt-1 break-all text-sm">{r.v}</div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <a className="btn-ghost" href={explorerHref} target="_blank" rel="noreferrer">Open explorer</a>
          <a className="btn-ghost" href="https://github.com/Artem1981777/genlayer-escrow-dapp/tree/main/docs/evidence/v3" target="_blank" rel="noreferrer">On-chain evidence</a>
        </div>
      </div>
    </section>
  );
}
