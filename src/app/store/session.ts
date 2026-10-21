// Authentication state. Guests can use the app fully on one device; signing in
// adds account storage and sync across devices.
import { create } from 'zustand';
import type { SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config';
import { onSessionExpired, setSessionToken } from '../lib/api';
import { readJSON, removeKey, writeJSON } from '../lib/storage';

export interface SessionUser {
  id: string;
  email: string | null;
}

type Status = 'loading' | 'guest' | 'signedIn';

interface SessionState {
  status: Status;
  user: SessionUser | null;
  /** True when the server rejected the session; the UI asks the person to sign in again. */
  expired: boolean;
  /** Set after a password-reset link is opened, until a new password is saved. */
  recovering: boolean;
  init(): Promise<void>;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string): Promise<{ needsConfirmation: boolean }>;
  signInWithGoogle(): Promise<void>;
  sendPasswordReset(email: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
  signOut(): Promise<void>;
}

export class AuthError extends Error {}

let supabase: SupabaseClient | null = null;
async function sb(): Promise<SupabaseClient> {
  if (!supabase) {
    const { createClient } = await import('@supabase/supabase-js');
    supabase = createClient(config.supabaseUrl, config.anonKey, {
      auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true, flowType: 'pkce' },
    });
  }
  return supabase;
}

const friendly = (message: string): string => {
  if (/invalid login credentials/i.test(message)) return 'That email and password don’t match. Try again or reset your password.';
  if (/email not confirmed/i.test(message)) return 'Please confirm your email first. Check your inbox for the link.';
  if (/already registered/i.test(message)) return 'An account with this email already exists. Try signing in.';
  if (/rate limit/i.test(message)) return 'Too many attempts. Please wait a minute and try again.';
  if (/failed to fetch|network/i.test(message)) return "We couldn't reach the sign-in service. Check your connection.";
  return message || 'Something went wrong. Please try again.';
};

const callbackUrl = () => new URL('/auth/callback', window.location.origin).toString();

// Development-only provider: no password check, token is accepted only by a
// server running with DEV_AUTH=true. Never enable in production.
const devToken = (email: string) => 'dev.' + btoa(email.toLowerCase()).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export const useSession = create<SessionState>()((set, get) => {
  const signedIn = (user: SessionUser, token: string) => {
    setSessionToken(token);
    set({ status: 'signedIn', user, expired: false });
  };
  const guest = () => {
    setSessionToken(null);
    set({ status: 'guest', user: null });
  };

  onSessionExpired(() => {
    if (get().status === 'signedIn') set({ expired: true });
  });

  return {
    status: 'loading',
    user: null,
    expired: false,
    recovering: false,

    async init() {
      if (config.authProvider === 'none') return guest();
      if (config.authProvider === 'dev') {
        const s = readJSON<{ email: string } | null>('devSession', null);
        return s ? signedIn({ id: 'dev', email: s.email }, devToken(s.email)) : guest();
      }
      try {
        const client = await sb();
        client.auth.onAuthStateChange((event, session) => {
          if (event === 'PASSWORD_RECOVERY') set({ recovering: true });
          if (session) signedIn({ id: session.user.id, email: session.user.email ?? null }, session.access_token);
          else if (event === 'SIGNED_OUT') guest();
        });
        const timeout = new Promise<null>((r) => setTimeout(() => r(null), 4000));
        const res = await Promise.race([client.auth.getSession(), timeout]);
        const session = res && 'data' in res ? res.data.session : null;
        if (session) signedIn({ id: session.user.id, email: session.user.email ?? null }, session.access_token);
        else if (get().status === 'loading') guest();
      } catch {
        // Auth service unreachable: continue as guest; local data is unaffected.
        if (get().status === 'loading') guest();
      }
    },

    async signIn(email, password) {
      if (config.authProvider === 'dev') {
        writeJSON('devSession', { email });
        return signedIn({ id: 'dev', email }, devToken(email));
      }
      if (config.authProvider === 'none') throw new AuthError('Accounts are not enabled in this build.');
      const { data, error } = await (await sb()).auth.signInWithPassword({ email, password });
      if (error) throw new AuthError(friendly(error.message));
      if (data.session) signedIn({ id: data.user.id, email: data.user.email ?? null }, data.session.access_token);
    },

    async signUp(email, password) {
      if (config.authProvider === 'dev') {
        await get().signIn(email, password);
        return { needsConfirmation: false };
      }
      if (config.authProvider === 'none') throw new AuthError('Accounts are not enabled in this build.');
      const { data, error } = await (await sb()).auth.signUp({ email, password, options: { emailRedirectTo: callbackUrl() } });
      if (error) throw new AuthError(friendly(error.message));
      if (data.session) {
        signedIn({ id: data.user!.id, email: data.user!.email ?? null }, data.session.access_token);
        return { needsConfirmation: false };
      }
      return { needsConfirmation: true };
    },

    async signInWithGoogle() {
      const { data, error } = await (await sb()).auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: callbackUrl(), skipBrowserRedirect: true },
      });
      if (error) throw new AuthError(friendly(error.message));
      if (data.url) window.location.assign(data.url);
    },

    async sendPasswordReset(email) {
      if (config.authProvider !== 'supabase') throw new AuthError('Password reset is not available in this build.');
      const { error } = await (await sb()).auth.resetPasswordForEmail(email, { redirectTo: callbackUrl() });
      if (error) throw new AuthError(friendly(error.message));
    },

    async updatePassword(password) {
      const { error } = await (await sb()).auth.updateUser({ password });
      if (error) throw new AuthError(friendly(error.message));
      set({ recovering: false });
    },

    async signOut() {
      if (config.authProvider === 'dev') removeKey('devSession');
      else if (config.authProvider === 'supabase') await (await sb()).auth.signOut().catch(() => undefined);
      set({ expired: false });
      guest();
    },
  };
});
