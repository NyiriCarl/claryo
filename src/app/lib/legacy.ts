// Converts goals saved by the previous version of the app into projects.
import { newId } from './ids';
import { newTask } from './planToProject';
import type { Project, Task } from './types';

interface LegacyStep { text?: string; completed?: boolean; duration?: string }
interface LegacyGoal {
  originalInput?: string;
  rewrittenTitle?: string;
  startNow?: LegacyStep;
  nextStep?: LegacyStep;
  miniBreakdown?: LegacyStep[];
  createdAt?: string;
  lastActiveAt?: string;
}

const minutesOf = (d?: string) => {
  const m = d?.match(/(\d+)/);
  return m ? Number(m[1]) : null;
};

export function migrateLegacyGoals(goals: unknown[]): Project[] {
  const out: Project[] = [];
  for (const raw of goals) {
    const g = raw as LegacyGoal;
    if (!g || typeof g !== 'object' || !g.originalInput) continue;
    const steps: LegacyStep[] = [g.startNow, g.nextStep, ...(g.miniBreakdown ?? [])].filter(
      (s): s is LegacyStep => !!s && typeof s.text === 'string' && s.text.length > 0,
    );
    const created = g.createdAt ?? new Date().toISOString();
    const tasks: Task[] = steps.map((s, i) =>
      newTask({
        title: s.text!.slice(0, 120),
        position: i,
        estimateMinutes: minutesOf(s.duration),
        status: s.completed ? 'done' : 'todo',
        completedAt: s.completed ? g.lastActiveAt ?? created : null,
      }),
    );
    out.push({
      id: newId(),
      title: (g.rewrittenTitle || g.originalInput).slice(0, 120),
      originalGoal: g.originalInput,
      goalSummary: '',
      assumptions: [],
      estimatedDuration: null,
      status: 'active',
      // These came from fixed templates, not AI.
      source: 'demo',
      phases: [],
      tasks,
      recommendedFirstTaskId: tasks[0]?.id ?? null,
      createdAt: created,
      updatedAt: g.lastActiveAt ?? created,
      lastActivityAt: g.lastActiveAt ?? created,
    });
  }
  return out;
}
