# Changelog

All notable changes to **AIEscrowArbiter**. Commit links point to the repository history.

## [v2.0.0] - 2026-09-12 - Trust-minimized escrow

Source-complete and proven by the reproducible state-machine simulation (`sim_escrow.py`, 54/54). The live Bradbury redeploy and v2-specific transaction evidence are recorded in README / Deployments once the testnet deploy queue resumes; we do not fabricate on-chain results.

### Added
- **Deadlines + permissionless timeout lifecycle** - `dispute_deadline` / `final_deadline` are armed at `fund()` from integer on-chain time (`_chain_now`); `claim_timeout()` releases to the seller after the dispute window and refunds the buyer after the final window, callable by anyone - [`38039db`](https://github.com/Artem1981777/genlayer-escrow-dapp/commit/38039db).
- **AI-free happy path** - `confirm_delivery()` lets the buyer release instantly without invoking the arbiter - [`38039db`](https://github.com/Artem1981777/genlayer-escrow-dapp/commit/38039db).
- **Web-source-verified arbitration** - evidence carries an optional URL; `_arbitrate` fetches each cited source via `gl.nondet.web.render` under leader/validator consensus and rules from the live web - [`38039db`](https://github.com/Artem1981777/genlayer-escrow-dapp/commit/38039db).
- **Staked appeal round** - `appeal()` (payable, bond == amount) + `resolve_appeal()`: a verdict flip returns the bond, a hold slashes it to the winner; one appeal maximum - [`38039db`](https://github.com/Artem1981777/genlayer-escrow-dapp/commit/38039db).
- **Reproducible simulation** - `sim_escrow.py`, a network-free port with identical guard strings exercising every path (`CHECKS: 54 PASSED: 54 FAILED: 0`) - [`38039db`](https://github.com/Artem1981777/genlayer-escrow-dapp/commit/38039db).
- **dApp v2** - lifecycle/deadline timeline, APPEALED badge, appeal + bond card, and per-evidence web-source links - [`de406f1`](https://github.com/Artem1981777/genlayer-escrow-dapp/commit/de406f1).

### Changed
- `resolve()` is now web-verified (fetches cited sources) instead of judging text only - [`38039db`](https://github.com/Artem1981777/genlayer-escrow-dapp/commit/38039db).
- `payout()` is appeal-gated (locked until the appeal window closes) and replay-safe (executes once) - [`38039db`](https://github.com/Artem1981777/genlayer-escrow-dapp/commit/38039db).
- `submit_evidence(content, url)` gains an optional http(s) source URL - [`38039db`](https://github.com/Artem1981777/genlayer-escrow-dapp/commit/38039db).
- `get_status()` extended with deadlines, appeal state and `chain_now` - [`38039db`](https://github.com/Artem1981777/genlayer-escrow-dapp/commit/38039db).

### Docs
- Added `SECURITY.md` (attack -> cost -> defense matrix), `ARCHITECTURE.md` (state machine, transitions, arbitration sequence, access control), and `docs/MILESTONE-v1.md` (delta write-up); README rewritten in the deep-dive style.

## [v1.0.0] - AIEscrowArbiter (accepted) - native GEN custody + AI dispute resolution

### Added
- Payable escrow with real native-GEN custody (`fund`), non-overwritable both-party text evidence (`submit_evidence`), a validator-consensed AI verdict (`resolve`), and a replay-safe `payout`.
- Live read-only dApp over on-chain state; written security audit (`docs/SECURITY-AUDIT.md`).

### Deployment and live proof
- Deployed to Bradbury `0x829DB851bc9963c71B22305e3b73bf5B220D1462` (REFUND) and `0x679f4657d126Aa973A070E59654b6B8c37EaA7c0` (RELEASE); full RELEASE and REFUND flows settled on-chain - see README "Live proof" and the `*-tx.txt` evidence files.
