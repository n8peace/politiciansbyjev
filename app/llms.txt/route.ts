import { EXAMPLES, HOME_URL, REPO_URL, SITE_URL } from "@/lib/site";

// A plain-text guide for AI agents and crawlers (llms.txt convention).
export function GET() {
  const body = `# Jev!

> A silly free game: ask anything about America’s 100 most famous politicians and watch them float or sink. Jev, TypeSafe AI’s decision model, scores all 100 with a yes/no probability each and picks the top. An open-source Jev demo. Jev’s opinion, not fact.

## Use it from an agent

- JSON API: GET ${SITE_URL}/api/v1/ask?q=Best%20president%20ever (or POST {"question": "..."}). Returns status (answered, nobody, refused), the top pick, every pick with its probability, a link, and a share-card image.
- MCP server (Streamable HTTP): ${SITE_URL}/api/mcp. Tools: ask_jev(question), list_politicians().
- Limits: 20 requests a minute per IP; questions up to 140 characters; the same question returns the same stored answer for 30 days.
- Guardrails: questions about abuse or private traits (sexuality, health, religion) are refused; accusations (crime, bigotry) only name people at 90% or higher; "openly gay" answers come only from a checked public-record list.

## Pages

- [Home](${HOME_URL}): ask a question
- [Play: a silly game with politicians](${HOME_URL}/play): free party game, simple rules for taking turns
- [How it works](${HOME_URL}/how-it-works): methodology, thresholds, guardrails, code
- [How Jev scores a question](${HOME_URL}/how-it-works/scoring): the method, with real numbers: one yes/no call per politician, the 80% and 55% bars, what gets refused
- [Release log](${HOME_URL}/releases): every feature that went live, with its date and reason
- [What Jev says](${HOME_URL}/questions): Jev’s answers to common questions
- [Source code](${REPO_URL}): MIT

## Example questions

${EXAMPLES.filter((q) => !/corrupt/i.test(q)).map((q) => `- ${q}`).join("\n")}
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
