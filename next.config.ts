import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  experimental: {
    agentUpgrade: "latest",
  },
};

export default nextConfig;
