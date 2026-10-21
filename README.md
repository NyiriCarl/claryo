# Claryo (working name)

A mobile-first web app that turns a goal, idea or overwhelming task into a
clear plan and a first step you can start today.

"Claryo" is a provisional name. Every place the name, logo and colours appear
reads from [`src/brand.config.ts`](src/brand.config.ts), and you can override
the name at build time with `VITE_BRAND_NAME` without touching code.

## What this is

- A responsive **web app** that can be installed to a phone's home screen
  (web app manifest + icon). It is **not** a native iOS/Android app; see
  [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#web-vs-native).
- React 18 + Vite + Tailwind (kept from the original Figma Make export), with a
  Supabase Edge Function as the API (AI calls, sync, account export/delete).
- AI planning uses Claude through the server. With no API key configured, the
  server runs in **demo mode**: plans come from templates and the app labels
  them as examples, never as AI output.

## Documents

| Document | What's in it |
| --- | --- |
| [docs/SETUP.md](docs/SETUP.md) | Local development, environment variables, deploying to Supabase, turning on live AI |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Gap analysis of the original export, structure, data model, sync, AI, design decisions |
| [docs/TEST_PLAN.md](docs/TEST_PLAN.md) | Test plan for Flows A–E and verified results |
| [docs/KNOWN_LIMITATIONS.md](docs/KNOWN_LIMITATIONS.md) | What's not done or not verified yet |
| [.env.example](.env.example) | Every configuration value, no secrets |

## Quick start

```bash
pnpm install                # or npm install
npm run dev:api             # local API on :8787 (needs Deno 2), demo AI
VITE_API_URL=http://localhost:8787/make-server-b327929d VITE_AUTH_PROVIDER=dev npm run dev
npm test                    # unit tests
npm run test:e2e            # end-to-end flows (Playwright)
```
