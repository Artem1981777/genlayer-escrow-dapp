import { readFileSync, writeFileSync } from "node:fs";
import { createClient, createAccount } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";
const buyer = createAccount(process.env.PRIVATE_KEY);
const seller = createAccount(readFileSync("seller-key.txt", "utf8").trim());
const sellerAddr = readFileSync("seller-addr.txt", "utf8").trim();
const cBuyer = createClient({ chain: testnetBradbury, account: buyer });
const cSeller = createClient({ chain: testnetBradbury, account: seller });
const AMOUNT_WEI = 1000000000000000n;
const TERMS = "Deliver the agreed digital asset to the buyer. RELEASE to seller if delivered as described; REFUND to buyer if not delivered or not as described.";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function retriable(msg) { msg = String(msg || "").toLowerCase(); return msg.includes("-32005") || msg.includes("capacity") || msg.includes("rate limit") || msg.includes("exceeds defined limit") || msg.includes("consensus contract") || msg.includes("evm tx"); }
async function waitFinal(client, hash, label) {
  for (let i = 0; i < 80; i++) {
    let tx = null;
    try { tx = await client.getTransaction({ hash }); } catch (e) { await sleep(5000); continue; }
    const rn = String(tx?.txExecutionResultName || "");
    if (rn === "FINISHED" || rn === "FINISHED_WITH_RETURN") return tx;
    if (/ERROR|REVERT|ROLL|DISAGREE|UNDETERMIN/i.test(rn)) throw new Error("execution failed for " + label + ": " + rn);
    if (i % 5 === 0) console.log("  ...waiting finality for " + label + " (" + (rn || "pending") + ")");
    await sleep(6000);
  }
  throw new Error("timeout waiting finality for " + label);
}
async function submitWrite(client, address, functionName, args, value) {
  for (let attempt = 1; attempt <= 40; attempt++) {
    try {
      const hash = await client.writeContract({ address, functionName, args, value: value || 0n });
      await client.waitForTransactionReceipt({ hash, status: TransactionStatus.ACCEPTED, retries: 300 });
      await waitFinal(client, hash, functionName);
      return hash;
    } catch (e) {
      const msg = e?.message || String(e);
      if (retriable(msg) && attempt < 40) { console.log("  retry " + functionName + " (" + attempt + "): " + msg.slice(0, 80)); await sleep(8000); continue; }
      throw e;
    }
  }
}
async function main() {
  console.log("buyer:", buyer.address, "| seller:", sellerAddr);
  const code = new TextEncoder().encode(readFileSync("contracts/escrow_arbiter.py", "utf8"));
  console.log("deploying escrow #2 ...");
  const dHash = await cBuyer.deployContract({ code, args: [sellerAddr, AMOUNT_WEI, TERMS] });
  await cBuyer.waitForTransactionReceipt({ hash: dHash, status: TransactionStatus.ACCEPTED, retries: 300 });
  const dtx = await cBuyer.getTransaction({ hash: dHash });
  const ADDRESS = dtx?.txDataDecoded?.contractAddress ?? dtx?.recipient;
  writeFileSync("contract2.txt", String(ADDRESS));
  console.log("deploy tx:", dHash);
  console.log("contract2:", ADDRESS);
  const readStr = async (fn) => await cBuyer.readContract({ address: ADDRESS, functionName: fn, args: [] });
  console.log("state:", await readStr("get_state"));
  const hFund = await submitWrite(cBuyer, ADDRESS, "fund", [], AMOUNT_WEI); writeFileSync("b-fund-tx.txt", hFund); console.log("fund ->", hFund);
  const hEvB = await submitWrite(cBuyer, ADDRESS, "submit_evidence", ["BUYER: item arrived damaged; photos attached, requesting refund."], 0n); writeFileSync("b-evidence-buyer-tx.txt", hEvB); console.log("buyer evidence ->", hEvB);
  const hEvS = await submitWrite(cSeller, ADDRESS, "submit_evidence", ["SELLER: item shipped intact and insured; carrier scan shows no damage."], 0n); writeFileSync("b-evidence-seller-tx.txt", hEvS); console.log("seller evidence ->", hEvS);
  console.log("evidence:", await readStr("get_evidence"));
  const hRes = await submitWrite(cBuyer, ADDRESS, "resolve", [], 0n); writeFileSync("b-resolve-tx.txt", hRes); console.log("resolve ->", hRes);
  console.log("status:", await readStr("get_status"));
  const hPay = await submitWrite(cBuyer, ADDRESS, "payout", [], 0n); writeFileSync("b-payout-tx.txt", hPay); console.log("payout ->", hPay);
  console.log("=== BOTH-PARTIES DONE ===");
  console.log("contract2:", ADDRESS);
  console.log("final status:", await readStr("get_status"));
  console.log(">>> BOTH RUN COMPLETE");
}
main().catch((e) => { console.error("FATAL:", e?.message || e); process.exit(1); });
