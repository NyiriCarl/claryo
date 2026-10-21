// Progress is always calculated from task data, never supplied by the AI.
import type { Project, Task } from './types';

export function topLevelTasks(p: Project): Task[] {
  return orderedTasks(p);
}

/** Top-level tasks in display order: by phase position, then task position. */
export function orderedTasks(p: Project): Task[] {
  const top = p.tasks.filter((t) => !t.parentId);
  const phaseOrder = new Map([...p.phases].sort((a, b) => a.position - b.position).map((ph, i) => [ph.id, i]));
  const rank = (t: Task) => (t.phaseId != null && phaseOrder.has(t.phaseId) ? phaseOrder.get(t.phaseId)! : phaseOrder.size);
  return top.sort((a, b) => rank(a) - rank(b) || a.position - b.position);
}

export function tasksInPhase(p: Project, phaseId: string | null): Task[] {
  const valid = new Set(p.phases.map((ph) => ph.id));
  return p.tasks
    .filter((t) => !t.parentId && (phaseId === null ? t.phaseId === null || !valid.has(t.phaseId) : t.phaseId === phaseId))
    .sort((a, b) => a.position - b.position);
}

export function subtasksOf(p: Project, taskId: string): Task[] {
  return p.tasks.filter((t) => t.parentId === taskId).sort((a, b) => a.position - b.position);
}

export interface Progress {
  done: number;
  total: number;
  /** null when there are no tasks: show an empty state, not "0%". */
  percent: number | null;
  phasesDone: number;
  phasesTotal: number;
}

export function progressOf(p: Project): Progress {
  const top = p.tasks.filter((t) => !t.parentId);
  const done = top.filter((t) => t.status === 'done').length;
  const total = top.length;
  const phasesWithTasks = p.phases.filter((ph) => top.some((t) => t.phaseId === ph.id));
  const phasesDone = phasesWithTasks.filter((ph) => top.filter((t) => t.phaseId === ph.id).every((t) => t.status === 'done')).length;
  return {
    done,
    total,
    percent: total === 0 ? null : Math.round((done / total) * 100),
    phasesDone,
    phasesTotal: phasesWithTasks.length,
  };
}

export function depsSatisfied(p: Project, t: Task): boolean {
  return t.dependsOn.every((id) => {
    const dep = p.tasks.find((x) => x.id === id);
    return !dep || dep.status === 'done';
  });
}

export interface NextAction {
  task: Task;
  /** Set when the recommended action is a subtask. */
  parent: Task | null;
  /** True for the plan's original recommended first task. */
  isFirst: boolean;
}

/** The single next step: the next incomplete task whose dependencies are done. */
export function nextAction(p: Project): NextAction | null {
  const ordered = orderedTasks(p).filter((t) => t.status === 'todo');
  if (!ordered.length) return null;
  const first = p.recommendedFirstTaskId ? ordered.find((t) => t.id === p.recommendedFirstTaskId) : undefined;
  const pick =
    (first && depsSatisfied(p, first) ? first : undefined) ??
    ordered.find((t) => depsSatisfied(p, t)) ??
    ordered[0];
  const openSub = subtasksOf(p, pick.id).find((s) => s.status === 'todo');
  const noneDoneYet = !p.tasks.some((t) => t.status === 'done');
  return openSub
    ? { task: openSub, parent: pick, isFirst: false }
    : { task: pick, parent: null, isFirst: noneDoneYet && pick.id === p.recommendedFirstTaskId };
}

/** The action after `taskId`, used by the completion screen. */
export function nextAfter(p: Project, taskId: string): NextAction | null {
  const n = nextAction(p);
  return n && n.task.id !== taskId ? n : null;
}

export interface HistoryItem {
  project: Project;
  task: Task;
  completedAt: string;
}

export function completionHistory(projects: Project[], limit = 30): HistoryItem[] {
  const items: HistoryItem[] = [];
  for (const project of projects) {
    for (const task of project.tasks) {
      if (task.status === 'done' && task.completedAt) items.push({ project, task, completedAt: task.completedAt });
    }
  }
  return items.sort((a, b) => b.completedAt.localeCompare(a.completedAt)).slice(0, limit);
}

export function formatMinutes(m: number | null): string | null {
  if (m == null) return null;
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}
