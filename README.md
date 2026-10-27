# Jev! — politicians by Jev

America's 100 most famous politicians sit in a physics pile. Ask a question and
[Jev](https://vercel.com/ai-gateway/models/jev) (TypeSafe AI's decision model, via Vercel AI Gateway)
answers it two ways at once:

- **Each person on their own:** a yes/no probability for all 100. This sorts the pile: likely
  faces bubble up, unlikely ones sink and turn grey.
- **Everyone at once:** a forced choice for the single best (and worst) answer. Judged alone,
  opinion questions bunch up (12 people at 55-64% on "best hair"); forced to choose, Jev commits.

"One winner" questions (funniest, best hair) show **Jev's pick**, up to four **close behind**, and,
when it isn't an insult in disguise, the **bottom of the pile**. "Everyone who fits" questions
(who's from Texas) show **Jev is sure** (80%+) and **Jev thinks so** (55-80% and clearly above the
field). Accusations only name people at 90%+, openly-LGBTQ questions answer only from a checked list,
and questions about abuse or private lives aren't answered.

Every answer has a link (`?q=...`) with a share card drawn from the same answer (`/og?q=...`).
A question costs about 11,000 Jev input tokens, roughly $0.0005.

Thresholds live in `lib/tiers.ts`; the questions Jev is asked live in `lib/answer.ts`. The people are in `data/politicians.json`; portraits are
saved to `public/faces` by `node scripts/fetch-faces.mjs`.

## Run it

```bash
npx vercel link && npx vercel env pull .env.local
npm run dev
```

AI Gateway auth uses the Vercel OIDC token, so no API key is needed.

## License

Code: MIT (see `LICENSE`). Portraits: each under its own license, credited in [`CREDITS.md`](./CREDITS.md).
