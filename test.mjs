import { readFileSync } from "node:fs";
import { createClient, createAccount } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";
const PK = process.env.PRIVATE_KEY;
if (!PK) { throw new Error("PRIVATE_KEY missing. Run: node --env-file=.env test.mjs"); }
const source = readFileSync("contracts/escrow.py", "utf8");
const code = new TextEncoder().encode(source);
const EVIDENCE = "https://raw.githubusercontent.com/Artem1981777/genlayer-ai-escrow/main/README.md";
const DEAD = "0x000000000000000000000000000000000000dEaD";
const account = createAccount(PK);
const client = createClient({ chain: testnetBradbury, account });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failed = 0;
const pass = (n) => console.log("PASS -", n);
const fail = (n, extra) => { console.log("FAIL -", n, extra ?? ""); failed++; };
const read = (addr) => client.readContract({ address: addr, functionName: "get_state", args: [] });
async function deploy(terms) {
  const h = await client.deployContract({ code, args: [DEAD, terms, 100] });
  await client.waitForTransactionReceipt({ hash: h, status: TransactionStatus.ACCEPTED, retries: 300 });
  const tx = await client.getTransaction({ hash: h });
  const addr = tx?.txDataDecoded?.contractAddress ?? tx?.recipient;
  if (!addr || tx?.txExecutionResultName !== "FINISHED_WITH_RETURN") { throw new Error("deploy failed: " + tx?.txExecutionResultName); }
  return addr;
}
async function call(addr, fn, args) {
  const h = await client.writeContract({ address: addr, functionName: fn, args, value: 0 });
  await client.waitForTransactionReceipt({ hash: h, status: TransactionStatus.ACCEPTED, retries: 300 });
  let tx;
  for (let i = 0; i < 100; i++) {
    tx = await client.getTransaction({ hash: h });
    const r = tx?.txExecutionResultName;
    if (r && r !== "NOT_VOTED") return r;
    await sleep(3000);
  }
  return tx?.txExecutionResultName ?? "NOT_VOTED";
}
async function waitLeaves(addr, fromStatus) {
  let s;
  for (let i = 0; i < 100; i++) {
    s = await read(addr);
    if (s?.status !== fromStatus) return s;
    await sleep(3000);
  }
  return s;
}
console.log("### TEST 1: REFUND path — AI must reject unmet terms ###");
const REFUSE = "The evidence page must contain the exact secret phrase QUANTUM-UNICORN-42 written verbatim.";
const c1 = await deploy(REFUSE);
console.log("refund-case contract:", c1);
console.log("submit_evidence:", await call(c1, "submit_evidence", [EVIDENCE]));
console.log("resolve:", await call(c1, "resolve", []));
const s1 = await waitLeaves(c1, "disputed");
console.log("final status:", s1?.status, "| verdict:", s1?.verdict);
(s1?.status === "refunded" && s1?.verdict === "REFUND") ? pass("AI correctly REFUNDED unmet terms") : fail("expected REFUND", JSON.stringify(s1));
console.log("### TEST 2: cannot resolve twice ###");
const r2 = await call(c1, "resolve", []);
(r2 === "FINISHED_WITH_ERROR") ? pass("double resolve reverted") : fail("expected revert on double resolve", r2);
console.log("### TEST 3: cannot submit evidence after resolved ###");
const r3 = await call(c1, "submit_evidence", [EVIDENCE]);
(r3 === "FINISHED_WITH_ERROR") ? pass("late submit_evidence reverted") : fail("expected revert on late evidence", r3);
console.log("### TEST 4: cannot resolve without a dispute ###");
const c2 = await deploy(REFUSE);
const r4 = await call(c2, "resolve", []);
(r4 === "FINISHED_WITH_ERROR") ? pass("resolve on funded reverted") : fail("expected revert without dispute", r4);
console.log("### TEST 5: reject non-http evidence URL ###");
const c3 = await deploy(REFUSE);
const r5 = await call(c3, "submit_evidence", ["ftp://evil.example/x"]);
(r5 === "FINISHED_WITH_ERROR") ? pass("non-http evidence rejected") : fail("expected revert on bad URL", r5);
console.log("=====================================");
console.log(failed === 0 ? "ALL TESTS PASSED" : (failed + " TEST(S) FAILED"));
process.exitCode = failed === 0 ? 0 : 1;
