import { createClient, User, Session } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';
import { projectId, publicAnonKey } from '/utils/supabase/info';

// ─── Supabase client (shared across the app) ──────────────────────────────────

export const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  },
);

// ─── Global auth state ────────────────────────────────────────────────────────

let globalUser: User | null = null;
let globalSession: Session | null = null;
let globalLoading = true;
const authListeners = new Set<() => void>();

function notifyAuth() {
  authListeners.forEach((fn) => fn());
}

// Initialize
supabase.auth
  .getSession()
  .then(({ data: { session } }) => {
    globalSession = session;
    globalUser = session?.user ?? null;
  })
  .catch((error) => {
    console.error('Failed to restore auth session:', error);
  })
  .finally(() => {
    globalLoading = false;
    notifyAuth();
  });

supabase.auth.onAuthStateChange((_event, session) => {
  globalSession = session;
  globalUser = session?.user ?? null;
  globalLoading = false;
  notifyAuth();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the user's Supabase ID if authenticated, otherwise a local device ID */
export function getUserKey(): string {
  if (globalUser?.id) return globalUser.id;
  let id = localStorage.getItem('claryo_device_id');
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('claryo_device_id', id);
  }
  return id;
}

/** Returns the Authorization header value: user JWT if authed, anon key otherwise */
export function getAuthHeader(): string {
  if (globalSession?.access_token) {
    return `Bearer ${globalSession.access_token}`;
  }
  return `Bearer ${publicAnonKey}`;
}

/** Kept for backwards compat — just delegates to getUserKey */
export function getDeviceId(): string {
  return getUserKey();
}

function getAuthCallbackUrl(): string {
  return new URL('/auth/callback', window.location.origin).toString();
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuthStore() {
  const [, rerender] = useState(0);

  useEffect(() => {
    const fn = () => rerender((n) => n + 1);
    authListeners.add(fn);
    return () => {
      authListeners.delete(fn);
    };
  }, []);

  return {
    user: globalUser,
    session: globalSession,
    loading: globalLoading,

    signInWithGoogle: async () => {
      const result = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getAuthCallbackUrl(),
          skipBrowserRedirect: true,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      });
      // Manually navigate so the redirect works in all environments
      // (iframe sandboxes can block automatic redirects)
      if (result.data?.url) {
        window.location.assign(result.data.url);
      }
      return result;
    },

    signInWithEmail: (email: string, password: string) =>
      supabase.auth.signInWithPassword({ email, password }),

    signUpWithEmail: (email: string, password: string) =>
      supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: getAuthCallbackUrl() },
      }),

    signOut: () => supabase.auth.signOut(),

    resetPassword: (email: string) =>
      supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      }),
  };
}
