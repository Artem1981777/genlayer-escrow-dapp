# AIEscrowArbiter dApp — Live Escrow Dashboard on GenLayer

A full GenLayer project: an **AIEscrowArbiter** Intelligent Contract, a live web dApp that reads its on-chain state, and a backend client + automated test suite. Disputes are resolved by an LLM under validator **consensus** (Equivalence Principle) — no oracle, no human arbiter.

## Live demo

- **App:** https://artem1981777.github.io/genlayer-escrow-dapp/
- **Live contract:** `0x6f33FF874366aEd9B071505Ffa1057072b8FC37C` (Testnet Bradbury, Chain ID 4221) — currently shows a resolved **RELEASE** verdict.
- **Explorer:** https://explorer-bradbury.genlayer.com/address/0x6f33FF874366aEd9B071505Ffa1057072b8FC37C

Paste any AIEscrowArbiter address into the app to inspect it. Try `0x274bF783F93Ffe330440905BA80321514972A954` for another RELEASE example.

## What is in here

- `index.html` — live dashboard frontend (genlayer-js via CDN, no build). Reads `get_state()` and renders status, verdict, parties, terms and evidence, with auto-refresh.
- `contracts/escrow.py` — the AIEscrowArbiter Intelligent Contract (hardened v2).
- `deploy.mjs` — deploys a fresh instance.
- `interact.mjs` — end-to-end escrow flow (fund, evidence, AI resolve).
- `test.mjs` — automated test suite.
- `docs/SECURITY-AUDIT.md` — written security review.

## Tests

`test.mjs` runs against live GenLayer Testnet Bradbury, deploying fresh instances and exercising the full state machine on both outcomes:

- RELEASE path — evidence satisfies the terms, funds go to the seller.
- REFUND path — evidence fails the terms, funds go to the buyer.
- Guard reverts — wrong caller, wrong state, or invalid evidence URL are rejected.

Result: **5/5 passing**.

~~~bash
npm install
node --env-file=.env test.mjs
~~~

## Security

Full review: [`docs/SECURITY-AUDIT.md`](docs/SECURITY-AUDIT.md). Hardening in v2:

- Access control — only buyer or seller may submit evidence or resolve.
- State-machine guards — actions allowed only in valid states (funded / disputed).
- Evidence-URL validation — must be http(s).
- Prompt-injection defenses — evidence framed as untrusted data, strict JSON output, parse failure defaults to no-release.
- Deterministic consensus via `gl.eq_principle.strict_eq`.

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

## Live proof (Testnet Bradbury)

Real GEN custody, validator-consensed verdict, replay-safe payout, and non-overwritable both-party evidence - settled on-chain twice.

### Escrow #1 - RELEASE (funds to seller)
- Contract: `0x679f4657d126Aa973A070E59654b6B8c37EaA7c0`
- deploy: `0xab77e369f6eb100b0d3ddaecf57549fd3ef77aaba5bc7ab66ab6232aef352586`
- fund (custody deposit): `0xb81bb8aef18cab6fb90a465ba2eff1d0dae9edcc53b9ee4963de912f622da675`
- buyer evidence: `0x5820420728583cea354ec4f1244a5ffac26a669ffc52cbc3d316bcce78cec783`
- resolve (consensus RELEASE): `0xddfde4eb112ab194e8fe4b341461b84cf0c5e1f2b47797df324b96421bfa038d`
- payout (to seller): `0x8587b750b2ddb3f81efd886c66d14d131128f78339397e1eeba3f2dc68f00fbf`

### Escrow #2 - REFUND (funds back to buyer), both-party evidence
- Contract: `0x829DB851bc9963c71B22305e3b73bf5B220D1462`
- fund (custody deposit): `0xefd60583ad3fa4ffd21992ddf3af5cd9b55790cd44a0a6f15feeaa6d4b700d8a`
- buyer evidence: `0x68fd36b5cb81d2cea40830ee3e4c0e993fc0d39b25ee4ec3daec942e90506c5a`
- seller evidence: `0x76a19c876388df35e7cd573ef45c2eb4a52501e385ce9779431b70047edf56f7`
- resolve (consensus REFUND): `0xebf6384b22659600aa3e94711ec8d40169778068b9e9af4a318d833c85a7db61`
- payout (to buyer): `0xc5a29c8e12d2e9b01a6e34b29aa0685591815567551bbd14f6056c3d65b4119d`

Explorer: https://explorer-bradbury.genlayer.com
