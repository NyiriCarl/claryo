import { useState, FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Eye, EyeOff, Zap, ArrowRight, Mail, Lock, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

// ─── Static sub-components (defined OUTSIDE Auth so React never remounts them) ──

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

// Shell is hoisted outside Auth — if it were inside, every state change (e.g.
// typing a character) would create a new component reference, causing React to
// unmount/remount the whole tree and kill input focus on every keystroke.
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex justify-center" style={{ background: '#07060F' }}>
      <div
        className="relative w-full max-w-[430px] min-h-screen flex flex-col overflow-hidden"
        style={{ background: '#0D0B1E', fontFamily: 'Inter, sans-serif' }}
      >
        {/* Top ambient glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none"
          style={{
            width: '340px',
            height: '340px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(79,70,229,0.2) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
        {/* Bottom glow */}
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-none"
          style={{
            width: '280px',
            height: '200px',
            background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)',
            filter: 'blur(50px)',
          }}
        />
        <div className="relative flex-1 flex flex-col">{children}</div>
      </div>
    </div>
  );
}

type Mode = 'signin' | 'signup' | 'forgot';

function getFriendlyAuthError(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : fallback;
  if (
    message.toLowerCase().includes('failed to fetch') ||
    message.toLowerCase().includes('network')
  ) {
    return 'Unable to reach the sign-in service. Check your connection and try again.';
  }
  return message;
}

// ─── Main Auth component ───────────────────────────────────────────────────────

