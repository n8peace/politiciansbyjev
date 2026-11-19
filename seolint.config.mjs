// SEO check on the built site. Next.js prerenders pages into .next/server/app.
// Runs after every `next build` (npm run build). Errors fail the build; warnings print.
// The pages are served on natepeace.com under /games/politicians-by-jev;
// scripts/seo-stage.mjs copies the built HTML to that path first.
export default {
  host: "https://www.natepeace.com",
  inputs: [".seolint"],
  ignore: ["_not-found.html", "_global-error.html"],
  rules: {
    // robots.txt and sitemap.xml come from route handlers, so they aren't plain files in the build
    "site.robots": false,
    "site.sitemap": false,
    // "/" and "/questions" are server-rendered routes (no .html in the build), so link targets can't be checked as files
    "site.link.exists": false,
  },
};
