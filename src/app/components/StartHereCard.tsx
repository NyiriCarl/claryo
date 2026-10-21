import { useNavigate } from 'react-router';
import { Play, Scissors } from 'lucide-react';
import { Button, DurationLabel } from './ui';
import type { NextAction } from '../lib/progress';

/** The product's key component: one clear, concrete action to start now. */
export function StartHereCard({ projectId, next }: { projectId: string; next: NextAction }) {
  const navigate = useNavigate();
  const { task, parent, isFirst } = next;
  const instruction = task.steps[0] ?? task.description.split(/(?<=[.!?])\s/)[0] ?? '';
  return (
    <section aria-labelledby="start-here-label" className="rounded-2xl border-2 border-brand bg-surface p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between gap-2">
        <span id="start-here-label" className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1 text-[12px] font-bold uppercase tracking-wide text-brand-ink">
          {isFirst ? 'Start here' : 'Next step'}
        </span>
        <DurationLabel minutes={task.estimateMinutes} />
      </div>
      {parent && <p className="mt-3 t-meta text-ink-3">Part of: {parent.title}</p>}
      <h2 className="mt-2 text-[19px] font-semibold leading-snug text-ink">{task.title}</h2>
      {instruction && instruction !== task.title && <p className="mt-1.5 t-secondary text-ink-2">{instruction}</p>}
      <div className="mt-4 flex flex-col gap-2">
        <Button block icon={Play} onClick={() => navigate(`/focus/${projectId}/${task.id}`)}>
          Start now
        </Button>
        <Button block variant="secondary" icon={Scissors} onClick={() => navigate(`/projects/${projectId}/tasks/${task.id}/help?action=breakdown`)}>
          Break this down
        </Button>
      </div>
    </section>
  );
}
