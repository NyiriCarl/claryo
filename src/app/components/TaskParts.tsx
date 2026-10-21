import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { ArrowDown, ArrowUp, ChevronRight, Lock, Pencil, Play, Plus, Scissors, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { LIMITS } from '@shared/plan.ts';
import { Button, ConfirmDialog, DurationLabel, OverflowMenu, Sheet, TaskCheckbox, TextArea, TextField, cx } from './ui';
import { depsSatisfied, subtasksOf } from '../lib/progress';
import type { Project, Task } from '../lib/types';
import { useProjects } from '../store/projects';
import { useFocus } from '../store/focus';

/** Toggle with an undo toast. Completing never happens automatically. */
export function useToggleTask() {
  const setTaskDone = useProjects((s) => s.setTaskDone);
  return (projectId: string, task: Task, done: boolean) => {
    setTaskDone(projectId, task.id, done);
    toast(done ? 'Marked as done' : 'Marked as not done', {
      description: task.title,
      action: { label: 'Undo', onClick: () => setTaskDone(projectId, task.id, !done) },
    });
  };
}

export function TaskRow({ project, task, index, count }: { project: Project; task: Task; index: number; count: number }) {
  const navigate = useNavigate();
  const toggle = useToggleTask();
  const { moveTask, deleteTask } = useProjects();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const subs = subtasksOf(project, task.id);
  const subsDone = subs.filter((s) => s.status === 'done').length;
  const blocked = task.status === 'todo' && !depsSatisfied(project, task);
  const done = task.status === 'done';
  const open = () => navigate(`/projects/${project.id}/tasks/${task.id}`);

  return (
    <li className="flex items-start gap-1 py-1">
      <TaskCheckbox checked={done} onChange={(v) => toggle(project.id, task, v)} label={`${task.title}: ${done ? 'done' : 'not done'}`} />
      <button onClick={open} className="min-h-11 min-w-0 flex-1 py-2.5 text-left">
        <span className={cx('block t-body leading-snug', done ? 'text-ink-3 line-through' : 'text-ink')}>{task.title}</span>
        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          {!done && <DurationLabel minutes={task.estimateMinutes} />}
          {subs.length > 0 && (
            <span className="t-meta text-ink-3">
              {subsDone}/{subs.length} steps
            </span>
          )}
          {blocked && (
            <span className="inline-flex items-center gap-1 t-meta text-ink-3">
              <Lock size={12} aria-hidden /> After an earlier task
            </span>
          )}
        </span>
      </button>
      <OverflowMenu
        label={`Options for ${task.title}`}
        items={[
          { label: 'Start now', icon: Play, onSelect: () => navigate(`/focus/${project.id}/${task.id}`), disabled: done },
          { label: 'Open', icon: ChevronRight, onSelect: open },
          { label: 'Edit', icon: Pencil, onSelect: () => setEditing(true) },
          { label: 'Break this down', icon: Scissors, onSelect: () => navigate(`/projects/${project.id}/tasks/${task.id}/help?action=breakdown`), disabled: done },
          { label: 'Move up', icon: ArrowUp, onSelect: () => moveTask(project.id, task.id, -1), disabled: index === 0 },
          { label: 'Move down', icon: ArrowDown, onSelect: () => moveTask(project.id, task.id, 1), disabled: index === count - 1 },
          { label: 'Delete', icon: Trash2, destructive: true, onSelect: () => setConfirmDelete(true) },
        ]}
      />
      <TaskEditSheet open={editing} onOpenChange={setEditing} project={project} task={task} />
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
          setConfirmDelete(false);
          toast('Task deleted');
        }}
      />
    </li>
  );
}

export function TaskEditSheet({ open, onOpenChange, project, task }: { open: boolean; onOpenChange: (v: boolean) => void; project: Project; task: Task }) {
  const updateTask = useProjects((s) => s.updateTask);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [minutes, setMinutes] = useState(task.estimateMinutes?.toString() ?? '');
  const [error, setError] = useState<string | null>(null);

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setError('Give the task a title.');
    const m = minutes.trim() ? Number(minutes) : null;
    if (m !== null && (!Number.isInteger(m) || m < 1 || m > LIMITS.maxEstimateMinutes)) return setError(`Estimate must be 1–${LIMITS.maxEstimateMinutes} minutes.`);
    updateTask(project.id, task.id, { title: title.trim().slice(0, 120), description: description.trim().slice(0, LIMITS.textMaxChars), estimateMinutes: m });
    onOpenChange(false);
    toast('Task updated');
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (v) {
          setTitle(task.title);
          setDescription(task.description);
          setMinutes(task.estimateMinutes?.toString() ?? '');
          setError(null);
        }
        onOpenChange(v);
      }}
      title="Edit task"
    >
      <form onSubmit={save} className="flex flex-col gap-4">
        <TextField label="Title" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} error={error && !title.trim() ? error : null} />
        <TextArea label="Description" rows={4} value={description} maxLength={LIMITS.textMaxChars} onChange={(e) => setDescription(e.target.value)} />
        <TextField
          label="Estimated minutes (optional)"
          inputMode="numeric"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value.replace(/[^0-9]/g, ''))}
          error={error && title.trim() ? error : null}
        />
        <Button type="submit" block>
          Save changes
        </Button>
      </form>
    </Sheet>
  );
}

export function AddTaskInline({ projectId, phaseId, parentId = null, label = 'Add task' }: { projectId: string; phaseId: string | null; parentId?: string | null; label?: string }) {
  const addTask = useProjects((s) => s.addTask);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="flex min-h-11 items-center gap-2 px-2.5 t-secondary font-medium text-brand-text">
        <Plus size={18} aria-hidden /> {label}
      </button>
    );
  }
  return (
    <form
      className="flex items-end gap-2 py-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        addTask(projectId, { title, phaseId, parentId });
        setTitle('');
        toast('Task added');
      }}
    >
      <TextField label={label} hideLabel className="flex-1" placeholder="What needs doing?" value={title} maxLength={120} autoFocus onChange={(e) => setTitle(e.target.value)} />
      <Button type="submit" disabled={!title.trim()} className="h-14">
        Add
      </Button>
      <Button variant="ghost" className="h-14 px-3" onClick={() => { setOpen(false); setTitle(''); }}>
        Done
      </Button>
    </form>
  );
}
