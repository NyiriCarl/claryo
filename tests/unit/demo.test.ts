import { describe, expect, it } from 'vitest';
import { demoPlan, demoSimplify } from '@shared/demo.ts';
import { SIMPLIFY_ACTIONS, validatePlanResult, validateSimplifyResult } from '@shared/plan.ts';

const GOALS = [
  'I want to start a clothing brand',
  'Learn UI/UX design',
  'Build a portfolio website',
  'Plan a church conference',
  'Create a YouTube video',
  'Prepare for my WAEC examination',
  'Repaint my bedroom',
];

describe('demo planner', () => {
  it.each(GOALS)('produces a valid plan for "%s"', (goal) => {
    const r = demoPlan(goal, { allowClarification: false });
    expect(r.kind).toBe('plan');
    const v = validatePlanResult(r.kind === 'plan' ? r.plan : null, { allowClarification: false });
    if (v.kind !== 'plan') throw new Error();
    expect(v.plan.tasks.length).toBeGreaterThan(2);
    const first = v.plan.tasks.find((t) => t.id === v.plan.recommended_first_task_id)!;
    expect(first.depends_on).toEqual([]);
  });

  it('asks a clarifying question for vague goals only when allowed', () => {
    expect(demoPlan('Start a business', { allowClarification: true }).kind).toBe('clarification');
    expect(demoPlan('Start a business', { allowClarification: false }).kind).toBe('plan');
    expect(demoPlan('Start a clothing brand in Lagos', { allowClarification: true }).kind).toBe('plan');
  });

  it.each(SIMPLIFY_ACTIONS)('returns a valid "%s" suggestion', (action) => {
    const r = demoSimplify({ title: 'Write a business plan', description: 'A one-page plan.', steps: [], project_title: 'Brand', goal_summary: '' }, action);
    expect(() => validateSimplifyResult(r, action)).not.toThrow();
  });
});
