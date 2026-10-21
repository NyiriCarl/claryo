import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { BookOpen, CheckCircle2, Clock4, HelpCircle, Lightbulb, Lock, Pencil, Play, RotateCcw, Scissors, Shrink, Trash2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Button, ConfirmDialog, DurationLabel, ErrorState, OverflowMenu, Sheet, TaskCheckbox, cx } from '../components/ui';
import { Screen, TopBar } from '../components/Layout';
import { AddTaskInline, TaskEditSheet, useToggleTask } from '../components/TaskParts';
import { depsSatisfied, subtasksOf } from '../lib/progress';
import { useProjects } from '../store/projects';
import { useFocus } from '../store/focus';
import type { SimplifyAction } from '@shared/plan.ts';

const MORE_HELP: { action: SimplifyAction; label: string; icon: typeof Zap }[] = [
  { action: 'stuck', label: "I'm stuck", icon: HelpCircle },
  { action: 'ten_minutes', label: 'I only have 10 minutes', icon: Clock4 },
  { action: 'too_much', label: 'This is too much', icon: Shrink },
  { action: 'smaller', label: 'Give me a smaller start', icon: Zap },
];

/** Screen 08: what the task involves and how to start it. */
export default function TaskDetail() {
  const { projectId = '', taskId = '' } = useParams();
  const project = useProjects((s) => s.projects[projectId]);
  const task = project?.tasks.find((t) => t.id === taskId);
  const navigate = useNavigate();
  const { setTaskDone, deleteTask } = useProjects();
  const toggle = useToggleTask();
  const [editing, setEditing] = useState(false);
  const [moreHelp, setMoreHelp] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!project || !task) {
    return (
      <Screen>
        <TopBar back={project ? `/projects/${projectId}` : '/projects'} />
        <ErrorState title="Task not found" body="It may have been deleted." actions={<Button onClick={() => navigate(project ? `/projects/${projectId}` : '/projects')}>Back</Button>} />
      </Screen>
    );
  }

  const parent = task.parentId ? project.tasks.find((t) => t.id === task.parentId) : null;
  const subs = subtasksOf(project, task.id);
  const deps = task.dependsOn.map((id) => project.tasks.find((t) => t.id === id)).filter((t): t is NonNullable<typeof t> => !!t);
  const blocked = task.status === 'todo' && !depsSatisfied(project, task);
  const done = task.status === 'done';
  const help = (action: SimplifyAction) => navigate(`/projects/${project.id}/tasks/${task.id}/help?action=${action}`);

  return (
    <Screen>
      <TopBar
        back={parent ? `/projects/${project.id}/tasks/${parent.id}` : `/projects/${project.id}`}
        title={<span className="t-secondary text-ink-2">{project.title}</span>}
        actions={
          <OverflowMenu
            label="Task options"
            items={[
              { label: 'Edit', icon: Pencil, onSelect: () => setEditing(true) },
              { label: 'Delete', icon: Trash2, destructive: true, onSelect: () => setConfirmDelete(true) },
            ]}
          />
        }
      />
      <main tabIndex={-1} className="flex flex-col gap-5 px-5 pb-6 outline-none">
        <header>
          {parent && (
            <Link to={`/projects/${project.id}/tasks/${parent.id}`} className="t-meta text-brand-text underline">
              Part of: {parent.title}
            </Link>
          )}
          <div className="mt-1 flex items-start gap-2">
            <h1 className={cx('flex-1 t-title', done ? 'text-ink-3 line-through' : 'text-ink')}>{task.title}</h1>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <DurationLabel minutes={task.estimateMinutes} />
            {done && (
              <span className="inline-flex items-center gap-1 t-meta font-semibold text-go-strong">
                <CheckCircle2 size={14} aria-hidden /> Done
              </span>
            )}
            <button onClick={() => setEditing(true)} className="inline-flex min-h-11 items-center gap-1 t-meta font-medium text-brand-text">
              <Pencil size={14} aria-hidden /> Edit
            </button>
          </div>
        </header>

        {blocked && (
          <div className="flex items-start gap-2 rounded-2xl bg-surface-2 p-3 t-secondary text-ink-2">
            <Lock size={16} className="mt-0.5 shrink-0" aria-hidden />
            <span>This usually comes after an earlier task. You can still start it if you like.</span>
          </div>
        )}

        {task.description && <p className="t-body text-ink">{task.description}</p>}

        {task.steps.length > 0 && (
          <section>
            <h2 className="mb-2 t-secondary font-semibold text-ink">Suggested steps</h2>
            <ol className="space-y-2">
              {task.steps.map((s, i) => (
                <li key={i} className="flex gap-3 t-body text-ink">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[13px] font-semibold text-brand-text">{i + 1}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {(task.expectedResult || task.completionCriteria) && (
          <section className="rounded-2xl bg-surface-2 p-4 t-secondary text-ink-2">
            {task.expectedResult && (
              <p>
                <span className="font-semibold text-ink">You'll end up with: </span>
                {task.expectedResult}
              </p>
            )}
            {task.completionCriteria && (
              <p className={task.expectedResult ? 'mt-2' : ''}>
                <span className="font-semibold text-ink">It's done when: </span>
                {task.completionCriteria}
              </p>
            )}
          </section>
        )}

        {deps.length > 0 && (
          <section>
            <h2 className="mb-1 t-secondary font-semibold text-ink">Comes after</h2>
            <ul>
              {deps.map((d) => (
                <li key={d.id}>
                  <Link to={`/projects/${project.id}/tasks/${d.id}`} className="flex min-h-11 items-center gap-2 t-secondary text-brand-text">
                    {d.status === 'done' ? <CheckCircle2 size={16} className="text-go-strong" aria-label="Done" /> : <Lock size={16} aria-label="Not done yet" />}
                    {d.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="flex flex-col gap-2.5">
          {!done && (
            <Button block icon={Play} onClick={() => navigate(`/focus/${project.id}/${task.id}`)}>
              Start now
            </Button>
          )}
          {done ? (
            <Button block variant="secondary" icon={RotateCcw} onClick={() => toggle(project.id, task, false)}>
              Mark as not done
            </Button>
          ) : (
            <Button
              block
              variant="success"
              icon={CheckCircle2}
              onClick={() => {
                setTaskDone(project.id, task.id, true);
                navigate(`/projects/${project.id}/tasks/${task.id}/done`);
              }}
            >
              Mark complete
            </Button>
          )}
        </div>

        {!done && (
          <section aria-labelledby="help-heading">
            <h2 id="help-heading" className="mb-2 t-secondary font-semibold text-ink">
              Need help with this?
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" size="sm" icon={Scissors} onClick={() => help('breakdown')}>
                Break this down
              </Button>
              <Button variant="secondary" size="sm" icon={BookOpen} onClick={() => help('explain')}>
                Explain simply
              </Button>
              <Button variant="secondary" size="sm" icon={Lightbulb} onClick={() => help('example')}>
                Show an example
              </Button>
              <Button variant="secondary" size="sm" icon={HelpCircle} onClick={() => setMoreHelp(true)}>
                More options
              </Button>
            </div>
          </section>
        )}

        {!parent && (
          <section aria-labelledby="steps-heading" className="rounded-2xl border border-line bg-surface px-2 py-2">
            <h2 id="steps-heading" className="px-2.5 pt-2 t-secondary font-semibold text-ink">
              Steps {subs.length > 0 && <span className="font-normal text-ink-3">({subs.filter((s) => s.status === 'done').length}/{subs.length} done)</span>}
            </h2>
            {subs.length > 0 && (
              <ul>
                {subs.map((s) => (
                  <li key={s.id} className="flex items-center gap-1">
                    <TaskCheckbox checked={s.status === 'done'} onChange={(v) => toggle(project.id, s, v)} label={`${s.title}: ${s.status === 'done' ? 'done' : 'not done'}`} />
                    <Link to={`/projects/${project.id}/tasks/${s.id}`} className={cx('flex min-h-11 flex-1 items-center t-body', s.status === 'done' ? 'text-ink-3 line-through' : 'text-ink')}>
                      {s.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <AddTaskInline projectId={project.id} phaseId={task.phaseId} parentId={task.id} label="Add a step" />
          </section>
        )}
      </main>

      <TaskEditSheet open={editing} onOpenChange={setEditing} project={project} task={task} />
      <Sheet open={moreHelp} onOpenChange={setMoreHelp} title="What would help?">
        <div className="flex flex-col gap-2">
          {MORE_HELP.map(({ action, label, icon }) => (
            <Button key={action} variant="secondary" block icon={icon} className="!justify-start" onClick={() => { setMoreHelp(false); help(action); }}>
              {label}
            </Button>
          ))}
        </div>
      </Sheet>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this task?"
        body={subs.length ? `"${task.title}" and its ${subs.length} steps will be deleted.` : `"${task.title}" will be deleted.`}
        confirmLabel="Delete task"
        destructive
        onConfirm={() => {
          useFocus.getState().discardFor(project.id, task.id);
          deleteTask(project.id, task.id);
          toast('Task deleted');
          navigate(`/projects/${project.id}`, { replace: true });
        }}
      />
    </Screen>
  );
}
