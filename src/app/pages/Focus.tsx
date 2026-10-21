import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { CheckCircle2, ChevronDown, Pause, Play, Plus, RotateCcw, Volume2, VolumeX, X } from 'lucide-react';
import { Button, Chip, ErrorState, IconButton, Sheet, cx } from '../components/ui';
import { useProjects } from '../store/projects';
import { useFocus } from '../store/focus';
import { usePrefs } from '../store/prefs';
import { useNow } from '../hooks/useNow';
import { elapsedMs, formatClock, isTimeUp, remainingMs } from '../lib/timer';
import { subtasksOf } from '../lib/progress';

const CHOICES = [5, 10, 15, 25];

function beep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 660;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.9);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 1);
  } catch {
    /* sound is optional */
  }
}

/** Screen 09: one task, a calm timer, and the person decides when it's done. */
export default function Focus() {
  const { projectId = '', taskId = '' } = useParams();
  const navigate = useNavigate();
  const project = useProjects((s) => s.projects[projectId]);
  const task = project?.tasks.find((t) => t.id === taskId);
  const setTaskDone = useProjects((s) => s.setTaskDone);
  const touch = useProjects((s) => s.touch);
  const focus = useFocus();
  const { prefs, set: setPrefs } = usePrefs();
  const [showDetails, setShowDetails] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const alerted = useRef<string | null>(null);

  const session = focus.active && focus.active.taskId === taskId ? focus.active : null;
  const running = session?.state === 'running';
  const now = useNow(running);

  useEffect(() => {
    if (project && task && task.status === 'todo') focus.open(projectId, taskId, prefs.defaultTimerMinutes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, taskId, !!task]);

  const timeUp = session ? isTimeUp(session, now) : false;
  useEffect(() => {
    if (!session || !timeUp) return;
    const key = `${session.id}:${session.durationSec}`;
    if (alerted.current === key) return;
    alerted.current = key;
    if (prefs.focusSound) beep();
    if (navigator.vibrate) navigator.vibrate(200);
  }, [timeUp, session, prefs.focusSound]);

  // Keep the screen on while the timer runs, where supported.
  useEffect(() => {
    if (!running || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    navigator.wakeLock.request('screen').then((l) => (lock = l)).catch(() => undefined);
    return () => void lock?.release().catch(() => undefined);
  }, [running]);

  if (!project || !task) {
    return (
      <main className="mx-auto min-h-dvh max-w-[480px] bg-canvas">
        <ErrorState title="Task not found" body="It may have been deleted." actions={<Button onClick={() => navigate('/')}>Go home</Button>} />
      </main>
    );
  }

  const exitTo = `/projects/${project.id}/tasks/${task.id}`;
  const subs = subtasksOf(project, task.id).filter((s) => s.status === 'todo');
  const started = session && session.state !== 'idle';
  const display = session
    ? session.durationSec != null
      ? formatClock(session.state === 'idle' ? session.durationSec * 1000 : remainingMs(session, now)!)
      : formatClock(elapsedMs(session, now))
    : '0:00';

  const complete = () => {
    setTaskDone(project.id, task.id, true);
    focus.end('completed');
    navigate(`/projects/${project.id}/tasks/${task.id}/done`, { replace: true });
  };
  const exit = () => {
    if (started) return setLeaving(true);
    focus.end('abandoned');
    navigate(exitTo);
  };

  if (task.status === 'done') {
    return (
      <main className="mx-auto min-h-dvh max-w-[480px] bg-canvas">
        <ErrorState title="This task is already done" body={task.title} actions={<Button onClick={() => navigate(`/projects/${project.id}`)}>Back to project</Button>} />
      </main>
    );
  }

  return (
    <main tabIndex={-1} aria-label="Focus mode" className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-canvas px-5 pb-6 outline-none safe-top">
      <div className="flex items-center justify-between">
        <IconButton icon={X} label="Exit focus mode" onClick={exit} className="-ml-2" />
        <span className="t-meta font-semibold uppercase tracking-wide text-ink-3">Focus</span>
        <IconButton
          icon={prefs.focusSound ? Volume2 : VolumeX}
          label={prefs.focusSound ? 'Sound on when time is up. Turn off' : 'Sound off. Turn on sound when time is up'}
          aria-pressed={prefs.focusSound}
          onClick={() => setPrefs({ focusSound: !prefs.focusSound })}
          className="-mr-2"
        />
      </div>

      <h1 className="mt-4 t-title text-ink">{task.title}</h1>
      {(task.description || task.steps.length > 0 || subs.length > 0) && (
        <div className="mt-2">
          <button className="inline-flex min-h-11 items-center gap-1 t-secondary font-medium text-ink-2" aria-expanded={showDetails} onClick={() => setShowDetails((v) => !v)}>
            Instructions <ChevronDown size={16} className={cx('transition-transform', showDetails && 'rotate-180')} aria-hidden />
          </button>
          {showDetails && (
            <div className="t-secondary text-ink-2">
              {task.description && <p className="whitespace-pre-line">{task.description}</p>}
              {task.steps.length > 0 && (
                <ol className="mt-2 list-decimal space-y-1 pl-5">
                  {task.steps.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
              )}
              {subs.length > 0 && (
                <>
                  <p className="mt-2 font-medium text-ink">Open steps:</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    {subs.map((s) => (
                      <li key={s.id}>{s.title}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-1 flex-col items-center justify-center py-8">
        <div
          role="timer"
          aria-label={session?.durationSec != null ? 'Time remaining' : 'Time elapsed'}
          className={cx('font-semibold tabular-nums tracking-tight', timeUp ? 'text-go-strong' : 'text-ink')}
          style={{ fontSize: 72, lineHeight: 1 }}
        >
          {display}
        </div>
        <p className="mt-3 t-secondary text-ink-3" aria-live="polite">
          {timeUp
            ? "Time's up. Finished, or want a few more minutes?"
            : session?.state === 'paused'
              ? 'Paused'
              : session?.state === 'running'
                ? session.durationSec != null
                  ? 'Focus on this one task.'
                  : 'Counting up. Stop whenever you like.'
                : 'Choose a timer, or work without one.'}
        </p>

        {(!session || session.state === 'idle') && (
          <div className="mt-6 flex flex-wrap justify-center gap-2" role="group" aria-label="Timer length">
            {CHOICES.map((m) => (
              <Chip key={m} selected={session?.durationSec === m * 60} onClick={() => focus.setDuration(m * 60)}>
                {m} min
              </Chip>
            ))}
            <Chip selected={session?.durationSec === null} onClick={() => focus.setDuration(null)}>
              No timer
            </Chip>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        {timeUp ? (
          <>
            <Button block variant="success" icon={CheckCircle2} onClick={complete}>
              Mark complete
            </Button>
            <Button block variant="secondary" icon={Plus} onClick={() => focus.extend(5 * 60)}>
              5 more minutes
            </Button>
            <Button
              block
              variant="ghost"
              onClick={() => {
                focus.end('saved_for_later');
                touch(project.id);
                navigate(exitTo);
              }}
            >
              Not done yet, save for later
            </Button>
          </>
        ) : (
          <>
            {(!session || session.state === 'idle') && (
              <Button block icon={Play} onClick={() => { focus.start(); touch(project.id); }}>
                Start
              </Button>
            )}
            {session?.state === 'running' && (
              <div className="flex gap-2">
                <Button className="flex-1" variant="secondary" icon={Pause} onClick={focus.pause}>
                  Pause
                </Button>
                <Button className="flex-1" variant="secondary" icon={RotateCcw} onClick={focus.reset}>
                  Reset
                </Button>
              </div>
            )}
            {session?.state === 'paused' && (
              <div className="flex gap-2">
                <Button className="flex-1" icon={Play} onClick={focus.resume}>
                  Resume
                </Button>
                <Button className="flex-1" variant="secondary" icon={RotateCcw} onClick={focus.reset}>
                  Reset
                </Button>
              </div>
            )}
            <Button block variant={started ? 'success' : 'secondary'} icon={CheckCircle2} onClick={complete}>
              Mark complete
            </Button>
          </>
        )}
      </div>

      <Sheet open={leaving} onOpenChange={setLeaving} title="Leave focus mode?" description="Your task stays as it is. Nothing is marked complete.">
        <div className="flex flex-col gap-2.5">
          <Button
            block
            onClick={() => {
              focus.pause();
              setLeaving(false);
              navigate(exitTo);
            }}
          >
            Pause and resume later
          </Button>
          <Button
            block
            variant="secondary"
            onClick={() => {
              focus.end('saved_for_later');
              setLeaving(false);
              navigate(exitTo);
            }}
          >
            End this session
          </Button>
          <Button block variant="ghost" onClick={() => setLeaving(false)}>
            Keep focusing
          </Button>
        </div>
      </Sheet>
    </main>
  );
}
