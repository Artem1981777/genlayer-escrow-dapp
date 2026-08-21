import { readFileSync } from "node:fs";
import { createClient, createAccount } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
const account = createAccount(process.env.PRIVATE_KEY);
const client = createClient({ chain: testnetBradbury, account });
const ADDRESS = readFileSync("contract.txt", "utf8").trim();
const SELLER = "0xdc6778C5F8cC74b10aED11c48306D4Cfc5737FBD";
const s = await client.readContract({ address: ADDRESS, functionName: "get_status", args: [] });
console.log("status:", s);
try { const cb = await client.getBalance({ address: ADDRESS }); console.log("contract native balance:", (cb?.toString?.() ?? cb)); } catch (e) { console.log("getBalance(contract) n/a:", (e?.message || String(e)).slice(0, 70)); }
try { const sb = await client.getBalance({ address: SELLER }); console.log("seller native balance:", (sb?.toString?.() ?? sb)); } catch (e) { console.log("getBalance(seller) n/a:", (e?.message || String(e)).slice(0, 70)); }
