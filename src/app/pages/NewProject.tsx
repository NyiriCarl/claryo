import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { HelpCircle, PenLine, RotateCcw } from 'lucide-react';
import type { Clarification } from '@shared/plan.ts';
import { LIMITS } from '@shared/plan.ts';
import { Button, Chip, ErrorState, TextField } from '../components/ui';
import { Screen, TopBar } from '../components/Layout';
import { LogoMark } from '../components/Logo';
import { requestPlan, type PlanInput } from '../lib/aiClient';
import { ApiError } from '../lib/api';
import { emptyProject, planToProject } from '../lib/planToProject';
import { useProjects } from '../store/projects';
import { useDraft } from '../store/app';
import { useSession } from '../store/session';

type Phase =
  | { kind: 'generating' }
  | { kind: 'clarify'; clarification: Clarification }
  | { kind: 'error'; error: ApiError };

const ERROR_COPY: Record<string, { title: string; body?: string }> = {
  offline: { title: "You're offline", body: 'Making a plan needs an internet connection. You can retry when you are back online, or create the project now and add tasks yourself.' },
  network: { title: "We couldn't reach the server" },
  timeout: { title: 'This took too long', body: 'The plan took longer than expected. Please try again.' },
  ai_timeout: { title: 'This took too long', body: 'The plan took longer than expected. Please try again.' },
  rate_limited: { title: "You've reached today's limit" },
  ai_rate_limited: { title: 'The planning service is busy' },
  ai_unavailable: { title: 'Planning is unavailable right now' },
  invalid_ai_output: { title: "We couldn't make a usable plan", body: 'The AI returned something we could not use. Trying again usually works; rephrasing your goal can also help.' },
  ai_refused: { title: "We can't plan this goal", body: 'The AI could not help with this request. Try describing your goal differently.' },
  invalid_input: { title: 'Please check your goal' },
};

