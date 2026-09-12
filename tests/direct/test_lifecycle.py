import json
from conftest import deploy, mk, fund, _hex, AMOUNT

def st(c, e):
    return json.loads(c.get_status(e))

def test_create_id0(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = deploy(direct_vm, direct_deploy)
    assert mk(direct_vm, c, direct_alice, direct_bob) == 0

def test_status_after_create(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = deploy(direct_vm, direct_deploy)
    e = mk(direct_vm, c, direct_alice, direct_bob)
    s = st(c, e)
    assert s["state"] == "CREATED"
    assert s["buyer"] == _hex(direct_alice)
    assert s["seller"] == _hex(direct_bob)
    assert s["amount_wei"] == AMOUNT

def test_fund(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = deploy(direct_vm, direct_deploy)
    e = mk(direct_vm, c, direct_alice, direct_bob)
    fund(direct_vm, c, direct_alice, e)
    assert st(c, e)["state"] == "FUNDED"
from conftest import T0, TFAR

def test_confirm_release(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = deploy(direct_vm, direct_deploy); direct_vm.warp(T0)
    e = mk(direct_vm, c, direct_alice, direct_bob)
    fund(direct_vm, c, direct_alice, e)
    direct_vm.sender = direct_alice; c.confirm_delivery(e)
    s = st(c, e)
    assert s["state"]=="RESOLVED" and s["verdict"]=="RELEASE"

def test_timeout_release(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = deploy(direct_vm, direct_deploy); direct_vm.warp(T0)
    e = mk(direct_vm, c, direct_alice, direct_bob)
    fund(direct_vm, c, direct_alice, e)
    direct_vm.warp(TFAR); direct_vm.sender = direct_alice
    r = json.loads(c.claim_timeout(e))
    assert r["verdict"]=="RELEASE" and r["state"]=="RESOLVED"

def test_timeout_refund(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = deploy(direct_vm, direct_deploy); direct_vm.warp(T0)
    e = mk(direct_vm, c, direct_alice, direct_bob)
    fund(direct_vm, c, direct_alice, e)
    direct_vm.sender = direct_bob; c.open_dispute(e)
    direct_vm.warp(TFAR)
    r = json.loads(c.claim_timeout(e))
    assert r["verdict"]=="REFUND" and r["state"]=="RESOLVED"
