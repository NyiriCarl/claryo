# Architecture and decisions

## Starting point: what the original export had

The uploaded `Claryo_App_Main_1.zip` was a Figma Make project (React + Vite
web app with a Supabase edge function). It built cleanly but did not meet the
brief:

| Area | Original export | Now |
| --- | --- | --- |
| AI planning | Five hardcoded keyword templates presented as generated plans | Server-side Claude call with a JSON schema and validation; clearly labelled demo mode without a key |
| Data model | A goal was a fixed set of slots | Projects → optional phases → tasks → subtasks, with dependencies, estimates, steps, completion criteria |
| Server security | No authentication on the API; anyone with a device ID could read or overwrite data | Every account route checks the Supabase session; data keyed by user ID; old routes removed |
| Pro upgrade | Unlocked without payment | Removed |
| "Delete all data" | Reset settings only | Deletes projects, profile, history and the auth user on the server, and clears the device |
| Timers | Interval counters that drifted in the background | Timestamp-based; never auto-complete a task |
| Streaks / gamification | Present | Removed (brief rules them out) |
| Guest use | Sign-in forced | Guest mode with local storage; projects move to the account on sign-in |
| Clarifying question, Start Here card, simplify actions, offline handling, export | Missing | Implemented |

The old pages, stores and components were replaced rather than patched. The
generated shadcn UI kit (`src/app/components/ui/`) and Figma Make files were
kept so the project still opens in Figma Make.

## Web vs native

This is a **responsive web app** that can be installed to the home screen
(web app manifest + icons, standalone display). It is not an App Store /
Play Store app. That was the right first step because the existing project is
a web app, it can be tested and shared by link immediately, and it needs no
store review. Moving to native later (for example React Native/Expo, or
wrapping this app with Capacitor) would add reliable notifications, store
presence and better background behaviour. The server, data model, AI
contract and validation are UI-independent and would carry over.

## Structure

```
src/brand.config.ts          the one place for name, logo, colours
src/app/
  config.ts                  public runtime config from VITE_* variables
  lib/                       pure logic: types, progress, timer, plan→project, API client
  store/                     zustand stores (projects, session, prefs, focus, drafts)
  sync/sync.ts               device ↔ account sync
  components/                shared UI (ui.tsx, Layout, StartHereCard, TaskParts, …)
  pages/                     one file per screen
supabase/functions/server/
  index.tsx                  Supabase entry: wires real auth, KV and AI provider
  app.ts                     the API (Hono), dependency-injected for tests
  ai.ts                      AIProvider interface, Claude provider, demo provider
  shared/plan.ts             schema, types and validation (shared with the app)
  shared/demo.ts             demo planner templates (shared with the app)
server/dev.ts                local API with file storage and test sign-in
tests/unit, tests/e2e        Vitest and Playwright suites
```

## Screens

Welcome, Sign in / Sign up (with password reset), Auth callback, Home,
New project (goal → generating → clarifying question → error states),
Project detail (Start Here card, phases, tasks), Task detail, Task help
(simplify actions), Focus Mode, Task complete, Projects, Progress, Settings,
Privacy, Terms, Help, Not found. Bottom navigation: Home, Projects,
Progress, Settings.

## Data and persistence

- Everything is saved on the device first (localStorage, prefix
  `stepapp.v3.`, independent of the brand name). The original export's data
  (`claryo_v2_store`) is migrated once.
- Progress is always **computed from tasks** (top-level tasks count; subtasks
  roll up), never stored as a number.
- Signed-in users sync to the server, which stores one document per project
  in the existing `kv_store_b327929d` table under `u:{userId}:…` keys.

### Sync

Each project carries a server version. The app pushes changes with the
version it started from; the server refuses a stale write (HTTP 409) and
returns its copy. On conflict the server copy is kept and the device's edits
are saved as a separate "(copy from this device)" project, and the user is
told. Deletions are tombstones. Sync runs on start, on change (debounced),
when the connection returns, and retries with backoff.

## AI

- The browser never talks to an AI provider. It calls `/ai/plan` and
  `/ai/simplify` on the server, which holds the key.
- `AnthropicProvider` uses structured outputs (a JSON schema) so the response
  shape is enforced, then `validatePlanResult` checks and repairs it (unknown
  or circular dependencies, an invalid first task, duplicate IDs, estimate
  ranges). Malformed output is retried once, then reported as a readable
  error. Refusals and truncated output are handled explicitly.
- The system prompt forbids invented statistics or facts, turns anything
  needing verification into a "check X" task, states assumptions, and treats
  the goal text as data.
- Without `ANTHROPIC_API_KEY` the `DemoProvider` serves template plans. The
  API marks every response with `mode: "demo"` and the app labels the plan "Demo plan, not AI-generated"
  and shows a "Demo mode" badge on help suggestions; Help explains what it means.
- Daily limits per guest network (hashed IP) and per user. For signed-in
  users, generation records store metadata only (time, mode, model, outcome),
  not the goal text.

## Design decisions

- **Colours.** Brand indigo `#4F46E5` and Action Green `#22C55E` from the
  brief. Two adjustments for WCAG AA contrast: secondary text in light mode
  is `#566579` (the brief's `#64748B` fails 4.5:1 on light grey surfaces),
  and green text/buttons use `#15803D`, with `#22C55E` kept for fills and
  icons. Dark mode is supported and follows the system by default.
- **Touch targets** are at least 44px; motion respects "reduce motion".
- **Brand independence.** The name appears only via `brand.config.ts`; storage
  keys, API paths and IDs don't contain it, so a rename is a config change.
- **No fake features.** Things that aren't built (payments, notifications)
  are absent rather than mocked; legal pages are clearly marked as drafts.
