import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  logging: {incomingRequests: {ignore: [/^\/reset-password(?:[/?]|$)/]}},
  async headers() {
      return [{source: "/reset-password", headers: [
          {key: "Referrer-Policy", value: "no-referrer"},
          {key: "Cache-Control", value: "no-store"},
          {key: "X-Robots-Tag", value: "noindex, nofollow"},
      ]}];
  },
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
