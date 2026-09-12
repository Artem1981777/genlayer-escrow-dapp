"use client";
import { useState } from "react";
import { genToWei } from "@/lib/utils";

export function CreateEscrow({ busy, onCreate }: { busy: boolean; onCreate: (args: any[]) => void }) {
  const [role, setRole] = useState("buyer");
  const [cp, setCp] = useState("");
  const [amount, setAmount] = useState("0.001");
  const [title, setTitle] = useState("");
  const [terms, setTerms] = useState("Deliver the agreed digital asset as described.");
  const dw = 259200, fw = 604800, aw = 172800;
  const inp = "w-full rounded-lg border border-white/10 bg-[var(--color-panel2)] px-3 py-2 text-sm outline-none";
  const submit = () => onCreate([cp.trim(), role, Number(genToWei(amount)), title.trim(), terms.trim(), dw, fw, aw]);
  return (
    <div className="rounded-2xl border border-white/10 bg-[var(--color-panel)] p-5">
      <div className="mb-3 text-base font-semibold">Create escrow</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <select value={role} onChange={(ev) => setRole(ev.target.value)} className={inp}>
          <option value="buyer">I am the buyer</option>
          <option value="seller">I am the seller</option>
        </select>
        <input value={cp} onChange={(ev) => setCp(ev.target.value)} placeholder="Counterparty 0x..." className={inp} />
        <input value={amount} onChange={(ev) => setAmount(ev.target.value)} placeholder="Amount (GEN)" className={inp} />
        <input value={title} onChange={(ev) => setTitle(ev.target.value)} placeholder="Title" className={inp} />
      </div>
      <textarea value={terms} onChange={(ev) => setTerms(ev.target.value)} rows={2} className={inp + " mt-3"} />
      <button disabled={busy} onClick={submit} className="mt-3 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-40" style={{ background: "var(--color-accent)" }}>Create</button>
    </div>
  );
}
