import { useEffect, useId, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { ChevronRight, Download, HelpCircle, LogIn, LogOut, MessageSquare, RefreshCw, Shield, Trash2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, ConfirmDialog, Sheet, TextArea, TextField, cx } from '../components/ui';
import { Screen, TopBar } from '../components/Layout';
import { useSession } from '../store/session';
import { usePrefs } from '../store/prefs';
import { useProjects } from '../store/projects';
import { useFocus } from '../store/focus';
import { useAiMode } from '../store/app';
import { hasUnsyncedChanges, syncNow, useSync } from '../sync/sync';
import { fetchUsage, type Usage } from '../lib/aiClient';
import { api, ApiError } from '../lib/api';
import { relativeTime } from '../lib/dates';
import { clearAppStorage } from '../lib/storage';
import { brand } from '../../brand.config';
import { config } from '../config';
import type { Prefs } from '../lib/types';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title}>
      <h2 className="mb-2 px-1 t-meta font-semibold uppercase tracking-wide text-ink-3">{title}</h2>
      <div className="overflow-hidden rounded-2xl border border-line bg-surface">{children}</div>
    </section>
  );
}

function Row({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('flex min-h-14 items-center gap-3 border-b border-line px-4 py-2 last:border-b-0', className)}>{children}</div>;
}

