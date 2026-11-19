// The pages are served on natepeace.com under /games/politicians-by-jev, but
// Next.js writes them to .next/server/app without that path. Copy the built
// HTML to .seolint/games/politicians-by-jev so seolint sees each page at its
// public address. Runs between `next build` and `seolint` (npm run build).
import { cpSync, rmSync, statSync } from "node:fs";

rmSync(".seolint", { recursive: true, force: true });
cpSync(".next/server/app", ".seolint/games/politicians-by-jev", {
  recursive: true,
  filter: (src) => statSync(src).isDirectory() || src.endsWith(".html"),
});
