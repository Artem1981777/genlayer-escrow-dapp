// seed.mjs - deploy demo AIEscrowArbiter v2 instances in different states for the dApp.
import { readFileSync, writeFileSync } from "node:fs";
import { createClient, createAccount } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

const PK = process.env.PRIVATE_KEY;
if (!PK) { throw new Error("PRIVATE_KEY missing. Run: node --env-file=.env seed.mjs"); }
const buyer = createAccount(PK);
const sellerAddr = readFileSync("seller-addr.txt", "utf8").trim();
const client = createClient({ chain: testnetBradbury, account: buyer });
const code = new TextEncoder().encode(readFileSync("contracts/escrow_arbiter.py", "utf8"));

const AMOUNT = 1000000000000000n;
const TERMS = "Deliver the agreed digital asset. RELEASE to seller if delivered as described; REFUND to buyer otherwise.";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function finalOf(hash){
  for (let i=0;i<100;i++){
    const t = await client.getTransaction({ hash });
    const r = t?.txExecutionResultName;
    if (r && r !== "NOT_VOTED") return r;
    await sleep(3000);
  }
  return "NOT_VOTED";
}

async function tx(address, fn, args, value=0n){
  const hash = await client.writeContract({ address, functionName: fn, args, value });
  await client.waitForTransactionReceipt({ hash, status: TransactionStatus.ACCEPTED, retries: 300 });
  const r = await finalOf(hash);
  if (r === "FINISHED_WITH_ERROR") throw new Error(fn + " reverted");
  return hash;
}
async function deploy(dispute, finalW, appeal){
  const hash = await client.deployContract({ code, args: [sellerAddr, AMOUNT, TERMS, dispute, finalW, appeal] });
  await client.waitForTransactionReceipt({ hash, status: TransactionStatus.ACCEPTED, retries: 300 });
  const t = await client.getTransaction({ hash });
  return t?.txDataDecoded?.contractAddress ?? t?.recipient;
}

async function main(){
  const out = {};
  console.log("seeding FUNDED demo...");
  out.funded = await deploy(3600, 7200, 600);
  await tx(out.funded, "fund", [], AMOUNT);

  console.log("seeding RESOLVED (RELEASE, in appeal window) demo...");
  out.resolved = await deploy(3600, 7200, 3600);
  await tx(out.resolved, "fund", [], AMOUNT);
  await tx(out.resolved, "confirm_delivery", []);

  console.log("seeding PAID demo...");
  out.paid = await deploy(3600, 7200, 20);
  await tx(out.paid, "fund", [], AMOUNT);
  await tx(out.paid, "confirm_delivery", []);
  await sleep(28000);
  await tx(out.paid, "payout", []);

  writeFileSync("seed-addresses.json", JSON.stringify(out, null, 2));
  console.log("=== SEED DONE ==="); console.log(out);
}
main().catch((e) => { console.error("FATAL:", e?.message || e); process.exit(1); });
