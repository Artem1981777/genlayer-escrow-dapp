import { writeFileSync } from "node:fs";
import { createClient, createAccount } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const hash = process.argv[2];
if (!hash) { throw new Error("usage: node --env-file=.env scripts/poll.mjs <txHash>"); }
const account = createAccount(PRIVATE_KEY);
const client = createClient({ chain: testnetBradbury, account });
const ZERO = "0x0000000000000000000000000000000000000000";
let tx, address, ok=false;
for (let i=0;i<60;i++){
  await new Promise(r=>setTimeout(r,5000));
  tx = await client.getTransaction({ hash });
  address = tx?.txDataDecoded?.contractAddress ?? tx?.recipient;
  console.log("["+i+"] status:", tx?.statusName, "exec:", tx?.txExecutionResultName, "addr:", address);
  if (address && address!==ZERO && ["ACCEPTED","FINALIZED"].includes(tx?.statusName)) { ok=true; break; }
}
if (ok) {
  const rec = { version:"v3.0.0", chain:"bradbury", chainId:"0x107d", contract:"EscrowArbiter", address:String(address), deployTx:String(hash), owner:account.address, deployedAt:new Date().toISOString() };
  writeFileSync("deployments.json", JSON.stringify(rec,null,2)+"\n");
  console.log(">>> CONFIRMED ->", address);
} else { console.log("!!! still not confirmed after poll window"); }
