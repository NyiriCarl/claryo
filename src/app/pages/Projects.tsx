import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { FolderOpen, Plus, RotateCcw, Search } from 'lucide-react';
import { Button, EmptyState, ErrorState, Spinner, cx } from '../components/ui';
import { Screen, TopBar } from '../components/Layout';
import { ProjectCard } from '../components/ProjectCard';
import { useProjectList } from '../store/projects';
import { useSession } from '../store/session';
import { syncNow, useSync } from '../sync/sync';
import { progressOf } from '../lib/progress';
import type { ProjectStatus } from '../lib/types';

type Sort = 'recent' | 'name' | 'progress';
const TABS: { key: ProjectStatus; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'archived', label: 'Archived' },
];

/** Screen 12 */
export default function ProjectsPage() {
  const navigate = useNavigate();
  const all = useProjectList();
  const signedIn = useSession((s) => s.status === 'signedIn');
  const sync = useSync();
  const [tab, setTab] = useState<ProjectStatus>('active');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('recent');

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = all.filter((p) => p.status === tab && (!q || p.title.toLowerCase().includes(q) || p.originalGoal.toLowerCase().includes(q)));
    if (sort === 'name') return [...filtered].sort((a, b) => a.title.localeCompare(b.title));
    if (sort === 'progress') return [...filtered].sort((a, b) => (progressOf(b).percent ?? -1) - (progressOf(a).percent ?? -1));
    return filtered;
  }, [all, tab, query, sort]);

  const counts = Object.fromEntries(TABS.map((t) => [t.key, all.filter((p) => p.status === t.key).length]));
  const firstLoad = signedIn && all.length === 0 && sync.status === 'syncing' && !sync.lastSyncedAt;
  const loadFailed = signedIn && all.length === 0 && sync.status === 'error' && !sync.lastSyncedAt;

  return (
    <Screen>
      <TopBar title={<span className="t-section">Projects</span>} actions={<Button size="sm" icon={Plus} onClick={() => navigate('/')}>New</Button>} />
      <main tabIndex={-1} className="flex flex-col gap-4 px-5 pb-6 outline-none">
        {all.length > 3 && (
          <div className="relative">
            <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden />
            <label htmlFor="project-search" className="sr-only">
              Search projects
            </label>
            <input
              id="project-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects"
              className="h-12 w-full rounded-2xl border border-line-strong bg-surface pl-11 pr-4 text-[16px] text-ink outline-none placeholder:text-ink-3 focus:border-brand"
            />
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <div role="tablist" aria-label="Project status" className="flex gap-1 rounded-2xl bg-surface-2 p-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className={cx('min-h-10 rounded-xl px-3 t-secondary font-medium', tab === t.key ? 'bg-surface text-ink shadow-[var(--shadow-card)]' : 'text-ink-2')}
              >
                {t.label}
                {counts[t.key] > 0 && <span className="ml-1 text-ink-3">{counts[t.key]}</span>}
              </button>
            ))}
          </div>
          {list.length > 1 && (
            <>
              <label htmlFor="sort" className="sr-only">
                Sort by
              </label>
              <select
                id="sort"
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                className="h-10 rounded-xl border border-line-strong bg-surface px-2 t-meta text-ink"
              >
                <option value="recent">Recent</option>
                <option value="name">Name</option>
                <option value="progress">Progress</option>
              </select>
            </>
          )}
        </div>

        {firstLoad ? (
          <div className="flex flex-col items-center gap-3 py-12">
            <Spinner label="Loading your projects" />
            <p className="t-secondary text-ink-2">Loading your projects…</p>
          </div>
        ) : loadFailed ? (
          <ErrorState
            title="We couldn't load your projects"
            body={sync.error ?? 'Check your connection and try again.'}
            actions={<Button icon={RotateCcw} onClick={() => void syncNow()}>Try again</Button>}
          />
        ) : list.length > 0 ? (
          <div className="flex flex-col gap-3">
            {list.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        ) : query ? (
          <EmptyState icon={Search} title="No matching projects" body="Try a different word, or check the other tabs." />
        ) : tab === 'active' ? (
          <EmptyState
            icon={FolderOpen}
            title="No projects yet"
            body="Describe a goal and you'll get a plan with a clear first step."
            action={<Button block onClick={() => navigate('/')}>Create a project</Button>}
          />
        ) : (
          <EmptyState icon={FolderOpen} title={tab === 'completed' ? 'No completed projects yet' : 'Nothing archived'} />
        )}
      </main>
    </Screen>
  );
}
