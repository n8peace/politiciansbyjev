import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The share image reads portraits and fonts from disk.
  outputFileTracingIncludes: {
    "/og": ["./public/faces/**/*", "./assets/**/*"],
  },
};

export default nextConfig;
