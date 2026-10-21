import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { MailCheck } from 'lucide-react';
import { Button, Notice, TextField } from '../components/ui';
import { Lockup } from '../components/Logo';
import { TopBar } from '../components/Layout';
import { AuthError, useSession } from '../store/session';
import { config } from '../config';

type Mode = 'signin' | 'signup' | 'reset';
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Screen 03: create account / sign in / password recovery. */
export default function AuthPage() {
  const [params, setParams] = useSearchParams();
  const mode = (params.get('mode') as Mode) || 'signup';
  const expired = params.get('reason') === 'expired';
  const navigate = useNavigate();
  const { signIn, signUp, signInWithGoogle, sendPasswordReset } = useSession();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<null | 'confirm' | 'reset'>(null);

  const setMode = (m: Mode) => {
    setErrors({});
    setSent(null);
    setParams({ mode: m }, { replace: true });
  };

  const validate = () => {
    const e: typeof errors = {};
    if (!EMAIL.test(email.trim())) e.email = 'Enter a valid email address.';
    if (mode !== 'reset') {
      if (!password) e.password = 'Enter your password.';
      else if (mode === 'signup' && password.length < 8) e.password = 'Use at least 8 characters.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (busy || !validate()) return;
    setBusy(true);
    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password);
        navigate('/', { replace: true });
      } else if (mode === 'signup') {
        const { needsConfirmation } = await signUp(email.trim(), password);
        if (needsConfirmation) setSent('confirm');
        else navigate('/', { replace: true });
      } else {
        await sendPasswordReset(email.trim());
        setSent('reset');
      }
    } catch (e) {
      setErrors({ form: e instanceof AuthError ? e.message : 'Something went wrong. Please try again.' });
    } finally {
      setBusy(false);
    }
  };

  const heading = mode === 'signin' ? 'Welcome back' : mode === 'signup' ? 'Create your account' : 'Reset your password';
  const sub =
    mode === 'signin'
      ? 'Sign in to sync your projects across devices.'
      : mode === 'signup'
        ? 'Save your projects to your account and use them on any device.'
        : "Enter your email and we'll send you a link to set a new password.";

  if (config.authProvider === 'none') {
    return (
      <main tabIndex={-1} className="mx-auto min-h-dvh max-w-[480px] bg-canvas outline-none">
        <TopBar back="/" />
        <div className="px-5">
          <Notice>Accounts aren't enabled in this build. Your projects are saved on this device.</Notice>
        </div>
      </main>
    );
  }

  if (sent) {
    return (
      <main tabIndex={-1} className="mx-auto flex min-h-dvh max-w-[480px] flex-col bg-canvas outline-none">
        <TopBar back="/" />
        <div className="flex flex-1 flex-col items-center px-6 pt-10 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand-text">
            <MailCheck size={26} aria-hidden />
          </div>
          <h1 className="t-title text-ink">Check your email</h1>
          <p className="mt-2 t-body text-ink-2">
            {sent === 'confirm'
              ? `We sent a confirmation link to ${email}. Open it on this device to finish creating your account.`
              : `If an account exists for ${email}, you'll get a link to set a new password.`}
          </p>
          <Button variant="secondary" className="mt-6" onClick={() => setMode('signin')}>
            Back to sign in
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main tabIndex={-1} className="mx-auto flex min-h-dvh max-w-[480px] flex-col bg-canvas outline-none">
      <TopBar back={true} />
      <div className="flex-1 px-5 pb-8">
        <Lockup size={28} />
        <h1 className="mt-6 t-title text-ink">{heading}</h1>
        <p className="mt-1.5 t-body text-ink-2">{sub}</p>

        {expired && (
          <div className="mt-4">
            <Notice tone="warn">Your session expired. Sign in again. Changes you made meanwhile are still on this device.</Notice>
          </div>
        )}
        {config.authProvider === 'dev' && (
          <div className="mt-4">
            <Notice tone="warn">Development sign-in: any email works and no password is checked. Not for production.</Notice>
          </div>
        )}

        <form noValidate onSubmit={submit} className="mt-6 flex flex-col gap-4">
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
          />
          {mode !== 'reset' && (
            <TextField
              label="Password"
              type="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              hint={mode === 'signup' ? 'At least 8 characters.' : undefined}
            />
          )}
          {errors.form && (
            <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 t-secondary text-danger">
              {errors.form}
            </p>
          )}
          <Button type="submit" block loading={busy}>
            {mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
          </Button>
        </form>

        {config.googleSignIn && mode !== 'reset' && config.authProvider === 'supabase' && (
          <Button
            variant="secondary"
            block
            className="mt-3"
            onClick={() => signInWithGoogle().catch((e) => setErrors({ form: e.message }))}
          >
            Continue with Google
          </Button>
        )}

        <div className="mt-6 flex flex-col items-center gap-1 t-secondary">
          {mode === 'signin' && (
            <>
              {config.authProvider === 'supabase' && (
                <button className="min-h-11 font-medium text-brand-text" onClick={() => setMode('reset')}>
                  Forgot your password?
                </button>
              )}
              <button className="min-h-11 font-medium text-brand-text" onClick={() => setMode('signup')}>
                New here? Create an account
              </button>
            </>
          )}
          {mode === 'signup' && (
            <button className="min-h-11 font-medium text-brand-text" onClick={() => setMode('signin')}>
              Already have an account? Sign in
            </button>
          )}
          {mode === 'reset' && (
            <button className="min-h-11 font-medium text-brand-text" onClick={() => setMode('signin')}>
              Back to sign in
            </button>
          )}
          <Link to="/" className="min-h-11 inline-flex items-center text-ink-2 underline">
            Continue without an account
          </Link>
        </div>

        <p className="mt-6 text-center t-meta text-ink-3">
          By continuing you agree to the <Link to="/settings/terms" className="underline">Terms</Link> and{' '}
          <Link to="/settings/privacy" className="underline">Privacy notice</Link>.
        </p>
      </div>
    </main>
  );
}
