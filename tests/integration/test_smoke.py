import os, json, pytest

pytestmark = pytest.mark.skipif(
    not os.getenv("GLTEST_INTEGRATION"),
    reason="requires GenLayer Studio/localnet; set GLTEST_INTEGRATION=1",
)

def test_deploy_create_status():
    from gltest import get_contract_factory, get_accounts
    accts = get_accounts()
    buyer, seller = accts[0], accts[1]
    factory = get_contract_factory(contract_file_path="contracts/escrow_arbiter_v3.py")
    c = factory.deploy(args=[0, ""], account=buyer)
    c.create_escrow(seller.address, "buyer", 1000, "Job", "Terms",
                    259200, 604800, 172800).transact(value=0)
    s = json.loads(c.get_status(0).call())
    assert s["state"] in ("CREATED", "FUNDED")
