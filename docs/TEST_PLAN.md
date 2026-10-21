# Test plan and results

Last run: 21 October 2026, on the code in this folder.

| Suite | Command | Result |
| --- | --- | --- |
| App type check | `tsc --noEmit -p .` | Pass |
| Server type check | `deno check` on `app.ts`, `ai.ts`, `server/dev.ts` | Pass |
| Unit tests | `npm test` | **52 / 52 pass** |
| End-to-end + accessibility | `npm run test:e2e` | **32 / 32 pass** (16 tests × 2 screen sizes) |
| Production build | `vite build` | Pass (one bundle-size warning, see limitations) |

End-to-end tests run the real web app in Chromium against the local API with
demo AI and the test sign-in, at **390×844** (typical iPhone) and **360×740**
(typical Android) with touch enabled. They do not run on real devices or in
Safari; see [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md).

## Core journeys (tests/e2e/flows.spec.ts)

### Flow A: first-time user creates a project
- **Welcome → goal → clarifying question → plan → start → complete → progress.**
  Types "Start a business", gets one clarifying question, answers it, sees the
  plan with a Start Here card and the demo label, starts the first task in
  Focus Mode, marks it done, sees the completion screen with the next task,
  and sees progress update on Home, Projects and Progress.
- **Cancel during generation and retry after a failure.** Cancel returns to
  the goal with the text kept; a forced server failure shows a readable error
  with Retry, Edit goal and Create manually.

### Flow B: returning user resumes work
- **Progress persists, focus session survives reload, ending a timer never
  completes the task.** Reloads the app mid-project, resumes from the Home
  "next action", starts a 5-minute timer, reloads during the session (timer
  continues from timestamps), lets time run out, and checks the task is still
  open until the user marks it done.

### Flow C: user is overwhelmed
- **Break a task down, edit suggestions, accept, start one subtask.**
- **Cancel keeps the task unchanged; Replace swaps it for the new steps.**

### Flow D: simpler explanation
- **Explain simply, back to the task, start it.**
- **"I only have 10 minutes"** gives one small action that can be started.

### Flow E: offline
- **Guest offline:** AI generation is honestly unavailable with a message;
  a manually created project is saved locally.
- **Signed in:** edits made offline sync when the connection returns.
- **Conflicting edits on two devices** keep both versions (server copy plus a
  "(copy from this device)" project) and tell the user.

### Accounts, export and deletion
- **Guest projects move to the account on sign-in; export; delete account**
  removes server data (verified via the API afterwards).
- **Sign-out removes account data from the device.**

## Accessibility and layout (tests/e2e/a11y.spec.ts)
- axe-core finds **no serious or critical violations** on Welcome, Home, project,
  Focus, task complete, Projects, Progress, Settings and sign-up, in **light and dark** themes.
- Bottom navigation and task-row touch targets are **at least 44px**.
- **No horizontal scrolling** on the main screens.

## Unit tests (tests/unit)
- **plan.test.ts (9):** AI output validation: required fields, clarification
  only when allowed, repair of unknown/cyclic dependencies and invalid first
  task, estimate clamping, duplicate ids, orphan tasks; simplify-result rules;
  goal input validation.
- **demo.test.ts (16):** demo planner produces valid plans for seven example
  goals from the brief, asks a clarifying question only for vague goals, and
  returns valid output for all eight help actions.
- **server.test.ts (16):** authentication required for account routes; users
  can't read each other's projects; versioned sync with conflict reporting and
  tombstones; payload validation; demo responses labelled as demo; daily
  limits for guests and users; generation records hold metadata only (no
  prompt text); provider errors mapped to readable messages; export and full
  account deletion; the Claude provider with a **simulated** client
  (structured-output request, one retry on malformed output, refusals and
  truncation handled).
- **progress.test.ts (7):** progress is computed from tasks (top-level only,
  per phase), next-action selection respects dependencies and subtasks.
- **timer.test.ts (5):** timestamp-based timer survives backgrounding,
  pause/resume, reset, no-timer mode, extend.

## Manual checks still to do before launch
1. Live AI with a real key: generate plans for the seven example goals and
   review quality, tone and assumptions.
2. Deployed Supabase function: sign-up confirmation email, auth callback, password
   reset, Google (if enabled), sync across two real phones.
3. Real devices: iOS Safari and Android Chrome, including "Add to Home Screen",
   backgrounding during Focus Mode, and the on-screen keyboard.
4. Screen reader pass (VoiceOver and TalkBack) on Flows A and B.
