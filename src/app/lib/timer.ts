// Focus timer maths. Time is derived from timestamps, so the timer stays
// correct when the app is backgrounded, the phone sleeps, or the page reloads.

export type TimerState = 'idle' | 'running' | 'paused';

export interface TimerData {
  state: TimerState;
  /** Planned length in seconds; null = no countdown (shows elapsed time). */
  durationSec: number | null;
  /** Time accumulated in previous running segments. */
  accumulatedMs: number;
  /** Epoch ms when the current running segment began. */
  segmentStartedAt: number | null;
}

export const idleTimer = (durationSec: number | null): TimerData => ({
  state: 'idle',
  durationSec,
  accumulatedMs: 0,
  segmentStartedAt: null,
});

export function elapsedMs(t: TimerData, now: number): number {
  const live = t.state === 'running' && t.segmentStartedAt != null ? Math.max(0, now - t.segmentStartedAt) : 0;
  return t.accumulatedMs + live;
}

/** Remaining ms, or null without a countdown. Never negative. */
export function remainingMs(t: TimerData, now: number): number | null {
  if (t.durationSec == null) return null;
  return Math.max(0, t.durationSec * 1000 - elapsedMs(t, now));
}

export function isTimeUp(t: TimerData, now: number): boolean {
  return t.durationSec != null && t.state !== 'idle' && remainingMs(t, now) === 0;
}

export function start(t: TimerData, now: number): TimerData {
  return { ...t, state: 'running', accumulatedMs: 0, segmentStartedAt: now };
}

export function pause(t: TimerData, now: number): TimerData {
  if (t.state !== 'running') return t;
  return { ...t, state: 'paused', accumulatedMs: elapsedMs(t, now), segmentStartedAt: null };
}

export function resume(t: TimerData, now: number): TimerData {
  if (t.state !== 'paused') return t;
  return { ...t, state: 'running', segmentStartedAt: now };
}

export function reset(t: TimerData): TimerData {
  return idleTimer(t.durationSec);
}

/** Adds time to a countdown (e.g. "+5 min" after time is up). */
export function extend(t: TimerData, now: number, addSec: number): TimerData {
  if (t.durationSec == null) return t;
  const elapsedSec = Math.ceil(elapsedMs(t, now) / 1000);
  const base = Math.max(t.durationSec, elapsedSec);
  return { ...t, durationSec: base + addSec };
}

export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(h ? 2 : 1, '0');
  return `${h ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
}
