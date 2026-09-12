# AIEscrowArbiter - Trust-minimized AI Escrow on GenLayer

[![CI](https://github.com/Artem1981777/genlayer-escrow-dapp/actions/workflows/ci.yml/badge.svg)](https://github.com/Artem1981777/genlayer-escrow-dapp/actions/workflows/ci.yml) [![GenLayer](https://img.shields.io/badge/GenLayer-Bradbury%20testnet-6c5ce7)](https://explorer-bradbury.genlayer.com/address/0x829DB851bc9963c71B22305e3b73bf5B220D1462) [![Live dApp](https://img.shields.io/badge/live-dApp-00b894)](https://artem1981777.github.io/genlayer-escrow-dapp/) [![Version](https://img.shields.io/badge/contract-v2.0-brightgreen)](CHANGELOG.md) [![Intelligent Contract](https://img.shields.io/badge/Intelligent%20Contract-Python-3776ab)](contracts/escrow_arbiter.py)

> An on-chain escrow that holds real native GEN and resolves disputes with a validator-run LLM that verifies cited web sources - finalized by the GenLayer Equivalence Principle. No oracle, no human arbiter, no owner who can freeze funds.

Deep dives: [Security model](SECURITY.md) - [Architecture](ARCHITECTURE.md) - [Changelog](CHANGELOG.md)

AIEscrowArbiter is a GenLayer Intelligent Contract that custodies native GEN against human-readable terms. Either party appends authenticated evidence (optionally citing a web source); on a dispute the contract fetches those sources and an LLM run by every validator produces a verdict finalized by comparative consensus. Deadlines, permissionless timeouts and a staked appeal round guarantee funds are never locked and every verdict is contestable.

**Live dApp:** https://artem1981777.github.io/genlayer-escrow-dapp/

## Contents
- [Milestone v2 - what's new since v1.0](#milestone-v2---trust-minimized-escrow-whats-new-since-v10)
- [Deployments](#deployments-bradbury-testnet)
- [Lifecycle](#lifecycle)
- [Live proof](#live-proof-on-genlayer-testnet-bradbury)
- [Hardening](#hardening)
- [Why GenLayer](#why-genlayer)
- [Security](#security)
- [Documentation and verification](#documentation-and-verification)
- [Repository layout](#repository-layout)
- [Run](#run)

## Milestone v2 - Trust-minimized escrow (what's new since v1.0)

v1.0 custodied GEN and resolved a dispute from the two parties' text evidence. Milestone v2 turns it into a trust-minimized escrow: hard deadlines, permissionless exits so funds can never freeze, an AI-free happy path, web-source-verified arbitration, and an economically-staked appeal round. Every consensus-critical decision stays inside the Intelligent Contract; the frontend only reads state and submits transactions.

| What's new | Category | Where |
| --- | --- | --- |
| Deadlines + permissionless timeout lifecycle (`claim_timeout`: no-dispute release, final-deadline refund) | major feature | `contracts/escrow_arbiter.py` |
| AI-free happy path (`confirm_delivery`: buyer releases instantly) | new functionality | `escrow_arbiter.py` |
| Web-source-verified arbitration (evidence URL fetched via `gl.nondet.web.render` under consensus) | major feature | `escrow_arbiter.py` `_arbitrate` |
| Staked appeal round (`appeal` bond + `resolve_appeal`: flip returns bond, hold slashes to winner) | new functionality | `escrow_arbiter.py` |
| Appeal-gated, replay-safe `payout` | security | `escrow_arbiter.py` `payout` |
| Integer on-chain deadlines (`_chain_now`, GenLayer datetime) - no block-height dependency | architecture | `escrow_arbiter.py` |
| Reproducible state-machine simulation, 54/54, no keys/network | verification | `sim_escrow.py` |
| dApp v2: lifecycle timeline, APPEALED state, appeal/bond card, web-source evidence links | major feature | `index.html` |

### Deployments (Bradbury testnet)

| Version | Address | Status |
| --- | --- | --- |
| v2.0.0 | pending redeploy (Bradbury deploy queue paused) | source `contracts/escrow_arbiter.py`; simulation 54/54 |
| v1.0.0 | `0x829DB851bc9963c71B22305e3b73bf5B220D1462` | accepted; live REFUND settlement (both-party evidence) |
| v1.0.0 | `0x679f4657d126Aa973A070E59654b6B8c37EaA7c0` | accepted; live RELEASE settlement (funds to seller) |

- Deploy tx (RELEASE instance): `0xab77e369f6eb100b0d3ddaecf57549fd3ef77aaba5bc7ab66ab6232aef352586`
- Owner / operator: `0x198a1952BD58984281f57CF824d264cdbd412814`

> v2.0.0 is source-complete and proven by the reproducible simulation below. The live redeploy plus v2-specific transaction evidence (timeout, confirm, web-verified resolve, appeal) will be recorded here as soon as the Bradbury deploy queue resumes; we do not fabricate on-chain results.

## Lifecycle

```
CREATED -> FUNDED -> RESOLVED -> PAID
                 \-> APPEALED -/
```

- `fund()` - buyer only, payable; locks the exact amount, arms dispute and final deadlines (CREATED -> FUNDED)
- `submit_evidence(content, url)` - buyer or seller; append-only, optional http(s) source URL
- `confirm_delivery()` - buyer only; instant RELEASE without the AI (FUNDED -> RESOLVED)
- `claim_timeout()` - permissionless; no-dispute release to seller after the dispute deadline, refund to buyer after the final deadline (FUNDED -> RESOLVED)
- `resolve()` - runs the web-verified AI arbiter under consensus (FUNDED -> RESOLVED)
- `appeal()` - losing party only, payable; stakes a bond equal to the amount (RESOLVED -> APPEALED)
- `resolve_appeal()` - re-arbitrates; a verdict flip refunds the bond, otherwise it is slashed to the winner (APPEALED -> RESOLVED)
- `payout()` - permissionless, replay-safe; locked until the appeal window closes (RESOLVED -> PAID)
- `get_status()`, `get_state()`, `get_evidence()` - views

## Live proof on GenLayer Testnet (Bradbury)

Real GEN custody, validator-consensed verdict, replay-safe payout and non-overwritable both-party evidence - settled on-chain on the accepted v1.0 contract. Explorer: https://explorer-bradbury.genlayer.com

### Escrow #1 - RELEASE (funds to seller) - `0x679f4657d126Aa973A070E59654b6B8c37EaA7c0`

| Step | Tx |
| --- | --- |
| deploy | `0xab77e369f6eb100b0d3ddaecf57549fd3ef77aaba5bc7ab66ab6232aef352586` |
| fund (custody deposit) | `0xb81bb8aef18cab6fb90a465ba2eff1d0dae9edcc53b9ee4963de912f622da675` |
| buyer evidence | `0x5820420728583cea354ec4f1244a5ffac26a669ffc52cbc3d316bcce78cec783` |
| resolve (consensus RELEASE) | `0xddfde4eb112ab194e8fe4b341461b84cf0c5e1f2b47797df324b96421bfa038d` |
| payout (to seller) | `0x8587b750b2ddb3f81efd886c66d14d131128f78339397e1eeba3f2dc68f00fbf` |

### Escrow #2 - REFUND (funds to buyer), both-party evidence - `0x829DB851bc9963c71B22305e3b73bf5B220D1462`

| Step | Tx |
| --- | --- |
| fund (custody deposit) | `0xefd60583ad3fa4ffd21992ddf3af5cd9b55790cd44a0a6f15feeaa6d4b700d8a` |
| buyer evidence | `0x68fd36b5cb81d2cea40830ee3e4c0e993fc0d39b25ee4ec3daec942e90506c5a` |
| seller evidence | `0x76a19c876388df35e7cd573ef45c2eb4a52501e385ce9779431b70047edf56f7` |
| resolve (consensus REFUND) | `0xebf6384b22659600aa3e94711ec8d40169778068b9e9af4a318d833c85a7db61` |
| payout (to buyer) | `0xc5a29c8e12d2e9b01a6e34b29aa0685591815567551bbd14f6056c3d65b4119d` |

## Hardening

Each v2 guarantee, how it is enforced, and where it is proven. Live proofs are on-chain; simulation proofs are reproducible offline (`python3 sim_escrow.py`, 54/54); v2-only on-chain proofs are recorded on redeploy.

| Hardening | Guarantee | Proof |
| --- | --- | --- |
| Real native custody | `fund()` locks exactly the escrow amount; a wrong amount reverts | live fund REFUND `0xefd60583` / RELEASE `0xb81bb8ae` |
| Access control | only the buyer funds/confirms; only buyer or seller submit evidence; only the loser appeals | sim guards + SECURITY.md #1-3 |
| State-machine integrity | actions valid only in-state; CREATED->FUNDED->RESOLVED/APPEALED->PAID | sim 54/54 + ARCHITECTURE.md |
| No locked funds | permissionless `claim_timeout` releases/refunds after the deadlines | sim no-dispute + final-deadline paths; live tx on redeploy |
| Replay-safe payout | `payout()` executes once, gated by the appeal window | live payout REFUND `0xc5a29c8e` / RELEASE `0x8587b750` |
| Web-source verification | the arbiter fetches cited URLs and rules from the live web under consensus | live resolve `0xddfde4eb` (RELEASE) / `0xebf6384b` (REFUND); URL-carrying v2 evidence on redeploy |
| Prompt-injection defense | fetched pages are fenced as untrusted data; malformed output defaults buyer-protective | SECURITY.md #6 |
| Contestability | staked `appeal()` + `resolve_appeal()`; the loser's bond is slashed if the verdict holds | sim appeal-flip and appeal-hold; live tx on redeploy |

## Why GenLayer

A plain smart contract cannot read a shipping tracker, a Git commit, or a delivery receipt, and an oracle just moves the trust to whoever runs it. AIEscrowArbiter needs to *judge* real-world evidence: it fetches the cited web source inside the contract (`gl.nondet.web.render`), an LLM weighs it against the terms, and the GenLayer Equivalence Principle makes every validator agree on the verdict before a single GEN moves. The result is subjective dispute resolution with objective, on-chain finality - impossible on a classical chain.

## Security

- Fetched evidence is untrusted data: embedded instructions are judged, never executed; malformed model output defaults to the buyer-protective outcome.
- Consensus via the Equivalence Principle: validators must agree on the discrete verdict, not on exact LLM wording.
- Access control and strict state-machine guards on every state-changing method.
- No owner freeze: permissionless timeouts and an appeal-gated, replay-safe payout mean funds always reach a terminal state.

Full threat model: [SECURITY.md](SECURITY.md). Written audit: [docs/SECURITY-AUDIT.md](docs/SECURITY-AUDIT.md).

## Documentation and verification

- **[SECURITY.md](SECURITY.md)** - attack -> cost -> defense matrix mapped to `escrow_arbiter.py`, plus defense-in-depth.
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - state machine, transition/access tables, the web-verified arbitration sequence, and the contract/frontend boundary.
- **[CHANGELOG.md](CHANGELOG.md)** - every change since v1.0, grouped by category and linked to commits.
- **[docs/MILESTONE-v1.md](docs/MILESTONE-v1.md)** - the milestone delta write-up.
- **`sim_escrow.py`** - reproducible, network-free port of the state machine; `python3 sim_escrow.py` -> `CHECKS: 54 PASSED: 54 FAILED: 0`.

## Repository layout

- `contracts/escrow_arbiter.py` - active v2 Intelligent Contract (custody, deadlines, web-verified arbitration, staked appeals)
- `contracts/escrow.py` - original verdict-only contract (v0), retained for history
- `index.html` - live read-only dashboard (state + evidence + lifecycle; submits nothing)
- `sim_escrow.py` - reproducible state-machine simulation (54/54)
- `deploy.mjs` / `interact.mjs` / `test.mjs` - deploy, end-to-end flow, live guard suite
- `both.mjs` / `settle.mjs` / `fund-seller.mjs` / `verify.mjs` - live-proof helpers
- `docs/` - MILESTONE-v1.md, SECURITY-AUDIT.md
- `*-tx.txt` - raw on-chain evidence (full tx hashes)

## Run

```
npm install
node --env-file=.env test.mjs      # live guard + both-outcome suite on Bradbury
python3 sim_escrow.py              # offline state-machine proof (no keys, no network)
```

The deployer key (`PRIVATE_KEY`) is read from `.env` (never committed; see `.env.example`). GenLayer Testnet Bradbury: chain id 4221, RPC https://rpc-bradbury.genlayer.com.
