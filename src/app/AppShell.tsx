import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { Toaster, toast } from 'sonner';
import { LogoMark, Wordmark } from './components/Logo';
import { useSession } from './store/session';
import { applyTheme, usePrefs } from './store/prefs';
import { startSync, useSync } from './sync/sync';

/** Splash (Screen 01): shown only while the session is being restored. */
function Splash() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-canvas" aria-busy="true">
      <LogoMark size={56} />
      <Wordmark size={22} />
      <span className="sr-only">Loading</span>
    </div>
  );
}

export function AppShell() {
  const status = useSession((s) => s.status);
  const init = useSession((s) => s.init);
  const prefs = usePrefs((s) => s.prefs);
  const seenWelcome = usePrefs((s) => s.seenWelcome);
  const notices = useSync((s) => s.notices);
  const location = useLocation();

  useEffect(() => {
    void init().then(startSync);
  }, [init]);

  useEffect(() => {
    applyTheme(prefs);
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme(usePrefs.getState().prefs);
    mq?.addEventListener('change', onChange);
    return () => mq?.removeEventListener('change', onChange);
  }, [prefs]);

  useEffect(() => {
    if (!notices.length) return;
    notices.forEach((n) => toast(n, { duration: 6000 }));
    useSync.getState().clearNotices();
  }, [notices]);

  // Keep focus sensible after navigation for screen-reader and keyboard users.
  useEffect(() => {
    const main = document.querySelector('main');
    if (main instanceof HTMLElement) main.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [location.pathname]);

  if (status === 'loading') return <Splash />;
  if (location.pathname === '/' && status === 'guest' && !seenWelcome) return <Navigate to="/welcome" replace />;

  return (
    <>
      <Outlet />
      <Toaster position="top-center" theme={prefs.theme === 'system' ? 'system' : prefs.theme} closeButton offset={16} />
    </>
  );
}
