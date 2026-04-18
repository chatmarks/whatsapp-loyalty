# CLAUDE.md

## Project
WhatsApp-native digital stamp card for DACH gastro SMBs (cafés, imbiss, pizzerias).
Operators set up a loyalty program in <10 min. Customers opt in via QR code, collect
stamps and redeem rewards entirely in WhatsApp — no app, no login.

Core flows: QR opt-in → stamp → reward → blast → win-back.
8 DB tables: `businesses` `customers` `stamp_events` `blast_campaigns` `vouchers` `products` `orders` `membership_tiers`

## ⛔ NEVER
- **Touch `.env*`** — never read/edit/print/reference. Ask for key names only.
- Hardcode secrets, tokens, or passwords.
- Commit without explicit instruction.
- Run `DROP`/`DELETE`/`TRUNCATE` without confirmation.
- Log phone numbers, message content, or any PII.

## Stack
| Layer | Choice |
|---|---|
| API | Node.js + Express + TypeScript |
| DB | Supabase (Postgres via `@supabase/supabase-js`) |
| Frontend | React + Vite + **shadcn/ui** (Tailwind CSS v4) — hosted on **Vercel** |
| State | Zustand (auth) + TanStack Query v5 (server state) |
| Hosting | Backend → **Railway** (Railpack builder); Frontend → **Vercel** |
| Payments | Stripe |
| WhatsApp | Meta Cloud API (direct) |

## UI
- **shadcn/ui standard styles only** — no custom component libraries
- All components installed via CLI: `npx shadcn@latest add <component>`
- Never manually author shadcn internals — always use the CLI output
- Use `cn()` utility (from `src/lib/utils.ts`) for conditional class merging
- Charts: shadcn `chart` wrapper around Recharts
- Tables: shadcn `data-table` with `@tanstack/react-table`

## Env Keys (names only)
**Backend (Railway):** `SUPABASE_URL` `SUPABASE_SERVICE_KEY` `JWT_SECRET`
`META_WA_TOKEN` `META_WA_PHONE_ID` `META_APP_SECRET`
`STRIPE_SECRET_KEY` `STRIPE_WEBHOOK_SECRET` `CLIENT_URL` `PHONE_ENCRYPTION_KEY` `PHONE_HMAC_KEY`
`DEV_BUSINESS_ID` *(optional — activates auth bypass whenever set; never set in real multi-tenant prod)*

**Frontend (Vercel):** `VITE_API_URL` *(Railway backend URL, no trailing slash)*

## Code
- TypeScript strict, no `any`
- ES modules, named imports
- `async/await` only, max 40 lines/fn
- `camelCase` vars · `PascalCase` types · `SCREAMING_SNAKE` constants
- Zod on all API inputs — validate before any DB call
- Typed errors, never swallow silently
- Comments explain *why*, not what

## Security
- JWT `authMiddleware` on every protected route
- `express-rate-limit` on public endpoints
- Helmet + CORS whitelist (never `*` in prod)
- Phone numbers encrypted at rest; never appear in logs
- DSGVO: log `opted_in_at` + `opt_in_ip` on opt-in; full deletion on opt-out
- Verify `X-Hub-Signature-256` on all Meta webhooks

## WhatsApp Rules
- Approved templates only for outbound (marketing/utility)
- Free-form only within 24h service window
- Max 2 blasts/week/business — enforce in `BlastService`
- Validate opt-in status before every send
- Opt-out keywords: `stop`, `abmelden`, `nein`, `stopp` → immediate unsubscribe
- Stamp keyword: `stempel`, `stamp` → keyword stamp flow (8h cooldown per customer)
- Use **Meta System User permanent tokens** for `META_WA_TOKEN` (Business Manager → System Users)
  - Permanent tokens don't expire (suitable for dev); for production rotate every 60 days
- Webhook dedup: insert `{wa_message_id, event_type}` into `wa_message_events`; on `23505` (duplicate key) → skip processing

## Testing
- Vitest for unit + integration tests
- Mock WhatsApp + Stripe in all tests
- Required coverage: stamp flow, opt-in/out, blast limit enforcement

```bash
npm test          # run all tests
npm run lint      # ESLint
npm run typecheck # tsc --noEmit
```

## Deployment
**Monorepo layout:** single git repo, two services.
- **Backend → Railway** (Railpack builder, NOT Nixpacks — Nixpacks is deprecated)
  - `railway.json` lives at **repo root** (Railpack runs from monorepo root)
  - Build: `npm run build --workspace=backend`
  - Start: `node backend/dist/index.js`
  - `/health` endpoint required — must return 200
  - `app.set('trust proxy', 1)` required before Helmet (Railway sits behind a proxy)
- **Frontend → Vercel**
  - Root directory set to `frontend/` in Vercel project settings
  - `frontend/vercel.json` handles SPA routing (rewrites `/*` → `/index.html`)
  - `VITE_API_URL` must be set in Vercel env vars (no trailing slash)
- Run DB migrations manually in Supabase SQL Editor before deploying schema changes
- Never push broken code to `main`

## Public Pages (no auth)
Pages that call `/api/v1/public/*` must prefix the base URL with `VITE_API_URL`:
```ts
const BASE = `${(import.meta.env['VITE_API_URL'] as string | undefined) ?? ''}/api/v1/public`;
```
Without this, Vercel-deployed pages make relative requests and receive 404s (no Vite proxy in prod).

## DB Schema Notes
- `businesses` table has `stamp_count int` and `reward_stages jsonb` (added in migration 007)
  - `stamp_count` = total slots on the card (replaces old `stamps_per_reward` usage)
  - `reward_stages` = `[{stamp: number, description: string}]` — multiple reward tiers per card
- `wa_message_events.business_id` is **nullable** (set via ALTER in migration; dedup insert omits it)
- `customers.wallet_token uuid` (added in migration 006) — used for public wallet URL

## When Unsure
Ask before touching auth, payments, or PII. Simple + correct beats clever + fast.