// Runtime configuration from VITE_* environment variables (see .env.example).
// Only public values belong here: everything in this file ships to the browser.
import { projectId, publicAnonKey } from '../../utils/supabase/info';

const e = import.meta.env;

export type AuthProviderKind = 'supabase' | 'dev' | 'none';

export const config = {
  /** Base URL of the API (the Supabase edge function, or the local dev server). */
  apiUrl: (e.VITE_API_URL as string) || `https://${projectId}.supabase.co/functions/v1/make-server-b327929d`,
  supabaseUrl: (e.VITE_SUPABASE_URL as string) || `https://${projectId}.supabase.co`,
  /** Public "anon" key: safe to expose, it only identifies the project. */
  anonKey: (e.VITE_SUPABASE_ANON_KEY as string) || publicAnonKey,
  /** "dev" is a local-only sign-in for testing; the server rejects it unless DEV_AUTH=true. */
  authProvider: ((e.VITE_AUTH_PROVIDER as string) || 'supabase') as AuthProviderKind,
  /** Show "Continue with Google" (requires the Google provider to be enabled in Supabase). */
  googleSignIn: e.VITE_GOOGLE_SIGN_IN === 'true',
  /** Run the demo planner in the browser instead of calling the API (static prototype hosting). */
  localDemoAI: e.VITE_LOCAL_DEMO_AI === 'true',
};
