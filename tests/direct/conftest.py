import json
CONTRACT = "contracts/escrow_arbiter_v3.py"
DW=259200; FW=604800; AW=172800; AMOUNT=1000

def _hex(a):
    return a.as_hex if hasattr(a,"as_hex") else a

def deploy(vm, dep, owner=None, fee=0, frec=""):
    if owner is not None: vm.sender = owner
    return dep(CONTRACT, fee, frec)

def mk(vm, c, s, cp, role="buyer", amt=AMOUNT, dw=DW, fw=FW, aw=AW):
    vm.sender = s
    r = c.create_escrow(_hex(cp), role, amt, "Job", "Terms", dw, fw, aw)
    return json.loads(r)["id"]

def fund(vm, c, s, eid, amt=AMOUNT):
    vm.sender = s; vm.value = amt
    r = c.fund(eid); vm.value = 0
    return r

T0 = "2027-01-01T00:00:00Z"
TFAR = "2027-12-01T00:00:00Z"

def disputed(vm, c, b, s, ev="buyer says done"):
    vm.warp(T0)
    e = mk(vm, c, b, s)
    fund(vm, c, b, e)
    vm.sender = s; c.open_dispute(e)
    vm.sender = b; c.submit_evidence(e, ev, "")
    vm.warp(TFAR)
    return e

TEND = "2028-06-01T00:00:00Z"
