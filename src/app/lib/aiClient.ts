// Calls to the planning service. In local-demo mode the demo planner runs in
// the browser (for static prototypes); results are still labelled "demo".
import type { PlanResult, SimplifyAction, SimplifyResult, TaskContext } from '@shared/plan.ts';
import { demoPlan, demoSimplify } from '@shared/demo.ts';
import { api } from './api';
import { config } from '../config';

export type AIMode = 'live' | 'demo';

export interface PlanInput {
  goal: string;
  clarification?: { question: string; answer: string };
  skipClarification?: boolean;
}

const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });

export async function requestPlan(input: PlanInput, signal?: AbortSignal): Promise<{ mode: AIMode; result: PlanResult }> {
  if (config.localDemoAI) {
    await wait(600, signal);
    return {
      mode: 'demo',
      result: demoPlan(input.goal, { allowClarification: !input.clarification && !input.skipClarification, answer: input.clarification?.answer }),
    };
  }
  // Live generation can take a while; the screen offers Cancel throughout.
  return api('/ai/plan', { method: 'POST', body: input, signal, timeoutMs: 120_000 });
}

export async function requestSimplify(
  task: TaskContext,
  action: SimplifyAction,
  signal?: AbortSignal,
): Promise<{ mode: AIMode; result: SimplifyResult }> {
  if (config.localDemoAI) {
    await wait(400, signal);
    return { mode: 'demo', result: demoSimplify(task, action) };
  }
  return api('/ai/simplify', { method: 'POST', body: { task, action }, signal, timeoutMs: 90_000 });
}

export interface Usage {
  aiMode: AIMode;
  plans: { used: number; limit: number };
  simplify: { used: number; limit: number };
}

export async function fetchUsage(): Promise<Usage> {
  if (config.localDemoAI) return { aiMode: 'demo', plans: { used: 0, limit: 0 }, simplify: { used: 0, limit: 0 } };
  return api('/ai/usage');
}
