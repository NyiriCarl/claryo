// Local development server (Deno). Runs the same API as the Supabase edge
// function, with a JSON-file key-value store and an optional development-only
// sign-in. Never deploy this file.
//
//   deno run -A server/dev.ts            (see docs/SETUP.md)

import { createApp, type KV } from "../supabase/functions/server/app.ts";
import { providerFromEnv } from "../supabase/functions/server/ai.ts";

const env = (name: string) => Deno.env.get(name) ?? undefined;
const port = Number(env("PORT") ?? 8787);
const file = env("DEV_DATA_FILE") ?? ".data/dev-kv.json";

let data: Record<string, unknown> = {};
try {
  data = JSON.parse(await Deno.readTextFile(file));
} catch {
  data = {};
}
let writing = Promise.resolve();
const persist = () => {
  writing = writing.then(async () => {
    await Deno.mkdir(file.split("/").slice(0, -1).join("/") || ".", { recursive: true });
    await Deno.writeTextFile(file, JSON.stringify(data));
  });
  return writing;
};
const clone = <T>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)));

const kv: KV = {
  async get(k) { return clone(data[k]); },
  async set(k, v) { data[k] = clone(v); await persist(); },
  async del(k) { delete data[k]; await persist(); },
  async mdel(ks) { for (const k of ks) delete data[k]; await persist(); },
  async getByPrefix(p) { return Object.keys(data).filter((k) => k.startsWith(p)).map((k) => clone(data[k])); },
};

const devAuth = env("DEV_AUTH") === "true";

async function idFor(email: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email.toLowerCase()));
  const h = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

const ai = providerFromEnv(env);
const app = createApp({
  kv,
  ai,
  async verifyToken(token) {
    // Development tokens look like "dev.<base64url email>". Accepted only with DEV_AUTH=true.
    if (!devAuth || !token.startsWith("dev.")) return null;
    if (data[`devauth:revoked:${token}`]) return null;
    try {
      const email = atob(token.slice(4).replace(/-/g, "+").replace(/_/g, "/"));
      if (!/^[^@\s]+@[^@\s]+$/.test(email)) return null;
      return { id: await idFor(email), email };
    } catch {
      return null;
    }
  },
  async deleteAuthUser() {},
  limits: {
    guestPlansPerDay: env("LIMIT_GUEST_PLANS_PER_DAY") ? Number(env("LIMIT_GUEST_PLANS_PER_DAY")) : 50,
    userPlansPerDay: env("LIMIT_USER_PLANS_PER_DAY") ? Number(env("LIMIT_USER_PLANS_PER_DAY")) : 100,
    guestSimplifyPerDay: 200,
    userSimplifyPerDay: 500,
  },
});

console.log(`API on http://localhost:${port}/make-server-b327929d  (AI: ${ai.mode}, dev auth: ${devAuth ? "on" : "off"})`);
Deno.serve({ port, onListen() {} }, app.fetch);
