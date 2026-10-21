import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowRight, PenLine, Play, Sparkles, Timer } from 'lucide-react';
import { LIMITS, validateGoalInput } from '@shared/plan.ts';
import { Badge, Button, Card, Chip, DurationLabel, Notice, TextArea } from '../components/ui';
import { Screen } from '../components/Layout';
import { Lockup } from '../components/Logo';
import { ProjectCard } from '../components/ProjectCard';
import { useProjectList, useProjects } from '../store/projects';
import { useAiMode, useDraft } from '../store/app';
import { usePrefs } from '../store/prefs';
import { useFocus } from '../store/focus';
import { useOnline } from '../hooks/useOnline';
import { nextAction } from '../lib/progress';
import { emptyProject } from '../lib/planToProject';

const EXAMPLES = ['Start a business', 'Learn a new skill', 'Build a portfolio', 'Plan an event'];

function greeting(name: string) {
  const h = new Date().getHours();
  const part = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return name ? `${part}, ${name.split(' ')[0]}` : part;
}

/** Screen 04: create a project or pick up where you left off. */
export default function Home() {
  const navigate = useNavigate();
  const online = useOnline();
  const projects = useProjectList();
  const addProject = useProjects((s) => s.addProject);
  const { goal, setGoal } = useDraft();
  const name = usePrefs((s) => s.prefs.name);
  const aiMode = useAiMode((s) => s.mode);
  const loadAiMode = useAiMode((s) => s.load);
  const focus = useFocus((s) => s.active);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    void loadAiMode();
  }, [loadAiMode]);

  const active = projects.filter((p) => p.status === 'active');
  const current = useMemo(() => {
    for (const p of active) {
      const n = nextAction(p);
      if (n) return { project: p, next: n };
    }
    return null;
  }, [active]);
  const focusTask = focus ? projects.find((p) => p.id === focus.projectId)?.tasks.find((t) => t.id === focus.taskId) : null;

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const problem = validateGoalInput(goal);
    if (problem) {
      setError(problem);
      inputRef.current?.focus();
      return;
    }
    setError(null);
    navigate('/new', { state: { goal: goal.trim() } });
  };

  const createManually = () => {
    const problem = validateGoalInput(goal);
    const title = problem ? 'New project' : goal.trim().slice(0, 120);
    const p = emptyProject(title, problem ? '' : goal.trim());
    addProject(p);
    setGoal('');
    navigate(`/projects/${p.id}`);
  };

  return (
    <Screen>
      <main tabIndex={-1} className="flex flex-col gap-6 px-5 pt-5 outline-none">
        <div className="flex items-center justify-between">
          <Lockup size={28} />
          {aiMode === 'demo' && <Badge tone="warn">Demo mode</Badge>}
        </div>

        {focus && focusTask && (
          <Card className="border-brand/30 bg-brand-soft">
            <div className="flex items-center gap-3">
              <Timer size={22} className="shrink-0 text-brand-text" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="t-meta font-semibold text-brand-text">{focus.state === 'running' ? 'Focus session running' : 'Focus session paused'}</p>
                <p className="line-clamp-2 t-body font-medium text-ink">{focusTask.title}</p>
              </div>
              <Button size="sm" onClick={() => navigate(`/focus/${focus.projectId}/${focus.taskId}`)}>
                Resume
              </Button>
            </div>
          </Card>
        )}

        <section aria-labelledby="create-heading">
          <p className="t-secondary text-ink-2">{greeting(name)}</p>
          <h1 id="create-heading" className="mt-1 t-title text-ink">
            What would you like to get done?
          </h1>
          <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
            <TextArea
              ref={inputRef}
              label="Your goal"
              hideLabel
              rows={3}
              maxLength={LIMITS.goalMaxChars}
              placeholder="Describe a goal, idea, or task..."
              value={goal}
              onChange={(e) => {
                setGoal(e.target.value);
                if (error) setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
              }}
              error={error}
              hint={goal.length > LIMITS.goalMaxChars - 80 ? `${goal.length}/${LIMITS.goalMaxChars}` : undefined}
            />
            <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5" role="group" aria-label="Example goals">
              {EXAMPLES.map((ex) => (
                <Chip
                  key={ex}
                  selected={goal === ex}
                  onClick={() => {
                    setGoal(ex);
                    setError(null);
                    inputRef.current?.focus();
                  }}
                >
                  {ex}
                </Chip>
              ))}
            </div>
            {online ? (
              <Button type="submit" block icon={Sparkles}>
                Break it down
              </Button>
            ) : (
              <>
                <Notice tone="warn">
                  You're offline. Making a plan needs a connection, but you can create the project now and add tasks yourself.
                  It's saved on this device.
                </Notice>
                <Button block icon={PenLine} onClick={createManually}>
                  Create project without AI
                </Button>
              </>
            )}
          </form>
          {online && (
            <button onClick={createManually} className="mt-2 min-h-11 w-full t-secondary font-medium text-brand-text">
              Or create a project and add tasks yourself
            </button>
          )}
        </section>

        {current && (
          <section aria-labelledby="next-heading">
            <h2 id="next-heading" className="mb-2 t-meta font-semibold uppercase tracking-wide text-ink-3">
              Your next step
            </h2>
            <Card>
              <p className="truncate t-meta text-ink-3">{current.project.title}</p>
              <p className="mt-1 text-[17px] font-semibold text-ink">{current.next.task.title}</p>
              <DurationLabel minutes={current.next.task.estimateMinutes} className="mt-1" />
              <div className="mt-3 flex gap-2">
                <Button size="sm" icon={Play} onClick={() => navigate(`/focus/${current.project.id}/${current.next.task.id}`)}>
                  Start now
                </Button>
                <Button size="sm" variant="secondary" onClick={() => navigate(`/projects/${current.project.id}/tasks/${current.next.task.id}`)}>
                  View task
                </Button>
              </div>
            </Card>
          </section>
        )}

        {active.length > 0 && (
          <section aria-labelledby="recent-heading">
            <div className="mb-2 flex items-center justify-between">
              <h2 id="recent-heading" className="t-meta font-semibold uppercase tracking-wide text-ink-3">
                Recent projects
              </h2>
              <Link to="/projects" className="inline-flex min-h-11 items-center gap-1 t-secondary font-medium text-brand-text">
                See all <ArrowRight size={16} aria-hidden />
              </Link>
            </div>
            <div className="flex flex-col gap-3">
              {active.slice(0, 3).map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          </section>
        )}
      </main>
    </Screen>
  );
}
