import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { Archive, CheckCircle2, ChevronDown, Info, ListPlus, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, ConfirmDialog, EmptyState, ErrorState, IconButton, Notice, OverflowMenu, ProgressBar, TextField, cx } from '../components/ui';
import { Screen, TopBar } from '../components/Layout';
import { StartHereCard } from '../components/StartHereCard';
import { AddTaskInline, TaskRow } from '../components/TaskParts';
import { nextAction, progressOf, tasksInPhase } from '../lib/progress';
import type { Phase, Project } from '../lib/types';
import { useProjects } from '../store/projects';
import { useFocus } from '../store/focus';

/** Screen 07: the plan, with the Start Here card at the top. */
export default function ProjectDetail() {
  const { projectId = '' } = useParams();
  const project = useProjects((s) => s.projects[projectId]);
  const navigate = useNavigate();

  if (!project) {
    return (
      <Screen>
        <TopBar back="/projects" />
        <ErrorState
          title="Project not found"
          body="It may have been deleted on this or another device."
          actions={<Button onClick={() => navigate('/projects')}>Go to projects</Button>}
        />
      </Screen>
    );
  }
  return <ProjectView project={project} />;
}

function ProjectView({ project }: { project: Project }) {
  const navigate = useNavigate();
  const location = useLocation();
  const justCreated = (location.state as { justCreated?: boolean } | null)?.justCreated;
  const { renameProject, setProjectStatus, deleteProject } = useProjects();
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(project.title);
  const [showAssumptions, setShowAssumptions] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const prog = progressOf(project);
  const next = nextAction(project);
  const phases = [...project.phases].sort((a, b) => a.position - b.position);
  const unphased = tasksInPhase(project, null);

  const saveTitle = () => {
    if (title.trim()) renameProject(project.id, title);
    else setTitle(project.title);
    setEditingTitle(false);
  };

  return (
    <Screen>
      <TopBar
        back="/projects"
        actions={
          <OverflowMenu
            label="Project options"
            items={[
              { label: 'Rename', icon: Pencil, onSelect: () => setEditingTitle(true) },
              project.status === 'completed'
                ? { label: 'Mark as active', icon: RotateCcw, onSelect: () => setProjectStatus(project.id, 'active') }
                : { label: 'Mark as completed', icon: CheckCircle2, onSelect: () => setProjectStatus(project.id, 'completed') },
              project.status === 'archived'
                ? { label: 'Restore from archive', icon: RotateCcw, onSelect: () => setProjectStatus(project.id, 'active') }
                : { label: 'Archive', icon: Archive, onSelect: () => { setProjectStatus(project.id, 'archived'); toast('Project archived'); navigate('/projects'); } },
              { label: 'Delete project', icon: Trash2, destructive: true, onSelect: () => setConfirmDelete(true) },
            ]}
          />
        }
      />
      <main tabIndex={-1} className="flex flex-col gap-5 px-5 pb-6 outline-none">
        <header>
          {editingTitle ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveTitle();
              }}
              className="flex items-end gap-2"
            >
              <TextField label="Project name" hideLabel className="flex-1" value={title} maxLength={120} autoFocus onChange={(e) => setTitle(e.target.value)} onBlur={saveTitle} />
            </form>
          ) : (
            <div className="flex items-start gap-1">
              <h1 className="flex-1 t-title text-ink">{project.title}</h1>
              <IconButton icon={Pencil} label="Rename project" onClick={() => { setTitle(project.title); setEditingTitle(true); }} className="-mr-2" />
            </div>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            {project.source === 'demo' && <Badge tone="warn">Demo plan, not AI-generated</Badge>}
            {project.status === 'completed' && <Badge tone="go">Completed</Badge>}
            {project.status === 'archived' && <Badge>Archived</Badge>}
          </div>
          {project.goalSummary && <p className="mt-2 t-body text-ink-2">{project.goalSummary}</p>}
          {(project.assumptions.length > 0 || project.estimatedDuration) && (
            <div className="mt-2">
              <button
                className="inline-flex min-h-11 items-center gap-1.5 t-secondary font-medium text-brand-text"
                aria-expanded={showAssumptions}
                onClick={() => setShowAssumptions((v) => !v)}
              >
                <Info size={16} aria-hidden />
                {showAssumptions ? 'Hide' : 'Show'} assumptions and estimates
              </button>
              {showAssumptions && (
                <div className="mt-1 rounded-2xl bg-surface-2 p-4 t-secondary text-ink-2">
                  {project.assumptions.length > 0 && (
                    <>
                      <p className="font-semibold text-ink">This plan assumes:</p>
                      <ul className="mt-1 list-disc space-y-1 pl-5">
                        {project.assumptions.map((a) => (
                          <li key={a}>{a}</li>
                        ))}
                      </ul>
                    </>
                  )}
                  {project.estimatedDuration && (
                    <p className="mt-2">
                      <span className="font-semibold text-ink">Rough time estimate:</span> {project.estimatedDuration}. Estimates are guesses, not promises.
                    </p>
                  )}
                  {project.source === 'ai' && <p className="mt-2">Generated by AI. Check anything important before relying on it.</p>}
                  {project.source === 'demo' && <p className="mt-2">This plan was made from built-in templates because the AI service isn't connected.</p>}
                </div>
              )}
            </div>
          )}
        </header>

        {justCreated && prog.total > 0 && (
          <Notice tone="brand">Here's your plan. Change anything that doesn't fit, then start with the first step.</Notice>
        )}

        {prog.percent !== null && (
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <span className="t-secondary font-medium text-ink">
                {prog.done} of {prog.total} tasks done
              </span>
              <span className="t-meta text-ink-3">
                {prog.phasesTotal > 0 ? `${prog.phasesDone}/${prog.phasesTotal} phases · ` : ''}
                {prog.percent}%
              </span>
            </div>
            <ProgressBar value={prog.percent} label="Project progress" tone={prog.percent === 100 ? 'go' : 'brand'} />
          </div>
        )}

        {next && project.status !== 'completed' && <StartHereCard projectId={project.id} next={next} />}

        {!next && prog.total > 0 && (
          <div className="rounded-2xl bg-go-soft p-4">
            <p className="t-body font-semibold text-go-strong">Every task is done. Nice work.</p>
            {project.status !== 'completed' && (
              <Button className="mt-3" variant="success" icon={CheckCircle2} onClick={() => { setProjectStatus(project.id, 'completed'); toast('Project marked as completed'); }}>
                Mark project as completed
              </Button>
            )}
          </div>
        )}

        {prog.total === 0 && (
          <EmptyState
            icon={ListPlus}
            title="No tasks yet"
            body="Add the first thing you could do. Small and specific works best."
          />
        )}

        <div className="flex flex-col gap-3">
          {phases.map((ph, i) => (
            <PhaseSection key={ph.id} project={project} phase={ph} defaultOpen={i === 0 || tasksInPhase(project, ph.id).some((t) => t.status === 'todo')} />
          ))}
          {(unphased.length > 0 || phases.length === 0) && (
            <section className="rounded-2xl border border-line bg-surface px-2 py-2">
              {phases.length > 0 && <h2 className="px-2.5 pt-2 t-secondary font-semibold text-ink">Other tasks</h2>}
              {unphased.length > 0 && (
                <ul>
                  {unphased.map((t, i) => (
                    <TaskRow key={t.id} project={project} task={t} index={i} count={unphased.length} />
                  ))}
                </ul>
              )}
              <AddTaskInline projectId={project.id} phaseId={null} />
            </section>
          )}
        </div>
      </main>

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
          toast('Project deleted');
          navigate('/projects', { replace: true });
        }}
      />
    </Screen>
  );
}

