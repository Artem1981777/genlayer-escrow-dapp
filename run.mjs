import { readFileSync, writeFileSync } from "node:fs";
import { createClient, createAccount } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";
const PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) { throw new Error("PRIVATE_KEY not found. Run: node --env-file=.env run.mjs"); }
const ADDRESS = readFileSync("contract.txt", "utf8").trim();
const AMOUNT_WEI = 1000000000000000n;
const account = createAccount(PRIVATE_KEY);
const client = createClient({ chain: testnetBradbury, account });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function retriable(msg) { msg = String(msg || "").toLowerCase(); return msg.includes("-32005") || msg.includes("capacity") || msg.includes("rate limit") || msg.includes("exceeds defined limit") || msg.includes("consensus contract") || msg.includes("evm tx"); }
function save(f, h) { writeFileSync(f, String(h)); }
async function readStr(fn) { return await client.readContract({ address: ADDRESS, functionName: fn, args: [] }); }
async function waitFinal(hash, label) {
  for (let i = 0; i < 80; i++) {
    let tx = null;
    try { tx = await client.getTransaction({ hash }); } catch (e) { await sleep(5000); continue; }
    const rn = String(tx?.txExecutionResultName || "");
    if (rn === "FINISHED" || rn === "FINISHED_WITH_RETURN") return tx;
    if (/ERROR|REVERT|ROLL|DISAGREE|UNDETERMIN/i.test(rn)) { throw new Error("execution failed for " + label + ": " + rn); }
    if (i % 5 === 0) console.log("  ...waiting finality for " + label + " (" + (rn || "pending") + ")");
    await sleep(6000);
  }
  throw new Error("timeout waiting finality for " + label);
}
async function submitWrite(functionName, args, value) {
  for (let attempt = 1; attempt <= 40; attempt++) {
    try {
      const hash = await client.writeContract({ address: ADDRESS, functionName, args, value: value || 0n });
      await client.waitForTransactionReceipt({ hash, status: TransactionStatus.ACCEPTED, retries: 300 });
      await waitFinal(hash, functionName);
      return hash;
    } catch (e) {
      const msg = e?.message || String(e);
      if (retriable(msg) && attempt < 40) { console.log("  retry " + functionName + " (" + attempt + ") after throttle: " + msg.slice(0, 80)); await sleep(8000); continue; }
      throw e;
    }
  }
}
async function main() {
  console.log("contract:", ADDRESS);
  console.log("state before:", await readStr("get_state"));
  const hFund = await submitWrite("fund", [], AMOUNT_WEI); save("fund-tx.txt", hFund); console.log("fund ->", hFund);
  console.log("state:", await readStr("get_state"));
  const hEv = await submitWrite("submit_evidence", ["BUYER: item delivered as described; tracking and screenshots attached."], 0n); save("evidence-buyer-tx.txt", hEv); console.log("buyer evidence ->", hEv);
  console.log("evidence:", await readStr("get_evidence"));
  const hRes = await submitWrite("resolve", [], 0n); save("resolve-tx.txt", hRes); console.log("resolve ->", hRes);
  console.log("status:", await readStr("get_status"));
  const hPay = await submitWrite("payout", [], 0n); save("payout-tx.txt", hPay); console.log("payout ->", hPay);
  console.log("state after payout:", await readStr("get_state"));
  let replaySafe = false;
  try { const h2 = await submitWrite("payout", [], 0n); console.log("!!! second payout unexpectedly succeeded ->", h2); }
  catch (e) { replaySafe = true; console.log("second payout correctly reverted:", (e?.message || String(e)).slice(0, 90)); }
  console.log("=== FINAL ===");
  console.log("state:", await readStr("get_state"));
  console.log("status:", await readStr("get_status"));
  console.log("replay_safe:", replaySafe);
  console.log(">>> ESCROW RUN COMPLETE");
}
main().catch((e) => { console.error("FATAL:", e?.message || e); process.exit(1); });
