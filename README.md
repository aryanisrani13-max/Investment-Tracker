# Tracker

A personal investment tracker built to look and feel like a real finance app (Robinhood / Coinbase aesthetic). Mobile-first, dark, data-forward.

## Quick start

```bash
npm install
cp .env.example .env       # then paste your Finnhub key
npm run dev
```

Open http://localhost:5173.

## Environment variables

| Var | Purpose | Required |
|---|---|---|
| `VITE_FINNHUB_KEY` | Free key from https://finnhub.io/dashboard. Used for search, quotes, company profiles, sparkline. | Yes |
| `VITE_CLAUDE_PROXY_URL` | URL of a backend proxy that forwards to the Anthropic Messages API using `claude-sonnet-4-6`. Powers Research summaries and Learn explanations. | No (graceful fallback) |

### Why a proxy for Claude?

Calling the Anthropic API directly from the browser ships your API key in the bundle — anyone can read it and run up your bill. The app expects a tiny backend endpoint that holds the key.

**Proxy contract:**
- `POST <VITE_CLAUDE_PROXY_URL>`
- Body: `{ system: string, user: string, max_tokens?: number, model: string }`
- Response: `{ text: string }`

A reference implementation is ~30 LOC in any of: a Supabase edge function, a Cloudflare Worker, or a Vercel Function. Without the proxy configured, Research and Learn render readable fallback copy explaining how to wire it up.

## Tabs

1. **Portfolio** — total value, gain/loss, holdings list, swipe-to-delete, add via bottom sheet (Finnhub search).
2. **Progress** — Robinhood-style scrubbable area chart of historical portfolio value (snapshotted every refresh), with `1D / 7D / 3W / 1M / ALL` filters and stat grid.
3. **Research** — search any ticker, get an AI-generated breakdown (what they do, performance, risk, beginner-friendly), live price, and a 7-day sparkline. Compare two side-by-side.
4. **Goals** — target amount, progress bar, ETA estimated from your actual growth rate, personal note.
5. **Learn** — editorial feed of seeded topics + on-demand AI explanation for any term you search.

## Storage (localStorage)

| Key | Shape |
|---|---|
| `portfolio-holdings` | `Holding[]` |
| `portfolio-snapshots` | `Snapshot[]` (timestamped portfolio values) |
| `investment-goal` | `Goal` |
| `app-opened` | `boolean` (controls onboarding sheet) |
| `learn-topic-cache` | `Record<topicId, body>` |
| `portfolio-starting-value` | `number` (defaults to 1000) |

## Deploying to Lovable

This is a standard Vite + React + TS project. Drop the entire folder into Lovable, set `VITE_FINNHUB_KEY` (and optionally `VITE_CLAUDE_PROXY_URL`) in the project's environment variables, and deploy.

## Tech

- React 18 + TypeScript + Vite
- Tailwind CSS (custom finance palette: `bg #0a0a0a`, `surface #111`, `gain #00c805`, `loss #ff5000`)
- Recharts for the area chart and sparklines
- lucide-react for icons
- Finnhub for market data
- Anthropic `claude-sonnet-4-6` for AI features (via proxy)
