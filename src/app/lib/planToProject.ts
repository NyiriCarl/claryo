import type { Plan, SuggestedStep } from '@shared/plan.ts';
import { newId } from './ids';
import type { PlanSource, Project, Task } from './types';

export function planToProject(plan: Plan, goal: string, source: PlanSource): Project {
  const now = new Date().toISOString();
  const phaseIds = new Map(plan.phases.map((p) => [p.id, newId()]));
  const taskIds = new Map(plan.tasks.map((t) => [t.id, newId()]));
  const positions = new Map<string | null, number>();
  const tasks: Task[] = plan.tasks.map((t) => {
    const phaseId = t.phase_id ? phaseIds.get(t.phase_id) ?? null : null;
    const position = positions.get(phaseId) ?? 0;
    positions.set(phaseId, position + 1);
    return {
      id: taskIds.get(t.id)!,
      phaseId,
      parentId: null,
      title: t.title,
      description: t.description,
      expectedResult: t.expected_result,
      steps: t.steps,
      dependsOn: t.depends_on.map((d) => taskIds.get(d)!).filter(Boolean),
      estimateMinutes: t.estimated_minutes,
      completionCriteria: t.completion_criteria,
      status: 'todo',
      position,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    };
  });
  return {
    id: newId(),
    title: plan.project_title,
    originalGoal: goal,
    goalSummary: plan.goal_summary,
    assumptions: plan.assumptions,
    estimatedDuration: plan.estimated_duration,
    status: 'active',
    source,
    phases: plan.phases.map((p, i) => ({ id: phaseIds.get(p.id)!, title: p.title, description: p.description, position: i })),
    tasks,
    recommendedFirstTaskId: taskIds.get(plan.recommended_first_task_id) ?? tasks[0]?.id ?? null,
    createdAt: now,
    updatedAt: now,
    lastActivityAt: now,
  };
}

export function emptyProject(title: string, goal: string): Project {
  const now = new Date().toISOString();
  return {
    id: newId(),
    title,
    originalGoal: goal,
    goalSummary: '',
    assumptions: [],
    estimatedDuration: null,
    status: 'active',
    source: 'manual',
    phases: [],
    tasks: [],
    recommendedFirstTaskId: null,
    createdAt: now,
    updatedAt: now,
    lastActivityAt: now,
  };
}

export function newTask(fields: Partial<Task> & { title: string }): Task {
  const now = new Date().toISOString();
  return {
    id: newId(),
    phaseId: null,
    parentId: null,
    description: '',
    expectedResult: null,
    steps: [],
    dependsOn: [],
    estimateMinutes: null,
    completionCriteria: null,
    status: 'todo',
    position: 0,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    ...fields,
  };
}

export function taskFromStep(s: SuggestedStep, fields: Partial<Task>): Task {
  return newTask({ title: s.title, description: s.description, estimateMinutes: s.estimated_minutes, ...fields });
}
