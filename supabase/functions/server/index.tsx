import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";

const app = new Hono();

app.use('*', logger(console.log));

app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check
app.get("/make-server-b327929d/health", (c) => {
  return c.json({ status: "ok", ts: new Date().toISOString() });
});

// ─── Goals ────────────────────────────────────────────────────────────────────

app.get("/make-server-b327929d/goals/:deviceId", async (c) => {
  try {
    const deviceId = c.req.param("deviceId");
    const goals = await kv.get(`claryo:goals:${deviceId}`);
    return c.json({ goals: goals ?? [] });
  } catch (e) {
    console.log("Error fetching goals:", e);
    return c.json({ error: `Failed to fetch goals: ${e}` }, 500);
  }
});

app.post("/make-server-b327929d/goals/:deviceId", async (c) => {
  try {
    const deviceId = c.req.param("deviceId");
    const body = await c.req.json();
    if (!Array.isArray(body.goals)) {
      return c.json({ error: "goals must be an array" }, 400);
    }
    await kv.set(`claryo:goals:${deviceId}`, body.goals);
    return c.json({ ok: true });
  } catch (e) {
    console.log("Error saving goals:", e);
    return c.json({ error: `Failed to save goals: ${e}` }, 500);
  }
});

// ─── Settings ─────────────────────────────────────────────────────────────────

app.get("/make-server-b327929d/settings/:deviceId", async (c) => {
  try {
    const deviceId = c.req.param("deviceId");
    const settings = await kv.get(`claryo:settings:${deviceId}`);
    return c.json({ settings: settings ?? null });
  } catch (e) {
    console.log("Error fetching settings:", e);
    return c.json({ error: `Failed to fetch settings: ${e}` }, 500);
  }
});

app.post("/make-server-b327929d/settings/:deviceId", async (c) => {
  try {
    const deviceId = c.req.param("deviceId");
    const body = await c.req.json();
    if (!body.settings || typeof body.settings !== "object") {
      return c.json({ error: "settings must be an object" }, 400);
    }
    await kv.set(`claryo:settings:${deviceId}`, body.settings);
    return c.json({ ok: true });
  } catch (e) {
    console.log("Error saving settings:", e);
    return c.json({ error: `Failed to save settings: ${e}` }, 500);
  }
});

// ─── Feedback ─────────────────────────────────────────────────────────────────

app.post("/make-server-b327929d/feedback", async (c) => {
  try {
    const body = await c.req.json();
    const { text, deviceId } = body;
    if (!text || typeof text !== "string") {
      return c.json({ error: "text is required" }, 400);
    }
    const existing = (await kv.get(`claryo:feedback:${deviceId ?? "anon"}`)) as
      | { text: string; date: string }[]
      | null;
    const updated = [
      ...(existing ?? []),
      { text: text.slice(0, 1000), date: new Date().toISOString() },
    ];
    await kv.set(`claryo:feedback:${deviceId ?? "anon"}`, updated);
    return c.json({ ok: true });
  } catch (e) {
    console.log("Error saving feedback:", e);
    return c.json({ error: `Failed to save feedback: ${e}` }, 500);
  }
});

Deno.serve(app.fetch);
