import { describe, expect, it, beforeEach } from 'vitest';
import Anthropic from '@anthropic-ai/sdk';
import { createApp, type KV } from '../../supabase/functions/server/app';
import { AnthropicProvider, DemoProvider, AIError, type AIProvider } from '../../supabase/functions/server/ai';
import { demoPlan } from '@shared/demo.ts';

const B = '/make-server-b327929d';

function memoryKV(): KV & { data: Map<string, any> } {
  const data = new Map<string, any>();
  const clone = (v: any) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
  return {
    data,
    async get(k) { return clone(data.get(k)); },
    async set(k, v) { data.set(k, clone(v)); },
    async del(k) { data.delete(k); },
    async mdel(ks) { ks.forEach((k) => data.delete(k)); },
    async getByPrefix(p) { return [...data.entries()].filter(([k]) => k.startsWith(p)).map(([, v]) => clone(v)); },
  };
}

const USERS: Record<string, { id: string; email: string }> = {
  'token-alice': { id: 'alice', email: 'alice@example.com' },
  'token-bob': { id: 'bob', email: 'bob@example.com' },
};

function setup(ai: AIProvider = new DemoProvider()) {
  const kv = memoryKV();
  const deleted: string[] = [];
  const app = createApp({
    kv,
    ai,
    verifyToken: async (t) => USERS[t] ?? null,
    deleteAuthUser: async (id) => void deleted.push(id),
    limits: { guestPlansPerDay: 2, userPlansPerDay: 3 },
  });
  const req = (path: string, opts: { method?: string; body?: unknown; token?: string; ip?: string } = {}) =>
    app.request(B + path, {
      method: opts.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(opts.token ? { 'X-Session': opts.token } : {}),
        'x-forwarded-for': opts.ip ?? '1.2.3.4',
      },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    });
  return { kv, req, deleted };
}

const project = (id: string, title = 'P') => ({ id, title, tasks: [] });

describe('authentication and authorization', () => {
  it('rejects /me routes without a session and with an invalid session', async () => {
    const { req } = setup();
    expect((await req('/me/projects')).status).toBe(401);
    const r = await req('/me/projects', { token: 'forged' });
    expect(r.status).toBe(401);
    expect((await r.json()).error.code).toBe('session_expired');
  });

  it("keeps each user's projects private", async () => {
    const { req } = setup();
    const id = 'project-0001';
    expect((await req(`/me/projects/${id}`, { method: 'PUT', token: 'token-alice', body: { baseVersion: null, project: project(id, 'Alice secret') } })).status).toBe(200);
    const bob = await (await req('/me/projects', { token: 'token-bob' })).json();
    expect(bob.projects).toEqual([]);
    // Bob writing to the same id creates his own record; Alice's is untouched.
    await req(`/me/projects/${id}`, { method: 'PUT', token: 'token-bob', body: { baseVersion: null, project: project(id, 'Bob') } });
    const alice = await (await req('/me/projects', { token: 'token-alice' })).json();
    expect(alice.projects[0].data.title).toBe('Alice secret');
  });
});

