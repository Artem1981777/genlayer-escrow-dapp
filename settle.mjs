import { readFileSync } from "node:fs";
import { createClient, createAccount } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
const account = createAccount(process.env.PRIVATE_KEY);
const client = createClient({ chain: testnetBradbury, account });
const ADDRESS = readFileSync("contract.txt", "utf8").trim();
const SELLER = "0xdc6778C5F8cC74b10aED11c48306D4Cfc5737FBD";
const PAYOUT = readFileSync("payout-tx.txt", "utf8").trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sb0 = await client.getBalance({ address: SELLER });
console.log("seller balance (start):", sb0.toString());
let done = false;
for (let i = 0; i < 60; i++) {
  let st = "";
  try { const tx = await client.getTransaction({ hash: PAYOUT }); st = String(tx?.statusName || ""); } catch (e) { st = "err"; }
  const cb = await client.getBalance({ address: ADDRESS });
  console.log("i=" + i, "payout:", st, "| contract balance:", cb.toString());
  if (cb.toString() === "0") { done = true; break; }
  await sleep(10000);
}
const cb = await client.getBalance({ address: ADDRESS });
const sb = await client.getBalance({ address: SELLER });
console.log("=== SETTLED CHECK ===");
console.log("contract balance:", cb.toString());
console.log("seller balance (start):", sb0.toString());
console.log("seller balance (now)  :", sb.toString());
console.log("seller delta:", (sb - sb0).toString());
console.log("settled:", done);
