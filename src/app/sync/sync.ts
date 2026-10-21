// Sync between this device and the signed-in account.
//
// Strategy: each project is one document with a server version number.
// - Edits are saved on the device first and pushed with the version they were
//   based on. The server rejects a push if someone else changed it since.
// - On a conflict nothing is thrown away: the server copy is kept under the
//   original project, and this device's edits are saved as a separate
//   "(copy from this device)" project for the person to compare.
// - Deletions travel as tombstones. A deletion that races with an edit made
//   elsewhere loses (the edited project is restored), so work isn't lost.
import { create } from 'zustand';
import { api, ApiError } from '../lib/api';
import { newId } from '../lib/ids';
import type { Project } from '../lib/types';
import { useProjects } from '../store/projects';
import { useSession } from '../store/session';
import { usePrefs } from '../store/prefs';

export type SyncStatus = 'local' | 'synced' | 'syncing' | 'offline' | 'error';

interface SyncState {
  status: SyncStatus;
  lastSyncedAt: string | null;
  error: string | null;
  /** Messages about conflicts resolved during sync, shown once. */
  notices: string[];
  clearNotices(): void;
}

export const useSync = create<SyncState>()((set) => ({
  status: 'local',
  lastSyncedAt: null,
  error: null,
  notices: [],
  clearNotices: () => set({ notices: [] }),
}));

interface RemoteProject {
  id: string;
  version: number;
  updatedAt: string;
  deleted: boolean;
  data: Project | null;
}

const notice = (msg: string) => useSync.setState((s) => ({ notices: [...s.notices, msg] }));

function saveLocalCopy(local: Project) {
  const copy: Project = { ...local, id: newId(), title: `${local.title} (copy from this device)`.slice(0, 120) };
  useProjects.getState().addProject(copy);
}

/** Resolve a push conflict using the server's current copy. */
function resolveConflict(local: Project | undefined, server: RemoteProject | null) {
  const store = useProjects.getState();
  if (!server || server.deleted || !server.data) {
    // Deleted (or purged) elsewhere while we edited here: keep our copy by re-creating it.
    if (local) {
      store.setMeta(local.id, { baseVersion: server?.version ?? null, dirty: true });
      notice(`"${local.title}" was deleted on another device. Your copy on this device was kept.`);
    }
    return;
  }
  if (local) saveLocalCopy(local);
  store.applyRemote(server.id, server.data, server.version);
  if (local) notice(`"${server.data.title}" was changed on another device. We kept both versions.`);
  else notice(`"${server.data.title}" was changed on another device, so it wasn't deleted.`);
}

async function pull() {
  const { projects: remote } = await api<{ projects: RemoteProject[] }>('/me/projects');
  const remoteIds = new Set(remote.map((r) => r.id));
  for (const r of remote) {
    const { projects, meta, applyRemote, setMeta } = useProjects.getState();
    const local = projects[r.id];
    const m = meta[r.id];
    if (r.deleted) {
      if (local && m?.dirty) resolveConflict(local, r);
      else if (local) applyRemote(r.id, null, r.version);
      else if (m) setMeta(r.id, null);
      continue;
    }
    if (!local) {
      if (!m?.pendingDelete) applyRemote(r.id, r.data, r.version);
      continue;
    }
    if (m?.dirty) {
      if (m.baseVersion !== r.version) resolveConflict(local, r);
    } else if (m?.baseVersion !== r.version) {
      applyRemote(r.id, r.data, r.version);
    }
  }
  // Uploaded before but missing on the server now: upload again as new.
  const { meta, setMeta } = useProjects.getState();
  for (const [id, m] of Object.entries(meta)) {
    if (m.baseVersion != null && !remoteIds.has(id)) {
      if (m.pendingDelete) setMeta(id, null);
      else setMeta(id, { baseVersion: null, dirty: true });
    }
  }
}