/** Screens 05 and 06: clarifying question (only when needed) and plan generation. */
export default function NewProject() {
  const location = useLocation();
  const navigate = useNavigate();
  const draft = useDraft();
  const goal: string = (location.state as { goal?: string } | null)?.goal ?? draft.goal.trim();
  const addProject = useProjects((s) => s.addProject);
  const signedIn = useSession((s) => s.status === 'signedIn');

  const [phase, setPhase] = useState<Phase>({ kind: 'generating' });
  const [answer, setAnswer] = useState('');
  const [lastInput, setLastInput] = useState<PlanInput>({ goal });
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(
    async (input: PlanInput) => {
      if (abortRef.current && !abortRef.current.signal.aborted) return; // ignore repeated taps
      setLastInput(input);
      setPhase({ kind: 'generating' });
      const ac = new AbortController();
      abortRef.current = ac;
      try {
        const { mode, result } = await requestPlan(input, ac.signal);
        if (ac.signal.aborted) return;
        if (result.kind === 'clarification') {
          setPhase({ kind: 'clarify', clarification: result.clarification });
          return;
        }
        const project = planToProject(result.plan, goal, mode === 'live' ? 'ai' : 'demo');
        addProject(project);
        draft.setGoal('');
        navigate(`/projects/${project.id}`, { replace: true, state: { justCreated: true } });
      } catch (e) {
        if (ac.signal.aborted || (e instanceof ApiError && e.code === 'cancelled') || (e instanceof DOMException && e.name === 'AbortError')) return;
        setPhase({ kind: 'error', error: e instanceof ApiError ? e : new ApiError('network', 'Something went wrong. Please try again.') });
      } finally {
        if (abortRef.current === ac) abortRef.current = null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [goal],
  );

  useEffect(() => {
    if (!goal) return;
    void run({ goal });
    return () => abortRef.current?.abort();
  }, [goal, run]);

  if (!goal) return <Navigate to="/" replace />;

  const cancel = () => {
    abortRef.current?.abort();
    navigate('/', { replace: true });
  };
  const editGoal = () => {
    abortRef.current?.abort();
    draft.setGoal(goal);
    navigate('/', { replace: true });
  };
  const createManually = () => {
    const p = emptyProject(goal.slice(0, 120), goal);
    addProject(p);
    draft.setGoal('');
    navigate(`/projects/${p.id}`, { replace: true });
  };

  return (
    <Screen nav={false}>
      <TopBar back={phase.kind === 'generating' ? undefined : '/'} title={phase.kind === 'clarify' ? 'One quick question' : undefined} />
      <main tabIndex={-1} className="flex flex-1 flex-col px-5 pb-8 outline-none">
        {phase.kind === 'generating' && (
          <div className="flex flex-1 flex-col items-center justify-center text-center" aria-live="polite" aria-busy="true">
            <div className="pulse-soft">
              <LogoMark size={56} />
            </div>
            <p className="mt-6 t-meta font-semibold uppercase tracking-wide text-ink-3">Your goal</p>
            <h1 className="mt-1 max-w-[340px] t-section text-ink">“{goal}”</h1>
            <p className="mt-3 t-secondary text-ink-2">Building your plan. This can take up to a minute.</p>
            <Button variant="secondary" className="mt-8" onClick={cancel}>
              Cancel
            </Button>
          </div>
        )}

        {phase.kind === 'clarify' && (
          <ClarifyForm
            goal={goal}
            clarification={phase.clarification}
            answer={answer}
            setAnswer={setAnswer}
            onContinue={(a) => run({ goal, clarification: { question: phase.clarification.question, answer: a } })}
            onSkip={() => run({ goal, skipClarification: true })}
            onEdit={editGoal}
          />
        )}

        {phase.kind === 'error' && (
          <ErrorState
            title={ERROR_COPY[phase.error.code]?.title ?? 'Something went wrong'}
            body={
              phase.error.code === 'rate_limited'
                ? phase.error.message
                : ERROR_COPY[phase.error.code]?.body ?? phase.error.message
            }
            actions={
              <>
                {phase.error.code !== 'rate_limited' && phase.error.code !== 'ai_refused' && phase.error.code !== 'invalid_input' && (
                  <Button icon={RotateCcw} block onClick={() => run(lastInput)}>
                    Try again
                  </Button>
                )}
                {phase.error.code === 'rate_limited' && !signedIn && (
                  <Button block onClick={() => navigate('/auth?mode=signup')}>
                    Create a free account
                  </Button>
                )}
                <Button variant="secondary" icon={PenLine} block onClick={editGoal}>
                  Edit goal
                </Button>
                <Button variant="ghost" block onClick={createManually}>
                  Create project without AI
                </Button>
              </>
            }
          />
        )}
      </main>
    </Screen>
  );
}

function ClarifyForm({
  goal,
  clarification,
  answer,
  setAnswer,
  onContinue,
  onSkip,
  onEdit,
}: {
  goal: string;
  clarification: Clarification;
  answer: string;
  setAnswer: (v: string) => void;
  onContinue: (answer: string) => void;
  onSkip: () => void;
  onEdit: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!answer.trim()) return setError('Pick an option or type a short answer.');
    onContinue(answer.trim());
  };
  return (
    <form onSubmit={submit} className="flex flex-1 flex-col pt-2">
      <p className="t-meta font-semibold uppercase tracking-wide text-ink-3">Your goal</p>
      <div className="mt-1 flex items-start justify-between gap-2">
        <p className="t-body text-ink">“{goal}”</p>
        <button type="button" onClick={onEdit} className="min-h-11 shrink-0 t-secondary font-medium text-brand-text">
          Edit
        </button>
      </div>

      <div className="mt-6 flex items-start gap-3">
        <HelpCircle size={22} className="mt-0.5 shrink-0 text-brand-text" aria-hidden />
        <h1 className="t-section text-ink" id="clarify-q">
          {clarification.question}
        </h1>
      </div>
      {clarification.options.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-labelledby="clarify-q">
          {clarification.options.map((o) => (
            <Chip
              key={o}
              selected={answer === o}
              onClick={() => {
                setAnswer(o);
                setError(null);
              }}
            >
              {o}
            </Chip>
          ))}
        </div>
      )}
      <TextField
        className="mt-4"
        label={clarification.options.length ? 'Or type your own answer' : 'Your answer'}
        value={answer}
        maxLength={LIMITS.answerMaxChars}
        onChange={(e) => {
          setAnswer(e.target.value);
          setError(null);
        }}
        error={error}
      />
      <div className="mt-auto flex flex-col gap-2.5 pt-8">
        <Button type="submit" block>
          Continue
        </Button>
        <Button variant="ghost" block onClick={onSkip}>
          Skip and use reasonable assumptions
        </Button>
      </div>
    </form>
  );
}
