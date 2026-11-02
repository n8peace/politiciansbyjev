import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { MAX_LEN } from "@/lib/answer";
import { askHeadless, headlessText, roster } from "@/lib/headless";
import { limited } from "@/lib/limit";

// MCP server for agents: add https://politiciansbyjev.vercel.app/api/mcp to
// any client that speaks Streamable HTTP. Same guardrails as the site.

export const maxDuration = 30;

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "ask_jev",
      {
        title: "Ask Jev about US politicians",
        description:
          "Ask a question about America’s 100 most famous politicians (best president, who would win a fistfight, who has the best hair). Jev, TypeSafe AI’s decision model, scores all 100 and returns its top pick, the runners-up, and how sure it is. Opinion, not fact. Questions about abuse or private traits are refused; accusations only name people at 90% or higher.",
        inputSchema: z.object({
          question: z.string().min(1).max(MAX_LEN).describe("The question, in plain words."),
        }),
        annotations: { readOnlyHint: true, openWorldHint: false },
      },
      async ({ question }) => {
        const v = await askHeadless(question);
        return { content: [{ type: "text", text: headlessText(v) }], structuredContent: v };
      },
    );

    server.registerTool(
      "list_politicians",
      {
        title: "List the 100 politicians",
        description: "The 100 politicians Jev chooses from, with role, years in office, and whether they are current or historic.",
        inputSchema: z.object({}),
        annotations: { readOnlyHint: true, openWorldHint: false },
      },
      async () => {
        const people = roster();
        return {
          content: [{ type: "text", text: people.map((p) => `${p.name} (${p.role}, ${p.years})`).join("\n") }],
          structuredContent: { politicians: people },
        };
      },
    );
  },
  { serverInfo: { name: "jev-politicians", version: "1.0.0" } },
);

async function guarded(req: Request) {
  if (limited(req)) return Response.json({ error: "Slow down: 20 requests a minute." }, { status: 429 });
  return handler(req);
}

export { guarded as GET, guarded as POST, guarded as DELETE };
