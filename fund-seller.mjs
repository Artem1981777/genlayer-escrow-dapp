import { createClient, createAccount } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import { readFileSync } from "node:fs";
const account = createAccount(process.env.PRIVATE_KEY);
const client = createClient({ chain: testnetBradbury, account });
const sellerAddr = readFileSync("seller-addr.txt", "utf8").trim();
const GAS = 50000000000000000n;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
console.log("seller:", sellerAddr);
console.log("seller before:", (await client.getBalance({ address: sellerAddr })).toString());
let hash;
try { hash = await client.sendTransaction({ to: sellerAddr, value: GAS }); }
catch (e) { hash = await client.sendTransaction({ account, to: sellerAddr, value: GAS }); }
console.log("send tx:", hash);
let credited = false;
for (let i = 0; i < 25; i++) {
  const b = await client.getBalance({ address: sellerAddr });
  console.log("i=" + i, "seller balance:", b.toString());
  if (b > 0n) { credited = true; break; }
  await sleep(6000);
}
console.log("credited:", credited);
