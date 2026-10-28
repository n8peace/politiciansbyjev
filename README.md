# Jev! · politicians by Jev

An open-source demo of [Jev](https://vercel.com/ai-gateway/models/jev), TypeSafe AI's decision model,
on Vercel AI Gateway. America's 100 most famous politicians sit in a physics pile. Ask a question and
Jev scores every one of them (100 yes/no calls, under a second); the top pick floats out, runners-up
follow, and everyone who missed turns gray.

Live: https://politiciansbyjev.vercel.app · Methodology: https://politiciansbyjev.vercel.app/how-it-works

- Thresholds and verdict rules: `lib/verdict.ts` (80% sure, 55% thinks so, 40% best guess)
- Jev calls, question sorting, guardrails, and the one-a-day answer cache: `lib/answer.ts`
- Per-question share card: `app/og/route.tsx`
- The people: `data/politicians.json`; portraits saved by `node scripts/fetch-faces.mjs`

## Run it

```bash
npx vercel link && npx vercel env pull .env.local
npm run dev
```

AI Gateway auth uses the Vercel OIDC token, so no API key is needed.

## License

Code: MIT (see `LICENSE`). Portraits: each under its own license, credited in [`CREDITS.md`](./CREDITS.md).
