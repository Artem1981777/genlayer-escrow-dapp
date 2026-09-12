import json
from conftest import deploy, mk, fund, _hex, T0, AMOUNT

def test_stats_after_fund(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = deploy(direct_vm, direct_deploy); direct_vm.warp(T0)
    e = mk(direct_vm, c, direct_alice, direct_bob)
    fund(direct_vm, c, direct_alice, e)
    s = json.loads(c.get_stats())
    assert s["total"]==1 and s["funded"]==1 and s["volume_wei"]==AMOUNT

def test_list_escrows(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = deploy(direct_vm, direct_deploy); direct_vm.warp(T0)
    mk(direct_vm, c, direct_alice, direct_bob)
    mk(direct_vm, c, direct_alice, direct_bob)
    r = json.loads(c.list_escrows(0, 10))
    assert r["total"]==2 and len(r["items"])==2

def test_list_by_party(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = deploy(direct_vm, direct_deploy); direct_vm.warp(T0)
    e = mk(direct_vm, c, direct_alice, direct_bob)
    r = json.loads(c.list_by_party(_hex(direct_alice)))
    assert e in r["escrow_ids"]

def test_get_evidence(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = deploy(direct_vm, direct_deploy); direct_vm.warp(T0)
    e = mk(direct_vm, c, direct_alice, direct_bob)
    fund(direct_vm, c, direct_alice, e)
    direct_vm.sender = direct_bob; c.open_dispute(e)
    direct_vm.sender = direct_alice; c.submit_evidence(e, "proof", "")
    r = json.loads(c.get_evidence(e))
    assert len(r["evidence"])==1 and r["evidence"][0]["content"]=="proof"

def test_status_balance(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = deploy(direct_vm, direct_deploy); direct_vm.warp(T0)
    e = mk(direct_vm, c, direct_alice, direct_bob)
    fund(direct_vm, c, direct_alice, e)
    d = json.loads(c.get_status(e))
    assert d["balance_wei"]==AMOUNT and d["chain_now"]>0

def test_stats_disputed(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = deploy(direct_vm, direct_deploy); direct_vm.warp(T0)
    e = mk(direct_vm, c, direct_alice, direct_bob)
    fund(direct_vm, c, direct_alice, e)
    direct_vm.sender = direct_bob; c.open_dispute(e)
    s = json.loads(c.get_stats())
    assert s["disputed"]==1