function PhaseSection({ project, phase, defaultOpen }: { project: Project; phase: Phase; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const tasks = tasksInPhase(project, phase.id);
  const done = tasks.filter((t) => t.status === 'done').length;
  const complete = tasks.length > 0 && done === tasks.length;
  const id = `phase-${phase.id}`;
  return (
    <section className="rounded-2xl border border-line bg-surface">
      <h2>
        <button
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((v) => !v)}
          className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-[17px] font-semibold text-ink">{phase.title}</span>
            {phase.description && open && <span className="mt-0.5 block t-secondary text-ink-2">{phase.description}</span>}
          </span>
          <span className={cx('shrink-0 t-meta font-medium', complete ? 'text-go-strong' : 'text-ink-3')}>
            {complete ? 'Done' : `${done}/${tasks.length}`}
          </span>
          <ChevronDown size={20} className={cx('shrink-0 text-ink-3 transition-transform', open && 'rotate-180')} aria-hidden />
        </button>
      </h2>
      {open && (
        <div id={id} className="px-2 pb-2">
          <ul>
            {tasks.map((t, i) => (
              <TaskRow key={t.id} project={project} task={t} index={i} count={tasks.length} />
            ))}
          </ul>
          <AddTaskInline projectId={project.id} phaseId={phase.id} />
        </div>
      )}
    </section>
  );
}
