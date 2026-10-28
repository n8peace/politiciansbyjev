@AGENTS.md

# Jev! project notes

## Deploying (SOP)

Nate approves every production deploy. The steps, in order:

1. **Branch.** Work on a branch, never directly on `main`.
2. **Check.** `npx tsc --noEmit`, `npx eslint app lib`, `npm run build`. Lint only `app lib scripts`: other sessions may leave worktrees under `.claude/` whose build files fail lint.
3. **Preview.** `npx vercel deploy --yes`. Previews sit behind Vercel login. For scripts, send `x-vercel-trusted-oidc-idp-token` from `.env.local` (`npx vercel env pull .env.local --yes` refreshes it), or use `npx vercel curl <url>`. Never print the token.
4. **Look.** Screenshot phone (375, 390), tablet (768), and desktop (1024, 1440) widths, idle and answered states, plus reduced motion. Check `/og?q=...` renders.
5. **Ask Nate.** Send the preview link. Wait for an explicit "go live".
6. **Ship.** Merge the branch into `main` (fast-forward), then `npx vercel deploy --prod --yes`.
7. **Verify live.** `/`, `/how-it-works`, `/questions`, `/credits`, `/sitemap.xml`, `/robots.txt` (must allow on production), `/og`, `/og?q=Best%20president%20ever` (JPEG), a 404, and the guardrails: `who is gay` returns `{"blocked":true}`, `Who is racist` returns `mode: "strict"`.
8. **Push to GitHub.** `git push origin main`. The repo is public (MIT) and `/how-it-works` links to it, so it must match production. Nate approved pushing as part of every go-live (2026-10-28). If the push dies with "remote end hung up" (large image commits), retry with `git -c http.postBuffer=157286400 push origin main`.
9. **Report.** Tell Nate (and HQ, if it asked) what shipped and what was verified.

## Guardrails that must survive every change

- Accusation questions (crime, bigotry) only name people at 90%+; lower scores never leave the server.
- Abuse and private-trait questions are refused.
- "Openly gay" answers come only from `publiclyOut` in `data/politicians.json`.
- Refusal share cards never print the visitor's question.
- "Most corrupt" stays out of `/questions` and the sitemap (`INDEXED` in `lib/site.ts`).
