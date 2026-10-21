// Projects live on the device first (works offline and for guests) and are
// synced to the account by sync/sync.ts when the person is signed in.
import { useMemo } from 'react';
import { create } from 'zustand';
import type { SuggestedStep } from '@shared/plan.ts';
import { readJSON, readLegacy, writeJSON, removeKey, type SaveResult } from '../lib/storage';
import type { Project, SyncMeta, Task, ProjectStatus } from '../lib/types';
import { newTask, taskFromStep } from '../lib/planToProject';
import { migrateLegacyGoals } from '../lib/legacy';

interface State {
  projects: Record<string, Project>;
  meta: Record<string, SyncMeta>;
  saveError: SaveResult | null;
  /** Bumped on every local change; the sync engine listens to it. */
  revision: number;
}

interface Actions {
  addProject(p: Project): void;
  updateProject(id: string, fn: (p: Project) => Project): void;
  renameProject(id: string, title: string): void;
  setProjectStatus(id: string, status: ProjectStatus): void;
  deleteProject(id: string): void;
  setTaskDone(projectId: string, taskId: string, done: boolean): void;
  updateTask(projectId: string, taskId: string, patch: Partial<Pick<Task, 'title' | 'description' | 'estimateMinutes' | 'steps'>>): void;
  addTask(projectId: string, fields: { title: string; phaseId: string | null; parentId?: string | null; estimateMinutes?: number | null }): Task;
  deleteTask(projectId: string, taskId: string): void;
  moveTask(projectId: string, taskId: string, dir: -1 | 1): void;
  addSubtasks(projectId: string, parentId: string, steps: SuggestedStep[]): Task[];
  replaceTaskWithSteps(projectId: string, taskId: string, steps: SuggestedStep[]): Task[];
  touch(projectId: string): void;
  /** Used by the sync engine to apply server state without marking it dirty. */
  applyRemote(id: string, project: Project | null, version: number): void;
  setMeta(id: string, meta: SyncMeta | null): void;
  /** Removes everything from this device (sign-out, delete account). */
  resetLocal(): void;
}

function load(): Pick<State, 'projects' | 'meta'> {
  const projects = readJSON<Record<string, Project>>('projects', {});
  const meta = readJSON<Record<string, SyncMeta>>('syncmeta', {});
  // One-time import of goals created with the previous version of the app.
  const legacy = readLegacy<{ goals?: unknown[] }>('claryo_v2_store');
  if (legacy?.goals?.length && !readJSON('legacyImported', false)) {
    for (const p of migrateLegacyGoals(legacy.goals)) {
      projects[p.id] = p;
      meta[p.id] = { baseVersion: null, dirty: true };
    }
    writeJSON('legacyImported', true);
  }
  return { projects, meta };
}

const now = () => new Date().toISOString();

