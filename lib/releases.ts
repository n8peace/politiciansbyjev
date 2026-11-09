// The public release log: what went live on the production site, when, and
// why. Newest first. The /releases page, the sitemap, and llms.txt read this.

export type Release = {
  date: string; // the day it went live on production, YYYY-MM-DD
  slug: string; // anchor on /releases
  title: string;
  what: string;
  why: string;
};

export const RELEASES: Release[] = [
  {
    date: "2026-11-09",
    slug: "counts",
    title: "Counting agent calls and tagged links",
    what: "Questions sent through the JSON API and the MCP server are now counted by day, by how they arrived, and by what Jev answered. A link tagged with ?ref= counts the visits and questions it brings in. The tag is removed from the address once it is counted.",
    why: "We can only grow what we can measure. Agents were invisible before, and so was which post sent people to the site. The question text is never counted, only its type, as the privacy page says.",
  },
  {
    date: "2026-11-02",
    slug: "weigh-in",
    title: "The weigh-in chart",
    what: "After an answer, all 100 faces pour into a chart of ten columns, one per 10 points of Jev’s score. The picks stay in color at the high end and everyone else turns gray. The share card draws the same chart along its bottom edge.",
    why: "A top pick says who won. The chart shows how close it was. For “Who would survive a zombie apocalypse?” Theodore Roosevelt sits alone in the 60s column at 66%, with six people bunched at 55 to 57% just under him. Plain answers get the chart; strict and refused questions don’t, because their low scores are never sent to the page.",
  },
  {
    date: "2026-11-02",
    slug: "slow-links",
    title: "The pile arrives as one on slow connections",
    what: "The 100 portraits went from 691 KB to 344 KB in total, with no visible change. The pile now waits until most faces have loaded and appears all at once, instead of filling in face by face.",
    why: "On a 6 Mbps connection the old pile had holes until 2.2 seconds. The new one appears whole at 1.3 seconds, which matters most on a first visit from a phone.",
  },
  {
    date: "2026-11-02",
    slug: "agent-api",
    title: "A JSON API and an MCP server for agents",
    what: "GET /api/v1/ask?q=… returns Jev’s verdict as JSON: the top pick, every pick with its probability, a link, and a share card. /api/mcp is an MCP server with two tools, ask_jev and list_politicians. /llms.txt describes both.",
    why: "AI assistants can ask Jev directly instead of scraping the page. They get the same stored answer, the same guardrails, and the same limit of 20 questions a minute as a person on the site.",
  },
  {
    date: "2026-11-02",
    slug: "first-screen",
    title: "A real answer on the first screen",
    what: "A new visitor sees the pile already settled and a real answer in place, “Best president ever” with Abraham Lincoln at 94% and three runners-up floating out of the pile, before typing anything.",
    why: "An empty search box asks people to guess what the site does. A real answer shows it in one look. The page, the share link, the API, and MCP also now read one stored answer per question, so they never disagree by a point.",
  },
  {
    date: "2026-10-28",
    slug: "launch",
    title: "Share cards, the method page, and open source",
    what: "Each question got its own share card and link, plus a page explaining how Jev! works, photo credits, and the full source on GitHub under the MIT license.",
    why: "A verdict is only fun if you can send it to someone, and an AI ranking real people should show its method.",
  },
  {
    date: "2026-10-02",
    slug: "first-version",
    title: "Jev! goes public",
    what: "A pile of America’s 100 most famous politicians, as faces you can grab and fling. Ask any question and Jev scores all 100 at once; whoever clears the bar floats up out of the pile.",
    why: "A fun way to see what Jev, TypeSafe AI’s decision model, can do: 100 judgments in under a second. From day one, questions about crimes or bigotry only name people Jev rates at 90% or higher, and questions about abuse or private traits are refused.",
  },
];

export const LATEST = RELEASES[0].date;
