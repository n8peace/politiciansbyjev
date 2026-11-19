import type { NextConfig } from "next";
import { BASE, HOME_URL } from "./lib/site";

// Human pages on the app's own domain move to natepeace.com. Temporary (307)
// so it is easy to undo. Only this host: previews and local runs keep their
// root, and requests natepeace.com proxies in arrive under BASE, so they never
// match these root paths. Agent addresses (/api, /og, /llms.txt, /faces,
// /.well-known, sitemap, robots) are not listed and keep answering at the root.
const OLD_HOST = "politiciansbyjev.vercel.app";
const HUMAN_PAGES = ["/play", "/how-it-works/:path*", "/questions/:path*", "/releases", "/credits", "/privacy", "/terms"];

const nextConfig: NextConfig = {
  // Pages are served under BASE on natepeace.com, so the browser must fetch
  // /_next files from there too, not from natepeace.com's own /_next.
  assetPrefix: BASE,
  async rewrites() {
    return {
      // BASE and everything under it is the same app, except the paid and
      // generated routes: /api/* and /og never answer under BASE, so the
      // firewall rule on /api and /og (root paths) covers every call to them.
      // natepeace.com sends BASE/api/ask and BASE/og to the root routes here.
      beforeFiles: [
        { source: BASE, destination: "/" },
        { source: `${BASE}/:path((?!(?:api|og)(?:/|$)).+)`, destination: "/:path" },
      ],
    };
  },
  async redirects() {
    const has = [{ type: "host" as const, value: OLD_HOST }];
    return [
      { source: "/", destination: HOME_URL, permanent: false, has },
      ...HUMAN_PAGES.map((source) => ({ source, destination: `${HOME_URL}${source}`, permanent: false, has })),
    ];
  },
  // The share card reads portraits and fonts from disk at request time.
  outputFileTracingIncludes: {
    "/og": [
      "./public/faces/*.jpg",
      "./public/faces/sm/*.jpg",
      "./public/faces/gray/*.jpg",
      "./node_modules/@fontsource/archivo-black/files/archivo-black-latin-400-normal.woff",
      "./node_modules/@fontsource/geist-sans/files/geist-sans-latin-{400,500,600}-normal.woff",
    ],
  },
};

export default nextConfig;
