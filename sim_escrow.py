#!/usr/bin/env python3
# Deterministic reference simulation of contracts/escrow_arbiter.py (EscrowArbiter v1).
# Mirrors the on-chain lifecycle exactly: same state machine, same guard messages.
# A controllable clock, explicit senders/values, and a deterministic stand-in for
# the validator-consensed AI arbiter replace chain time, wallets and the LLM.
# No keys, no network. Run: python3 sim_escrow.py

class Revert(Exception):
    pass

BUYER = "0xBUYER"
SELLER = "0xSELLER"
OTHER = "0xOTHER"

class EscrowModel:
    def __init__(self, buyer, seller, amount, terms, dispute_window, final_window, appeal_window, now):
        if not (dispute_window > 0):
            raise Revert("dispute window must be positive")
        if not (final_window > dispute_window):
            raise Revert("final window must exceed the dispute window")
        if not (appeal_window >= 0):
            raise Revert("appeal window must be non-negative")
        self.buyer = buyer
        self.seller = seller
        self.amount = amount
        self.terms = terms
        self.state = "CREATED"
        self.verdict = ""
        self.verdict_reason = ""
        self.payout_done = False
        self.evidence = []
        self.dispute_window = dispute_window
        self.final_window = final_window
        self.appeal_window = appeal_window
        self.created_at = now
        self.dispute_deadline = 0
        self.final_deadline = 0
        self.resolve_time = 0
        self.appeal_deadline = 0
        self.appeal_bond = 0
        self.appellant = ""
        self.appealed = False
        self.balance = 0
        self.transfers = []

    def _emit(self, to, value):
        self.balance -= value
        self.transfers.append((to, value))

    def fund(self, sender, value, now):
        if self.state != "CREATED":
            raise Revert("escrow already funded or closed")
        if sender != self.buyer:
            raise Revert("only the buyer can fund this escrow")
        if value != self.amount:
            raise Revert("must send exactly the escrow amount")
        self.balance += value
        self.dispute_deadline = now + self.dispute_window
        self.final_deadline = now + self.final_window
        self.state = "FUNDED"

    def submit_evidence(self, sender, content, url, now):
        if self.state != "FUNDED":
            raise Revert("evidence only while funded and unresolved")
        if now >= self.final_deadline:
            raise Revert("evidence window has closed")
        if sender == self.buyer:
            role = "buyer"
        elif sender == self.seller:
            role = "seller"
        else:
            raise Revert("only buyer or seller may submit evidence")
        u = url.strip()
        if u != "" and not (u.startswith("http://") or u.startswith("https://")):
            raise Revert("evidence url must be empty or an http(s) link")
        self.evidence.append({"submitter": sender, "role": role, "content": content, "url": u})

    def confirm_delivery(self, sender, now):
        if self.state != "FUNDED":
            raise Revert("can only confirm while funded")
        if sender != self.buyer:
            raise Revert("only the buyer can confirm delivery")
        self.verdict = "RELEASE"
        self.verdict_reason = "Buyer confirmed delivery; funds released to the seller."
        self.state = "RESOLVED"
        self.resolve_time = now
        self.appeal_deadline = now

    def claim_timeout(self, sender, now):
        if self.state != "FUNDED":
            raise Revert("timeout only applies while funded and unresolved")
        if now >= self.final_deadline:
            self.verdict = "REFUND"
            self.verdict_reason = "No resolution before the final deadline; funds returned to the buyer."
        elif now >= self.dispute_deadline and len(self.evidence) == 0:
            self.verdict = "RELEASE"
            self.verdict_reason = "No dispute was raised within the dispute window; funds released to the seller."
        else:
            raise Revert("no timeout condition is satisfied yet")
        self.state = "RESOLVED"
        self.resolve_time = now
        self.appeal_deadline = now

    def _arbitrate(self, ai):
        verdict = ai(self.terms, self.evidence)
        if verdict not in ("RELEASE", "REFUND"):
            raise Revert("invalid verdict")
        return verdict

    def resolve(self, sender, now, ai):
        if self.state != "FUNDED":
            raise Revert("escrow is not in a resolvable state")
        self.verdict = self._arbitrate(ai)
        self.verdict_reason = "arbiter ruling"
        self.state = "RESOLVED"
        self.resolve_time = now
        self.appeal_deadline = now + self.appeal_window

    def appeal(self, sender, value, now):
        if self.state != "RESOLVED":
            raise Revert("can only appeal a resolved escrow")
        if self.appealed:
            raise Revert("this escrow has already been appealed once")
        if now >= self.appeal_deadline:
            raise Revert("appeal window has closed")
        loser = self.buyer if self.verdict == "RELEASE" else self.seller
        if sender != loser:
            raise Revert("only the losing party may appeal")
        if value != self.amount:
            raise Revert("appeal bond must equal the escrow amount")
        self.balance += value
        self.appeal_bond = value
        self.appellant = sender
        self.appealed = True
        self.state = "APPEALED"

    def resolve_appeal(self, sender, now, ai):
        if self.state != "APPEALED":
            raise Revert("no appeal in progress")
        original = self.verdict
        new_verdict = self._arbitrate(ai)
        bond = self.appeal_bond
        if new_verdict != original:
            self.verdict = new_verdict
            self.appeal_bond = 0
            self._emit(self.appellant, bond)
        else:
            winner = self.seller if original == "RELEASE" else self.buyer
            self.appeal_bond = 0
            self._emit(winner, bond)
        self.state = "RESOLVED"
        self.resolve_time = now
        self.appeal_deadline = now

    def payout(self, sender, now):
        if self.payout_done:
            raise Revert("payout already executed")
        if self.state != "RESOLVED":
            raise Revert("resolve the escrow before payout")
        if now < self.appeal_deadline:
            raise Revert("payout is locked until the appeal window closes")
        if self.verdict == "RELEASE":
            recipient = self.seller
        elif self.verdict == "REFUND":
            recipient = self.buyer
        else:
            raise Revert("no verdict recorded")
        amount = self.amount
        self.payout_done = True
        self.state = "PAID"
        self._emit(recipient, amount)