describe('project sync', () => {
  it('versions writes and reports conflicts with the server copy', async () => {
    const { req } = setup();
    const id = 'project-0002';
    const a = await (await req(`/me/projects/${id}`, { method: 'PUT', token: 'token-alice', body: { baseVersion: null, project: project(id, 'v1') } })).json();
    expect(a.version).toBe(1);
    const b = await (await req(`/me/projects/${id}`, { method: 'PUT', token: 'token-alice', body: { baseVersion: 1, project: project(id, 'v2') } })).json();
    expect(b.version).toBe(2);
    // A second device still based on version 1:
    const c = await req(`/me/projects/${id}`, { method: 'PUT', token: 'token-alice', body: { baseVersion: 1, project: project(id, 'stale') } });
    expect(c.status).toBe(409);
    const body = await c.json();
    expect(body.server.version).toBe(2);
    expect(body.server.data.title).toBe('v2');
  });

  it('keeps tombstones for deletions and refuses stale deletes', async () => {
    const { req } = setup();
    const id = 'project-0003';
    await req(`/me/projects/${id}`, { method: 'PUT', token: 'token-alice', body: { baseVersion: null, project: project(id) } });
    expect((await req(`/me/projects/${id}?baseVersion=0`, { method: 'DELETE', token: 'token-alice' })).status).toBe(409);
    expect((await req(`/me/projects/${id}?baseVersion=1`, { method: 'DELETE', token: 'token-alice' })).status).toBe(200);
    const list = await (await req('/me/projects', { token: 'token-alice' })).json();
    expect(list.projects[0]).toMatchObject({ id, deleted: true, data: null, version: 2 });
  });

  it('validates project payloads', async () => {
    const { req } = setup();
    expect((await req('/me/projects/bad', { method: 'PUT', token: 'token-alice', body: { project: project('bad') } })).status).toBe(400);
    expect((await req('/me/projects/project-0004', { method: 'PUT', token: 'token-alice', body: { project: project('other-id-000') } })).status).toBe(400);
  });
});

describe('AI endpoints', () => {
  it('returns demo plans labelled as demo', async () => {
    const { req } = setup();
    const r = await (await req('/ai/plan', { method: 'POST', body: { goal: 'Learn UI/UX design' } })).json();
    expect(r.mode).toBe('demo');
    expect(r.result.kind).toBe('plan');
  });

  it('validates the goal', async () => {
    const { req } = setup();
    const r = await req('/ai/plan', { method: 'POST', body: { goal: '  ' } });
    expect(r.status).toBe(400);
    expect((await r.json()).error.code).toBe('invalid_input');
  });

  it('applies daily limits per guest network and per user', async () => {
    const { req } = setup();
    for (let i = 0; i < 2; i++) expect((await req('/ai/plan', { method: 'POST', body: { goal: 'Learn to cook' } })).status).toBe(200);
    const limited = await req('/ai/plan', { method: 'POST', body: { goal: 'Learn to cook' } });
    expect(limited.status).toBe(429);
    // A different network is counted separately; signed-in users have their own allowance.
    expect((await req('/ai/plan', { method: 'POST', ip: '5.6.7.8', body: { goal: 'Learn to cook' } })).status).toBe(200);
    expect((await req('/ai/plan', { method: 'POST', token: 'token-alice', body: { goal: 'Learn to cook' } })).status).toBe(200);
    const usage = await (await req('/ai/usage', { token: 'token-alice' })).json();
    expect(usage.plans).toEqual({ used: 1, limit: 3 });
  });

  it('records generation metadata without prompt content', async () => {
    const { req, kv } = setup();
    await req('/ai/plan', { method: 'POST', token: 'token-alice', body: { goal: 'My very private goal text' } });
    const gens = [...kv.data.entries()].filter(([k]) => k.includes(':gen:'));
    expect(gens).toHaveLength(1);
    expect(JSON.stringify(gens[0][1])).not.toContain('private goal');
  });

  it('maps provider failures to readable errors', async () => {
    const failing: AIProvider = {
      mode: 'live',
      modelId: 'x',
      plan: async () => { throw new AIError('invalid_ai_output', "The AI returned a plan we couldn't use."); },
      simplify: async () => { throw new Error('boom'); },
    };
    const { req } = setup(failing);
    const r = await req('/ai/plan', { method: 'POST', body: { goal: 'Learn to cook' } });
    expect(r.status).toBe(502);
    expect((await r.json()).error.code).toBe('invalid_ai_output');
    const s = await req('/ai/simplify', { method: 'POST', body: { action: 'explain', task: { title: 'T' } } });
    expect((await s.json()).error.code).toBe('ai_unavailable');
  });
});

