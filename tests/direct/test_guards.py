import json, pytest
from conftest import deploy, mk, fund, _hex, AMOUNT, DW, FW, AW, T0

CC = [
 ("x", AMOUNT, DW, FW, AW, 4, False, "role_of_sender must be buyer or seller"),
 ("buyer", 0, DW, FW, AW, 4, False, "amount must be positive"),
 ("buyer", AMOUNT, 0, FW, AW, 4, False, "dispute window must be positive"),
 ("buyer", AMOUNT, DW, DW, AW, 4, False, "final window must exceed the dispute window"),
 ("buyer", AMOUNT, DW, FW, -1, 4, False, "appeal window must be non-negative"),
 ("buyer", AMOUNT, DW, FW, AW, 2001, False, "title or terms too long"),
 ("buyer", AMOUNT, DW, FW, AW, 4, True, "counterparty must differ from sender"),
]

@pytest.mark.parametrize("case", CC)
def test_create_guards(direct_vm, direct_deploy, direct_alice, direct_bob, case):
    role,amt,dw,fw,aw,tl,selfcp,msg = case
    c = deploy(direct_vm, direct_deploy); direct_vm.warp(T0); direct_vm.sender = direct_alice
    cp = direct_alice if selfcp else direct_bob
    with direct_vm.expect_revert(msg):
        c.create_escrow(_hex(cp), role, amt, "T"*tl, "Terms", dw, fw, aw)

def test_fund_only_buyer(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = deploy(direct_vm, direct_deploy); direct_vm.warp(T0)
    e = mk(direct_vm, c, direct_alice, direct_bob)
    direct_vm.sender = direct_bob; direct_vm.value = AMOUNT
    with direct_vm.expect_revert("only the buyer can fund this escrow"):
        c.fund(e)
    direct_vm.value = 0

def test_fund_wrong_amount(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = deploy(direct_vm, direct_deploy); direct_vm.warp(T0)
    e = mk(direct_vm, c, direct_alice, direct_bob)
    direct_vm.sender = direct_alice; direct_vm.value = AMOUNT + 1
    with direct_vm.expect_revert("must send exactly the escrow amount"):
        c.fund(e)
    direct_vm.value = 0

def test_fund_twice(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = deploy(direct_vm, direct_deploy); direct_vm.warp(T0)
    e = mk(direct_vm, c, direct_alice, direct_bob)
    fund(direct_vm, c, direct_alice, e)
    direct_vm.sender = direct_alice; direct_vm.value = AMOUNT
    with direct_vm.expect_revert("escrow already funded or closed"):
        c.fund(e)
    direct_vm.value = 0

def test_missing_escrow(direct_vm, direct_deploy):
    c = deploy(direct_vm, direct_deploy)
    with direct_vm.expect_revert("escrow does not exist"):
        c.get_status(999)

def test_dispute_needs_funded(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = deploy(direct_vm, direct_deploy); direct_vm.warp(T0)
    e = mk(direct_vm, c, direct_alice, direct_bob)
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("can only dispute while funded"):
        c.open_dispute(e)

def test_evidence_only_party(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie):
    c = deploy(direct_vm, direct_deploy); direct_vm.warp(T0)
    e = mk(direct_vm, c, direct_alice, direct_bob)
    direct_vm.sender = direct_charlie
    with direct_vm.expect_revert("only buyer or seller may submit evidence"):
        c.submit_evidence(e, "hi", "")

def test_evidence_wrong_state(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = deploy(direct_vm, direct_deploy); direct_vm.warp(T0)
    e = mk(direct_vm, c, direct_alice, direct_bob)
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("evidence only while disputed or appealed"):
        c.submit_evidence(e, "hi", "")

def test_resolve_needs_dispute(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = deploy(direct_vm, direct_deploy); direct_vm.warp(T0)
    e = mk(direct_vm, c, direct_alice, direct_bob)
    fund(direct_vm, c, direct_alice, e)
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("escrow is not in a resolvable state"):
        c.resolve(e)

def test_payout_before_resolve(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = deploy(direct_vm, direct_deploy); direct_vm.warp(T0)
    e = mk(direct_vm, c, direct_alice, direct_bob)
    fund(direct_vm, c, direct_alice, e)
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("resolve the escrow before payout"):
        c.payout(e)

def test_appeal_needs_resolved(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = deploy(direct_vm, direct_deploy); direct_vm.warp(T0)
    e = mk(direct_vm, c, direct_alice, direct_bob)
    fund(direct_vm, c, direct_alice, e)
    direct_vm.sender = direct_alice; direct_vm.value = AMOUNT
    with direct_vm.expect_revert("can only appeal a resolved escrow"):
        c.appeal(e)
    direct_vm.value = 0

def test_confirm_only_buyer(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = deploy(direct_vm, direct_deploy); direct_vm.warp(T0)
    e = mk(direct_vm, c, direct_alice, direct_bob)
    fund(direct_vm, c, direct_alice, e)
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("only the buyer can confirm delivery"):
        c.confirm_delivery(e)
