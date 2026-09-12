"use client";
import { StatusBadge } from "./StatusBadge";
import { shortAddr, weiToGen } from "@/lib/utils";

type Props = {
  e: any;
  address: string | null;
  busy: boolean;
  onAction: (label: string, fn: string, args: any[], value?: bigint) => void;
  onEvidence: (id: number) => void;
};

export function EscrowCard({ e, address, busy, onAction, onEvidence }: Props) {
  const me = (address || "").toLowerCase();
  const isBuyer = !!me && me === String(e.buyer || "").toLowerCase();
  const isSeller = !!me && me === String(e.seller || "").toLowerCase();
  const amt = BigInt(e.amount_wei ?? 0);
  const st = e.state as string;
  const id = Number(e.id);
  const btn = "rounded-lg px-3 py-1.5 text-xs font-semibold border border-[var(--color-accent)] disabled:opacity-40";
  const A = (label: string, fn: string, args: any[], value?: bigint) => (
    <button key={label} disabled={busy} onClick={() => onAction(label, fn, args, value)} className={btn}>{label}</button>
  );
  const actions: any[] = [];
  if (st === "CREATED" && isBuyer) actions.push(A("Fund", "fund", [id], amt));
  if (st === "FUNDED") {
    if (isBuyer) actions.push(A("Confirm delivery", "confirm_delivery", [id]));
    if (isBuyer || isSeller) actions.push(A("Open dispute", "open_dispute", [id]));
    actions.push(A("Claim timeout", "claim_timeout", [id]));
  }
  if (st === "DISPUTED") {
    if (isBuyer || isSeller) actions.push(<button key="ev" disabled={busy} onClick={() => onEvidence(id)} className={btn}>Submit evidence</button>);
    actions.push(A("Resolve", "resolve", [id]));
    actions.push(A("Claim timeout", "claim_timeout", [id]));
  }
  if (st === "RESOLVED") {
    actions.push(A("Appeal", "appeal", [id], amt));
    actions.push(A("Payout", "payout", [id]));
  }
  if (st === "APPEALED") actions.push(A("Resolve appeal", "resolve_appeal", [id]));
  return (
    <div className="rounded-2xl border border-white/10 bg-[var(--color-panel)] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-[var(--color-muted)]">#{id}</div>
          <div className="text-base font-semibold">{e.title || "Untitled escrow"}</div>
        </div>
        <StatusBadge state={st} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[var(--color-muted)]">
        <div>Buyer<br /><span className="text-white">{shortAddr(e.buyer)}</span></div>
        <div>Seller<br /><span className="text-white">{shortAddr(e.seller)}</span></div>
        <div>Amount<br /><span className="text-white">{weiToGen(amt)} GEN</span></div>
        <div>Verdict<br /><span className="text-white">{e.verdict || "-"}</span></div>
      </div>
      {actions.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
