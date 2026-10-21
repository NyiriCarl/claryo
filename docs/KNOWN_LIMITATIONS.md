# Known limitations

Honest list of what is not done or not verified. Nothing here is hidden in
the app's own copy.

## Not verified
- **Live AI** has only been tested with a simulated Claude client. No real
  API key was available, so plan quality, latency and cost are unmeasured.
- **The deployed Supabase function** was not redeployed or exercised from
  this environment. Sign-up emails, the auth callback, password reset and
  Google sign-in have only been tested with the local test sign-in.
- **Real devices and Safari.** Tests ran in Chromium with phone-sized,
  touch-enabled viewports. iOS Safari behaviour (home-screen install,
  keyboard, backgrounding) is unverified.
- **Screen readers.** Automated axe checks pass; no manual VoiceOver/TalkBack pass yet.

## Product scope
- **Web app, not native.** Installable to the home screen via the manifest,
  but there is no service worker yet, so the app shell needs a connection to
  open the first time in a session. Data already loaded keeps working offline.
- **No notifications or reminders.**
- **Focus history** (time spent per task) is stored on the device only and
  is not synced.
- **No payments.** The original fake "Pro" upgrade was removed rather than
  kept as a mock.
- **Terms of Service** is a placeholder and the **Privacy notice** is a draft
  describing what the code actually stores. Both need legal review.
- **No user research** has been carried out; nothing in the app or docs
  claims otherwise.

## Technical
- **Rate limits** use the key-value table, which has no atomic increment, so
  two requests at the same instant can both pass. Fine for cost control at
  MVP scale; move to a database function before heavy traffic.
- **Guest limits** are per hashed IP address per day. People behind one shared
  network share a limit; counters are never cleaned up (small rows).
- **Sync** is per-project, last-write-checked with versions. A conflict keeps
  both copies rather than merging individual tasks.
- **Bundle size:** the production JS bundle is over 500 kB because the
  original export's UI kit dependencies (MUI, many Radix packages) are still
  installed. Unused ones can be removed once the Figma Make workflow no
  longer needs them.
- **Pre-existing type errors** in `vite.figma.config.ts` and
  `supabase/functions/server/kv_store.tsx` (Figma Make generated files) were
  left untouched and are excluded from the type check.
- **Brand checks pending.** "Claryo" is a working name; see
  `src/brand.config.ts` to change it.
