# v3 Deployment status (GenLayer Bradbury testnet)

Status: PENDING - deploy transaction submitted, but Bradbury validators are
not finalizing transactions right now (consensus returns UNINITIALIZED /
NOT_VOTED). This is a network-side outage, not a contract or script error.

- Contract: EscrowArbiter (contracts/escrow_arbiter_v3.py)
- Constructor args: [protocol_fee_bps=0, fee_recipient=""]
- Deployer / owner: 0x198a1952BD58984281f57CF824d264cdbd412814
- Chain: Bradbury testnet (chainId 0x107d / 4221)
- RPC: https://rpc-bradbury.genlayer.com
- Pending deploy tx: 0x524352349da5ef727d4028138c51dd3d25c48095a9520d00ee22de2623f936f8

## How this was verified
- `node --env-file=.env scripts/deploy.mjs` submitted the tx and returned a hash.
- `scripts/poll.mjs <hash>` polled for >30 min: every attempt returned
  status=UNINITIALIZED, exec=NOT_VOTED (validators not voting).
- A second deploy was rejected: "insufficient gas price to replace existing
  transaction" - proving the first tx still holds the nonce in the mempool
  (submission works; only network-side finalization is blocked).

## TODO (finish when Bradbury validators resume)
1. Re-check: node --env-file=.env scripts/poll.mjs 0x524352349da5ef727d4028138c51dd3d25c48095a9520d00ee22de2623f936f8
2. If it never finalizes, clear the stuck nonce (higher-gas self-tx), then
   re-run: node --env-file=.env scripts/deploy.mjs
3. On CLEAN DEPLOY OK, deployments.json is rewritten with the contract address.
4. Then run the lifecycle proof script to capture real tx hashes into this folder.