function LinkRow({ to, icon: Icon, label, onClick, destructive }: { to?: string; icon: typeof Shield; label: string; onClick?: () => void; destructive?: boolean }) {
  const inner = (
    <>
      <Icon size={20} aria-hidden className={destructive ? 'text-danger' : 'text-ink-2'} />
      <span className={cx('flex-1 text-left t-body', destructive ? 'text-danger' : 'text-ink')}>{label}</span>
      {to && <ChevronRight size={18} className="text-ink-3" aria-hidden />}
    </>
  );
  const cls = 'flex min-h-14 w-full items-center gap-3 border-b border-line px-4 last:border-b-0 hover:bg-surface-2';
  return to ? (
    <Link to={to} className={cls}>
      {inner}
    </Link>
  ) : (
    <button onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

function Switch({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  const id = useId();
  return (
    <Row>
      <div className="flex-1">
        <span className="t-body text-ink" id={id}>
          {label}
        </span>
        {description && <p className="t-meta text-ink-3">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={id}
        onClick={() => onChange(!checked)}
        className="flex h-11 w-14 shrink-0 items-center"
      >
        {/* The button is a 44px touch target; the visible track sits inside it. left-0 anchors the knob to the track. */}
        <span aria-hidden data-track className={cx('relative h-8 w-14 rounded-full transition-colors', checked ? 'bg-brand' : 'bg-line-strong')}>
          <span data-knob className={cx('absolute left-0 top-1 h-6 w-6 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-7' : 'translate-x-1')} />
        </span>
      </button>
    </Row>
  );
}

function Segmented<T extends string | number | null>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1 rounded-xl bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={String(o.value)}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx('min-h-11 min-w-11 flex-1 rounded-lg px-1 t-secondary font-medium', value === o.value ? 'bg-surface text-ink shadow-[var(--shadow-card)]' : 'text-ink-2')}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function download(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Screen 14 */
export default function SettingsPage() {
  const navigate = useNavigate();
  const session = useSession();
  const { prefs, set: setPrefs } = usePrefs();
  const sync = useSync();
  const aiMode = useAiMode((s) => s.mode);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [name, setName] = useState(prefs.name);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [sending, setSending] = useState(false);
  const signedIn = session.status === 'signedIn';

  useEffect(() => {
    fetchUsage().then(setUsage).catch(() => setUsage(null));
    void useAiMode.getState().load();
  }, [signedIn]);

  const exportData = async () => {
    const { projects } = useProjects.getState();
    const { history } = useFocus.getState();
    let account: unknown = null;
    if (signedIn) {
      try {
        account = await api('/me/export');
      } catch (e) {
        toast.error(`Account data couldn't be included: ${e instanceof Error ? e.message : 'unknown error'}. Exporting this device's data only.`);
      }
    }
    download(`${brand.name.toLowerCase().replace(/\W+/g, '-')}-export-${new Date().toISOString().slice(0, 10)}.json`, {
      exportedAt: new Date().toISOString(),
      device: { projects: Object.values(projects), focusSessions: history, preferences: prefs },
      account,
    });
    toast('Export downloaded');
  };

  const wipeDevice = () => {
    useProjects.getState().resetLocal();
    useFocus.getState().clearAll();
    clearAppStorage();
  };

  const signOut = async () => {
    await session.signOut();
    // Account data is removed from this device on sign-out (shared-device privacy).
    wipeDevice();
    usePrefs.getState().markWelcomeSeen();
    setConfirmSignOut(false);
    toast('Signed out');
    navigate('/', { replace: true });
  };

  const deleteEverything = async () => {
    setDeleting(true);
    try {
      if (signedIn) await api('/me', { method: 'DELETE' });
      wipeDevice();
      if (signedIn) await session.signOut();
      setConfirmDelete(false);
      toast(signedIn ? 'Your account and data were deleted' : 'All data on this device was deleted');
      window.location.assign(config.hashRouter ? '#/welcome' : '/welcome');
      if (config.hashRouter) window.location.reload();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't delete your account. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const sendFeedback = async () => {
    if (!feedback.trim()) return;
    setSending(true);
    try {
      await api('/feedback', { method: 'POST', body: { text: feedback.trim() } });
      toast('Thanks for the feedback');
      setFeedback('');
      setFeedbackOpen(false);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't send. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const syncLabel =
    sync.status === 'syncing' ? 'Syncing…' :
    sync.status === 'offline' ? 'Offline. Changes will sync when you reconnect.' :
    sync.status === 'error' ? "Last sync didn't finish." :
    sync.lastSyncedAt ? `Synced ${relativeTime(sync.lastSyncedAt)}` : 'Not synced yet';

  return (
    <Screen>
      <TopBar title={<span className="t-section">Settings</span>} />
      <main tabIndex={-1} className="flex flex-col gap-6 px-5 pb-8 outline-none">
        <Section title="Account">
          {signedIn ? (
            <>
              <Row>
                <div className="min-w-0 flex-1">
                  <p className="t-meta text-ink-3">Signed in as</p>
                  <p className="truncate t-body text-ink">{session.user?.email}</p>
                </div>
              </Row>
              <Row>
                <p className="flex-1 t-secondary text-ink-2" aria-live="polite">{syncLabel}</p>
                <Button size="sm" variant="secondary" icon={RefreshCw} onClick={() => void syncNow()} disabled={sync.status === 'syncing'}>
                  Sync now
                </Button>
              </Row>
              <LinkRow icon={LogOut} label="Sign out" onClick={() => setConfirmSignOut(true)} />
            </>
          ) : (
            <>
              <Row className="!items-start py-4">
                <p className="t-secondary text-ink-2">
                  You're using {brand.name} as a guest. Your projects are saved only on this device{config.authProvider !== 'none' ? '. Create a free account to keep them safe and use them on other devices.' : '.'}
                </p>
              </Row>
              {config.authProvider !== 'none' && (
                <Row className="flex-wrap gap-2 py-3">
                  <Button size="sm" className="flex-1 whitespace-nowrap" onClick={() => navigate('/auth?mode=signup')}>
                    Create account
                  </Button>
                  <Button size="sm" variant="secondary" icon={LogIn} className="flex-1 whitespace-nowrap" onClick={() => navigate('/auth?mode=signin')}>
                    Sign in
                  </Button>
                </Row>
              )}
            </>
          )}
        </Section>

        <Section title="Profile">
          <form
            className="p-4"
            onSubmit={(e) => {
              e.preventDefault();
              setPrefs({ name: name.trim().slice(0, 60) });
              toast('Saved');
            }}
          >
            <TextField label="What should we call you?" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} onBlur={() => name !== prefs.name && setPrefs({ name: name.trim().slice(0, 60) })} hint="Used for the greeting on Home. Optional." />
          </form>
        </Section>

        <Section title="Preferences">
          <div className="border-b border-line p-4">
            <p className="mb-2 t-body text-ink">Theme</p>
            <Segmented<Prefs['theme']>
              label="Theme"
              value={prefs.theme}
              onChange={(v) => setPrefs({ theme: v })}
              options={[
                { value: 'system', label: 'System' },
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
              ]}
            />
          </div>
          <div className="border-b border-line p-4">
            <p className="mb-2 t-body text-ink">Default focus timer</p>
            <Segmented<number | null>
              label="Default focus timer"
              value={prefs.defaultTimerMinutes}
              onChange={(v) => setPrefs({ defaultTimerMinutes: v })}
              options={[
                { value: 5, label: '5' },
                { value: 10, label: '10' },
                { value: 15, label: '15' },
                { value: 25, label: '25' },
                { value: null, label: 'None' },
              ]}
            />
          </div>
          <Switch label="Sound when focus time is up" checked={prefs.focusSound} onChange={(v) => setPrefs({ focusSound: v })} />
          <Switch label="Reduce motion" description="Also follows your device setting." checked={prefs.reduceMotion} onChange={(v) => setPrefs({ reduceMotion: v })} />
        </Section>

        <Section title="Notifications">
          <Row className="py-4">
            <p className="t-secondary text-ink-2">Reminders and notifications aren't available in this version. Nothing is sent to your device.</p>
          </Row>
        </Section>

        <Section title="AI planning">
          <Row className="!items-start py-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="t-body text-ink">Planning service</span>
                {aiMode === 'live' && <Badge tone="brand">AI connected</Badge>}
                {aiMode === 'demo' && <Badge tone="warn">Demo mode</Badge>}
                {aiMode === 'unknown' && <Badge>Unavailable</Badge>}
              </div>
              <p className="mt-1 t-secondary text-ink-2">
                {aiMode === 'demo'
                  ? 'Plans and suggestions come from built-in templates, not AI. They are labelled “Demo” wherever they appear.'
                  : aiMode === 'live'
                    ? 'Your goal and task text are sent to an AI provider to create plans and suggestions. AI can make mistakes, so check anything important.'
                    : "We couldn't reach the planning service. You can still create and manage projects yourself."}
              </p>
              {usage && usage.plans.limit > 0 && (
                <p className="mt-2 t-meta text-ink-3">
                  Today: {usage.plans.used} of {usage.plans.limit} new plans, {usage.simplify.used} of {usage.simplify.limit} task suggestions. Limits reset daily (UTC).
                </p>
              )}
            </div>
          </Row>
        </Section>

        <Section title="Privacy and data">
          <LinkRow to="/settings/privacy" icon={Shield} label="Privacy notice" />
          <LinkRow to="/settings/terms" icon={FileText} label="Terms of use" />
          <LinkRow icon={Download} label="Export my data" onClick={() => void exportData()} />
          <LinkRow icon={Trash2} label={signedIn ? 'Delete my account' : 'Delete all data on this device'} destructive onClick={() => setConfirmDelete(true)} />
        </Section>

        <Section title="Help and support">
          <LinkRow to="/settings/help" icon={HelpCircle} label="Help" />
          <LinkRow icon={MessageSquare} label="Send feedback" onClick={() => setFeedbackOpen(true)} />
          {brand.supportEmail && (
            <Row>
              <a className="t-body text-brand-text underline" href={`mailto:${brand.supportEmail}`}>
                {brand.supportEmail}
              </a>
            </Row>
          )}
        </Section>

        <p className="text-center t-meta text-ink-3">
          {brand.name} · version {import.meta.env.VITE_APP_VERSION || '0.1.0'} (MVP)
        </p>
      </main>

      <ConfirmDialog
        open={confirmSignOut}
        onOpenChange={setConfirmSignOut}
        title="Sign out?"
        body={
          hasUnsyncedChanges()
            ? 'Some changes haven’t synced to your account yet and will be lost if you sign out now. Connect to the internet and tap “Sync now” first.'
            : 'Your projects stay in your account. They will be removed from this device.'
        }
        confirmLabel="Sign out"
        destructive={hasUnsyncedChanges()}
        onConfirm={() => void signOut()}
      />
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={signedIn ? 'Delete your account?' : 'Delete all data on this device?'}
        body={
          signedIn
            ? 'This permanently deletes your account, all projects, tasks and settings from our servers and this device. Export your data first if you want a copy. This can’t be undone.'
            : 'This permanently deletes all projects, tasks and settings stored on this device. This can’t be undone.'
        }
        confirmLabel={signedIn ? 'Delete account' : 'Delete data'}
        destructive
        busy={deleting}
        onConfirm={() => void deleteEverything()}
      />
      <Sheet open={feedbackOpen} onOpenChange={setFeedbackOpen} title="Send feedback" description="What's working, what's confusing, what's missing?">
        <div className="flex flex-col gap-3">
          <TextArea label="Your feedback" hideLabel rows={5} maxLength={2000} value={feedback} onChange={(e) => setFeedback(e.target.value)} />
          <p className="t-meta text-ink-3">Please don't include passwords or sensitive personal information.</p>
          <Button block onClick={() => void sendFeedback()} loading={sending} disabled={!feedback.trim()}>
            Send
          </Button>
        </div>
      </Sheet>
    </Screen>
  );
}
