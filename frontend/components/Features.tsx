import { Bot, Coins, Globe, Scale, ShieldCheck, GitBranch } from "lucide-react";

const FEATURES = [
  { icon: Coins, title: "Native GEN escrow", body: "Funds are locked in the contract as native GEN and released only by contract rules - no custodian." },
  { icon: Bot, title: "LLM arbiter", body: "On dispute, an LLM reads terms + evidence and returns a structured verdict: RELEASE, REFUND or SPLIT." },
  { icon: Globe, title: "Verified web evidence", body: "Evidence URLs are fetched on-chain via gl.nondet.web so the arbiter reasons over real sources, not claims." },
  { icon: Scale, title: "Equivalence Principle", body: "Non-deterministic AI output is validated by independent validators, so the verdict is consensus-safe." },
  { icon: GitBranch, title: "Appeals & splits", body: "Losing party can appeal with a bond; verdicts support proportional SPLIT payouts in 5% steps." },
  { icon: ShieldCheck, title: "Guarded lifecycle", body: "Timeouts, role checks, fencing and a protocol fee cap keep every state transition safe." },
];

export function Features() {
  return (
    <section id="features" className="container py-16">
      <h2 className="text-center text-3xl font-bold">Why AIEscrowArbiter</h2>
      <p className="mx-auto mt-3 max-w-2xl text-center text-[var(--color-muted)]">Everything an intelligent escrow needs - implemented in the contract, not promised.</p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.title} className="card p-6">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: "color-mix(in srgb, var(--color-accent) 18%, transparent)", color: "var(--color-accent2)" }}>
                <Icon size={22} />
              </div>
              <div className="text-lg font-semibold">{f.title}</div>
              <div className="mt-2 text-sm text-[var(--color-muted)]">{f.body}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
