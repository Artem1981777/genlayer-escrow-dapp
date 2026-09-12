// test.mjs - AIEscrowArbiter v2 live suite (Bradbury): both outcome paths + guards.
import { readFileSync } from "node:fs";
import { createClient, createAccount } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

const PK = process.env.PRIVATE_KEY;
if (!PK) { throw new Error("PRIVATE_KEY missing. Run: node --env-file=.env test.mjs"); }
const buyer = createAccount(PK);
const seller = createAccount(readFileSync("seller-key.txt", "utf8").trim());
const sellerAddr = readFileSync("seller-addr.txt", "utf8").trim();
const cBuyer = createClient({ chain: testnetBradbury, account: buyer });
const cSeller = createClient({ chain: testnetBradbury, account: seller });
const code = new TextEncoder().encode(readFileSync("contracts/escrow_arbiter.py", "utf8"));

const AMOUNT = 1000000000000000n;
const DEAD = "0x000000000000000000000000000000000000dEaD";
const TERMS = "Deliver the agreed digital asset. RELEASE to seller if delivered as described; REFUND to buyer otherwise.";
const GOOD_URL = "https://raw.githubusercontent.com/Artem1981777/genlayer-escrow-dapp/main/README.md";
const BAD_URL = "javascript:alert(1)";
const BIG = 3600, SHORT = 20;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failed = 0;
const pass = (n) => console.log("PASS -", n);
const fail = (n, x) => { console.log("FAIL -", n, x ?? ""); failed++; };
const isRevert = (r) => r === "FINISHED_WITH_ERROR" || String(r).startsWith("THREW");
const isOk = (r) => r === "FINISHED" || r === "FINISHED_WITH_RETURN";
function retriable(m){ m=String(m||"").toLowerCase(); return m.includes("-32005")||m.includes("capacity")||m.includes("rate limit")||m.includes("exceeds defined limit")||m.includes("consensus contract")||m.includes("evm tx"); }
const readS = (addr, fn) => cBuyer.readContract({ address: addr, functionName: fn, args: [] });

async function finalOf(client, hash){
  for (let i=0;i<100;i++){
    const t = await client.getTransaction({ hash });
    const r = t?.txExecutionResultName;
    if (r && r !== "NOT_VOTED") return r;
    await sleep(3000);
  }
  return "NOT_VOTED";
}

async function tx(client, address, functionName, args, value=0n){
  for (let a=1;a<=40;a++){
    try {
      const hash = await client.writeContract({ address, functionName, args, value });
      await client.waitForTransactionReceipt({ hash, status: TransactionStatus.ACCEPTED, retries: 300 });
      return await finalOf(client, hash);
    } catch(e){
      const m = e?.message || String(e);
      if (retriable(m) && a<40){ await sleep(8000); continue; }
      return "THREW:" + m.slice(0,60);
    }
  }
  return "THREW:retries";
}

async function deploy(sellerArg, dispute, finalW, appeal){
  for (let a=1;a<=40;a++){
    try {
      const hash = await cBuyer.deployContract({ code, args: [sellerArg, AMOUNT, TERMS, dispute, finalW, appeal] });
      await cBuyer.waitForTransactionReceipt({ hash, status: TransactionStatus.ACCEPTED, retries: 300 });
      const t = await cBuyer.getTransaction({ hash });
      const addr = t?.txDataDecoded?.contractAddress ?? t?.recipient;
      if (!addr) throw new Error("no addr: " + t?.txExecutionResultName);
      return addr;
    } catch(e){
      const m = e?.message || String(e);
      if (retriable(m) && a<40){ await sleep(8000); continue; }
      throw e;
    }
  }
}