PASS = 0
FAIL = 0

def check(cond, label):
    global PASS, FAIL
    if cond:
        PASS += 1
    else:
        FAIL += 1
        print("FAIL: " + label)

def expect_revert(fn, msg, label):
    global PASS, FAIL
    try:
        fn()
    except Revert as e:
        if msg in str(e):
            PASS += 1
        else:
            FAIL += 1
            print("FAIL: " + label + " -> wrong message: " + str(e))
        return
    FAIL += 1
    print("FAIL: " + label + " -> expected revert, got none")

def ai_release(terms, ev):
    return "RELEASE"

def ai_refund(terms, ev):
    return "REFUND"

def ai_bad(terms, ev):
    return "MAYBE"

def ai_web(terms, ev):
    for e in ev:
        text = (e["content"] + " " + e["url"]).lower()
        if ("delivered" in text) or ("tracking" in text) or ("signed" in text):
            return "RELEASE"
    return "REFUND"

def funded():
    e = EscrowModel(BUYER, SELLER, 1000, "deliver one widget", 100, 300, 50, 1000)
    e.fund(BUYER, 1000, 1000)
    return e

# ---- constructor validation ----
expect_revert(lambda: EscrowModel(BUYER, SELLER, 1000, "t", 0, 300, 50, 1000), "dispute window must be positive", "ctor rejects dw<=0")
expect_revert(lambda: EscrowModel(BUYER, SELLER, 1000, "t", 100, 100, 50, 1000), "final window must exceed the dispute window", "ctor rejects fw<=dw")
expect_revert(lambda: EscrowModel(BUYER, SELLER, 1000, "t", 100, 300, -1, 1000), "appeal window must be non-negative", "ctor rejects aw<0")
e = EscrowModel(BUYER, SELLER, 1000, "t", 100, 300, 50, 1000)
check(e.state == "CREATED", "ctor sets CREATED")
check(e.created_at == 1000, "ctor records created_at")

