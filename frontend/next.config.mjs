const repo = "genlayer-escrow-dapp";
const isProd = process.env.NODE_ENV === "production";
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: { unoptimized: true },
  basePath: isProd ? "/" + repo : "",
  assetPrefix: isProd ? "/" + repo + "/" : "",
  trailingSlash: true,
};
export default nextConfig;
