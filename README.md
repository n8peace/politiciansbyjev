# Jev! — politicians by Jev

America's 100 most famous politicians sit in a physics pile. Ask a question and
[Jev](https://vercel.com/ai-gateway/models/jev) (TypeSafe AI's decision model, via Vercel AI Gateway)
gives each person a yes/no probability. Faces past the threshold float up in groups:

- **Jev is sure**: 80% or higher
- **Jev thinks so**: 55–80%
- **Jev's best guess**: nobody cleared 55%, so the top 3 (if at least 20%)

Thresholds live in `lib/tiers.ts`. The people are in `data/politicians.json`; portraits are
saved to `public/faces` by `node scripts/fetch-faces.mjs`.

## Run it

```bash
npx vercel link && npx vercel env pull .env.local
npm run dev
```

AI Gateway auth uses the Vercel OIDC token, so no API key is needed.
