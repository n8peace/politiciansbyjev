// One place for the site's name, address, and words, so pages, share cards,
// the sitemap, and structured data all say the same thing.

// Canonical address. Previews point here too, so search engines only ever
// see one copy of each page.
export const SITE_URL = "https://politiciansbyjev.vercel.app";
export const SITE_NAME = "Jev!";
export const REPO_URL = "https://github.com/n8peace/politiciansbyjev";
export const JEV_URL = "https://vercel.com/ai-gateway/models/jev";

export const TITLE = "Jev! · A Jev AI demo: ask about 100 US politicians";
export const DESCRIPTION =
  "Ask anything about America’s 100 most famous politicians. Jev, TypeSafe AI’s decision model, scores all 100 in under a second and the picks float out of the pile. An open-source Jev demo. Blame Jev.";
export const KEYWORDS = [
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
  "most corrupt politician",
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

export const askUrl = (q: string) => `${SITE_URL}/?q=${encodeURIComponent(q)}`;
