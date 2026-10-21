import { useState, useEffect, useCallback } from 'react';
import { projectId } from '/utils/supabase/info';
import { supabase, getAuthHeader, getUserKey } from './useAuthStore';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExecutionStep {
  id: string;
  text: string;
  completed: boolean;
  timerSeconds?: number;
}

export interface MiniStep {
  id: string;
  text: string;
  completed: boolean;
  timerSeconds?: number;
}

export interface GoalAction {
  id: string;
  text: string;
  duration: string;
  justStartText: string;
  completed: boolean;
  timerSeconds?: number;
}

export interface Goal {
  id: string;
  originalInput: string;
  rewrittenTitle: string;
  startNow: GoalAction;
  nextStep: GoalAction;
  miniBreakdown: MiniStep[];
  executionSteps: ExecutionStep[];
  currentExecutionStep: number;
  executionCompleted: boolean;
  createdAt: string;
  lastActiveAt: string;
  category: string;
  isStarted: boolean;
  stepsCompleted: number;
}

type GoalStore = { goals: Goal[] };

// ─── Local persistence ────────────────────────────────────────────────────────

const STORAGE_KEY = 'claryo_v2_store';

function loadStore(): GoalStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { goals: [] };
}

function saveStore(store: GoalStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

// ─── Cloud sync ───────────────────────────────────────────────────────────────

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-b327929d`;

// getDeviceId kept for backwards compat — delegates to auth-aware getUserKey
export function getDeviceId(): string {
  return getUserKey();
}

async function cloudPushGoals(goals: Goal[]) {
  try {
    const userKey = getUserKey();
    const res = await fetch(`${BASE}/goals/${userKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': getAuthHeader(),
      },
      body: JSON.stringify({ goals }),
    });
    if (!res.ok) console.log('Cloud push goals failed:', await res.text());
  } catch (e) {
    console.log('Cloud push goals error:', e);
  }
}

async function cloudFetchGoals(): Promise<Goal[]> {
  try {
    const userKey = getUserKey();
    const res = await fetch(`${BASE}/goals/${userKey}`, {
      headers: { 'Authorization': getAuthHeader() },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.goals) ? data.goals : [];
  } catch (e) {
    console.log('Cloud fetch goals error:', e);
    return [];
  }
}

// ─── Global state ─────────────────────────────────────────────────────────────

let globalStore: GoalStore = loadStore();
const listeners: Set<() => void> = new Set();
let syncTimer: ReturnType<typeof setTimeout> | null = null;

function notify() {
  listeners.forEach((fn) => fn());
}

function updateStore(fn: (s: GoalStore) => GoalStore) {
  globalStore = fn(globalStore);
  saveStore(globalStore);
  notify();
  schedulePush();
}

function schedulePush() {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    cloudPushGoals(globalStore.goals);
  }, 1500);
}

// Initial cloud sync on module load
async function initCloudSync() {
  const cloudGoals = await cloudFetchGoals();
  if (cloudGoals.length > 0) {
    // Cloud wins – update local
    globalStore = { goals: cloudGoals };
    saveStore(globalStore);
    notify();
  } else if (globalStore.goals.length > 0) {
    // Push local up to cloud
    cloudPushGoals(globalStore.goals);
  }
}

initCloudSync().catch(console.error);