async function main(){
  console.log("buyer:", buyer.address, "seller:", sellerAddr);

  console.log("### A: happy-path RELEASE ###");
  const A = await deploy(sellerAddr, BIG, BIG*2, SHORT);
  isOk(await tx(cBuyer, A, "fund", [], AMOUNT)) ? pass("A fund") : fail("A fund");
  isOk(await tx(cBuyer, A, "confirm_delivery", [])) ? pass("A confirm_delivery") : fail("A confirm_delivery");
  const sA = await readS(A, "get_status");
  (sA?.status === "resolved" && sA?.verdict === "RELEASE") ? pass("A verdict RELEASE") : fail("A status", JSON.stringify(sA));
  isRevert(await tx(cBuyer, A, "payout", [])) ? pass("A payout locked in appeal window") : fail("A payout should be locked");

  console.log("### B: web-verified resolve ###");
  const B = await deploy(sellerAddr, BIG, BIG*2, SHORT);
  await tx(cBuyer, B, "fund", [], AMOUNT);
  isOk(await tx(cBuyer, B, "submit_evidence", ["BUYER: not as described", GOOD_URL])) ? pass("B buyer evidence") : fail("B evidence");
  isOk(await tx(cSeller, B, "submit_evidence", ["SELLER: delivered per terms", GOOD_URL])) ? pass("B seller evidence") : fail("B seller evidence");
  isOk(await tx(cBuyer, B, "resolve", [])) ? pass("B resolve") : fail("B resolve");
  const sB = await readS(B, "get_status");
  (sB?.status === "resolved" && (sB?.verdict === "RELEASE" || sB?.verdict === "REFUND")) ? pass("B resolved -> " + sB?.verdict) : fail("B status", JSON.stringify(sB));

  console.log("### C: permissionless timeout RELEASE ###");
  const C = await deploy(sellerAddr, SHORT, SHORT*4, 1);
  await tx(cBuyer, C, "fund", [], AMOUNT);
  isRevert(await tx(cBuyer, C, "claim_timeout", [])) ? pass("C early timeout reverts") : fail("C early timeout");
  await sleep((SHORT+8)*1000);
  isOk(await tx(cSeller, C, "claim_timeout", [])) ? pass("C permissionless claim_timeout") : fail("C timeout");
  const sC = await readS(C, "get_status");
  (sC?.status === "resolved" && sC?.verdict === "RELEASE") ? pass("C no-dispute RELEASE") : fail("C status", JSON.stringify(sC));

  console.log("### D: permissionless final-deadline REFUND ###");
  const D = await deploy(sellerAddr, SHORT, SHORT*2, 1);
  await tx(cBuyer, D, "fund", [], AMOUNT);
  await tx(cBuyer, D, "submit_evidence", ["BUYER: dispute", GOOD_URL]);
  await sleep((SHORT*2+8)*1000);
  isOk(await tx(cSeller, D, "claim_timeout", [])) ? pass("D permissionless final refund") : fail("D timeout");
  const sD = await readS(D, "get_status");
  (sD?.status === "resolved" && sD?.verdict === "REFUND") ? pass("D final REFUND") : fail("D status", JSON.stringify(sD));

  console.log("### GUARDS ###");
  const G = await deploy(sellerAddr, BIG, BIG*2, BIG);
  isRevert(await tx(cSeller, G, "fund", [], AMOUNT)) ? pass("fund by non-buyer reverts") : fail("G-fund-caller");
  isRevert(await tx(cBuyer, G, "fund", [], AMOUNT + 1n)) ? pass("fund wrong amount reverts") : fail("G-fund-amount");
  isOk(await tx(cBuyer, G, "fund", [], AMOUNT)) ? pass("fund ok") : fail("G-fund");
  isRevert(await tx(cSeller, G, "confirm_delivery", [])) ? pass("confirm by seller reverts") : fail("G-confirm");
  isRevert(await tx(cBuyer, G, "submit_evidence", ["x", BAD_URL])) ? pass("bad URL reverts") : fail("G-url");
  isRevert(await tx(cBuyer, G, "claim_timeout", [])) ? pass("early timeout reverts") : fail("G-timeout");

  const O = await deploy(DEAD, BIG, BIG*2, BIG);
  await tx(cBuyer, O, "fund", [], AMOUNT);
  isRevert(await tx(cSeller, O, "submit_evidence", ["outsider", GOOD_URL])) ? pass("outsider evidence reverts") : fail("G-outsider");

  isRevert(await tx(cBuyer, A, "resolve", [])) ? pass("resolve on resolved reverts") : fail("G-resolve2");
  isRevert(await tx(cSeller, A, "appeal", [], AMOUNT)) ? pass("appeal by winner reverts") : fail("G-appeal-winner");
  isRevert(await tx(cBuyer, A, "appeal", [], AMOUNT + 1n)) ? pass("appeal wrong bond reverts") : fail("G-appeal-bond");

  console.log("=====================================");
  console.log(failed === 0 ? "ALL TESTS PASSED" : failed + " TEST(S) FAILED");
  process.exitCode = failed === 0 ? 0 : 1;
}
main().catch((e) => { console.error("FATAL:", e?.message || e); process.exit(1); });
