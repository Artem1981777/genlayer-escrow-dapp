import { readFileSync, writeFileSync } from "node:fs";
import { createClient, createAccount } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
const PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) { throw new Error("PRIVATE_KEY missing. Run: node --env-file=.env scripts/deploy.mjs"); }
const source = readFileSync("contracts/escrow_arbiter_v3.py", "utf8");
const code = new TextEncoder().encode(source);
const account = createAccount(PRIVATE_KEY);
const client = createClient({ chain: testnetBradbury, account });
const ZERO = "0x0000000000000000000000000000000000000000";
console.log("Deploying EscrowArbiter v3 (factory) as", account.address);
const txHash = await client.deployContract({ code, args: [0, ""] });
console.log("deploy tx:", txHash);
let tx, address, ok=false;
for (let i=0;i<60;i++){
  await new Promise(r=>setTimeout(r,5000));
  tx = await client.getTransaction({ hash: txHash });
  address = tx?.txDataDecoded?.contractAddress ?? tx?.recipient;
  console.log("["+i+"] status:", tx?.statusName, "exec:", tx?.txExecutionResultName, "addr:", address);
  if (address && address!==ZERO && ["ACCEPTED","FINALIZED"].includes(tx?.statusName)) { ok=true; break; }
}
if (ok) {
  const rec = { version:"v3.0.0", chain:"bradbury", chainId:"0x107d", contract:"EscrowArbiter", address:String(address), deployTx:String(txHash), owner:account.address, deployedAt:new Date().toISOString() };
  writeFileSync("deployments.json", JSON.stringify(rec,null,2)+"\n");
  console.log(">>> CLEAN DEPLOY OK ->", address);
} else {
  writeFileSync("deployments.json", JSON.stringify({version:"v3.0.0",chain:"bradbury",status:"PENDING",deployTx:String(txHash),owner:account.address,note:"deploy submitted; Bradbury consensus not confirmed in poll window",checkedAt:new Date().toISOString()},null,2)+"\n");
  console.log("!!! not confirmed; recorded PENDING. Re-check with scripts/poll.mjs", txHash);
}
