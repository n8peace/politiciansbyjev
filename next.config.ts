import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The share card reads portraits and fonts from disk at request time.
  outputFileTracingIncludes: {
    "/og": [
      "./public/faces/*.jpg",
      "./node_modules/@fontsource/archivo-black/files/archivo-black-latin-400-normal.woff",
      "./node_modules/@fontsource/geist-sans/files/geist-sans-latin-{400,500,600}-normal.woff",
    ],
  },
};

export default nextConfig;
