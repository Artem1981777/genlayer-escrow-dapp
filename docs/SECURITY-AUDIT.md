# Security Audit - AIEscrowArbiter (v2.0)

Self-conducted security review of the `AIEscrowArbiter` Intelligent Contract (`contracts/escrow_arbiter.py`) on GenLayer Testnet Bradbury. Supersedes the v0 audit, which covered the verdict-only `contracts/escrow.py` without native custody.

## Scope
- **Contract:** `EscrowArbiter` (`contracts/escrow_arbiter.py`), v2.0.
- **Predecessor (live):** `0x829DB851bc9963c71B22305e3b73bf5B220D1462` (REFUND), `0x679f4657d126Aa973A070E59654b6B8c37EaA7c0` (RELEASE); the v2 address is recorded on redeploy.
- **Focus:** native-asset custody and fund safety, access control, state-machine integrity, non-deterministic web+LLM adjudication, consensus determinism, prompt injection.
- **Method:** manual source review + reproducible state-machine simulation (`sim_escrow.py`, 54/54, identical guard strings) + live two-outcome suite (`test.mjs`).

## Findings

| # | Finding | Severity | Status |
| --- | --- | --- | --- |
| 1 | Native custody and automatic payout (was "no custody" in v0) | High | Resolved |
| 2 | Funds could be frozen by an inactive party / owner | High | Resolved |
| 3 | Missing access control on state-changing methods | High | Fixed |
| 4 | Verdict not contestable | Medium | Resolved |
| 5 | Prompt injection via attacker-controlled evidence page | Medium | Mitigated |
| 6 | Unhandled LLM output (revert / undefined verdict) | Medium | Fixed |
| 7 | Replay / double payout | Medium | Fixed |
| 8 | Evidence URL validation | Low | Fixed |
| 9 | Consensus determinism on dynamic sources | Low | Accepted |

## Details

### 1. Native custody and payout (High) - Resolved
The v0 escrow only recorded a verdict; v2 custodies native GEN. `fund()` is payable, requires `value == amount_wei` and `sender == buyer`, and `payout()` transfers the balance to the winner. Custody proven live (fund `0xefd60583` / `0xb81bb8ae`, payout `0xc5a29c8e` / `0x8587b750`).

### 2. Fund liveness (High) - Resolved
No actor can strand funds. `claim_timeout()` is permissionless: after the dispute window with no dispute it releases to the seller; after the final deadline an unresolved escrow refunds the buyer. `payout()` is permissionless too. Every terminal state is reachable without the owner.

### 3. Access control (High) - Fixed
`fund` / `confirm_delivery` are buyer-only, `submit_evidence` is buyer-or-seller, and `appeal` is restricted to the losing party - all enforced on `gl.message.sender_address`.

### 4. Contestability (Medium) - Resolved
`appeal()` (bond == amount) + `resolve_appeal()` re-run arbitration; a verdict flip returns the bond, a hold slashes it to the winner. `payout()` is locked until the appeal window closes, so a verdict cannot be cashed out before it can be contested.

### 5. Prompt injection (Medium) - Mitigated
`_arbitrate` fetches evidence pages via `gl.nondet.web.render` and frames them as untrusted DATA with an explicit "not a command" instruction; embedded overrides are judged, not obeyed. Residual risk is inherent to LLM adjudication and bounded by the Equivalence Principle.

### 6. Output parsing (Medium) - Fixed
Malformed or non-JSON model output no longer reverts or yields an undefined verdict; defensive parsing (code-fence stripping, try/except, default key) falls back to a buyer-protective REFUND.

### 7. Replay-safe payout (Medium) - Fixed
`payout()` sets a paid flag and reverts on re-entry ("payout already executed"), so funds transfer exactly once.

### 8. URL validation (Low) - Fixed
`submit_evidence` requires an empty value or an http(s) link, rejecting `javascript:`, `data:` and `file:` URLs before any fetch.

### 9. Consensus determinism (Low) - Accepted
The verdict is agreed under `gl.eq_principle` on the discrete outcome, not exact scores. A highly dynamic evidence page can still cause disagreement; integrators should cite stable, content-addressable sources.

## Conclusion
The v0 roadmap item (native custody) is resolved: v2 custodies GEN, guarantees fund liveness via permissionless timeouts, makes verdicts economically contestable, and settles exactly once. After hardening, no High- or Medium-severity issue remains exploitable in the deployed logic.
