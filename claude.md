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
| Frontend | React + Vite + **shadcn/ui** (Tailwind CSS v4) |
| State | Zustand (auth) + TanStack Query v5 (server state) |
| Hosting | Railway |
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
`SUPABASE_URL` `SUPABASE_SERVICE_KEY` `JWT_SECRET`
`META_WA_TOKEN` `META_WA_PHONE_ID` `META_APP_SECRET`
`STRIPE_SECRET_KEY` `CLIENT_URL`

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
- Opt-out keywords: `stop`, `abmelden`, `nein` → immediate unsubscribe

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
- Railway: auto-deploy from `main`
- `/health` endpoint required — must return 200
- Run DB migrations before app start
- Never push broken code to `main`

## When Unsure
Ask before touching auth, payments, or PII. Simple + correct beats clever + fast.