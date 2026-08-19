import { readFileSync, writeFileSync } from "node:fs";
import { createClient, createAccount } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";
const PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) { throw new Error("PRIVATE_KEY not found. Run: node --env-file=.env deploy.mjs"); }
const SELLER = "0x000000000000000000000000000000000000dEaD";
const TERMS = "The evidence page must describe an AI-powered escrow arbiter Intelligent Contract built on GenLayer.";
const AMOUNT = 100;
const source = readFileSync("contracts/escrow.py", "utf8");
const code = new TextEncoder().encode(source);
const account = createAccount(PRIVATE_KEY);
const client = createClient({ chain: testnetBradbury, account });
console.log("Deploying AIEscrowArbiter (new Depends hash)...");
const txHash = await client.deployContract({ code, args: [SELLER, TERMS, AMOUNT] });
console.log("deploy tx:", txHash);
await client.waitForTransactionReceipt({ hash: txHash, status: TransactionStatus.ACCEPTED, retries: 300 });
const tx = await client.getTransaction({ hash: txHash });
const address = tx?.txDataDecoded?.contractAddress ?? tx?.recipient;
console.log("=== DEPLOY RESULT ===");
console.log("statusName:", tx?.statusName);
console.log("txExecutionResultName:", tx?.txExecutionResultName);
console.log("contract address:", address);
if (tx?.txExecutionResultName !== "FINISHED") { console.log("!!! WARNING: execution not clean ->", tx?.txExecutionResultName); }
else { console.log(">>> CLEAN DEPLOY OK"); }
writeFileSync("contract.txt", String(address));
console.log("saved address -> contract.txt");
