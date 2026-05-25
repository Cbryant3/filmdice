import type { NextConfig } from "next";

// Copy this file to next.config.ts.
// When running on a local network (.\start.ps1 -Network), start.ps1 patches
// allowedDevOrigins automatically with your machine's detected IP.
const nextConfig: NextConfig = {
  allowedDevOrigins: [],
};

export default nextConfig;
