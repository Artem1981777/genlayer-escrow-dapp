import json, pytest
from conftest import deploy, disputed

DEC = '{"verdict":"%s","seller_bps":%d,"reason":"ok","key_facts":["k"]}'

def st(c, e):
    return json.loads(c.get_status(e))

@pytest.mark.parametrize("v,bps", [("RELEASE",10000),("REFUND",0),("SPLIT",6000)])
def test_resolve_verdicts(direct_vm, direct_deploy, direct_alice, direct_bob, v, bps):
    c = deploy(direct_vm, direct_deploy)
    e = disputed(direct_vm, c, direct_alice, direct_bob)
    direct_vm.mock_llm(r"impartial escrow arbiter", DEC % (v, bps))
    direct_vm.sender = direct_alice
    r = json.loads(c.resolve(e))
    assert r["verdict"] == v

def test_split_payout(direct_vm, direct_deploy, direct_alice, direct_bob):
    from conftest import TEND
    c = deploy(direct_vm, direct_deploy)
    e = disputed(direct_vm, c, direct_alice, direct_bob)
    direct_vm.mock_llm(r"impartial escrow arbiter", DEC % ("SPLIT", 6000))
    direct_vm.sender = direct_alice; c.resolve(e)
    direct_vm.warp(TEND)
    r = json.loads(c.payout(e))
    assert r["seller_wei"] == 600 and r["buyer_wei"] == 400
    assert st(c, e)["state"] == "PAID"

def test_resolve_with_web(direct_vm, direct_deploy, direct_alice, direct_bob):
    from conftest import mk, fund, T0, TFAR
    c = deploy(direct_vm, direct_deploy); direct_vm.warp(T0)
    e = mk(direct_vm, c, direct_alice, direct_bob)
    fund(direct_vm, c, direct_alice, e)
    direct_vm.sender = direct_bob; c.open_dispute(e)
    direct_vm.sender = direct_alice
    c.submit_evidence(e, "see proof", "https://x.io/p")
    direct_vm.warp(TFAR)
    direct_vm.mock_web(r"x\.io", {"status":200,"body":"delivered on time"})
    direct_vm.mock_llm(r"Extract only facts", '{"facts":["ok"],"supports":"seller"}')
    direct_vm.mock_llm(r"impartial escrow arbiter", DEC % ("RELEASE",10000))
    r = json.loads(c.resolve(e))
    assert r["verdict"] == "RELEASE"

def test_validator_agrees(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = deploy(direct_vm, direct_deploy)
    e = disputed(direct_vm, c, direct_alice, direct_bob)
    direct_vm.mock_llm(r"impartial escrow arbiter", DEC % ("RELEASE",10000))
    direct_vm.sender = direct_alice; c.resolve(e)
    assert direct_vm.run_validator() is True

def test_validator_disagrees(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = deploy(direct_vm, direct_deploy)
    e = disputed(direct_vm, c, direct_alice, direct_bob)
    direct_vm.mock_llm(r"impartial escrow arbiter", DEC % ("RELEASE",10000))
    direct_vm.sender = direct_alice; c.resolve(e)
    direct_vm.clear_mocks()
    direct_vm.mock_llm(r"impartial escrow arbiter", DEC % ("REFUND",0))
    assert direct_vm.run_validator() is False