# ---- fund ----
e = EscrowModel(BUYER, SELLER, 1000, "t", 100, 300, 50, 1000)
expect_revert(lambda: e.fund(OTHER, 1000, 1000), "only the buyer can fund this escrow", "fund rejects non-buyer")
expect_revert(lambda: e.fund(BUYER, 999, 1000), "must send exactly the escrow amount", "fund rejects wrong amount")
e.fund(BUYER, 1000, 1000)
check(e.state == "FUNDED", "fund sets FUNDED")
check(e.balance == 1000, "fund holds the amount")
check(e.dispute_deadline == 1100, "fund sets dispute_deadline")
check(e.final_deadline == 1300, "fund sets final_deadline")
expect_revert(lambda: e.fund(BUYER, 1000, 1000), "escrow already funded or closed", "fund rejects double fund")

# ---- submit_evidence ----
e = EscrowModel(BUYER, SELLER, 1000, "t", 100, 300, 50, 1000)
expect_revert(lambda: e.submit_evidence(BUYER, "x", "", 1000), "evidence only while funded and unresolved", "evidence rejected before funding")
e = funded()
expect_revert(lambda: e.submit_evidence(OTHER, "x", "", 1050), "only buyer or seller may submit evidence", "evidence rejects stranger")
expect_revert(lambda: e.submit_evidence(BUYER, "x", "ftp://bad", 1050), "evidence url must be empty or an http(s) link", "evidence rejects bad url")
e.submit_evidence(BUYER, "did not arrive", "https://a.example", 1050)
check(len(e.evidence) == 1 and e.evidence[0]["role"] == "buyer", "buyer evidence tagged")
e.submit_evidence(SELLER, "shipped", "", 1050)
check(len(e.evidence) == 2 and e.evidence[1]["role"] == "seller", "seller evidence tagged")
expect_revert(lambda: e.submit_evidence(BUYER, "late", "", 1300), "evidence window has closed", "evidence rejected after final deadline")

# ---- confirm_delivery (happy path, no AI) ----
e = funded()
expect_revert(lambda: e.confirm_delivery(SELLER, 1050), "only the buyer can confirm delivery", "confirm rejects seller")
e.confirm_delivery(BUYER, 1050)
check(e.verdict == "RELEASE" and e.state == "RESOLVED", "confirm sets RELEASE/RESOLVED")
check(e.appeal_deadline == 1050, "confirm leaves no appeal window")
e.payout(BUYER, 1050)
check(e.state == "PAID" and e.transfers == [(SELLER, 1000)], "confirm payout pays seller")
check(e.balance == 0, "confirm path drains balance")
expect_revert(lambda: e.payout(BUYER, 1050), "payout already executed", "payout is replay-safe")
expect_revert(lambda: e.confirm_delivery(BUYER, 1050), "can only confirm while funded", "confirm rejected after resolved")

# ---- claim_timeout: no-dispute release to seller ----
e = funded()
expect_revert(lambda: e.claim_timeout(OTHER, 1050), "no timeout condition is satisfied yet", "timeout rejected before any deadline")
e.claim_timeout(OTHER, 1100)
check(e.verdict == "RELEASE" and e.state == "RESOLVED", "no-dispute timeout releases to seller")
e.payout(OTHER, 1100)
check(e.transfers == [(SELLER, 1000)] and e.balance == 0, "no-dispute timeout pays seller")
e = funded()
e.submit_evidence(BUYER, "dispute", "", 1050)
expect_revert(lambda: e.claim_timeout(OTHER, 1150), "no timeout condition is satisfied yet", "timeout blocked while dispute open pre-final")

# ---- claim_timeout: final-deadline refund to buyer ----
e = funded()
e.claim_timeout(OTHER, 1300)
check(e.verdict == "REFUND" and e.state == "RESOLVED", "final timeout refunds buyer")
e.payout(OTHER, 1300)
check(e.transfers == [(BUYER, 1000)] and e.balance == 0, "final timeout pays buyer")
e = funded()
e.submit_evidence(SELLER, "shipped", "", 1050)
e.claim_timeout(OTHER, 1350)
check(e.verdict == "REFUND", "final timeout overrides an open dispute")

