import json
from conftest import deploy, disputed, AMOUNT

DEC = '{"verdict":"%s","seller_bps":%d,"reason":"ok","key_facts":["k"]}'
TAPP = "2027-12-02T12:00:00Z"

def st(c, e):
    return json.loads(c.get_status(e))

def test_appeal_opens(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = deploy(direct_vm, direct_deploy)
    e = disputed(direct_vm, c, direct_alice, direct_bob)
    direct_vm.mock_llm(r"impartial escrow arbiter", DEC % ("RELEASE",10000))
    direct_vm.sender = direct_alice; c.resolve(e)
    direct_vm.sender = direct_alice; direct_vm.value = AMOUNT
    r = json.loads(c.appeal(e)); direct_vm.value = 0
    assert r["state"] == "APPEALED"

def test_appeal_changed(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = deploy(direct_vm, direct_deploy)
    e = disputed(direct_vm, c, direct_alice, direct_bob)
    direct_vm.mock_llm(r"impartial escrow arbiter", DEC % ("RELEASE",10000))
    direct_vm.sender = direct_alice; c.resolve(e)
    direct_vm.sender = direct_alice; direct_vm.value = AMOUNT
    c.appeal(e); direct_vm.value = 0
    direct_vm.warp(TAPP); direct_vm.clear_mocks()
    direct_vm.mock_llm(r"impartial escrow arbiter", DEC % ("REFUND",0))
    r = json.loads(c.resolve_appeal(e))
    assert r["verdict"]=="REFUND" and r["changed"] is True

def test_appeal_wrong_party(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = deploy(direct_vm, direct_deploy)
    e = disputed(direct_vm, c, direct_alice, direct_bob)
    direct_vm.mock_llm(r"impartial escrow arbiter", DEC % ("RELEASE",10000))
    direct_vm.sender = direct_alice; c.resolve(e)
    direct_vm.sender = direct_bob; direct_vm.value = AMOUNT
    with direct_vm.expect_revert("only the losing party may appeal"):
        c.appeal(e)
    direct_vm.value = 0

def test_appeal_wrong_bond(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = deploy(direct_vm, direct_deploy)
    e = disputed(direct_vm, c, direct_alice, direct_bob)
    direct_vm.mock_llm(r"impartial escrow arbiter", DEC % ("RELEASE",10000))
    direct_vm.sender = direct_alice; c.resolve(e)
    direct_vm.sender = direct_alice; direct_vm.value = AMOUNT + 1
    with direct_vm.expect_revert("appeal bond must equal the escrow amount"):
        c.appeal(e)
    direct_vm.value = 0
