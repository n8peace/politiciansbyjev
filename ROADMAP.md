# Politicians by Jev Roadmap

## Up next
Last refreshed: 2026-11-01

<!-- roadmap:matrix:start -->
| # | Item | Value / use case | Depends on | Owner | Status |
|---|---|---|---|---|---|
| 1 | Check and preview the first-screen branch: settled faces and a real example answer on the empty screen, tested on phone, tablet and desktop, plus reduced motion | A first-time visitor sees a real answer and a calm pile instead of an empty one, so more of them ask a question | none | Agent | in progress |
| 7 | A headless way in: a JSON API and an MCP server so agents can ask Jev and get the verdict, with the same guardrails and rate limit | Other people's agents (and Claude) can use Jev without the page; a second way questions get asked | none | Agent | blocked: #2 (built and checked on preview) |
| 2 | Look at the preview (first screen plus the agent API) and say "go live" (default: go live if the screenshots look right) | The deploy rule is that Nate approves every production deploy | #1 | Nate | blocked: #1 |
| 3 | Ship it: merge to main, deploy to production, run the live guardrail checks, push to GitHub | The live site and the open-source repo match, and the guardrails are proven on production | #2 | Agent | blocked: #2 |
| 4 | Share Jev once with real people (default: the LinkedIn post the CMO drafted for Fri Nov 6) | Questions asked is "under 10, mostly tests"; the value rating reaches 7 when people share it | #3 | Nate | blocked: #3 |
<!-- roadmap:matrix:end -->

## Later
- Submit Jev! to madewithjev.com, the public gallery of Jev builds (Nate's call; it's public)

## Shipped
| # | Item | Value / use case | Depends on | Owner | Status |
|---|---|---|---|---|---|
| 5 | Share cards, a how-it-works page, photo credits, SEO and a polish pass from four design critiques | Every answer is worth sharing and every claim on the page is one we can stand behind | none | Agent | done 2026-10-27 |
| 6 | Questions-asked counter (no cookies) and web analytics with a Share event | The north star number, questions asked, is now counted | none | Agent | done 2026-10-27 |