export const useProjects = create<State & Actions>()((set, get) => {
  const persist = () => {
    const { projects, meta } = get();
    const a = writeJSON('projects', projects);
    const b = writeJSON('syncmeta', meta);
    set({ saveError: a.ok && b.ok ? null : !a.ok ? a : b });
  };

  /** Apply a local edit: bump timestamps, mark for sync, save. */
  const edit = (id: string, fn: (p: Project) => Project, activity = true) => {
    const p = get().projects[id];
    if (!p) return;
    const t = now();
    const next = { ...fn(p), updatedAt: t, ...(activity ? { lastActivityAt: t } : {}) };
    set((s) => ({
      projects: { ...s.projects, [id]: next },
      meta: { ...s.meta, [id]: { baseVersion: s.meta[id]?.baseVersion ?? null, dirty: true } },
      revision: s.revision + 1,
    }));
    persist();
  };

  const mapTask = (p: Project, taskId: string, fn: (t: Task) => Task): Project => ({
    ...p,
    tasks: p.tasks.map((t) => (t.id === taskId ? { ...fn(t), updatedAt: now() } : t)),
  });

  const reindex = (tasks: Task[], phaseId: string | null, parentId: string | null): Task[] => {
    const siblings = tasks
      .filter((t) => t.phaseId === phaseId && t.parentId === parentId)
      .sort((a, b) => a.position - b.position);
    const pos = new Map(siblings.map((t, i) => [t.id, i]));
    return tasks.map((t) => (pos.has(t.id) ? { ...t, position: pos.get(t.id)! } : t));
  };

  return {
    ...load(),
    saveError: null,
    revision: 0,

    addProject(p) {
      set((s) => ({
        projects: { ...s.projects, [p.id]: p },
        meta: { ...s.meta, [p.id]: { baseVersion: null, dirty: true } },
        revision: s.revision + 1,
      }));
      persist();
    },

    updateProject: (id, fn) => edit(id, fn),
    renameProject: (id, title) => edit(id, (p) => ({ ...p, title: title.trim().slice(0, 120) || p.title })),
    setProjectStatus: (id, status) => edit(id, (p) => ({ ...p, status })),

    deleteProject(id) {
      set((s) => {
        const { [id]: _gone, ...projects } = s.projects;
        const m = s.meta[id];
        const meta = { ...s.meta };
        if (m?.baseVersion != null) meta[id] = { ...m, dirty: false, pendingDelete: true };
        else delete meta[id];
        return { projects, meta, revision: s.revision + 1 };
      });
      persist();
    },

    setTaskDone(projectId, taskId, done) {
      edit(projectId, (p) =>
        mapTask(p, taskId, (t) => ({ ...t, status: done ? 'done' : 'todo', completedAt: done ? now() : null })),
      );
    },

    updateTask(projectId, taskId, patch) {
      edit(projectId, (p) => mapTask(p, taskId, (t) => ({ ...t, ...patch })));
    },

    addTask(projectId, fields) {
      const p = get().projects[projectId];
      const parentId = fields.parentId ?? null;
      const siblings = p ? p.tasks.filter((t) => t.phaseId === fields.phaseId && t.parentId === parentId) : [];
      const task = newTask({
        title: fields.title.trim().slice(0, 120),
        phaseId: fields.phaseId,
        parentId,
        estimateMinutes: fields.estimateMinutes ?? null,
        position: siblings.length ? Math.max(...siblings.map((t) => t.position)) + 1 : 0,
      });
      edit(projectId, (pr) => ({ ...pr, tasks: [...pr.tasks, task] }));
      return task;
    },

    deleteTask(projectId, taskId) {
      edit(projectId, (p) => {
        const gone = new Set([taskId, ...p.tasks.filter((t) => t.parentId === taskId).map((t) => t.id)]);
        const victim = p.tasks.find((t) => t.id === taskId);
        let tasks = p.tasks
          .filter((t) => !gone.has(t.id))
          .map((t) => (t.dependsOn.some((d) => gone.has(d)) ? { ...t, dependsOn: t.dependsOn.filter((d) => !gone.has(d)) } : t));
        if (victim) tasks = reindex(tasks, victim.phaseId, victim.parentId);
        return { ...p, tasks, recommendedFirstTaskId: gone.has(p.recommendedFirstTaskId ?? '') ? null : p.recommendedFirstTaskId };
      });
    },

    moveTask(projectId, taskId, dir) {
      edit(projectId, (p) => {
        const t = p.tasks.find((x) => x.id === taskId);
        if (!t) return p;
        const siblings = p.tasks
          .filter((x) => x.phaseId === t.phaseId && x.parentId === t.parentId)
          .sort((a, b) => a.position - b.position);
        const i = siblings.findIndex((x) => x.id === taskId);
        const j = i + dir;
        if (j < 0 || j >= siblings.length) return p;
        [siblings[i], siblings[j]] = [siblings[j], siblings[i]];
        const pos = new Map(siblings.map((x, k) => [x.id, k]));
        return { ...p, tasks: p.tasks.map((x) => (pos.has(x.id) ? { ...x, position: pos.get(x.id)! } : x)) };
      });
    },

    addSubtasks(projectId, parentId, steps) {
      const p = get().projects[projectId];
      const parent = p?.tasks.find((t) => t.id === parentId);
      if (!p || !parent) return [];
      const start = p.tasks.filter((t) => t.parentId === parentId).length;
      const created = steps.map((s, i) => taskFromStep(s, { parentId, phaseId: parent.phaseId, position: start + i }));
      edit(projectId, (pr) => ({ ...pr, tasks: [...pr.tasks, ...created] }));
      return created;
    },

    replaceTaskWithSteps(projectId, taskId, steps) {
      const p = get().projects[projectId];
      const old = p?.tasks.find((t) => t.id === taskId);
      if (!p || !old || steps.length === 0) return [];
      const created = steps.map((s, i) =>
        taskFromStep(s, {
          phaseId: old.phaseId,
          parentId: old.parentId,
          position: old.position + i / steps.length, // reindexed below
          dependsOn: i === 0 ? old.dependsOn : [],
        }),
      );
      const last = created[created.length - 1].id;
      edit(projectId, (pr) => {
        const oldSubs = new Set(pr.tasks.filter((t) => t.parentId === taskId).map((t) => t.id));
        let tasks = pr.tasks
          .filter((t) => t.id !== taskId && !oldSubs.has(t.id))
          // Anything that waited for the old task now waits for the last new step.
          .map((t) => (t.dependsOn.includes(taskId) ? { ...t, dependsOn: t.dependsOn.map((d) => (d === taskId ? last : d)) } : t));
        tasks = reindex([...tasks, ...created], old.phaseId, old.parentId);
        return { ...pr, tasks, recommendedFirstTaskId: pr.recommendedFirstTaskId === taskId ? created[0].id : pr.recommendedFirstTaskId };
      });
      return created;
    },

    touch: (projectId) => edit(projectId, (p) => p),

    applyRemote(id, project, version) {
      set((s) => {
        const projects = { ...s.projects };
        const meta = { ...s.meta };
        if (project) {
          projects[id] = project;
          meta[id] = { baseVersion: version, dirty: false };
        } else {
          delete projects[id];
          delete meta[id];
        }
        return { projects, meta };
      });
      persist();
    },

    setMeta(id, m) {
      set((s) => {
        const meta = { ...s.meta };
        if (m) meta[id] = m;
        else delete meta[id];
        return { meta };
      });
      persist();
    },

    resetLocal() {
      removeKey('projects');
      removeKey('syncmeta');
      set({ projects: {}, meta: {}, saveError: null, revision: get().revision + 1 });
    },
  };
});

/** Projects sorted by most recent activity. */
export function useProjectList(): Project[] {
  const projects = useProjects((s) => s.projects);
  return useMemo(() => Object.values(projects).sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt)), [projects]);
}
