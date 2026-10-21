import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Check, CheckCircle2, Play } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Card, DurationLabel, ErrorState, ProgressBar } from '../components/ui';
import { Screen } from '../components/Layout';
import { nextAfter, progressOf, subtasksOf } from '../lib/progress';
import { useProjects } from '../store/projects';

/** Screen 10: confirms what the person marked done and offers the next step. */
export default function TaskComplete() {
  const { projectId = '', taskId = '' } = useParams();
  const navigate = useNavigate();
  const project = useProjects((s) => s.projects[projectId]);
  const { setTaskDone, setProjectStatus } = useProjects();
  const task = project?.tasks.find((t) => t.id === taskId);
  const [shown, setShown] = useState(0);
  const prog = project ? progressOf(project) : null;

  // Animate the bar from the previous value to the new one.
  useEffect(() => {
    if (!prog || prog.percent === null) return;
    const before = prog.total ? Math.round((Math.max(0, prog.done - (task?.parentId ? 0 : 1)) / prog.total) * 100) : 0;
    setShown(before);
    const t = setTimeout(() => setShown(prog.percent!), 150);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  if (!project || !task) {
    return (
      <Screen>
        <ErrorState title="Task not found" body="It may have been deleted." actions={<Button onClick={() => navigate('/projects')}>Go to projects</Button>} />
      </Screen>
    );
  }

  if (task.status !== 'done') {
    return (
      <Screen>
        <ErrorState
          title="This task isn't marked complete"
          body={task.title}
          actions={<Button onClick={() => navigate(`/projects/${project.id}/tasks/${task.id}`)}>Open task</Button>}
        />
      </Screen>
    );
  }

  const next = nextAfter(project, task.id);
  const parent = task.parentId ? project.tasks.find((t) => t.id === task.parentId) : null;
  const parentReady = parent && parent.status === 'todo' && subtasksOf(project, parent.id).every((s) => s.status === 'done');

  return (
    <Screen nav={false}>
      <main tabIndex={-1} className="flex flex-1 flex-col px-5 pb-8 pt-12 outline-none">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-go-soft text-go-strong">
            <Check size={34} strokeWidth={3} aria-hidden />
          </div>
          <h1 className="mt-5 t-title text-ink">Nice work. One step forward.</h1>
          <p className="mt-2 t-body text-ink-2">
            You marked <span className="font-semibold text-ink">“{task.title}”</span> as done.
          </p>
        </div>

        {prog && prog.percent !== null && (
          <Card className="mt-8">
            <p className="truncate t-secondary text-ink-2">{project.title}</p>
            <div className="mt-2 mb-2 flex items-baseline justify-between">
              <span className="t-body font-semibold text-ink">
                {prog.done} of {prog.total} tasks done
              </span>
              <span className="t-meta text-ink-3">{prog.percent}%</span>
            </div>
            <ProgressBar value={shown} label="Project progress" tone={prog.percent === 100 ? 'go' : 'brand'} />
          </Card>
        )}

        {parentReady && parent && (
          <Card className="mt-3">
            <p className="t-secondary text-ink-2">All steps of “{parent.title}” are done.</p>
            <Button
              size="sm"
              variant="success"
              icon={CheckCircle2}
              className="mt-3"
              onClick={() => {
                setTaskDone(project.id, parent.id, true);
                navigate(`/projects/${project.id}/tasks/${parent.id}/done`, { replace: true });
              }}
            >
              Mark “{parent.title.length > 28 ? parent.title.slice(0, 28) + '…' : parent.title}” complete
            </Button>
          </Card>
        )}

        {next && (
          <Card className="mt-3">
            <p className="t-meta font-semibold uppercase tracking-wide text-brand-text">Up next</p>
            <p className="mt-1 text-[17px] font-semibold text-ink">{next.task.title}</p>
            <DurationLabel minutes={next.task.estimateMinutes} className="mt-1" />
          </Card>
        )}

        <div className="mt-auto flex flex-col gap-2.5 pt-8">
          {next ? (
            <>
              <Button block icon={Play} onClick={() => navigate(`/focus/${project.id}/${next.task.id}`, { replace: true })}>
                Continue to next task
              </Button>
              <Button block variant="secondary" onClick={() => navigate(`/projects/${project.id}`, { replace: true })}>
                Return to project
              </Button>
            </>
          ) : (
            <>
              {project.status !== 'completed' && prog?.done === prog?.total && (
                <Button
                  block
                  variant="success"
                  icon={CheckCircle2}
                  onClick={() => {
                    setProjectStatus(project.id, 'completed');
                    toast('Project marked as completed');
                    navigate(`/projects/${project.id}`, { replace: true });
                  }}
                >
                  Mark project as completed
                </Button>
              )}
              <Button block variant="secondary" onClick={() => navigate(`/projects/${project.id}`, { replace: true })}>
                Return to project
              </Button>
            </>
          )}
        </div>
      </main>
    </Screen>
  );
}
