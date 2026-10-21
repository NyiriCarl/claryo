// HTTP API. Platform-neutral: the Supabase entry (index.tsx) and the local
// dev server (server/dev.ts) both build it with their own dependencies.

import { Hono, type Context } from "npm:hono@4.13.12";
import { cors } from "npm:hono@4.13.12/cors";
import { bodyLimit } from "npm:hono@4.13.12/body-limit";
import { AIError, type AIProvider } from "./ai.ts";
import {
  LIMITS,
  SIMPLIFY_ACTIONS,
  validateGoalInput,
  type SimplifyAction,
  type TaskContext,
} from "./shared/plan.ts";

export const BASE_PATH = "/make-server-b327929d";

/** Minimal key-value interface (matches kv_store.tsx). Values stored under a
 *  user's prefix always carry their own key in `k` so they can be deleted. */
export interface KV {
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<void>;
  del(key: string): Promise<void>;
  mdel(keys: string[]): Promise<void>;
  getByPrefix(prefix: string): Promise<any[]>;
}

export interface AuthUser {
  id: string;
  email: string | null;
}

export interface Limits {
  guestPlansPerDay: number;
  userPlansPerDay: number;
  guestSimplifyPerDay: number;
  userSimplifyPerDay: number;
  maxProjectsPerUser: number;
}

export const DEFAULT_LIMITS: Limits = {
  guestPlansPerDay: 5,
  userPlansPerDay: 20,
  guestSimplifyPerDay: 20,
  userSimplifyPerDay: 100,
  maxProjectsPerUser: 200,
};

export interface Deps {
  kv: KV;
  ai: AIProvider;
  /** Returns the user for a valid session token, or null. */
  verifyToken(token: string): Promise<AuthUser | null>;
  /** Removes the user from the auth system (account deletion). */
  deleteAuthUser(id: string): Promise<void>;
  limits?: Partial<Limits>;
  allowedOrigins?: string[] | "*";
  rateLimitSalt?: string;
  now?: () => number;
}

type Env = { Variables: { user: AuthUser | null } };

const PROJECT_ID = /^[A-Za-z0-9_-]{8,64}$/;
const MAX_PROJECT_BYTES = 200_000;

