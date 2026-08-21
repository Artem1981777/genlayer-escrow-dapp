# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
from dataclasses import dataclass
import json

def _extract_json(resp):
    if isinstance(resp, dict):
        return resp
    s = str(resp)
    a = s.find("{")
    b = s.rfind("}")
    if a == -1 or b == -1:
        raise gl.vm.UserError("model did not return JSON")
    return json.loads(s[a:b + 1])

# EVM interface used only to send native GEN to an address (external message, on finalization)
@gl.evm.contract_interface
class _NativeRecipient:
    class View:
        pass
    class Write:
        pass

@allow_storage
@dataclass
class EvidenceItem:
    submitter: str
    role: str
    content: str

class EscrowArbiter(gl.Contract):
    buyer: Address
    seller: Address
    amount: u256
    terms: str
    state: str
    verdict: str
    verdict_reason: str
    payout_done: bool
    evidence: DynArray[EvidenceItem]

    def __init__(self, seller: str, amount_wei: int, terms: str):
        self.buyer = gl.message.sender_address
        self.seller = Address(seller)
        self.amount = u256(amount_wei)
        self.terms = terms
        self.state = "CREATED"
        self.verdict = ""
        self.verdict_reason = ""
        self.payout_done = False

    # ---- funding: really receives and holds GEN ----
    @gl.public.write.payable
    def fund(self) -> None:
        if self.state != "CREATED":
            raise gl.vm.UserError("escrow already funded or closed")
        if gl.message.sender_address != self.buyer:
            raise gl.vm.UserError("only the buyer can fund this escrow")
        v = gl.message.value
        if v != self.amount:
            raise gl.vm.UserError("must send exactly the escrow amount")
        self.state = "FUNDED"

    # ---- authenticated, append-only evidence from both parties ----
    @gl.public.write
    def submit_evidence(self, content: str) -> None:
        if self.state != "FUNDED":
            raise gl.vm.UserError("evidence only while funded and unresolved")
        sender = gl.message.sender_address
        if sender == self.buyer:
            role = "buyer"
        elif sender == self.seller:
            role = "seller"
        else:
            raise gl.vm.UserError("only buyer or seller may submit evidence")
        self.evidence.append(EvidenceItem(submitter=sender.as_hex, role=role, content=content))

    # ---- validator-consensed AI verdict ----
    @gl.public.write
    def resolve(self) -> None:
        if self.state != "FUNDED":
            raise gl.vm.UserError("escrow is not in a resolvable state")
        terms = self.terms
        buyer_ev = [e.content for e in self.evidence if e.role == "buyer"]
        seller_ev = [e.content for e in self.evidence if e.role == "seller"]

        def leader_fn():
            prompt = f"""You are an impartial escrow arbiter. Using ONLY the agreed release terms and the evidence from each party, decide whether the seller fulfilled the terms.
RELEASE = seller fulfilled the terms, pay the seller.
REFUND = seller did not fulfil the terms, return funds to the buyer.

Agreed release terms:
{terms}

BUYER evidence:
{json.dumps(buyer_ev)}

SELLER evidence:
{json.dumps(seller_ev)}

Return ONLY strict JSON: {{"verdict": "RELEASE" or "REFUND", "reason": "<=200 chars"}}"""
            return _extract_json(gl.nondet.exec_prompt(prompt))

        def validator_fn(leader_result) -> bool:
            if not isinstance(leader_result, gl.vm.Return):
                return False
            validator_data = leader_fn()
            leader_data = leader_result.calldata
            return leader_data["verdict"] == validator_data["verdict"]

        result = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        verdict = result["verdict"]
        if verdict not in ("RELEASE", "REFUND"):
            raise gl.vm.UserError("invalid verdict")
        self.verdict = verdict
        self.verdict_reason = str(result.get("reason", ""))[:200]
        self.state = "RESOLVED"

    # ---- replay-safe payout controlled by the verdict ----
    @gl.public.write
    def payout(self) -> None:
        if self.payout_done:
            raise gl.vm.UserError("payout already executed")
        if self.state != "RESOLVED":
            raise gl.vm.UserError("resolve the escrow before payout")
        if self.verdict == "RELEASE":
            recipient = self.seller
        elif self.verdict == "REFUND":
            recipient = self.buyer
        else:
            raise gl.vm.UserError("no verdict recorded")
        amount = self.amount
        self.payout_done = True
        self.state = "PAID"
        _NativeRecipient(recipient).emit_transfer(value=amount)

    # ---- views ----
    @gl.public.view
    def get_state(self) -> str:
        return self.state

    @gl.public.view
    def get_status(self) -> str:
        return json.dumps({
            "state": self.state,
            "buyer": self.buyer.as_hex,
            "seller": self.seller.as_hex,
            "amount_wei": str(self.amount),
            "balance_wei": str(self.balance),
            "verdict": self.verdict,
            "verdict_reason": self.verdict_reason,
            "payout_done": self.payout_done,
            "evidence_count": len(self.evidence),
        })

    @gl.public.view
    def get_evidence(self) -> str:
        return json.dumps([
            {"submitter": e.submitter, "role": e.role, "content": e.content}
            for e in self.evidence
        ])
