// The active focus session survives reloads and app restarts (persisted with
// timestamps). Ending a session never completes the task by itself.
import { create } from 'zustand';
import { newId } from '../lib/ids';
import { readJSON, writeJSON } from '../lib/storage';
import * as timer from '../lib/timer';

export interface FocusSession extends timer.TimerData {
  id: string;
  projectId: string;
  taskId: string;
  startedAt: string | null;
}

export type SessionOutcome = 'completed' | 'saved_for_later' | 'abandoned';

export interface FocusRecord {
  id: string;
  projectId: string;
  taskId: string;
  startedAt: string;
  endedAt: string;
  intendedSec: number | null;
  elapsedSec: number;
  outcome: SessionOutcome;
}

interface FocusState {
  active: FocusSession | null;
  history: FocusRecord[];
  open(projectId: string, taskId: string, defaultMinutes: number | null): void;
  setDuration(sec: number | null): void;
  start(): void;
  pause(): void;
  resume(): void;
  reset(): void;
  extend(sec: number): void;
  end(outcome: SessionOutcome): void;
  /** Called when a task or project is deleted. */
  discardFor(projectId: string, taskId?: string): void;
  clearAll(): void;
}

export const useFocus = create<FocusState>()((set, get) => {
  const save = (patch: Partial<Pick<FocusState, 'active' | 'history'>>) => {
    set(patch);
    const { active, history } = get();
    writeJSON('focus', { active, history });
  };
  const update = (fn: (s: FocusSession) => FocusSession) => {
    const a = get().active;
    if (a) save({ active: fn(a) });
  };
  const record = (s: FocusSession, outcome: SessionOutcome): FocusRecord | null => {
    if (!s.startedAt) return null; // never started: nothing to record
    return {
      id: s.id,
      projectId: s.projectId,
      taskId: s.taskId,
      startedAt: s.startedAt,
      endedAt: new Date().toISOString(),
      intendedSec: s.durationSec,
      elapsedSec: Math.round(timer.elapsedMs(s, Date.now()) / 1000),
      outcome,
    };
  };
  const pushHistory = (r: FocusRecord | null) => (r ? [r, ...get().history].slice(0, 200) : get().history);

  const stored = readJSON<{ active: FocusSession | null; history: FocusRecord[] }>('focus', { active: null, history: [] });

  return {
    active: stored.active,
    history: stored.history ?? [],

    open(projectId, taskId, defaultMinutes) {
      const a = get().active;
      if (a && a.taskId === taskId) return;
      // Opening another task closes an unfinished session (the task itself is untouched).
      const history = a ? pushHistory(record(a, 'abandoned')) : get().history;
      save({
        history,
        active: { id: newId(), projectId, taskId, startedAt: null, ...timer.idleTimer(defaultMinutes ? defaultMinutes * 60 : null) },
      });
    },
    setDuration: (sec) => update((s) => (s.state === 'idle' ? { ...s, durationSec: sec } : s)),
    start: () => update((s) => ({ ...s, ...timer.start(s, Date.now()), startedAt: new Date().toISOString() })),
    pause: () => update((s) => ({ ...s, ...timer.pause(s, Date.now()) })),
    resume: () => update((s) => ({ ...s, ...timer.resume(s, Date.now()) })),
    reset: () => update((s) => ({ ...s, ...timer.reset(s), startedAt: null })),
    extend: (sec) => update((s) => ({ ...s, ...timer.extend(s, Date.now(), sec) })),
    end(outcome) {
      const a = get().active;
      if (!a) return;
      save({ active: null, history: pushHistory(record(a, outcome)) });
    },
    discardFor(projectId, taskId) {
      const a = get().active;
      if (a && a.projectId === projectId && (!taskId || a.taskId === taskId)) save({ active: null });
    },
    clearAll: () => save({ active: null, history: [] }),
  };
});