// Re-sync whenever the user signs in or a persisted session is restored
supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
    initCloudSync().catch(console.error);
  }
});

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGoalStore() {
  const [, rerender] = useState(0);

  useEffect(() => {
    const fn = () => rerender((n) => n + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);

  const addGoal = useCallback((goal: Goal) => {
    updateStore((s) => ({ ...s, goals: [goal, ...s.goals] }));
  }, []);

  const deleteGoal = useCallback((goalId: string) => {
    updateStore((s) => ({
      ...s,
      goals: s.goals.filter((g) => g.id !== goalId),
    }));
  }, []);

  const markStarted = useCallback((goalId: string) => {
    updateStore((s) => ({
      ...s,
      goals: s.goals.map((g) =>
        g.id === goalId
          ? { ...g, isStarted: true, lastActiveAt: new Date().toISOString() }
          : g,
      ),
    }));
  }, []);

  const completeStartNow = useCallback((goalId: string) => {
    updateStore((s) => ({
      ...s,
      goals: s.goals.map((g) =>
        g.id === goalId
          ? {
              ...g,
              startNow: { ...g.startNow, completed: true },
              stepsCompleted: g.stepsCompleted + 1,
              lastActiveAt: new Date().toISOString(),
            }
          : g,
      ),
    }));
  }, []);

  const completeNextStep = useCallback((goalId: string) => {
    updateStore((s) => ({
      ...s,
      goals: s.goals.map((g) =>
        g.id === goalId
          ? {
              ...g,
              nextStep: { ...g.nextStep, completed: true },
              stepsCompleted: g.stepsCompleted + 1,
              lastActiveAt: new Date().toISOString(),
            }
          : g,
      ),
    }));
  }, []);

  const completeMiniStep = useCallback((goalId: string, stepId: string) => {
    updateStore((s) => ({
      ...s,
      goals: s.goals.map((g) => {
        if (g.id !== goalId) return g;
        return {
          ...g,
          miniBreakdown: g.miniBreakdown.map((ms) =>
            ms.id === stepId ? { ...ms, completed: true } : ms,
          ),
          stepsCompleted: g.stepsCompleted + 1,
          lastActiveAt: new Date().toISOString(),
        };
      }),
    }));
  }, []);

  const advanceExecutionStep = useCallback((goalId: string) => {
    updateStore((s) => ({
      ...s,
      goals: s.goals.map((g) => {
        if (g.id !== goalId) return g;
        const next = g.currentExecutionStep + 1;
        const done = next >= g.executionSteps.length;
        return {
          ...g,
          executionSteps: g.executionSteps.map((es, i) =>
            i === g.currentExecutionStep ? { ...es, completed: true } : es,
          ),
          currentExecutionStep: done ? g.currentExecutionStep : next,
          executionCompleted: done,
          stepsCompleted: done ? g.stepsCompleted + 1 : g.stepsCompleted,
          lastActiveAt: new Date().toISOString(),
        };
      }),
    }));
  }, []);

  const seekToExecutionStep = useCallback((goalId: string, stepIndex: number) => {
    updateStore((s) => ({
      ...s,
      goals: s.goals.map((g) =>
        g.id !== goalId
          ? g
          : { ...g, currentExecutionStep: Math.max(0, Math.min(stepIndex, g.executionSteps.length - 1)), lastActiveAt: new Date().toISOString() },
      ),
    }));
  }, []);

  // ─── Timer setters ──────────────────────────────────────────────────────────

  const setStartNowTimer = useCallback(
    (goalId: string, seconds: number | undefined) => {
      updateStore((s) => ({
        ...s,
        goals: s.goals.map((g) =>
          g.id !== goalId
            ? g
            : { ...g, startNow: { ...g.startNow, timerSeconds: seconds } },
        ),
      }));
    },
    [],
  );

  const setNextStepTimer = useCallback(
    (goalId: string, seconds: number | undefined) => {
      updateStore((s) => ({
        ...s,
        goals: s.goals.map((g) =>
          g.id !== goalId
            ? g
            : { ...g, nextStep: { ...g.nextStep, timerSeconds: seconds } },
        ),
      }));
    },
    [],
  );

  const setMiniStepTimer = useCallback(
    (goalId: string, stepId: string, seconds: number | undefined) => {
      updateStore((s) => ({
        ...s,
        goals: s.goals.map((g) =>
          g.id !== goalId
            ? g
            : {
                ...g,
                miniBreakdown: g.miniBreakdown.map((ms) =>
                  ms.id === stepId ? { ...ms, timerSeconds: seconds } : ms,
                ),
              },
        ),
      }));
    },
    [],
  );

  const setExecutionStepTimer = useCallback(
    (goalId: string, stepIndex: number, seconds: number | undefined) => {
      updateStore((s) => ({
        ...s,
        goals: s.goals.map((g) =>
          g.id !== goalId
            ? g
            : {
                ...g,
                executionSteps: g.executionSteps.map((es, i) =>
                  i === stepIndex ? { ...es, timerSeconds: seconds } : es,
                ),
              },
        ),
      }));
    },
    [],
  );

  // ─── Derived ────────────────────────────────────────────────────────────────

  const getStats = () => {
    const goals = globalStore.goals;
    const started = goals.filter((g) => g.isStarted).length;
    const totalSteps = goals.reduce((a, g) => a + g.stepsCompleted, 0);
    const completed = goals.filter((g) => g.executionCompleted).length;
    return { started, totalSteps, total: goals.length, executing: completed };
  };

  const getResumeGoal = () =>
    globalStore.goals.find((g) => g.isStarted && !g.executionCompleted) || null;

  return {
    goals: globalStore.goals,
    addGoal,
    deleteGoal,
    markStarted,
    completeStartNow,
    completeNextStep,
    completeMiniStep,
    advanceExecutionStep,
    seekToExecutionStep,
    setStartNowTimer,
    setNextStepTimer,
    setMiniStepTimer,
    setExecutionStepTimer,
    getStats,
    getResumeGoal,
  };
}
