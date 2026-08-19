# AIEscrowArbiter dApp — Live Escrow Dashboard on GenLayer

A web dApp that reads the on-chain state of an **AIEscrowArbiter** Intelligent Contract live from GenLayer Testnet Bradbury, alongside the contract and the client/test scripts that drive it. No oracle and no human arbiter: disputes are resolved by an LLM under validator **consensus** (Equivalence Principle).

## Live demo

- **App:** https://artem1981777.github.io/genlayer-escrow-dapp/
- **Live contract:** `0x6f33FF874366aEd9B071505Ffa1057072b8FC37C` (Testnet Bradbury, Chain ID 4221)
- **Explorer:** https://explorer-bradbury.genlayer.com/address/0x6f33FF874366aEd9B071505Ffa1057072b8FC37C

Paste any AIEscrowArbiter address into the app to inspect it. Try `0x274bF783F93Ffe330440905BA80321514972A954` to see a resolved RELEASE verdict.

## What is in here

- `index.html` — the live dashboard frontend (genlayer-js via CDN, no build step). Reads `get_state()` and renders status, verdict, parties, terms and evidence, with auto-refresh.
- `contracts/escrow.py` — the AIEscrowArbiter Intelligent Contract (hardened v2).
- `deploy.mjs` — deploys a fresh instance.
- `interact.mjs` — end-to-end escrow flow (fund, evidence, AI resolve).
- `test.mjs` — automated test suite (5/5 on live testnet).

## How it works

1. Buyer locks funds against human-readable terms (`funded`).
2. A party submits an evidence URL (`disputed`).
3. `resolve()` fetches the evidence with `gl.nondet.web.get`, an LLM judges it with `gl.nondet.exec_prompt`, and `gl.eq_principle.strict_eq` makes validators agree on the verdict.
4. Funds are `released` to the seller or `refunded` to the buyer.

## Run the frontend locally

~~~bash
python -m http.server 8000
# then open http://localhost:8000
~~~

## Tech

- Frontend: vanilla HTML/JS + `genlayer-js` (ESM CDN).
- Contract: Python Intelligent Contract on GenVM.
- Network: GenLayer Testnet Bradbury.

---

Built for the GenLayer Builder Program.
