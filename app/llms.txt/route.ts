import { EXAMPLES, REPO_URL, SITE_URL } from "@/lib/site";

// A plain-text guide for AI agents and crawlers (llms.txt convention).
export function GET() {
  const body = `# Jev!

> Ask anything about America’s 100 most famous politicians. Jev, TypeSafe AI’s decision model, scores all 100 with a yes/no probability each and picks the top. An open-source Jev demo. Jev’s opinion, not fact.

## Use it from an agent

- JSON API: GET ${SITE_URL}/api/v1/ask?q=Best%20president%20ever (or POST {"question": "..."}). Returns status (answered, nobody, refused), the top pick, every pick with its probability, a link, and a share-card image.
- MCP server (Streamable HTTP): ${SITE_URL}/api/mcp. Tools: ask_jev(question), list_politicians().
- Limits: 20 requests a minute per IP; questions up to 140 characters; the same question returns the same answer for a day.
- Guardrails: questions about abuse or private traits (sexuality, health, religion) are refused; accusations (crime, bigotry) only name people at 90% or higher; "openly gay" answers come only from a checked public-record list.

## Pages

- [Home](${SITE_URL}/): ask a question
- [How it works](${SITE_URL}/how-it-works): methodology, thresholds, guardrails, code
- [What Jev says](${SITE_URL}/questions): Jev’s answers to common questions
- [Source code](${REPO_URL}): MIT

## Example questions

${EXAMPLES.filter((q) => !/corrupt/i.test(q)).map((q) => `- ${q}`).join("\n")}
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
