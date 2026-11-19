# Jev! · politicians by Jev

An open-source demo of [Jev](https://vercel.com/ai-gateway/models/jev), TypeSafe AI's decision model,
on Vercel AI Gateway. America's 100 most famous politicians sit in a physics pile. Ask a question and
Jev scores every one of them (100 yes/no calls, under a second); the top pick floats out, runners-up
follow, and everyone who missed turns gray.

Play: https://www.natepeace.com/games/politicians-by-jev · Methodology: https://www.natepeace.com/games/politicians-by-jev/how-it-works

natepeace.com rewrites `/games/politicians-by-jev` to this app, which serves every page under that path
(`BASE` in `lib/site.ts`). `/api` and `/og` answer only at the root; natepeace.com sends the page's
ask call and share card there. The app's own domain keeps the agent addresses at its root and sends its
human pages to natepeace.com with a temporary redirect (`next.config.ts`).

- Thresholds and verdict rules: `lib/verdict.ts` (80% sure, 55% thinks so, 40% best guess)
- Jev calls, question sorting, guardrails, and the shared 30-day answer store: `lib/answer.ts`
- Per-question share card: `app/og/route.tsx`
- The people: `data/politicians.json`; portraits saved by `node scripts/fetch-faces.mjs`

## Use it from an agent

- JSON API: `GET https://politiciansbyjev.vercel.app/api/v1/ask?q=Best%20president%20ever` (or `POST {"question": "..."}`)
- MCP server (Streamable HTTP): `https://politiciansbyjev.vercel.app/api/mcp`, tools `ask_jev` and `list_politicians`
- Same guardrails and rate limit (20 a minute) as the site; see `/llms.txt`

## Run it

```bash
npx vercel link && npx vercel env pull .env.local
npm run dev
```

AI Gateway auth uses the Vercel OIDC token, so no API key is needed.

## License

Code: MIT (see `LICENSE`). Portraits: each under its own license, credited in [`CREDITS.md`](./CREDITS.md).
