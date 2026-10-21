// Supabase Edge Function entry point (Deno).
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import * as kv from "./kv_store.tsx";
import { createApp, type AuthUser } from "./app.ts";
import { providerFromEnv } from "./ai.ts";

const env = (name: string) => Deno.env.get(name) ?? undefined;

const admin = createClient(env("SUPABASE_URL")!, env("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const num = (name: string) => (env(name) ? Number(env(name)) : undefined);

const app = createApp({
  kv,
  ai: providerFromEnv(env),
  async verifyToken(token): Promise<AuthUser | null> {
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data.user) return null;
    return { id: data.user.id, email: data.user.email ?? null };
  },
  async deleteAuthUser(id) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) throw new Error(error.message);
  },
  limits: {
    guestPlansPerDay: num("LIMIT_GUEST_PLANS_PER_DAY"),
    userPlansPerDay: num("LIMIT_USER_PLANS_PER_DAY"),
    guestSimplifyPerDay: num("LIMIT_GUEST_SIMPLIFY_PER_DAY"),
    userSimplifyPerDay: num("LIMIT_USER_SIMPLIFY_PER_DAY"),
  },
  allowedOrigins: env("ALLOWED_ORIGINS") ? env("ALLOWED_ORIGINS")!.split(",").map((s) => s.trim()) : "*",
  rateLimitSalt: env("RATE_LIMIT_SALT"),
});

Deno.serve(app.fetch);
