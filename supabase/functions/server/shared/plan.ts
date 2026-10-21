// Shared between the edge function and the web client.
// Keep this file dependency-free and use explicit `.ts` import extensions so it
// runs unchanged under Deno (Supabase) and Vite.

// ─── Wire types (what the AI returns, after validation) ──────────────────────

export interface PlanPhase {
  id: string;
  title: string;
  description: string;
}

export interface PlanTask {
  id: string;
  phase_id: string | null;
  title: string;
  description: string;
  expected_result: string | null;
  steps: string[];
  depends_on: string[];
  estimated_minutes: number | null;
  completion_criteria: string | null;
}

export interface Plan {
  project_title: string;
  goal_summary: string;
  assumptions: string[];
  phases: PlanPhase[];
  tasks: PlanTask[];
  recommended_first_task_id: string;
  estimated_duration: string | null;
}

export interface Clarification {
  question: string;
  options: string[];
}

/** Result of a plan request: either a plan or one clarifying question. */
export type PlanResult =
  | { kind: "plan"; plan: Plan }
  | { kind: "clarification"; clarification: Clarification };

export type SimplifyAction =
  | "breakdown" // "Break this down"
  | "explain" // "Explain simply"
  | "example" // "Show an example"
  | "first_step" // "Identify the first subtask"
  | "smaller" // "Reduce to a smaller starting action"
  | "stuck" // "I'm stuck"
  | "too_much" // "This is too much"
  | "ten_minutes"; // "I have only 10 minutes"

export const SIMPLIFY_ACTIONS: SimplifyAction[] = [
  "breakdown",
  "explain",
  "example",
  "first_step",
  "smaller",
  "stuck",
  "too_much",
  "ten_minutes",
];

export interface SuggestedStep {
  title: string;
  description: string;
  estimated_minutes: number | null;
}

export interface SimplifyResult {
  explanation: string;
  steps: SuggestedStep[];
  single_action: SuggestedStep | null;
  already_small: boolean;
}

/** What the client sends about a task when asking for help with it. */
export interface TaskContext {
  title: string;
  description: string;
  steps: string[];
  project_title: string;
  goal_summary: string;
}

// ─── Limits ──────────────────────────────────────────────────────────────────

export const LIMITS = {
  goalMaxChars: 500,
  goalMinChars: 3,
  answerMaxChars: 300,
  titleMaxChars: 120,
  textMaxChars: 1200,
  maxPhases: 6,
  maxTasks: 30,
  maxStepsPerTask: 8,
  maxAssumptions: 6,
  maxSuggestedSteps: 6,
  maxEstimateMinutes: 600,
};

// ─── JSON Schemas for structured output ──────────────────────────────────────
// Only features supported by structured outputs: no min/max constraints,
// additionalProperties:false everywhere. Limits are enforced by the validators.

const nullableString = { anyOf: [{ type: "string" }, { type: "null" }] };
const nullableInt = { anyOf: [{ type: "integer" }, { type: "null" }] };

const suggestedStepSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    estimated_minutes: nullableInt,
  },
  required: ["title", "description", "estimated_minutes"],
  additionalProperties: false,
};

export const PLAN_JSON_SCHEMA = {
  type: "object",
  properties: {
    clarification_needed: { type: "boolean" },
    clarification_question: nullableString,
    clarification_options: { type: "array", items: { type: "string" } },
    project_title: { type: "string" },
    goal_summary: { type: "string" },
    assumptions: { type: "array", items: { type: "string" } },
    phases: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
        },
        required: ["id", "title", "description"],
        additionalProperties: false,
      },
    },
    tasks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          phase_id: nullableString,
          title: { type: "string" },
          description: { type: "string" },
          expected_result: nullableString,
          steps: { type: "array", items: { type: "string" } },
          depends_on: { type: "array", items: { type: "string" } },
          estimated_minutes: nullableInt,
          completion_criteria: nullableString,
        },
        required: [
          "id",
          "phase_id",
          "title",
          "description",
          "expected_result",
          "steps",
          "depends_on",
          "estimated_minutes",
          "completion_criteria",
        ],
        additionalProperties: false,
      },
    },
    recommended_first_task_id: nullableString,
    estimated_duration: nullableString,
  },
  required: [
    "clarification_needed",
    "clarification_question",
    "clarification_options",
    "project_title",
    "goal_summary",
    "assumptions",
    "phases",
    "tasks",
    "recommended_first_task_id",
    "estimated_duration",
  ],
  additionalProperties: false,
};