describe('export and account deletion', () => {
  it('exports only the caller\'s data and deletes everything on request', async () => {
    const { req, kv, deleted } = setup();
    await req('/me/projects/project-0005', { method: 'PUT', token: 'token-alice', body: { baseVersion: null, project: project('project-0005', 'Mine') } });
    await req('/me/projects/project-0006', { method: 'PUT', token: 'token-bob', body: { baseVersion: null, project: project('project-0006', 'Bob') } });
    await req('/me/profile', { method: 'PUT', token: 'token-alice', body: { name: 'Alice', prefs: { theme: 'dark' } } });
    const exp = await (await req('/me/export', { token: 'token-alice' })).json();
    expect(exp.projects.map((p: any) => p.title)).toEqual(['Mine']);
    expect(exp.profile.name).toBe('Alice');

    expect((await req('/me', { method: 'DELETE', token: 'token-alice' })).status).toBe(200);
    expect(deleted).toEqual(['alice']);
    expect([...kv.data.keys()].some((k) => k.startsWith('u:alice:'))).toBe(false);
    expect([...kv.data.keys()].some((k) => k.startsWith('u:bob:'))).toBe(true);
  });
});

describe('AnthropicProvider (with a fake client)', () => {
  const plan = demoPlan('Learn UI/UX design', { allowClarification: false });
  const okJson = JSON.stringify({ clarification_needed: false, clarification_question: null, clarification_options: [], ...(plan.kind === 'plan' ? plan.plan : {}) });
  const msg = (text: string, stop_reason = 'end_turn') => ({ content: [{ type: 'text', text }], stop_reason });

  function fake(responses: (object | Error)[]) {
    const calls: any[] = [];
    const client = {
      beta: {
        messages: {
          create: async (params: any) => {
            calls.push(params);
            const r = responses.shift();
            if (r instanceof Error) throw r;
            return r;
          },
        },
      },
    } as unknown as Anthropic;
    return { client, calls };
  }
  const opts = { apiKey: 'test', model: 'claude-opus-5-5', effort: 'medium' as const, timeoutMs: 1000 };

  it('sends a structured-output request and validates the result', async () => {
    const { client, calls } = fake([msg(okJson)]);
    const p = new AnthropicProvider(opts, client);
    const r = await p.plan({ goal: 'Learn UI/UX design' });
    expect(r.kind).toBe('plan');
    expect(calls[0].output_config.format.type).toBe('json_schema');
    expect(calls[0].model).toBe('claude-opus-5-5');
    expect(calls[0].messages[0].content).toContain('Learn UI/UX design');
  });

  it('retries once on malformed output, then gives up with invalid_ai_output', async () => {
    const ok = new AnthropicProvider(opts, fake([msg('{not json'), msg(okJson)]).client);
    expect((await ok.plan({ goal: 'x y z' })).kind).toBe('plan');
    const bad = new AnthropicProvider(opts, fake([msg('{"tasks":[]}'), msg('nope')]).client);
    await expect(bad.plan({ goal: 'x y z' })).rejects.toMatchObject({ code: 'invalid_ai_output' });
  });

  it('treats refusals and truncation safely', async () => {
    const refused = new AnthropicProvider(opts, fake([msg('', 'refusal')]).client);
    await expect(refused.plan({ goal: 'x y z' })).rejects.toMatchObject({ code: 'ai_refused' });
    const cut = new AnthropicProvider(opts, fake([msg('{"a":', 'max_tokens'), msg('{"a":', 'max_tokens')]).client);
    await expect(cut.plan({ goal: 'x y z' })).rejects.toMatchObject({ code: 'invalid_ai_output' });
  });

  it('tells the model not to ask again after a clarification answer', async () => {
    const { client, calls } = fake([msg(okJson)]);
    await new AnthropicProvider(opts, client).plan({ goal: 'Start a business', clarification: { question: 'What kind?', answer: 'Food' } });
    expect(calls[0].messages[0].content).toContain('Do not ask another question');
  });
});
