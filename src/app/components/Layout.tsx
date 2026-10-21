import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router';
import { ArrowLeft, BarChart3, CloudOff, FolderOpen, Home, Settings, WifiOff } from 'lucide-react';
import { IconButton, cx } from './ui';
import { useOnline } from '../hooks/useOnline';
import { useSession } from '../store/session';
import { useSync } from '../sync/sync';
import { useProjects } from '../store/projects';

const tabs = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/projects', label: 'Projects', icon: FolderOpen, end: false },
  { to: '/progress', label: 'Progress', icon: BarChart3, end: false },
  { to: '/settings', label: 'Settings', icon: Settings, end: false },
];

export function BottomNav() {
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur safe-bottom">
      <ul className="mx-auto flex max-w-[480px] justify-around px-2 pt-1.5">
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cx(
                  'flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-xl text-[12px] font-medium',
                  isActive ? 'text-brand-text' : 'text-ink-3',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={22} strokeWidth={isActive ? 2.4 : 1.9} aria-hidden />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** App-wide status line: offline, sync problems, save failures, expired session. */
export function StatusStrip() {
  const online = useOnline();
  const signedIn = useSession((s) => s.status === 'signedIn');
  const expired = useSession((s) => s.expired);
  const sync = useSync((s) => s.status);
  const saveError = useProjects((s) => s.saveError);
  const navigate = useNavigate();

  let content: ReactNode = null;
  if (saveError && !saveError.ok) {
    content = (
      <span role="alert">
        {saveError.reason === 'quota'
          ? "Couldn't save: this device's storage is full. Free some space or delete old projects."
          : "Couldn't save on this device. Your browser may be blocking storage (private mode)."}
      </span>
    );
  } else if (expired) {
    content = (
      <button className="w-full text-left underline" onClick={() => navigate('/auth?mode=signin&reason=expired')}>
        Your session expired. Sign in again to keep syncing. Your changes are safe on this device.
      </button>
    );
  } else if (!online) {
    content = (
      <span className="inline-flex items-center gap-2">
        <WifiOff size={16} aria-hidden /> You're offline. Changes are saved on this device{signedIn ? ' and will sync later' : ''}.
      </span>
    );
  } else if (signedIn && sync === 'error') {
    content = (
      <span className="inline-flex items-center gap-2">
        <CloudOff size={16} aria-hidden /> Sync didn't finish. Your changes are safe here; we'll retry.
      </span>
    );
  }
  if (!content) return null;
  return (
    <div role="status" className="sticky top-0 z-30 bg-warn-soft px-5 py-2.5 t-meta font-medium text-warn">
      {content}
    </div>
  );
}

export function TopBar({ title, back, actions, sticky = true }: { title?: ReactNode; back?: string | true; actions?: ReactNode; sticky?: boolean }) {
  const navigate = useNavigate();
  return (
    <header className={cx('z-20 flex min-h-14 items-center gap-1 bg-canvas/95 px-2 backdrop-blur safe-top', sticky && 'sticky top-0')}>
      {back && (
        <IconButton
          icon={ArrowLeft}
          label="Back"
          onClick={() => (back === true ? (window.history.length > 1 ? navigate(-1) : navigate('/')) : navigate(back))}
        />
      )}
      <div className={cx('min-w-0 flex-1 truncate font-semibold text-ink', !back && 'pl-3')}>{title}</div>
      {actions && <div className="flex items-center">{actions}</div>}
    </header>
  );
}

export function Screen({ children, nav = true, className }: { children: ReactNode; nav?: boolean; className?: string }) {
  return (
    <div className="min-h-dvh bg-canvas">
      <div className={cx('mx-auto flex min-h-dvh w-full max-w-[480px] flex-col', nav && 'pb-28', className)}>
        <StatusStrip />
        {children}
      </div>
      {nav && <BottomNav />}
    </div>
  );
}
