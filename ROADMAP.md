# Politicians by Jev Roadmap

## Up next
Last refreshed: 2026-11-02

<!-- roadmap:matrix:start -->
| # | Item | Value / use case | Depends on | Owner | Status |
|---|---|---|---|---|---|
| 1 | Check and preview the first-screen branch: settled faces and a real example answer on the empty screen, tested on phone, tablet and desktop, plus reduced motion | A first-time visitor sees a real answer and a calm pile instead of an empty one, so more of them ask a question | none | Agent | done 2026-11-02 |
| 7 | A headless way in: a JSON API and an MCP server so agents can ask Jev and get the verdict, with the same guardrails and rate limit | Other people's agents (and Claude) can use Jev without the page; a second way questions get asked | none | Agent | done 2026-11-02 |
| 2 | Look at the preview (first screen, agent API, shared answer store) and say "go live" | The deploy rule is that Nate approves every production deploy | none | Nate | done 2026-11-02 |
| 3 | Ship it: merge to main, deploy to production, run the live guardrail checks, push to GitHub; $20/month AI budget and firewall rate limit (30/min per IP) set first | The live site and the open-source repo match, and the guardrails are proven on production | #2 | Agent | done 2026-11-02 |
| 8 | The weigh-in: after an answer, the pile pours into ten columns by score, a histogram made of all 100 faces with the picks in color at the top end; the share card shows the same | The moment only Jev has, at the payoff: every politician weighed at once, in one screenshot worth sending; lifts the design score from 7 toward 8 | none | Agent | done 2026-11-02 |
| 9 | Set up with your agent: a hosted setup page an agent fetches and follows to connect Jev (no key, read-only), a "Copy prompt" line on the site and in how-it-works, and a one-click Cursor install link | Anyone with Claude Code, Cursor or another agent connects Jev with one paste, in the style of Resend's setup prompt; more questions asked from agents | none | Agent | next |
| 4 | Share Jev once with real people (default: the LinkedIn post the CMO drafted for Fri Nov 6) | Questions asked is "under 10, mostly tests"; the value rating reaches 7 when people share it | #3 | Nate | next |
<!-- roadmap:matrix:end -->

## Headless plan

- **What:** agents ask Jev without the page. `GET/POST /api/v1/ask` returns JSON (status, top pick, every pick with probability and photo, the link, the share card); `/api/mcp` is an MCP server with `ask_jev` and `list_politicians`; `/llms.txt` describes both. Built and checked on preview (#7); live after Nate's yes.
- **Same rules as the site:** abuse and private-trait questions are refused, accusations only name people at 90% or higher, "openly gay" answers come only from the public-record list, and refusals never echo the question onto a card.
- **Cost per call:** about $0.00024 in Jev calls for a new question (5.6k input tokens); $0 for a repeat, since one answer per question is stored for 30 days and shared by the page, the API, MCP and share cards.
- **Abuse limits:** 20 requests a minute per IP, 140 characters per question, the daily cache. The per-IP limit is per server instance, not global. A bot sending 1 million distinct questions a day would cost about $240, so the backstop is a spend cap on Jev calls in the Vercel AI Gateway (Nate's account) plus a Vercel firewall rate-limit rule if traffic ever looks automated.
- **Not counted yet:** API and MCP asks don't fire the browser "Ask" event; count them server-side once the API sees real use.

## Agent setup plan (#9)

Nate's ask via HQ, 2026-11-02. Build on a branch, preview, no deploy without Nate's yes.

- **Page:** `/setup.md`, plain text an agent fetches and follows to connect the Jev MCP server (`/api/mcp`, tools `ask_jev` and `list_politicians`). No key: it's public and read-only.
- **Copy prompt** on the site: "Fetch and follow https://politiciansbyjev.vercel.app/setup.md to connect Jev to my agent".
- **Cursor link:** `cursor://anysphere.cursor-deeplink/mcp/install?name=jev&config=<base64 of the server config>`.
- **setup.md shape:**
  1. Title, then "verify you fetched <exact URL>".
  2. Ask all questions in one message.
  3. Numbered steps, one action each, with exact commands. Instructions in an intro line get skipped (dropped in 5 of 6 test runs elsewhere); numbered steps were followed 15 of 15.
  4. A verify step with pass/fail output (one `ask_jev` call).
  5. A report: what was done, at most 2 next steps.
  6. An already-set-up branch, so nothing is added twice.
- **Test:** run the copy prompt in a fresh, empty folder with Claude Code before showing Nate.

## Later
- Submit Jev! to madewithjev.com, the public gallery of Jev builds (Nate's call; it's public)

## Shipped
| # | Item | Value / use case | Depends on | Owner | Status |
|---|---|---|---|---|---|
| 5 | Share cards, a how-it-works page, photo credits, SEO and a polish pass from four design critiques | Every answer is worth sharing and every claim on the page is one we can stand behind | none | Agent | done 2026-10-27 |
| 6 | Questions-asked counter (no cookies) and web analytics with a Share event | The north star number, questions asked, is now counted | none | Agent | done 2026-10-27 |
