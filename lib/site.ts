// One place for the site's name, address, and words, so pages, share cards,
// the sitemap, and structured data all say the same thing.

// The app's own domain. Agents use it: the JSON API, the MCP server,
// /llms.txt, /og and /faces stay at its root, exactly where outside connector
// listings point.
export const SITE_URL = "https://politiciansbyjev.vercel.app";
// People play it on Nate's site. natepeace.com rewrites BASE and everything
// under it to this app, so the address bar stays on natepeace.com. Every page
// link, image, fetch and share address carries BASE; the app also still
// answers at its own root for agents.
export const BASE = "/games/politicians-by-jev";
// Canonical address for every human page. Previews point here too, so search
// engines only ever see one copy of each page.
const HOME_ORIGIN = "https://www.natepeace.com";
export const HOME_URL = `${HOME_ORIGIN}${BASE}`;
// A page path on whichever host is serving it: at("/play") -> "/games/politicians-by-jev/play".
export const at = (path: string) => (path === "/" ? BASE : `${BASE}${path}`);
export const SITE_NAME = "Jev!";
// The name Google shows above search results. "Jev" alone is also the model's
// name, so the site goes by its full name and keeps "Jev!" as the short one.
export const FULL_NAME = "Politicians by Jev";
export const REPO_URL = "https://github.com/n8peace/politiciansbyjev";
export const CONTACT_EMAIL = "support@bananaintelligence.ai";
export const JEV_URL = "https://vercel.com/ai-gateway/models/jev";

export const TITLE = "Politicians by Jev · A silly free game, 100 US politicians";
export const DESCRIPTION =
  "A silly free game: ask anything and watch 100 famous US politicians float or sink. Jev, TypeSafe AI’s model, scores all 100 in under a second. Blame Jev.";
export const KEYWORDS = [
  "silly game with politicians",
  "free party game",
  "Jev",
  "Jev AI",
  "Jev model",
  "Jev demo",
  "Jev example",
  "TypeSafe AI",
  "System One model",
  "Vercel AI Gateway",
  "AI SDK evaluate",
  "AI ranks politicians",
  "US politicians",
  "best president",
];

// Example questions: the chips on the page, the "What Jev says" page, and
// the sitemap all use this list.
export const EXAMPLES = [
  "Best president ever",
  "Who’s the most corrupt?",
  "Who would win a fistfight?",
  "Who’s the richest?",
  "Who has the best hair?",
  "Who’s the funniest?",
  "Who would survive a zombie apocalypse?",
  "Who gives the best speeches?",
];

// Questions we put in front of search engines. "Most corrupt" stays on the
// site but out of the index: an indexed page would rank living people's
// names next to the word "corrupt", outside the context of the toy.
export const INDEXED = EXAMPLES.filter((q) => !/corrupt/i.test(q));

export const askPath = (q: string) => `${BASE}?q=${encodeURIComponent(q)}`;
export const askUrl = (q: string) => `${HOME_ORIGIN}${askPath(q)}`;

// Readable, stable URL piece for a question: "Who’s the richest?" -> "whos-the-richest".
export const slugFor = (q: string) =>
  q.toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const questionBySlug = (slug: string) => INDEXED.find((q) => slugFor(q) === slug);
export const questionPath = (q: string) => `/questions/${slugFor(q)}`;