async function push() {
  const ids = Object.entries(useProjects.getState().meta)
    .filter(([, m]) => m.dirty || m.pendingDelete)
    .map(([id]) => id);
  for (const id of ids) {
    const { projects, meta, setMeta } = useProjects.getState();
    const m = meta[id];
    if (!m) continue;
    try {
      if (m.pendingDelete) {
        await api(`/me/projects/${id}?baseVersion=${m.baseVersion}`, { method: 'DELETE' });
        setMeta(id, null);
        continue;
      }
      const local = projects[id];
      if (!local) {
        setMeta(id, null);
        continue;
      }
      const sentAt = local.updatedAt;
      const res = await api<{ version: number }>(`/me/projects/${id}`, {
        method: 'PUT',
        body: { baseVersion: m.baseVersion, project: local },
      });
      // If the project was edited while uploading, keep it marked for the next push.
      const now = useProjects.getState().projects[id];
      setMeta(id, { baseVersion: res.version, dirty: !!now && now.updatedAt !== sentAt });
    } catch (e) {
      if (e instanceof ApiError && e.code === 'conflict') {
        if (m.pendingDelete) useProjects.getState().setMeta(id, null);
        resolveConflict(m.pendingDelete ? undefined : useProjects.getState().projects[id], e.body?.server ?? null);
        continue;
      }
      throw e;
    }
  }
}

async function syncProfile(direction: 'pull' | 'push') {
  if (direction === 'pull') {
    const { profile } = await api<{ profile: { name: string; prefs: Record<string, unknown> } }>('/me/profile');
    const remote = { ...(profile.prefs ?? {}), ...(profile.name ? { name: profile.name } : {}) };
    if (Object.keys(remote).length) usePrefs.getState().replace(remote);
    else await syncProfile('push');
  } else {
    const { prefs } = usePrefs.getState();
    const { name, ...rest } = prefs;
    await api('/me/profile', { method: 'PUT', body: { name, prefs: rest } });
  }
}

let running = false;
let again = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let failures = 0;

export async function syncNow(): Promise<void> {
  if (useSession.getState().status !== 'signedIn' || useSession.getState().expired) {
    useSync.setState({ status: 'local' });
    return;
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    useSync.setState({ status: 'offline' });
    return;
  }
  if (running) {
    again = true;
    return;
  }
  running = true;
  useSync.setState({ status: 'syncing', error: null });
  try {
    await pull();
    await push();
    failures = 0;
    useSync.setState({ status: 'synced', lastSyncedAt: new Date().toISOString(), error: null });
  } catch (e) {
    const offline = e instanceof ApiError && e.code === 'offline';
    failures++;
    useSync.setState({
      status: offline ? 'offline' : 'error',
      error: e instanceof Error ? e.message : 'Sync failed.',
    });
    if (!offline && !(e instanceof ApiError && e.code === 'session_expired')) {
      // Back off: 5s, 15s, 45s … up to 5 minutes.
      if (retryTimer) clearTimeout(retryTimer);
      retryTimer = setTimeout(() => void syncNow(), Math.min(300_000, 5000 * 3 ** (failures - 1)));
    }
  } finally {
    running = false;
    if (again) {
      again = false;
      void syncNow();
    }
  }
}

/** True when local changes haven't reached the account yet. */
export function hasUnsyncedChanges(): boolean {
  return Object.values(useProjects.getState().meta).some((m) => m.dirty || m.pendingDelete);
}

let started = false;
export function startSync() {
  if (started) return;
  started = true;
  let debounce: ReturnType<typeof setTimeout> | null = null;
  const schedule = (ms = 1500) => {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(() => void syncNow(), ms);
  };

  useProjects.subscribe((s, prev) => {
    if (s.revision !== prev.revision) schedule();
  });

  let prefsDebounce: ReturnType<typeof setTimeout> | null = null;
  usePrefs.subscribe((s, prev) => {
    if (s.revision === prev.revision || useSession.getState().status !== 'signedIn') return;
    if (prefsDebounce) clearTimeout(prefsDebounce);
    prefsDebounce = setTimeout(() => void syncProfile('push').catch(() => undefined), 1500);
  });

  useSession.subscribe((s, prev) => {
    if (s.status === prev.status && s.expired === prev.expired) return;
    if (s.status === 'signedIn' && !s.expired) {
      const hadLocal = Object.values(useProjects.getState().meta).some((m) => m.baseVersion == null);
      void syncProfile('pull').catch(() => undefined);
      void syncNow().then(() => {
        if (hadLocal && useSync.getState().status === 'synced' && prev.status === 'guest') {
          notice('Projects on this device are now saved to your account.');
        }
      });
    } else {
      useSync.setState({ status: 'local' });
    }
  });

  window.addEventListener('online', () => void syncNow());
  window.addEventListener('offline', () => {
    if (useSession.getState().status === 'signedIn') useSync.setState({ status: 'offline' });
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') schedule(200);
  });

  if (useSession.getState().status === 'signedIn') void syncNow();
}
