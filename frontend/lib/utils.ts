import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

export function shortAddr(a?: string | null): string {
  if (!a) return "-";
  return a.slice(0, 6) + "..." + a.slice(-4);
}

export function weiToGen(wei: string | number | bigint): string {
  const v = BigInt(wei ?? 0);
  const whole = v / 10n ** 18n;
  const frac = (v % 10n ** 18n).toString().padStart(18, "0").slice(0, 4).replace(/0+$/, "");
  return frac ? whole + "." + frac : whole.toString();
}

export function genToWei(gen: string): bigint {
  const [w, f = ""] = gen.trim().split(".");
  const frac = (f + "0".repeat(18)).slice(0, 18);
  return BigInt(w || "0") * 10n ** 18n + BigInt(frac || "0");
}

export const STATE_META: Record<string, { label: string; color: string }> = {
  CREATED: { label: "Created", color: "var(--color-muted)" },
  FUNDED: { label: "Funded", color: "var(--color-accent2)" },
  DISPUTED: { label: "Disputed", color: "var(--color-warn)" },
  RESOLVED: { label: "Resolved", color: "var(--color-accent)" },
  APPEALED: { label: "Appealed", color: "var(--color-warn)" },
  PAID: { label: "Paid", color: "var(--color-ok)" },
};
