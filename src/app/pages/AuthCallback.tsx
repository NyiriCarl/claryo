import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Button, ErrorState, Spinner, TextField } from '../components/ui';
import { TopBar } from '../components/Layout';
import { AuthError, useSession } from '../store/session';

/** Handles email confirmation, OAuth and password-recovery redirects. */
export default function AuthCallback() {
  const navigate = useNavigate();
  const { status, recovering, updatePassword } = useSession();
  const [timedOut, setTimedOut] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Errors arrive in the query (PKCE) or the fragment (implicit flow); with hash
  // routing the fragment also holds the route, so look in both.
  const urlError =
    new URLSearchParams(window.location.search).get('error_description') ??
    new URLSearchParams(window.location.hash.replace(/^#\/?[^?&]*[?]?/, '')).get('error_description');

  useEffect(() => {
    if (status === 'signedIn' && !recovering) navigate('/', { replace: true });
  }, [status, recovering, navigate]);

  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 10_000);
    return () => clearTimeout(t);
  }, []);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return setError('Use at least 8 characters.');
    setBusy(true);
    try {
      await updatePassword(password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'Could not update your password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main tabIndex={-1} className="mx-auto min-h-dvh max-w-[480px] bg-canvas outline-none">
      <TopBar back="/" />
      <div className="px-5">
        {recovering ? (
          <form onSubmit={save} className="flex flex-col gap-4 pt-4">
            <h1 className="t-title text-ink">Set a new password</h1>
            <TextField label="New password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} error={error} />
            <Button type="submit" block loading={busy}>
              Save password
            </Button>
          </form>
        ) : urlError || timedOut ? (
          <ErrorState
            title="We couldn't finish signing you in"
            body={urlError ?? 'The link may have expired or already been used.'}
            actions={<Button onClick={() => navigate('/auth?mode=signin', { replace: true })}>Back to sign in</Button>}
          />
        ) : (
          <div className="flex flex-col items-center gap-3 pt-20">
            <Spinner label="Signing you in" />
            <p className="t-secondary text-ink-2">Signing you in…</p>
          </div>
        )}
      </div>
    </main>
  );
}
