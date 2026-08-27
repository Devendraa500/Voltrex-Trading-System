import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Point the workspace root one level up so the API route can read ../data/
  outputFileTracingRoot: path.join(__dirname, ".."),
};

export default nextConfig;
