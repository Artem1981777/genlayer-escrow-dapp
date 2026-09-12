import { writeFileSync } from "node:fs";
import { createClient, createAccount } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const hash = process.argv[2];
if (!hash) { throw new Error("usage: node --env-file=.env scripts/status.mjs <txHash>"); }
const account = createAccount(PRIVATE_KEY);
const client = createClient({ chain: testnetBradbury, account });
const tx = await client.getTransaction({ hash });
const ZERO = "0x0000000000000000000000000000000000000000";
const address = tx?.txDataDecoded?.contractAddress ?? tx?.recipient;
console.log("status:", tx?.statusName, "| exec:", tx?.txExecutionResultName, "| address:", address);
const done = address && address !== ZERO && ["ACCEPTED","FINALIZED"].includes(tx?.statusName);
if (done) {
  const rec = { version:"v3.0.0", chain:"bradbury", chainId:"0x107d", contract:"EscrowArbiter", address:String(address), deployTx:String(hash), owner:account.address, deployedAt:new Date().toISOString() };
  writeFileSync("deployments.json", JSON.stringify(rec,null,2)+"\n");
  console.log(">>> CONFIRMED, saved -> deployments.json");
} else {
  writeFileSync("deployments.json", JSON.stringify({version:"v3.0.0",chain:"bradbury",status:"PENDING",deployTx:String(hash),note:"deploy tx submitted; awaiting Bradbury consensus",checkedAt:new Date().toISOString()},null,2)+"\n");
  console.log("... not confirmed yet (PENDING). Re-run in ~1-2 min.");
}