export const SIMPLIFY_JSON_SCHEMA = {
  type: "object",
  properties: {
    explanation: { type: "string" },
    steps: { type: "array", items: suggestedStepSchema },
    single_action: { anyOf: [suggestedStepSchema, { type: "null" }] },
    already_small: { type: "boolean" },
  },
  required: ["explanation", "steps", "single_action", "already_small"],
  additionalProperties: false,
};

// ─── Validation ──────────────────────────────────────────────────────────────

export class ValidationError extends Error {
  constructor(public issues: string[]) {
    super(`Invalid AI output: ${issues.join("; ")}`);
    this.name = "ValidationError";
  }
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function str(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  return v.replace(/\s+/g, " ").trim().slice(0, max);
}

function nullableStr(v: unknown, max: number): string | null {
  const s = str(v, max);
  return s ? s : null;
}

function strList(v: unknown, maxItems: number, maxChars: number): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => str(x, maxChars)).filter(Boolean).slice(0, maxItems);
}

function minutes(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  const n = Math.round(v);
  if (n < 1 || n > LIMITS.maxEstimateMinutes) return null;
  return n;
}

/**
 * Validate and normalise a raw plan response.
 * Structural problems (no title, no tasks) throw. Minor problems (unknown
 * dependency ids, a missing first-task id, over-long lists) are repaired so a
 * mostly-good plan is still usable.
 */
export function validatePlanResult(raw: unknown, opts: { allowClarification: boolean }): PlanResult {
  const issues: string[] = [];
  if (!isObj(raw)) throw new ValidationError(["response is not an object"]);

  if (raw.clarification_needed === true && opts.allowClarification) {
    const question = str(raw.clarification_question, 200);
    if (question) {
      const options = strList(raw.clarification_options, 5, 80);
      return { kind: "clarification", clarification: { question, options } };
    }
    // A clarification flag without a question: fall through and try to use the plan.
  }

  const project_title = str(raw.project_title, LIMITS.titleMaxChars);
  if (!project_title) issues.push("project_title is empty");
  const goal_summary = str(raw.goal_summary, 400);

  const phasesRaw = Array.isArray(raw.phases) ? raw.phases : [];
  const phases: PlanPhase[] = [];
  const phaseIds = new Set<string>();
  for (const p of phasesRaw.slice(0, LIMITS.maxPhases)) {
    if (!isObj(p)) continue;
    const id = str(p.id, 40);
    const title = str(p.title, 80);
    if (!id || !title || phaseIds.has(id)) continue;
    phaseIds.add(id);
    phases.push({ id, title, description: str(p.description, 300) });
  }

  const tasksRaw = Array.isArray(raw.tasks) ? raw.tasks : [];
  const tasks: PlanTask[] = [];
  const taskIds = new Set<string>();
  for (const t of tasksRaw.slice(0, LIMITS.maxTasks)) {
    if (!isObj(t)) continue;
    const id = str(t.id, 40);
    const title = str(t.title, LIMITS.titleMaxChars);
    if (!id || !title || taskIds.has(id)) continue;
    taskIds.add(id);
    const phaseId = str(t.phase_id, 40);
    tasks.push({
      id,
      phase_id: phaseId && phaseIds.has(phaseId) ? phaseId : null,
      title,
      description: str(t.description, LIMITS.textMaxChars),
      expected_result: nullableStr(t.expected_result, 300),
      steps: strList(t.steps, LIMITS.maxStepsPerTask, 200),
      depends_on: strList(t.depends_on, 10, 40),
      estimated_minutes: minutes(t.estimated_minutes),
      completion_criteria: nullableStr(t.completion_criteria, 300),
    });
  }
  if (tasks.length === 0) issues.push("plan has no usable tasks");
  if (issues.length) throw new ValidationError(issues);

  // If phases exist, every task must belong to one; orphans go to the first phase.
  if (phases.length) {
    for (const t of tasks) if (!t.phase_id) t.phase_id = phases[0].id;
    // Drop phases nobody uses.
    const used = new Set(tasks.map((t) => t.phase_id));
    for (let i = phases.length - 1; i >= 0; i--) if (!used.has(phases[i].id)) phases.splice(i, 1);
  }

  // Dependencies: keep only known, non-self ids, then break any cycles.
  for (const t of tasks) {
    t.depends_on = [...new Set(t.depends_on)].filter((d) => d !== t.id && taskIds.has(d));
  }
  breakCycles(tasks);

  let first = str(raw.recommended_first_task_id, 40);
  const firstTask = tasks.find((t) => t.id === first);
  if (!firstTask || firstTask.depends_on.length > 0) {
    first = (tasks.find((t) => t.depends_on.length === 0) ?? tasks[0]).id;
  }

  return {
    kind: "plan",
    plan: {
      project_title,
      goal_summary,
      assumptions: strList(raw.assumptions, LIMITS.maxAssumptions, 200),
      phases,
      tasks,
      recommended_first_task_id: first,
      estimated_duration: nullableStr(raw.estimated_duration, 80),
    },
  };
}

