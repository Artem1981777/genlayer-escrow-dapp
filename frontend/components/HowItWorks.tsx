const STEPS = [
  { n: "01", t: "Create & fund", d: "Buyer or seller opens an escrow with terms and windows; the buyer funds it with native GEN." },
  { n: "02", t: "Deliver", d: "Seller delivers. On confirmation the buyer releases funds instantly - the happy path needs no AI." },
  { n: "03", t: "Dispute", d: "If something goes wrong, either party opens a dispute and both submit evidence with optional source URLs." },
  { n: "04", t: "AI arbitration", d: "An LLM leader proposes a verdict from terms + fetched evidence; validators re-run it under the Equivalence Principle." },
  { n: "05", t: "Resolve & appeal", d: "The verdict sets RELEASE / REFUND / SPLIT. The losing party may appeal once with a bond." },
  { n: "06", t: "Payout", d: "After the window, anyone can trigger payout; funds and any protocol fee settle on-chain." },
];

export function HowItWorks() {
  return (
    <section id="how" className="container py-16">
      <h2 className="text-center text-3xl font-bold">How it works</h2>
      <p className="mx-auto mt-3 max-w-2xl text-center text-[var(--color-muted)]">A full escrow lifecycle with AI arbitration only where it is actually needed.</p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STEPS.map((s) => (
          <div key={s.n} className="card p-6">
            <div className="text-sm font-bold" style={{ color: "var(--color-accent2)" }}>{s.n}</div>
            <div className="mt-2 text-lg font-semibold">{s.t}</div>
            <div className="mt-2 text-sm text-[var(--color-muted)]">{s.d}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
