import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { Play, Plus, RotateCcw, X } from 'lucide-react';
import { toast } from 'sonner';
import { LIMITS, SIMPLIFY_ACTIONS, type SimplifyAction, type SimplifyResult, type SuggestedStep } from '@shared/plan.ts';
import { Badge, Button, Card, DurationLabel, ErrorState, IconButton, Spinner } from '../components/ui';
import { Screen, TopBar } from '../components/Layout';
import { requestSimplify, type AIMode } from '../lib/aiClient';
import { ApiError } from '../lib/api';
import { useProjects } from '../store/projects';

const TITLES: Record<SimplifyAction, string> = {
  breakdown: 'Break this down',
  too_much: 'Make it smaller',
  explain: 'Explained simply',
  example: 'An example',
  first_step: 'First step',
  smaller: 'A smaller start',
  stuck: "When you're stuck",
  ten_minutes: 'If you have 10 minutes',
};

/** Screen 11: AI help for one task. Nothing changes until the person accepts. */
export default function TaskHelp() {
  const { projectId = '', taskId = '' } = useParams();
  const [params] = useSearchParams();
  const raw = params.get('action') as SimplifyAction;
  const action: SimplifyAction = SIMPLIFY_ACTIONS.includes(raw) ? raw : 'breakdown';
  const navigate = useNavigate();
  const project = useProjects((s) => s.projects[projectId]);
  const task = project?.tasks.find((t) => t.id === taskId);
  const { addSubtasks, replaceTaskWithSteps, updateTask } = useProjects();

  const [state, setState] = useState<{ kind: 'loading' } | { kind: 'error'; error: ApiError } | { kind: 'done'; mode: AIMode; result: SimplifyResult }>({ kind: 'loading' });
  const [steps, setSteps] = useState<SuggestedStep[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(() => {
    if (!project || !task) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setState({ kind: 'loading' });
    requestSimplify(
      { title: task.title, description: task.description, steps: task.steps, project_title: project.title, goal_summary: project.goalSummary },
      action,
      ac.signal,
    )
      .then(({ mode, result }) => {
        if (ac.signal.aborted) return;
        setSteps(result.steps);
        setState({ kind: 'done', mode, result });
      })
      .catch((e) => {
        if (ac.signal.aborted) return;
        setState({ kind: 'error', error: e instanceof ApiError ? e : new ApiError('network', 'Something went wrong.') });
      });
    // Only re-run when the task identity or action changes, not on every edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, taskId, action]);

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [load]);

  const back = `/projects/${projectId}/tasks/${taskId}`;
  if (!project || !task) {
    return (
      <Screen nav={false}>
        <TopBar back={`/projects/${projectId}`} />
        <ErrorState title="Task not found" body="It may have been deleted." />
      </Screen>
    );
  }

  const isSubtask = !!task.parentId;
  const validSteps = steps.filter((s) => s.title.trim());

  const acceptAsSubtasks = () => {
    const created = addSubtasks(project.id, task.id, validSteps);
    toast(`Added ${created.length} steps. Pick one to start.`);
    navigate(back, { replace: true });
  };
  const acceptReplace = (list: SuggestedStep[]) => {
    const created = replaceTaskWithSteps(project.id, task.id, list);
    toast(`Replaced with ${created.length} ${created.length === 1 ? 'task' : 'tasks'}.`);
    navigate(isSubtask && task.parentId ? `/projects/${project.id}/tasks/${task.parentId}` : `/projects/${project.id}`, { replace: true });
  };
  const startSingle = (s: SuggestedStep) => {
    if (isSubtask) {
      const [created] = replaceTaskWithSteps(project.id, task.id, [s]);
      if (created) navigate(`/focus/${project.id}/${created.id}`, { replace: true });
    } else {
      const [created] = addSubtasks(project.id, task.id, [s]);
      if (created) navigate(`/focus/${project.id}/${created.id}`, { replace: true });
    }
  };

  return (
    <Screen nav={false}>
      <TopBar back={back} title={TITLES[action]} />
      <main tabIndex={-1} className="flex flex-1 flex-col gap-5 px-5 pb-8 outline-none">
        <Card className="bg-surface-2 shadow-none">
          <p className="t-meta font-semibold uppercase tracking-wide text-ink-3">Task</p>
          <p className="mt-1 t-body font-medium text-ink">{task.title}</p>
          {task.description && <p className="mt-1 line-clamp-3 t-secondary text-ink-2">{task.description}</p>}
        </Card>

        {state.kind === 'loading' && (
          <div className="flex flex-col items-center gap-3 py-10" aria-live="polite">
            <Spinner label="Thinking" />
            <p className="t-secondary text-ink-2">Working on a suggestion…</p>
            <Button variant="secondary" size="sm" onClick={() => navigate(back)}>
              Cancel
            </Button>
          </div>
        )}

        {state.kind === 'error' && (
          <ErrorState
            title={state.error.code === 'offline' ? "You're offline" : state.error.code === 'rate_limited' ? "You've reached today's limit" : "We couldn't get a suggestion"}
            body={state.error.message}
            actions={
              <>
                {state.error.code !== 'rate_limited' && (
                  <Button icon={RotateCcw} block onClick={load}>
                    Try again
                  </Button>
                )}
                <Button variant="secondary" block onClick={() => navigate(back)}>
                  Back to task
                </Button>
              </>
            }
          />
        )}

        {state.kind === 'done' && (
          <>
            <div className="flex items-center gap-2">
              <Badge tone={state.mode === 'demo' ? 'warn' : 'brand'}>{state.mode === 'demo' ? 'Demo suggestion, not AI' : 'Suggested by AI'}</Badge>
              <span className="t-meta text-ink-3">Review before using it.</span>
            </div>
            {state.result.explanation && <p className="t-body text-ink whitespace-pre-line">{state.result.explanation}</p>}

            {(action === 'breakdown' || action === 'too_much') && !state.result.already_small && (
              <StepsEditor steps={steps} setSteps={setSteps} />
            )}

            {state.result.single_action && (
              <Card>
                <p className="t-meta font-semibold uppercase tracking-wide text-brand-text">Try this</p>
                <p className="mt-1 text-[17px] font-semibold text-ink">{state.result.single_action.title}</p>
                {state.result.single_action.description && <p className="mt-1 t-secondary text-ink-2">{state.result.single_action.description}</p>}
                <DurationLabel minutes={state.result.single_action.estimated_minutes} className="mt-2" />
              </Card>
            )}

            <div className="mt-auto flex flex-col gap-2.5 pt-4">
              {(action === 'breakdown' || action === 'too_much') && !state.result.already_small && (
                <>
                  {!isSubtask && (
                    <Button block disabled={!validSteps.length} onClick={acceptAsSubtasks}>
                      Add as steps of this task
                    </Button>
                  )}
                  <Button block variant={isSubtask ? 'primary' : 'secondary'} disabled={!validSteps.length} onClick={() => acceptReplace(validSteps)}>
                    Replace this {isSubtask ? 'step' : 'task'} with these
                  </Button>
                </>
              )}
              {state.result.single_action && (
                <>
                  <Button block icon={Play} onClick={() => startSingle(state.result.single_action!)}>
                    Start this now
                  </Button>
                  {!isSubtask && (
                    <Button
                      block
                      variant="secondary"
                      onClick={() => {
                        addSubtasks(project.id, task.id, [state.result.single_action!]);
                        toast('Added as a step');
                        navigate(back, { replace: true });
                      }}
                    >
                      Add as a step
                    </Button>
                  )}
                </>
              )}
              {(action === 'explain' || action === 'example') && (
                <>
                  <Button block icon={Play} onClick={() => navigate(`/focus/${project.id}/${task.id}`, { replace: true })}>
                    Start the task
                  </Button>
                  <Button
                    block
                    variant="secondary"
                    onClick={() => {
                      const note = `${action === 'example' ? 'Example' : 'In simple terms'}: ${state.result.explanation}`;
                      updateTask(project.id, task.id, { description: [task.description, note].filter(Boolean).join('\n\n').slice(0, LIMITS.textMaxChars) });
                      toast('Saved to the task');
                      navigate(back, { replace: true });
                    }}
                  >
                    Save to task description
                  </Button>
                </>
              )}
              {state.result.already_small && (
                <Button block icon={Play} onClick={() => navigate(`/focus/${project.id}/${task.id}`, { replace: true })}>
                  Start now
                </Button>
              )}
              <Button block variant="ghost" onClick={() => navigate(back)}>
                {action === 'explain' || action === 'example' ? 'Back to task' : 'Cancel, keep the task as it is'}
              </Button>
            </div>
          </>
        )}
      </main>
    </Screen>
  );
}

function StepsEditor({ steps, setSteps }: { steps: SuggestedStep[]; setSteps: (s: SuggestedStep[]) => void }) {
  return (
    <section aria-label="Suggested steps">
      <p className="mb-2 t-secondary text-ink-2">Edit, remove or add steps before accepting.</p>
      <ol className="flex flex-col gap-2">
        {steps.map((s, i) => (
          <li key={i} className="flex items-start gap-2 rounded-2xl border border-line bg-surface p-2 pl-3">
            <span className="mt-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[13px] font-semibold text-brand-text">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <label className="sr-only" htmlFor={`step-${i}`}>
                Step {i + 1}
              </label>
              <input
                id={`step-${i}`}
                value={s.title}
                maxLength={120}
                onChange={(e) => setSteps(steps.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
                className="min-h-11 w-full bg-transparent t-body font-medium text-ink outline-none"
              />
              {s.description && <p className="t-meta text-ink-2">{s.description}</p>}
              <DurationLabel minutes={s.estimated_minutes} className="mt-1" />
            </div>
            <IconButton icon={X} label={`Remove step ${i + 1}`} onClick={() => setSteps(steps.filter((_, j) => j !== i))} />
          </li>
        ))}
      </ol>
      {steps.length < LIMITS.maxSuggestedSteps + 2 && (
        <button
          onClick={() => setSteps([...steps, { title: '', description: '', estimated_minutes: null }])}
          className="mt-2 flex min-h-11 items-center gap-2 px-2 t-secondary font-medium text-brand-text"
        >
          <Plus size={18} aria-hidden /> Add a step
        </button>
      )}
    </section>
  );
}