function err(c: Context, status: number, code: string, message: string) {
  return c.json({ error: { code, message } }, status as 400);
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

export function createApp(deps: Deps) {
  const limits: Limits = { ...DEFAULT_LIMITS };
  for (const [k, v] of Object.entries(deps.limits ?? {})) {
    if (typeof v === "number" && Number.isFinite(v) && v >= 0) limits[k as keyof Limits] = v;
  }
  const now = deps.now ?? (() => Date.now());
  const { kv, ai } = deps;
  const app = new Hono<Env>().basePath(BASE_PATH);

  const origins = deps.allowedOrigins ?? "*";
  app.use(
    "*",
    cors({
      origin: origins === "*" ? "*" : (o) => (origins.includes(o) ? o : null),
      allowHeaders: ["Content-Type", "Authorization", "X-Session", "apikey"],
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      maxAge: 600,
    }),
  );
  app.use("*", bodyLimit({ maxSize: 256 * 1024, onError: (c) => err(c, 413, "too_large", "That request is too large.") }));

  // Session: the user's access token travels in X-Session. Authorization carries
  // the public anon key that the Supabase gateway requires.
  app.use("*", async (c, next) => {
    const token = c.req.header("X-Session");
    if (!token) {
      c.set("user", null);
      return next();
    }
    const user = await deps.verifyToken(token).catch(() => null);
    if (!user) return err(c, 401, "session_expired", "Your session has expired. Please sign in again.");
    c.set("user", user);
    return next();
  });

  app.onError((e, c) => {
    console.error("Unhandled error:", e instanceof Error ? e.message : e);
    return err(c, 500, "server_error", "Something went wrong on our side. Please try again.");
  });

  const requireUser = (c: Context<Env>) => c.get("user");
  const day = () => new Date(now()).toISOString().slice(0, 10);

  async function subjectPrefix(c: Context<Env>): Promise<string> {
    const user = c.get("user");
    if (user) return `u:${user.id}:`;
    const ip = (c.req.header("x-forwarded-for") ?? c.req.header("x-real-ip") ?? "unknown").split(",")[0].trim();
    return `g:${await sha256(`${deps.rateLimitSalt ?? ""}:${ip}`)}:`;
  }

  async function usage(c: Context<Env>, op: "plan" | "simplify") {
    const prefix = await subjectPrefix(c);
    const key = `${prefix}rl:${op}:${day()}`;
    const row = (await kv.get(key)) as { k: string; n: number } | null;
    const signedIn = !!c.get("user");
    const limit =
      op === "plan"
        ? signedIn ? limits.userPlansPerDay : limits.guestPlansPerDay
        : signedIn ? limits.userSimplifyPerDay : limits.guestSimplifyPerDay;
    return { key, used: row?.n ?? 0, limit };
  }

  async function recordGeneration(c: Context<Env>, op: string, outcome: string) {
    const user = c.get("user");
    if (!user) return;
    const k = `u:${user.id}:gen:${now()}-${crypto.randomUUID().slice(0, 8)}`;
    // Operational metadata only: no prompt or response content.
    await kv.set(k, { k, op, mode: ai.mode, model: ai.modelId, outcome, at: new Date(now()).toISOString() });
  }

  function aiErrorResponse(c: Context<Env>, e: unknown) {
    if (e instanceof AIError) {
      const status = e.code === "ai_rate_limited" ? 503 : e.code === "ai_refused" ? 422 : e.code === "ai_timeout" ? 504 : 502;
      return err(c, status, e.code, e.message);
    }
    console.error("AI error:", e instanceof Error ? e.message : e);
    return err(c, 502, "ai_unavailable", "The AI service is unavailable right now.");
  }

  // ─── Public ────────────────────────────────────────────────────────────────

  app.get("/health", (c) => c.json({ status: "ok" }));

  app.get("/config", async (c) => {
    return c.json({ aiMode: ai.mode, limits: { plansPerDay: c.get("user") ? limits.userPlansPerDay : limits.guestPlansPerDay } });
  });

  app.get("/ai/usage", async (c) => {
    const [plan, simplify] = await Promise.all([usage(c, "plan"), usage(c, "simplify")]);
    return c.json({
      aiMode: ai.mode,
      plans: { used: plan.used, limit: plan.limit },
      simplify: { used: simplify.used, limit: simplify.limit },
      resetsAt: `${day()}T23:59:59Z`,
    });
  });

  app.post("/ai/plan", async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!body || typeof body !== "object") return err(c, 400, "invalid_input", "Invalid request.");
    const goalError = validateGoalInput(body.goal);
    if (goalError) return err(c, 400, "invalid_input", goalError);
    let clarification: { question: string; answer: string } | undefined;
    if (body.clarification) {
      const q = body.clarification.question, a = body.clarification.answer;
      if (typeof q !== "string" || typeof a !== "string" || !a.trim() || a.length > LIMITS.answerMaxChars || q.length > 300) {
        return err(c, 400, "invalid_input", "Please answer the question in a few words.");
      }
      clarification = { question: q.trim(), answer: a.trim() };
    }

    const u = await usage(c, "plan");
    if (u.used >= u.limit) {
      return err(c, 429, "rate_limited", c.get("user")
        ? `You've reached today's limit of ${u.limit} new plans. It resets tomorrow.`
        : `You've reached today's limit of ${u.limit} new plans for guests. Create a free account for more, or try again tomorrow.`);
    }
    // Count the attempt up front so repeated taps can't bypass the limit.
    await kv.set(u.key, { k: u.key, n: u.used + 1 });

    try {
      const result = await ai.plan({ goal: body.goal.trim(), clarification, skipClarification: body.skipClarification === true });
      await recordGeneration(c, "plan", result.kind);
      return c.json({ mode: ai.mode, result });
    } catch (e) {
      await recordGeneration(c, "plan", e instanceof AIError ? e.code : "error");
      return aiErrorResponse(c, e);
    }
  });

  app.post("/ai/simplify", async (c) => {
    const body = await c.req.json().catch(() => null);
    const action = body?.action as SimplifyAction;
    const t = body?.task;
    if (!SIMPLIFY_ACTIONS.includes(action) || !t || typeof t.title !== "string" || !t.title.trim()) {
      return err(c, 400, "invalid_input", "Invalid request.");
    }
    const s = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
    const task: TaskContext = {
      title: s(t.title, LIMITS.titleMaxChars),
      description: s(t.description, LIMITS.textMaxChars),
      steps: Array.isArray(t.steps) ? t.steps.slice(0, LIMITS.maxStepsPerTask).map((x: unknown) => s(x, 200)) : [],
      project_title: s(t.project_title, LIMITS.titleMaxChars),
      goal_summary: s(t.goal_summary, 400),
    };

    const u = await usage(c, "simplify");
    if (u.used >= u.limit) {
      return err(c, 429, "rate_limited", `You've reached today's limit of ${u.limit} AI suggestions. It resets tomorrow.`);
    }
    await kv.set(u.key, { k: u.key, n: u.used + 1 });

    try {
      const result = await ai.simplify(task, action);
      await recordGeneration(c, `simplify:${action}`, "ok");
      return c.json({ mode: ai.mode, result });
    } catch (e) {
      await recordGeneration(c, `simplify:${action}`, e instanceof AIError ? e.code : "error");
      return aiErrorResponse(c, e);
    }
  });

  app.post("/feedback", async (c) => {
    const body = await c.req.json().catch(() => null);
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    if (!text) return err(c, 400, "invalid_input", "Write a short message first.");
    const prefix = await subjectPrefix(c);
    const key = `${prefix}rl:feedback:${day()}`;
    const row = (await kv.get(key)) as { n: number } | null;
    if ((row?.n ?? 0) >= 10) return err(c, 429, "rate_limited", "Thanks! You've sent a lot of feedback today.");
    await kv.set(key, { k: key, n: (row?.n ?? 0) + 1 });
    const k = `${prefix}feedback:${now()}`;
    await kv.set(k, { k, text: text.slice(0, 2000), at: new Date(now()).toISOString() });
    return c.json({ ok: true });
  });

  // ─── Signed-in user data ───────────────────────────────────────────────────
  // Every key below is derived from the verified user id, never from the URL,
  // so one user can't read or write another user's records.

  const me = new Hono<Env>();
  me.use("*", async (c, next) => {
    if (!requireUser(c)) return err(c, 401, "auth_required", "Please sign in to use this feature.");
    return next();
  });

  const projectKey = (uid: string, id: string) => `u:${uid}:project:${id}`;

  me.get("/projects", async (c) => {
    const user = requireUser(c)!;
    const rows = (await kv.getByPrefix(`u:${user.id}:project:`)) as any[];
    return c.json({
      projects: rows.map((r) => ({ id: r.id, version: r.version, updatedAt: r.updatedAt, deleted: !!r.deleted, data: r.deleted ? null : r.data })),
    });
  });

  me.put("/projects/:id", async (c) => {
    const user = requireUser(c)!;
    const id = c.req.param("id");
    if (!PROJECT_ID.test(id)) return err(c, 400, "invalid_input", "Invalid project id.");
    const body = await c.req.json().catch(() => null);
    const data = body?.project;
    if (!data || typeof data !== "object" || data.id !== id || typeof data.title !== "string") {
      return err(c, 400, "invalid_input", "Invalid project.");
    }
    if (JSON.stringify(data).length > MAX_PROJECT_BYTES) return err(c, 413, "too_large", "This project is too large to save.");
    const baseVersion = typeof body.baseVersion === "number" ? body.baseVersion : null;

    const key = projectKey(user.id, id);
    const current = await kv.get(key);
    if (!current) {
      if (baseVersion !== null) {
        // The client thinks this exists on the server but it doesn't (deleted elsewhere and purged).
        return c.json({ error: { code: "conflict", message: "This project changed on another device." }, server: null }, 409);
      }
      const count = (await kv.getByPrefix(`u:${user.id}:project:`)).filter((r: any) => !r.deleted).length;
      if (count >= limits.maxProjectsPerUser) {
        return err(c, 403, "project_limit", `You can keep up to ${limits.maxProjectsPerUser} projects. Delete some to add more.`);
      }
    } else if (current.version !== baseVersion) {
      return c.json(
        {
          error: { code: "conflict", message: "This project changed on another device." },
          server: { id, version: current.version, updatedAt: current.updatedAt, deleted: !!current.deleted, data: current.deleted ? null : current.data },
        },
        409,
      );
    }
    const version = (current?.version ?? 0) + 1;
    const updatedAt = new Date(now()).toISOString();
    await kv.set(key, { k: key, id, version, updatedAt, deleted: false, data });
    return c.json({ id, version, updatedAt });
  });

  me.delete("/projects/:id", async (c) => {
    const user = requireUser(c)!;
    const id = c.req.param("id");
    if (!PROJECT_ID.test(id)) return err(c, 400, "invalid_input", "Invalid project id.");
    const baseVersion = Number(c.req.query("baseVersion"));
    const key = projectKey(user.id, id);
    const current = await kv.get(key);
    if (!current || current.deleted) return c.json({ id, deleted: true });
    if (current.version !== baseVersion) {
      return c.json(
        {
          error: { code: "conflict", message: "This project changed on another device." },
          server: { id, version: current.version, updatedAt: current.updatedAt, deleted: false, data: current.data },
        },
        409,
      );
    }
    // Keep a tombstone (without content) so other devices learn about the deletion.
    const version = current.version + 1;
    const updatedAt = new Date(now()).toISOString();
    await kv.set(key, { k: key, id, version, updatedAt, deleted: true, data: null });
    return c.json({ id, version, updatedAt, deleted: true });
  });

  me.get("/profile", async (c) => {
    const user = requireUser(c)!;
    const p = await kv.get(`u:${user.id}:profile`);
    return c.json({ profile: { email: user.email, name: p?.name ?? "", prefs: p?.prefs ?? {}, createdAt: p?.createdAt ?? null } });
  });

  me.put("/profile", async (c) => {
    const user = requireUser(c)!;
    const body = await c.req.json().catch(() => null);
    const name = typeof body?.name === "string" ? body.name.trim().slice(0, 60) : "";
    const prefs = body?.prefs && typeof body.prefs === "object" && !Array.isArray(body.prefs) ? body.prefs : {};
    if (JSON.stringify(prefs).length > 4000) return err(c, 400, "invalid_input", "Invalid preferences.");
    const k = `u:${user.id}:profile`;
    const existing = await kv.get(k);
    await kv.set(k, { k, name, prefs, createdAt: existing?.createdAt ?? new Date(now()).toISOString() });
    return c.json({ ok: true });
  });

  me.get("/export", async (c) => {
    const user = requireUser(c)!;
    const rows = (await kv.getByPrefix(`u:${user.id}:`)) as any[];
    const strip = ({ k: _k, ...rest }: any) => rest;
    return c.json({
      exportedAt: new Date(now()).toISOString(),
      account: { id: user.id, email: user.email },
      profile: rows.filter((r) => r.k?.endsWith(":profile")).map(strip)[0] ?? null,
      projects: rows.filter((r) => r.k?.includes(":project:") && !r.deleted).map((r) => r.data),
      aiGenerations: rows.filter((r) => r.k?.includes(":gen:")).map(strip),
      feedback: rows.filter((r) => r.k?.includes(":feedback:")).map(strip),
    });
  });

  me.delete("/", async (c) => {
    const user = requireUser(c)!;
    const rows = (await kv.getByPrefix(`u:${user.id}:`)) as any[];
    const keys = rows.map((r) => r.k).filter((k): k is string => typeof k === "string");
    if (keys.length) await kv.mdel(keys);
    await deps.deleteAuthUser(user.id);
    return c.json({ deleted: true });
  });

  app.route("/me", me);
  return app;
}
