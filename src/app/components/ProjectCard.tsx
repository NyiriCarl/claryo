import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Archive, ArchiveRestore, CheckCircle2, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import { Badge, Button, Card, ConfirmDialog, OverflowMenu, ProgressBar, Sheet, TextField } from './ui';
import { nextAction, progressOf } from '../lib/progress';
import { relativeTime } from '../lib/dates';
import type { Project } from '../lib/types';
import { useProjects } from '../store/projects';
import { useFocus } from '../store/focus';
import { toast } from 'sonner';

export function ProjectCard({ project }: { project: Project }) {
  const navigate = useNavigate();
  const { renameProject, setProjectStatus, deleteProject } = useProjects();
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState(project.title);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const prog = progressOf(project);
  const next = nextAction(project);
  const open = () => navigate(`/projects/${project.id}`);

  return (
    <Card className="!p-0">
      <div className="flex items-start gap-2 p-4 pb-3">
        <button className="min-w-0 flex-1 text-left" onClick={open}>
          <h3 className="line-clamp-2 break-words text-[17px] font-semibold leading-snug text-ink">{project.title}</h3>
          <p className="mt-1 line-clamp-2 t-secondary text-ink-2">
            {project.status === 'completed'
              ? 'Completed'
              : next
                ? <>Next: {next.task.title}</>
                : prog.total === 0
                  ? 'No tasks yet'
                  : 'All tasks done'}
          </p>
        </button>
        <OverflowMenu
          label={`Options for ${project.title}`}
          items={[
            { label: 'Rename', icon: Pencil, onSelect: () => setRenaming(true) },
            project.status === 'archived'
              ? { label: 'Restore', icon: ArchiveRestore, onSelect: () => setProjectStatus(project.id, 'active') }
              : { label: 'Archive', icon: Archive, onSelect: () => { setProjectStatus(project.id, 'archived'); toast('Project archived'); } },
            project.status === 'completed'
              ? { label: 'Mark as active', icon: RotateCcw, onSelect: () => setProjectStatus(project.id, 'active') }
              : { label: 'Mark as completed', icon: CheckCircle2, onSelect: () => setProjectStatus(project.id, 'completed') },
            { label: 'Delete', icon: Trash2, destructive: true, onSelect: () => setConfirmDelete(true) },
          ]}
        />
      </div>
      <div className="px-4 pb-4">
        {prog.percent !== null && (
          <div className="mb-2.5 flex items-center gap-3">
            <ProgressBar value={prog.percent} label={`${project.title} progress`} />
            <span className="shrink-0 t-meta font-medium text-ink-2">
              {prog.done}/{prog.total} tasks
            </span>
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 t-meta text-ink-3">
            Updated {relativeTime(project.lastActivityAt)}
            {project.source === 'demo' && <Badge tone="warn">Demo plan</Badge>}
          </span>
          {project.status !== 'completed' && next && (
            <Button size="sm" variant="secondary" className="shrink-0" onClick={open}>
              Resume
            </Button>
          )}
        </div>
      </div>

      <Sheet open={renaming} onOpenChange={setRenaming} title="Rename project">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim()) renameProject(project.id, title);
            setRenaming(false);
          }}
          className="flex flex-col gap-4"
        >
          <TextField label="Project name" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} autoFocus />
          <Button type="submit" block disabled={!title.trim()}>
            Save
          </Button>
        </form>
      </Sheet>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this project?"
        body={`"${project.title}" and all its tasks will be deleted. This can't be undone.`}
        confirmLabel="Delete project"
        destructive
        onConfirm={() => {
          useFocus.getState().discardFor(project.id);
          deleteProject(project.id);
          setConfirmDelete(false);
          toast('Project deleted');
        }}
      />
    </Card>
  );
}
