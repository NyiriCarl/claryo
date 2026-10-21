import { create } from 'zustand';
import { readJSON, writeJSON } from '../lib/storage';
import type { Prefs } from '../lib/types';

const DEFAULTS: Prefs = {
  name: '',
  theme: 'system',
  reduceMotion: false,
  focusSound: false, // off by default, per the brief
  defaultTimerMinutes: 10,
};

interface PrefsState {
  prefs: Prefs;
  seenWelcome: boolean;
  /** Bumped when prefs change locally, so they can be pushed to the account. */
  revision: number;
  set(patch: Partial<Prefs>): void;
  replace(prefs: Partial<Prefs>): void;
  markWelcomeSeen(): void;
}

export const usePrefs = create<PrefsState>()((set, get) => ({
  prefs: { ...DEFAULTS, ...readJSON<Partial<Prefs>>('prefs', {}) },
  seenWelcome: readJSON('seenWelcome', false),
  revision: 0,
  set(patch) {
    const prefs = { ...get().prefs, ...patch };
    writeJSON('prefs', prefs);
    set({ prefs, revision: get().revision + 1 });
  },
  replace(remote) {
    const prefs = { ...DEFAULTS, ...get().prefs, ...remote };
    writeJSON('prefs', prefs);
    set({ prefs });
  },
  markWelcomeSeen() {
    writeJSON('seenWelcome', true);
    set({ seenWelcome: true });
  },
}));

export function applyTheme(prefs: Prefs) {
  const root = document.documentElement;
  const dark = prefs.theme === 'dark' || (prefs.theme === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  root.dataset.theme = dark ? 'dark' : 'light';
  root.dataset.reduceMotion = String(prefs.reduceMotion);
}
