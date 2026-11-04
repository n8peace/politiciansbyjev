# Listings for Jev's MCP server

The server is live at `https://politiciansbyjev.vercel.app/api/mcp` (Streamable HTTP, no sign-in). Tools: `ask_jev(question)` and `list_politicians()`. Every listing below waits on Nate's yes, because each one is public.

## 1. Official MCP Registry (first; Glama, PulseMCP and mcp.directory copy from it)

`registry/server.json` is ready and passes `mcp-publisher validate`. The name `io.github.n8peace/politiciansbyjev` is proven by Nate's GitHub sign-in.

```bash
cd launch/registry && mcp-publisher login github && mcp-publisher publish
```

The login prints a short code and a GitHub link; Nate opens the link, pastes the code, and clicks Authorize. Then `publish` prints the listing. Check it with:

```bash
curl -s "https://registry.modelcontextprotocol.io/v0/servers?search=politiciansbyjev"
```

## 2. Listing text for connector stores (Claude, ChatGPT, Google, Grok)

- **Name:** Politicians by Jev
- **Short description (under 100 characters):** Ask anything about 100 famous US politicians; Jev scores all 100 and picks.
- **Long description:** Ask any question about America's 100 most famous politicians, from "best president ever" to "who would survive a zombie apocalypse". Jev, TypeSafe AI's decision model, gives each of the 100 a yes/no probability and returns the top pick, every pick above the bar with its score, a link, and a share card. Questions about crimes or bigotry only name people Jev rates at 90% or higher; questions about abuse or private traits are refused. Free, no account, 20 questions a minute. Jev's opinion, not fact.
- **Example prompts:** "Ask Jev who the best president ever was." "Ask Jev who would win a fistfight." "Who does Jev think has the best hair?"
- **Privacy:** no sign-in, no cookies; the question text is stored with its answer for 30 days so repeat asks return the same numbers. Only aggregate counts are tracked.
- **Links:** site https://politiciansbyjev.vercel.app · method https://politiciansbyjev.vercel.app/how-it-works/scoring · source https://github.com/n8peace/politiciansbyjev (MIT)
