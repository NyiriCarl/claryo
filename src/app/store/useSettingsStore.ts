import { useState, useEffect } from 'react';
import { projectId } from '/utils/supabase/info';
import { supabase, getAuthHeader, getUserKey } from './useAuthStore';

export interface UserSettings {
  name: string;
  isPremium: boolean;
  notifications: boolean;
  aiMode: boolean;
  haptics: boolean;
  autoAdvanceOnTimer: boolean;
  dailyGoalSteps: number;
  activeDays: string[]; // YYYY-MM-DD
  darkMode: boolean;
}

const KEY = 'claryo_settings_v2';

const DEFAULTS: UserSettings = {
  name: 'You',
  isPremium: false,
  notifications: true,
  aiMode: true,
  haptics: true,
  autoAdvanceOnTimer: false,
  dailyGoalSteps: 3,
  activeDays: [],
  darkMode: true,
};

function load(): UserSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULTS };
}

function persist(s: UserSettings) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

// ─── Cloud sync ───────────────────────────────────────────────────────────────

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-b327929d`;

async function cloudPushSettings(settings: UserSettings) {
  try {
    const userKey = getUserKey();
    const res = await fetch(`${BASE}/settings/${userKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': getAuthHeader(),
      },
      body: JSON.stringify({ settings }),
    });
    if (!res.ok) console.log('Cloud push settings failed:', await res.text());
  } catch (e) {
    console.log('Cloud push settings error:', e);
  }
}

async function cloudFetchSettings(): Promise<UserSettings | null> {
  try {
    const userKey = getUserKey();
    const res = await fetch(`${BASE}/settings/${userKey}`, {
      headers: { 'Authorization': getAuthHeader() },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.settings ? { ...DEFAULTS, ...data.settings } : null;
  } catch (e) {
    console.log('Cloud fetch settings error:', e);
    return null;
  }
}

export async function submitFeedback(text: string): Promise<boolean> {
  try {
    const userKey = getUserKey();
    const res = await fetch(`${BASE}/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': getAuthHeader(),
      },
      body: JSON.stringify({ text, deviceId: userKey }),
    });
    return res.ok;
  } catch (e) {
    console.log('Submit feedback error:', e);
    return false;
  }
}

// ─── Global state ────────────────────────────────────────────────────────────

let globalSettings: UserSettings = load();
const listeners = new Set<() => void>();
let syncTimer: ReturnType<typeof setTimeout> | null = null;

function notifyAll() {
  listeners.forEach((f) => f());
}

function mutate(fn: (s: UserSettings) => UserSettings) {
  globalSettings = fn(globalSettings);
  persist(globalSettings);
  notifyAll();
  // Debounced cloud push
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => cloudPushSettings(globalSettings), 1500);
}

// Initial cloud sync
async function initSettingsSync() {
  const cloudSettings = await cloudFetchSettings();
  if (cloudSettings) {
    globalSettings = cloudSettings;
    persist(globalSettings);
    notifyAll();
  } else {
    // Push local settings to cloud
    cloudPushSettings(globalSettings);
  }
}

initSettingsSync().catch(console.error);

// Re-sync whenever the user signs in or a persisted session is restored
supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
    initSettingsSync().catch(console.error);
  }
});

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSettingsStore() {
  const [, rerender] = useState(0);

  useEffect(() => {
    const fn = () => rerender((n) => n + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);

  const recordToday = () => {
    const today = new Date().toISOString().slice(0, 10);
    mutate((s) => ({
      ...s,
      activeDays: s.activeDays.includes(today)
        ? s.activeDays
        : [...s.activeDays, today],
    }));
  };

  const getStreak = (): number => {
    const active = new Set(globalSettings.activeDays);
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      if (active.has(ds)) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  };

  const getWeekDots = () => {
    const active = new Set(globalSettings.activeDays);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const ds = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en', { weekday: 'narrow' });
      const isToday = i === 6;
      return { key: ds, label, active: active.has(ds), isToday };
    });
  };

  const vibrate = (ms = 40) => {
    if (globalSettings.haptics && navigator.vibrate) {
      navigator.vibrate(ms);
    }
  };

  return {
    settings: globalSettings,
    setName: (v: string) => mutate((s) => ({ ...s, name: v })),
    setPremium: (v: boolean) => mutate((s) => ({ ...s, isPremium: v })),
    setNotifications: (v: boolean) =>
      mutate((s) => ({ ...s, notifications: v })),
    setAiMode: (v: boolean) => mutate((s) => ({ ...s, aiMode: v })),
    setHaptics: (v: boolean) => mutate((s) => ({ ...s, haptics: v })),
    setAutoAdvance: (v: boolean) =>
      mutate((s) => ({ ...s, autoAdvanceOnTimer: v })),
    setDailyGoal: (v: number) => mutate((s) => ({ ...s, dailyGoalSteps: v })),
    setDarkMode: (v: boolean) => mutate((s) => ({ ...s, darkMode: v })),
    clearAll: () => mutate(() => ({ ...DEFAULTS })),
    recordToday,
    getStreak,
    getWeekDots,
    vibrate,
  };
}
