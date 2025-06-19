import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
      serverActions: {
          bodySizeLimit: "500mb"
      }
  },
    images:{
      remotePatterns: [new URL(process.env.BACKEND_URL+"/**"||"")]
    }
};

export default nextConfig;
