import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    turbopack: {
      // Sometimes needed in monorepos or complex Windows setups
    },
  },
};

export default nextConfig;
