import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { BarChart3, CheckCircle2, Play } from 'lucide-react';
import { Button, Card, EmptyState, ProgressBar } from '../components/ui';
import { Screen, TopBar } from '../components/Layout';
import { useProjectList } from '../store/projects';
import { useFocus } from '../store/focus';
import { completionHistory, nextAction, progressOf } from '../lib/progress';
import { shortDate } from '../lib/dates';

/** Screen 13: progress from real task data. No streaks, no rankings. */
export default function ProgressPage() {
  const navigate = useNavigate();
  const all = useProjectList();
  const projects = all.filter((p) => p.status !== 'archived');
  const focusHistory = useFocus((s) => s.history);
  const [selected, setSelected] = useState<string>('all');
  const scope = selected === 'all' ? projects : projects.filter((p) => p.id === selected);

  const totals = useMemo(() => {
    let done = 0, total = 0, phasesDone = 0, phasesTotal = 0;
    for (const p of scope) {
      const pr = progressOf(p);
      done += pr.done;
      total += pr.total;
      phasesDone += pr.phasesDone;
      phasesTotal += pr.phasesTotal;
    }
    return { done, total, phasesDone, phasesTotal, percent: total ? Math.round((done / total) * 100) : null };
  }, [scope]);

  const history = completionHistory(scope, 30);
  const scopeIds = new Set(scope.map((p) => p.id));
  const sessions = focusHistory.filter((r) => scopeIds.has(r.projectId) && r.elapsedSec >= 30);
  const focusMinutes = Math.round(sessions.reduce((a, r) => a + r.elapsedSec, 0) / 60);
  const current = scope.map((p) => ({ p, n: p.status === 'active' ? nextAction(p) : null })).find((x) => x.n);

  const byDay = history.reduce<Record<string, typeof history>>((acc, h) => {
    const d = shortDate(h.completedAt);
    (acc[d] ??= []).push(h);
    return acc;
  }, {});

  if (projects.length === 0) {
    return (
      <Screen>
        <TopBar title={<span className="t-section">Progress</span>} />
        <EmptyState
          icon={BarChart3}
          title="Your progress will show up here"
          body="Create a project and complete a task. Every finished step is counted here."
          action={<Button block onClick={() => navigate('/')}>Create a project</Button>}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <TopBar title={<span className="t-section">Progress</span>} />
      <main tabIndex={-1} className="flex flex-col gap-5 px-5 pb-6 outline-none">
        {projects.length > 1 && (
          <div>
            <label htmlFor="scope" className="sr-only">
              Show progress for
            </label>
            <select
              id="scope"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="h-12 w-full rounded-2xl border border-line-strong bg-surface px-3 t-body text-ink"
            >
              <option value="all">All projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
        )}

        <Card>
          {totals.percent === null ? (
            <p className="t-body text-ink-2">No tasks yet. Add tasks to a project to track progress.</p>
          ) : (
            <>
              <div className="flex items-baseline justify-between">
                <span className="t-title text-ink">{totals.percent}%</span>
                <span className="t-secondary text-ink-2">of tasks done</span>
              </div>
              <div className="mt-3">
                <ProgressBar value={totals.percent} label="Overall progress" tone={totals.percent === 100 ? 'go' : 'brand'} />
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-surface-2 p-3">
                  <dt className="t-meta text-ink-2">Done</dt>
                  <dd className="t-section text-ink">{totals.done}</dd>
                </div>
                <div className="rounded-xl bg-surface-2 p-3">
                  <dt className="t-meta text-ink-2">Remaining</dt>
                  <dd className="t-section text-ink">{totals.total - totals.done}</dd>
                </div>
                <div className="rounded-xl bg-surface-2 p-3">
                  <dt className="t-meta text-ink-2">Phases done</dt>
                  <dd className="t-section text-ink">
                    {totals.phasesDone}
                    {totals.phasesTotal ? <span className="t-secondary text-ink-3">/{totals.phasesTotal}</span> : null}
                  </dd>
                </div>
              </dl>
              {sessions.length > 0 && (
                <p className="mt-3 t-meta text-ink-2">
                  {sessions.length} focus {sessions.length === 1 ? 'session' : 'sessions'} on this device, about {focusMinutes} min in total.
                </p>
              )}
            </>
          )}
        </Card>

        {current?.n && (
          <Card>
            <p className="t-meta font-semibold uppercase tracking-wide text-brand-text">Recommended next</p>
            <p className="mt-1 t-meta text-ink-3">{current.p.title}</p>
            <p className="mt-0.5 text-[17px] font-semibold text-ink">{current.n.task.title}</p>
            <Button size="sm" className="mt-3" icon={Play} onClick={() => navigate(`/focus/${current.p.id}/${current.n!.task.id}`)}>
              Start now
            </Button>
          </Card>
        )}

        {selected === 'all' && projects.length > 1 && (
          <section aria-labelledby="by-project">
            <h2 id="by-project" className="mb-2 t-meta font-semibold uppercase tracking-wide text-ink-3">
              By project
            </h2>
            <Card className="flex flex-col gap-4">
              {projects.map((p) => {
                const pr = progressOf(p);
                return (
                  <Link key={p.id} to={`/projects/${p.id}`} className="block">
                    <div className="mb-1.5 flex items-baseline justify-between gap-2">
                      <span className="truncate t-secondary font-medium text-ink">{p.title}</span>
                      <span className="shrink-0 t-meta text-ink-3">{pr.total ? `${pr.done}/${pr.total}` : 'No tasks'}</span>
                    </div>
                    {pr.percent !== null && <ProgressBar value={pr.percent} label={`${p.title} progress`} tone={pr.percent === 100 ? 'go' : 'brand'} />}
                  </Link>
                );
              })}
            </Card>
          </section>
        )}

        <section aria-labelledby="history">
          <h2 id="history" className="mb-2 t-meta font-semibold uppercase tracking-wide text-ink-3">
            Recently completed
          </h2>
          {history.length === 0 ? (
            <Card>
              <p className="t-secondary text-ink-2">Nothing completed yet. When you finish a task, it will be listed here.</p>
            </Card>
          ) : (
            <div className="flex flex-col gap-4">
              {Object.entries(byDay).map(([day, items]) => (
                <div key={day}>
                  <h3 className="mb-1 t-meta font-medium text-ink-2">{day}</h3>
                  <ul className="rounded-2xl border border-line bg-surface">
                    {items.map((h) => (
                      <li key={h.task.id} className="flex items-start gap-3 border-b border-line px-4 py-3 last:border-b-0">
                        <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-go-strong" aria-hidden />
                        <div className="min-w-0">
                          <p className="t-secondary text-ink">{h.task.title}</p>
                          {selected === 'all' && <p className="truncate t-meta text-ink-3">{h.project.title}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </Screen>
  );
}
