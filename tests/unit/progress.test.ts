import { describe, expect, it } from 'vitest';
import { completionHistory, nextAction, nextAfter, progressOf } from '../../src/app/lib/progress';
import type { Project, Task } from '../../src/app/lib/types';

const t = (id: string, o: Partial<Task> = {}): Task => ({
  id, phaseId: 'p1', parentId: null, title: id, description: '', expectedResult: null, steps: [], dependsOn: [],
  estimateMinutes: null, completionCriteria: null, status: 'todo', position: 0, createdAt: '', updatedAt: '', completedAt: null, ...o,
});
const project = (tasks: Task[], o: Partial<Project> = {}): Project => ({
  id: 'x', title: 'X', originalGoal: '', goalSummary: '', assumptions: [], estimatedDuration: null, status: 'active', source: 'ai',
  phases: [{ id: 'p1', title: 'One', description: '', position: 0 }, { id: 'p2', title: 'Two', description: '', position: 1 }],
  tasks, recommendedFirstTaskId: null, createdAt: '', updatedAt: '', lastActivityAt: '', ...o,
});

describe('progressOf', () => {
  it('returns null percent for a project with no tasks', () => {
    expect(progressOf(project([])).percent).toBeNull();
  });
  it('counts top-level tasks only and computes phases', () => {
    const p = project([
      t('a', { status: 'done' }),
      t('b', { position: 1 }),
      t('a1', { parentId: 'a', status: 'done' }),
      t('c', { phaseId: 'p2', status: 'done' }),
    ]);
    expect(progressOf(p)).toEqual({ done: 2, total: 3, percent: 67, phasesDone: 1, phasesTotal: 2 });
  });
});

describe('nextAction', () => {
  it('prefers the recommended first task when it has no blockers', () => {
    const p = project([t('a'), t('b', { position: 1 })], { recommendedFirstTaskId: 'b' });
    expect(nextAction(p)?.task.id).toBe('b');
    expect(nextAction(p)?.isFirst).toBe(true);
  });
  it('skips tasks whose dependencies are not done', () => {
    const p = project([t('a', { dependsOn: ['c'] }), t('b', { position: 1 }), t('c', { phaseId: 'p2' })]);
    expect(nextAction(p)?.task.id).toBe('b');
  });
  it('recommends an open subtask of the next task', () => {
    const p = project([t('a'), t('a1', { parentId: 'a', status: 'done' }), t('a2', { parentId: 'a', position: 1 })]);
    const n = nextAction(p)!;
    expect(n.task.id).toBe('a2');
    expect(n.parent?.id).toBe('a');
  });
  it('returns null when everything is done', () => {
    expect(nextAction(project([t('a', { status: 'done' })]))).toBeNull();
    expect(nextAfter(project([t('a', { status: 'done' }), t('b', { position: 1 })]), 'b')).toBeNull();
  });
});

describe('completionHistory', () => {
  it('sorts by completion time, newest first', () => {
    const p = project([t('a', { status: 'done', completedAt: '2026-01-01T10:00:00Z' }), t('b', { status: 'done', completedAt: '2026-01-02T10:00:00Z' })]);
    expect(completionHistory([p]).map((h) => h.task.id)).toEqual(['b', 'a']);
  });
});
