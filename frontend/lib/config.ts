import deployment from "./deployment.json";

export const CHAIN = {
  id: 4221,
  hexId: "0x107d",
  name: "GenLayer Bradbury",
  rpc: "https://rpc-bradbury.genlayer.com",
  explorer: "https://explorer-bradbury.genlayer.com",
  currency: { name: "GEN", symbol: "GEN", decimals: 18 },
} as const;

export type Deployment = {
  version: string; chain: string; status?: string;
  address?: string; deployTx?: string; owner?: string;
};

const ZERO = "0x0000000000000000000000000000000000000000";
export const DEPLOYMENT = deployment as Deployment;
export const CONTRACT_ADDRESS: string | null =
  DEPLOYMENT.address && DEPLOYMENT.address !== ZERO ? DEPLOYMENT.address : null;
export const IS_DEPLOYED = CONTRACT_ADDRESS !== null && DEPLOYMENT.status !== "PENDING";
