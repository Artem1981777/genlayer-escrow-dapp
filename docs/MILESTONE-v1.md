# Milestone v1 - Trust-minimized escrow

## Baseline (last accepted state)
AIEscrowArbiter is an accepted Project Explorer contract + live dApp: the buyer
funds native GEN (fund), buyer and seller append text evidence (submit_evidence),
a validator-consensed AI verdict is produced (resolve), and a replay-safe payout
sends funds to the winner. There were no deadlines, no owner-free exit if a party
disappears, no happy path, and no way to contest a verdict. The AI read only the
two parties' text, not any external source.

## What changed in this milestone (the delta)
1. Deadlines + permissionless timeout lifecycle. dispute_deadline and
   final_deadline are set at funding from on-chain time (_chain_now, the same
   integer-only clock used by our accepted prediction-market contract). Anyone
   can call claim_timeout: after the dispute window with no evidence the funds
   release to the seller; after the final deadline an unresolved escrow refunds
   the buyer. Funds can never be locked past final_deadline.
2. Happy path without the AI. confirm_delivery lets the buyer release instantly
   when satisfied - cheaper and honest; the AI is only for disputes.
3. Web-source-verified arbitration. Evidence now carries an optional URL. During
   resolve the arbiter fetches each cited source (gl.nondet.web.render) and rules
   from the live web under leader/validator consensus, with an explicit
   prompt-injection guard. This turns "read two messages" into "verify against
   cited sources" - GenLayer's core value.
4. Staked appeal round. The losing party can post a bond equal to the amount
   (appeal) within the appeal window. resolve_appeal re-runs arbitration: if the
   verdict flips the appeal succeeds and the bond is returned; if it holds the
   appeal fails and the bond is slashed to the winner. One appeal maximum.
5. Payout is gated by the appeal window so a verdict cannot be cashed out before
   it can be contested.

## Why it matters
The escrow no longer depends on any party (or an owner) staying online: every
terminal state is reachable permissionlessly, and the buyer is protected by a
hard refund deadline. Web-source verification and staked appeals make the AI
ruling both better-grounded and economically contestable.

## New / changed contract surface
- __init__(seller, amount_wei, terms, dispute_window_secs, final_window_secs, appeal_window_secs)
- submit_evidence(content, url)  (url added; may be empty or http/https)
- confirm_delivery()  (new)
- claim_timeout()  (new, permissionless)
- appeal() payable, resolve_appeal()  (new)
- resolve() now web-verified; payout() now appeal-gated
- status view extended with deadlines, appeal state and chain_now

## How to verify (no keys, no network)
Run:  python3 sim_escrow.py
Expected: CHECKS: 54 PASSED: 54 FAILED: 0. The simulation is a faithful port of
the contract state machine (identical guard messages) and exercises every path:
fund, evidence, happy-path confirm, no-dispute release, final-deadline refund,
AI resolve + appeal-window lock, appeal success (verdict flip, bond returned),
appeal failure (bond slashed), web-verified release/refund, and replay-safe
payout.

## Deployment status
The v1 contract is in contracts/escrow_arbiter.py. A live Bradbury redeploy plus
transaction evidence will be added once the testnet resumes activating deploys;
the milestone delta is fully reviewable from the source and the reproducible
simulation above.
