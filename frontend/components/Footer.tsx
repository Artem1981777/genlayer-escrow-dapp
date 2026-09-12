import { CHAIN } from "@/lib/config";

export function Footer() {
  const repo = "https://github.com/Artem1981777/genlayer-escrow-dapp";
  const links = [
    { t: "GitHub", h: repo },
    { t: "Explorer", h: CHAIN.explorer },
    { t: "GenLayer Docs", h: "https://docs.genlayer.com" },
    { t: "Faucet", h: "https://testnet-faucet.genlayer.foundation" },
  ];
  return (
    <footer className="border-t border-white/10 py-10">
      <div className="container flex flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="text-sm text-[var(--color-muted)]">AIEscrowArbiter - trust-minimized AI escrow on GenLayer</div>
        <div className="flex flex-wrap gap-4 text-sm">
          {links.map((l) => (
            <a key={l.t} className="text-[var(--color-muted)] hover:text-white" href={l.h} target="_blank" rel="noreferrer">{l.t}</a>
          ))}
        </div>
      </div>
    </footer>
  );
}
