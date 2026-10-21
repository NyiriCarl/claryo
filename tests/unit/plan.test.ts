import { describe, expect, it } from 'vitest';
import { validatePlanResult, validateSimplifyResult, validateGoalInput, ValidationError } from '@shared/plan.ts';

const base = () => ({
  clarification_needed: false,
  clarification_question: null,
  clarification_options: [],
  project_title: 'Learn UI design',
  goal_summary: 'Get comfortable with UI basics.',
  assumptions: ['Beginner'],
  phases: [
    { id: 'p1', title: 'Start', description: '' },
    { id: 'p2', title: 'Unused', description: '' },
  ],
  tasks: [
    { id: 'a', phase_id: 'p1', title: 'Pick a course', description: 'x', expected_result: null, steps: [], depends_on: [], estimated_minutes: 20, completion_criteria: null },
    { id: 'b', phase_id: 'p1', title: 'Do lesson 1', description: 'x', expected_result: null, steps: [], depends_on: ['a'], estimated_minutes: 30, completion_criteria: null },
  ],
  recommended_first_task_id: 'a',
  estimated_duration: 'About a month (estimate)',
});

describe('validatePlanResult', () => {
  it('accepts a valid plan and drops phases with no tasks', () => {
    const r = validatePlanResult(base(), { allowClarification: true });
    expect(r.kind).toBe('plan');
    if (r.kind !== 'plan') return;
    expect(r.plan.phases.map((p) => p.id)).toEqual(['p1']);
    expect(r.plan.recommended_first_task_id).toBe('a');
  });

  it('returns a clarification only when allowed', () => {
    const raw = { ...base(), clarification_needed: true, clarification_question: 'What kind?', clarification_options: ['A', 'B'] };
    expect(validatePlanResult(raw, { allowClarification: true })).toEqual({ kind: 'clarification', clarification: { question: 'What kind?', options: ['A', 'B'] } });
    expect(validatePlanResult(raw, { allowClarification: false }).kind).toBe('plan');
  });

  it('rejects plans without tasks or title', () => {
    expect(() => validatePlanResult({ ...base(), tasks: [] }, { allowClarification: false })).toThrow(ValidationError);
    expect(() => validatePlanResult({ ...base(), project_title: '  ' }, { allowClarification: false })).toThrow(ValidationError);
    expect(() => validatePlanResult('nope', { allowClarification: false })).toThrow(ValidationError);
  });

  it('repairs unknown and cyclic dependencies and a bad first task', () => {
    const raw = base();
    raw.tasks[0].depends_on = ['b', 'ghost', 'a'];
    raw.recommended_first_task_id = 'missing';
    const r = validatePlanResult(raw, { allowClarification: false });
    if (r.kind !== 'plan') throw new Error();
    const [a, b] = r.plan.tasks;
    // a→b and b→a can't both stand: one edge is removed, unknown/self ids dropped.
    expect(a.depends_on.includes('b') && b.depends_on.includes('a')).toBe(false);
    expect(a.depends_on).not.toContain('ghost');
    expect(a.depends_on).not.toContain('a');
    const first = r.plan.tasks.find((t) => t.id === r.plan.recommended_first_task_id)!;
    expect(first.depends_on).toEqual([]);
  });

  it('clamps estimates and removes duplicate ids', () => {
    const raw = base();
    raw.tasks[0].estimated_minutes = 99999;
    raw.tasks.push({ ...raw.tasks[1] });
    const r = validatePlanResult(raw, { allowClarification: false });
    if (r.kind !== 'plan') throw new Error();
    expect(r.plan.tasks).toHaveLength(2);
    expect(r.plan.tasks[0].estimated_minutes).toBeNull();
  });

  it('assigns orphan tasks to the first phase', () => {
    const raw = base();
    raw.tasks[1].phase_id = 'nope';
    const r = validatePlanResult(raw, { allowClarification: false });
    if (r.kind !== 'plan') throw new Error();
    expect(r.plan.tasks[1].phase_id).toBe('p1');
  });
});

describe('validateSimplifyResult', () => {
  it('requires steps for breakdown unless already small', () => {
    expect(() => validateSimplifyResult({ explanation: 'x', steps: [], single_action: null, already_small: false }, 'breakdown')).toThrow();
    expect(validateSimplifyResult({ explanation: 'x', steps: [], single_action: null, already_small: true }, 'breakdown').already_small).toBe(true);
  });
  it('requires a single action for "stuck"', () => {
    expect(() => validateSimplifyResult({ explanation: 'x', steps: [], single_action: null, already_small: false }, 'stuck')).toThrow();
  });
});

describe('validateGoalInput', () => {
  it('rejects empty, too short, too long and symbol-only input', () => {
    expect(validateGoalInput('')).toBeTruthy();
    expect(validateGoalInput('ab')).toBeTruthy();
    expect(validateGoalInput('x'.repeat(501))).toBeTruthy();
    expect(validateGoalInput('!!!???')).toBeTruthy();
    expect(validateGoalInput('Learn UI/UX design')).toBeNull();
  });
});