export default function Auth() {
  const navigate = useNavigate();
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword, user, loading } = useAuthStore();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [error, setError] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // Redirect already-authenticated users
  useEffect(() => {
    if (!loading && user) {
      const onboarded = localStorage.getItem('claryo_onboarded');
      navigate(onboarded ? '/' : '/onboarding', { replace: true });
    }
  }, [user, loading, navigate]);

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      const { error: authError } = await signInWithGoogle();
      if (authError) throw authError;
      // signInWithGoogle calls window.location.assign() — page navigates away
    } catch (err: unknown) {
      const msg = getFriendlyAuthError(err, 'Google sign-in failed');
      const friendlyMsg = msg.toLowerCase().includes('provider')
        ? 'Google sign-in is not enabled. Please use email/password instead.'
        : msg;
      setError(friendlyMsg);
      toast.error(friendlyMsg);
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoadingAuth(true);
    setError('');
    try {
      if (mode === 'signin') {
        const { error: authError } = await signInWithEmail(email.trim(), password);
        if (authError) throw authError;
      } else {
        const { data, error: authError } = await signUpWithEmail(email.trim(), password);
        if (authError) throw authError;
        if (data.session) {
          const isNew = !localStorage.getItem('claryo_onboarded');
          navigate(isNew ? '/onboarding' : '/', { replace: true });
        } else {
          setVerificationSent(true);
        }
      }
    } catch (err: unknown) {
      const msg = getFriendlyAuthError(err, 'Authentication failed');
      setError(msg);
    } finally {
      setLoadingAuth(false);
    }
  };

  const handleModeSwitch = (m: Mode) => {
    setMode(m);
    setError('');
  };

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setResetLoading(true);
    setError('');
    try {
      const { error: authError } = await resetPassword(email.trim());
      if (authError) throw authError;
      setResetSent(true);
    } catch (err: unknown) {
      const msg = getFriendlyAuthError(err, 'Failed to send reset email');
      setError(msg);
    } finally {
      setResetLoading(false);
    }
  };

  // ─── Email verification screen ─────────────────────────────────────────────

  if (verificationSent) {
    return (
      <Shell>
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 220, damping: 20 }}
            className="w-full text-center"
          >
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{
                background: 'rgba(79,70,229,0.12)',
                border: '2px solid rgba(79,70,229,0.35)',
                boxShadow: '0 0 32px rgba(79,70,229,0.18)',
              }}
            >
              <Mail size={34} color="#4F46E5" />
            </div>
            <h2 style={{ color: '#F8FAFC', fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 10 }}>
              Check your email
            </h2>
            <p style={{ color: '#94A3B8', fontSize: 15, lineHeight: 1.65, marginBottom: 36 }}>
              We sent a confirmation link to{' '}
              <span style={{ color: '#A5B4FC', fontWeight: 600 }}>{email}</span>.<br />
              Click it to activate your account.
            </p>
            <button
              onClick={() => setVerificationSent(false)}
              className="w-full py-4 rounded-2xl transition-all active:scale-[0.97]"
              style={{
                background: 'rgba(79,70,229,0.12)',
                border: '1px solid rgba(79,70,229,0.3)',
                color: '#A5B4FC',
                fontSize: 15,
                fontWeight: 600,
              }}
            >
              Back to sign in
            </button>
          </motion.div>
        </div>
      </Shell>
    );
  }

  // ─── Forgot password — success screen ─────────────────────────────────────

  if (resetSent) {
    return (
      <Shell>
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 220, damping: 20 }}
            className="w-full text-center"
          >
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{
                background: 'rgba(34,197,94,0.1)',
                border: '2px solid rgba(34,197,94,0.35)',
                boxShadow: '0 0 32px rgba(34,197,94,0.15)',
              }}
            >
              <Mail size={34} color="#22C55E" />
            </div>
            <h2 style={{ color: '#F8FAFC', fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 10 }}>
              Reset link sent
            </h2>
            <p style={{ color: '#94A3B8', fontSize: 15, lineHeight: 1.65, marginBottom: 36 }}>
              We sent a password reset link to{' '}
              <span style={{ color: '#A5B4FC', fontWeight: 600 }}>{email}</span>.<br />
              Check your inbox and follow the link.
            </p>
            <button
              onClick={() => { setResetSent(false); setMode('signin'); setError(''); }}
              className="w-full py-4 rounded-2xl transition-all active:scale-[0.97]"
              style={{
                background: 'rgba(79,70,229,0.12)',
                border: '1px solid rgba(79,70,229,0.3)',
                color: '#A5B4FC',
                fontSize: 15,
                fontWeight: 600,
              }}
            >
              Back to sign in
            </button>
          </motion.div>
        </div>
      </Shell>
    );
  }

  // ─── Forgot password — input screen ───────────────────────────────────────

  if (mode === 'forgot') {
    return (
      <Shell>
        <div className="flex-1 flex flex-col justify-center px-6 py-10">

          {/* Brand */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center mb-10"
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{
                background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                boxShadow: '0 8px 36px rgba(79,70,229,0.45)',
              }}
            >
              <Zap size={30} color="#fff" fill="#fff" />
            </div>
            <h1 style={{ color: '#F8FAFC', fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 6 }}>
              Reset password
            </h1>
            <p style={{ color: '#94A3B8', fontSize: 14, textAlign: 'center', lineHeight: 1.6 }}>
              Enter your email and we'll send you<br />a link to reset your password.
            </p>
          </motion.div>

          {/* Form */}
          <motion.form
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onSubmit={handleForgotPassword}
            className="flex flex-col gap-3"
            noValidate
          >
            {/* Email input */}
            <div
              className="flex items-center gap-3 rounded-2xl px-4"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: `1.5px solid ${email ? 'rgba(79,70,229,0.55)' : 'rgba(255,255,255,0.09)'}`,
                transition: 'border-color 0.2s, box-shadow 0.2s',
                boxShadow: email ? '0 0 0 3px rgba(79,70,229,0.1)' : 'none',
              }}
            >
              <Mail size={15} color="#94A3B8" style={{ flexShrink: 0 }} />
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                placeholder="Email address"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="flex-1 bg-transparent outline-none py-4"
                style={{ color: '#F8FAFC', fontSize: 15, minWidth: 0 }}
              />
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl overflow-hidden"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.22)' }}
                >
                  <AlertCircle size={13} color="#EF4444" style={{ flexShrink: 0 }} />
                  <p style={{ color: '#EF4444', fontSize: 13, fontWeight: 500 }}>{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <button
              type="submit"
              disabled={resetLoading || !email.trim()}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl transition-all active:scale-[0.97] mt-1"
              style={{
                background: email.trim() ? 'linear-gradient(135deg, #4F46E5, #7C3AED)' : 'rgba(255,255,255,0.06)',
                color: email.trim() ? '#fff' : '#94A3B8',
                fontSize: 16,
                fontWeight: 700,
                boxShadow: email.trim() ? '0 8px 28px rgba(79,70,229,0.38)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              {resetLoading ? (
                <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <>
                  <span>Send reset link</span>
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </motion.form>

          {/* Back to sign in */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            type="button"
            onClick={() => handleModeSwitch('signin')}
            className="mt-5 w-full py-3 rounded-2xl transition-all active:opacity-70"
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#94A3B8',
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            ← Back to sign in
          </motion.button>
        </div>
      </Shell>
    );
  }

  // ─── Main sign-in / sign-up screen ────────────────────────────────────────

  const filled = email.trim().length > 0 && password.trim().length > 0;

  return (
    <Shell>
      <div className="flex-1 flex flex-col justify-center px-6 py-10">

        {/* Brand */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center mb-10"
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{
              background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
              boxShadow: '0 8px 36px rgba(79,70,229,0.45)',
            }}
          >
            <Zap size={30} color="#fff" fill="#fff" />
          </div>
          <h1 style={{ color: '#F8FAFC', fontSize: 30, fontWeight: 800, letterSpacing: '-0.6px', marginBottom: 6 }}>
            Claryo
          </h1>
          <p style={{ color: '#94A3B8', fontSize: 15, textAlign: 'center', lineHeight: 1.5 }}>
            Stop planning. Start executing.
          </p>
        </motion.div>

        {/* Mode toggle */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          className="flex rounded-2xl p-1 mb-6"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          {(['signin', 'signup'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => handleModeSwitch(m)}
              className="flex-1 py-3 rounded-xl"
              style={{
                background: mode === m ? '#4F46E5' : 'transparent',
                color: mode === m ? '#fff' : '#94A3B8',
                fontSize: 14,
                fontWeight: 700,
                boxShadow: mode === m ? '0 4px 16px rgba(79,70,229,0.4)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              {m === 'signin' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </motion.div>

        {/* Google */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          type="button"
          onClick={handleGoogle}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl mb-5 transition-all active:scale-[0.97]"
          style={{
            background: '#FFFFFF',
            color: '#0F172A',
            fontSize: 15,
            fontWeight: 600,
            boxShadow: '0 2px 16px rgba(0,0,0,0.35)',
          }}
        >
          {googleLoading
            ? <div className="w-5 h-5 rounded-full border-2 border-gray-300 border-t-gray-600 animate-spin" />
            : <GoogleIcon />}
          {googleLoading ? 'Redirecting…' : 'Continue with Google'}
        </motion.button>

        {/* Divider */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.14 }}
          className="flex items-center gap-3 mb-5"
        >
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
          <span style={{ color: '#94A3B8', fontSize: 12 }}>or continue with email</span>
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
        </motion.div>

        {/* Form */}
        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          onSubmit={handleSubmit}
          className="flex flex-col gap-3"
          noValidate
        >
          {/* Email input */}
          <div
            className="flex items-center gap-3 rounded-2xl px-4"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: `1.5px solid ${email ? 'rgba(79,70,229,0.55)' : 'rgba(255,255,255,0.09)'}`,
              transition: 'border-color 0.2s, box-shadow 0.2s',
              boxShadow: email ? '0 0 0 3px rgba(79,70,229,0.1)' : 'none',
            }}
          >
            <Mail size={15} color="#94A3B8" style={{ flexShrink: 0 }} />
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              placeholder="Email address"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="flex-1 bg-transparent outline-none py-4"
              style={{ color: '#F8FAFC', fontSize: 15, minWidth: 0 }}
            />
          </div>

          {/* Password input */}
          <div
            className="flex items-center gap-3 rounded-2xl px-4"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: `1.5px solid ${password ? 'rgba(79,70,229,0.55)' : 'rgba(255,255,255,0.09)'}`,
              transition: 'border-color 0.2s, box-shadow 0.2s',
              boxShadow: password ? '0 0 0 3px rgba(79,70,229,0.1)' : 'none',
            }}
          >
            <Lock size={15} color="#94A3B8" style={{ flexShrink: 0 }} />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              placeholder="Password (min. 6 characters)"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              className="flex-1 bg-transparent outline-none py-4"
              style={{ color: '#F8FAFC', fontSize: 15, minWidth: 0 }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="opacity-50 hover:opacity-100 transition-opacity flex-shrink-0 p-1"
            >
              {showPassword ? <EyeOff size={15} color="#94A3B8" /> : <Eye size={15} color="#94A3B8" />}
            </button>
          </div>

          {/* Forgot password link — sign-in only */}
          {mode === 'signin' && (
            <button
              type="button"
              onClick={() => handleModeSwitch('forgot')}
              className="text-right transition-opacity active:opacity-50"
              style={{ color: '#A5B4FC', fontSize: 13, fontWeight: 500, marginTop: -4 }}
            >
              Forgot password?
            </button>
          )}

          {/* Error message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 px-4 py-3 rounded-xl overflow-hidden"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.22)' }}
              >
                <AlertCircle size={13} color="#EF4444" style={{ flexShrink: 0 }} />
                <p style={{ color: '#EF4444', fontSize: 13, fontWeight: 500 }}>{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit */}
          <button
            type="submit"
            disabled={loadingAuth || !filled}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl transition-all active:scale-[0.97] mt-1"
            style={{
              background: filled ? 'linear-gradient(135deg, #4F46E5, #7C3AED)' : 'rgba(255,255,255,0.06)',
              color: filled ? '#fff' : '#94A3B8',
              fontSize: 16,
              fontWeight: 700,
              boxShadow: filled ? '0 8px 28px rgba(79,70,229,0.38)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            {loadingAuth ? (
              <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            ) : (
              <>
                <span>{mode === 'signin' ? 'Sign In' : 'Create Account'}</span>
                <ArrowRight size={17} />
              </>
            )}
          </button>
        </motion.form>

        {/* Legal */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.26 }}
          style={{ color: 'rgba(148,163,184,0.35)', fontSize: 12, textAlign: 'center', marginTop: 24, lineHeight: 1.6 }}
        >
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </motion.p>
      </div>
    </Shell>
  );
}
