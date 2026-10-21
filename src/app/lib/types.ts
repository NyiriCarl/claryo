// Client-side domain model. A project is stored and synced as one document.

export type TaskStatus = 'todo' | 'done';
export type ProjectStatus = 'active' | 'completed' | 'archived';
/** Where a project's plan came from. "demo" plans must always be labelled. */
export type PlanSource = 'ai' | 'demo' | 'manual';

export interface Phase {
  id: string;
  title: string;
  description: string;
  position: number;
}

export interface Task {
  id: string;
  phaseId: string | null;
  /** Set for subtasks. Subtasks are one level deep. */
  parentId: string | null;
  title: string;
  description: string;
  expectedResult: string | null;
  steps: string[];
  dependsOn: string[];
  /** An estimate, never a measurement. */
  estimateMinutes: number | null;
  completionCriteria: string | null;
  status: TaskStatus;
  position: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface Project {
  id: string;
  title: string;
  originalGoal: string;
  goalSummary: string;
  assumptions: string[];
  estimatedDuration: string | null;
  status: ProjectStatus;
  source: PlanSource;
  phases: Phase[];
  tasks: Task[];
  /** The AI's recommended first task; used until it is completed. */
  recommendedFirstTaskId: string | null;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
}

/** Per-project sync bookkeeping, stored beside (not inside) the project. */
export interface SyncMeta {
  /** Server version this local copy was last based on; null = never uploaded. */
  baseVersion: number | null;
  dirty: boolean;
  /** Deleted locally; the deletion still has to reach the server. */
  pendingDelete?: boolean;
}

export interface Prefs {
  name: string;
  theme: 'system' | 'light' | 'dark';
  reduceMotion: boolean;
  focusSound: boolean;
  defaultTimerMinutes: number | null;
}