function breakCycles(tasks: PlanTask[]) {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const state = new Map<string, 1 | 2>(); // 1 visiting, 2 done
  const visit = (t: PlanTask) => {
    state.set(t.id, 1);
    t.depends_on = t.depends_on.filter((d) => {
      const s = state.get(d);
      if (s === 1) return false; // back edge → would create a cycle
      if (!s) visit(byId.get(d)!);
      return true;
    });
    state.set(t.id, 2);
  };
  for (const t of tasks) if (!state.has(t.id)) visit(t);
}

export function validateSimplifyResult(raw: unknown, action: SimplifyAction): SimplifyResult {
  if (!isObj(raw)) throw new ValidationError(["response is not an object"]);
  const stepOf = (v: unknown): SuggestedStep | null => {
    if (!isObj(v)) return null;
    const title = str(v.title, LIMITS.titleMaxChars);
    if (!title) return null;
    return { title, description: str(v.description, 600), estimated_minutes: minutes(v.estimated_minutes) };
  };
  const steps = (Array.isArray(raw.steps) ? raw.steps : [])
    .map(stepOf)
    .filter((s): s is SuggestedStep => s !== null)
    .slice(0, LIMITS.maxSuggestedSteps);
  const single_action = stepOf(raw.single_action);
  const explanation = typeof raw.explanation === "string" ? raw.explanation.trim().slice(0, 1500) : "";
  const already_small = raw.already_small === true;

  const issues: string[] = [];
  if ((action === "breakdown" || action === "too_much") && steps.length === 0 && !already_small) {
    issues.push("no steps returned");
  }
  if ((action === "explain" || action === "example") && !explanation) issues.push("no explanation returned");
  if ((action === "first_step" || action === "smaller" || action === "ten_minutes" || action === "stuck") && !single_action) {
    issues.push("no single action returned");
  }
  if (issues.length) throw new ValidationError(issues);
  return { explanation, steps, single_action, already_small };
}

// ─── Request validation (used by the server; mirrored in the client form) ───

export function validateGoalInput(goal: unknown): string | null {
  if (typeof goal !== "string") return "Describe your goal in a few words.";
  const g = goal.trim();
  if (g.length < LIMITS.goalMinChars) return "Add a little more detail so the plan can be useful.";
  if (g.length > LIMITS.goalMaxChars) return `Keep it under ${LIMITS.goalMaxChars} characters.`;
  if (!/[\p{L}\p{N}]/u.test(g)) return "Describe your goal using words.";
  return null;
}