# ---- resolve (AI) + appeal-window lock ----
e = funded()
expect_revert(lambda: e.resolve(OTHER, 1200, ai_bad), "invalid verdict", "resolve rejects invalid verdict")
e = funded()
e.resolve(OTHER, 1200, ai_release)
check(e.verdict == "RELEASE" and e.state == "RESOLVED", "resolve sets AI verdict")
check(e.appeal_deadline == 1250, "resolve opens appeal window")
expect_revert(lambda: e.payout(SELLER, 1200), "payout is locked until the appeal window closes", "payout locked during appeal window")
e.payout(SELLER, 1250)
check(e.transfers == [(SELLER, 1000)] and e.balance == 0, "resolve payout after window pays seller")
e2 = EscrowModel(BUYER, SELLER, 1000, "t", 100, 300, 50, 1000)
expect_revert(lambda: e2.resolve(OTHER, 1000, ai_release), "escrow is not in a resolvable state", "resolve rejected before funding")

# ---- appeal success: verdict flips, bond returned ----
e = funded()
e.resolve(OTHER, 1200, ai_release)
expect_revert(lambda: e.appeal(OTHER, 1000, 1210), "only the losing party may appeal", "appeal rejects stranger")
expect_revert(lambda: e.appeal(SELLER, 1000, 1210), "only the losing party may appeal", "appeal rejects winner")
expect_revert(lambda: e.appeal(BUYER, 500, 1210), "appeal bond must equal the escrow amount", "appeal rejects wrong bond")
expect_revert(lambda: e.appeal(BUYER, 1000, 1250), "appeal window has closed", "appeal rejects after window")
e.appeal(BUYER, 1000, 1210)
check(e.state == "APPEALED" and e.balance == 2000 and e.appellant == BUYER, "appeal locks bond")
expect_revert(lambda: e.appeal(BUYER, 1000, 1210), "can only appeal a resolved escrow", "no appeal while already appealing")
e.resolve_appeal(OTHER, 1220, ai_refund)
check(e.verdict == "REFUND" and e.state == "RESOLVED", "successful appeal flips verdict")
check(e.transfers == [(BUYER, 1000)] and e.balance == 1000, "successful appeal returns bond to appellant")
expect_revert(lambda: e.appeal(SELLER, 1000, 1220), "this escrow has already been appealed once", "second appeal rejected by flag")
e.payout(OTHER, 1220)
check(e.transfers == [(BUYER, 1000), (BUYER, 1000)] and e.balance == 0, "flipped verdict refunds buyer")

# ---- appeal failure: verdict stays, bond slashed to winner ----
e = funded()
e.resolve(OTHER, 1200, ai_refund)
e.appeal(SELLER, 1000, 1210)
check(e.state == "APPEALED" and e.balance == 2000, "seller appeal locks bond")
e.resolve_appeal(OTHER, 1220, ai_refund)
check(e.verdict == "REFUND" and e.state == "RESOLVED", "failed appeal keeps verdict")
check(e.transfers == [(BUYER, 1000)] and e.balance == 1000, "failed appeal slashes bond to winner")
e.payout(OTHER, 1220)
check(e.transfers == [(BUYER, 1000), (BUYER, 1000)] and e.balance == 0, "failed appeal then pays buyer")

# ---- web-verified arbitration ----
e = funded()
e.submit_evidence(SELLER, "package delivered", "https://track.example/1Z", 1050)
e.resolve(OTHER, 1200, ai_web)
check(e.verdict == "RELEASE", "web-verified: delivery evidence releases to seller")
e = funded()
e.submit_evidence(BUYER, "item never arrived", "", 1050)
e.submit_evidence(SELLER, "we shipped it", "https://seller.example/order", 1050)
e.resolve(OTHER, 1200, ai_web)
check(e.verdict == "REFUND", "web-verified: no proof of delivery refunds buyer")

print("CHECKS: %d PASSED: %d FAILED: %d" % (PASS + FAIL, PASS, FAIL))
import sys
sys.exit(0 if FAIL == 0 else 1)
