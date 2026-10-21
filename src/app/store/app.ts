// Small app-wide state: the goal draft and the AI service mode.
import { create } from 'zustand';
import { readJSON, writeJSON } from '../lib/storage';
import { api } from '../lib/api';
import { config } from '../config';

interface DraftState {
  goal: string;
  setGoal(goal: string): void;
}

/** The goal being typed on Home survives reloads, and "Edit goal" returns to it. */
export const useDraft = create<DraftState>()((set) => ({
  goal: readJSON('draftGoal', ''),
  setGoal(goal) {
    writeJSON('draftGoal', goal);
    set({ goal });
  },
}));

interface AiModeState {
  mode: 'live' | 'demo' | 'unknown';
  load(): Promise<void>;
}

export const useAiMode = create<AiModeState>()((set, get) => ({
  mode: config.localDemoAI ? 'demo' : 'unknown',
  async load() {
    if (config.localDemoAI || get().mode !== 'unknown') return;
    try {
      const res = await api<{ aiMode: 'live' | 'demo' }>('/config', { timeoutMs: 8000 });
      set({ mode: res.aiMode });
    } catch {
      /* stays unknown; plan requests report their own mode */
    }
  },
}));
