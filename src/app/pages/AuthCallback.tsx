import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../store/useAuthStore';
import { Zap } from 'lucide-react';
import { motion } from 'motion/react';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const finishSignIn = async () => {
      const params = new URLSearchParams(window.location.search);
      const callbackError = params.get('error_description') ?? params.get('error');
      if (callbackError) throw new Error(callbackError);

      // Supabase normally detects implicit and PKCE callbacks while the client
      // initializes. Explicitly exchange a remaining PKCE code as a fallback.
      let { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const code = params.get('code');
      if (!data.session && code) {
        const exchanged = await supabase.auth.exchangeCodeForSession(code);
        if (exchanged.error) throw exchanged.error;
        data = exchanged.data;
      }

      if (!data.session) {
        throw new Error('No sign-in session was returned. Please try again.');
      }

      if (active) {
        const onboarded = localStorage.getItem('claryo_onboarded');
        navigate(onboarded ? '/' : '/onboarding', { replace: true });
      }
    };

    finishSignIn().catch((callbackError: unknown) => {
      if (!active) return;
      const message =
        callbackError instanceof Error ? callbackError.message : 'Sign-in failed';
      setError(message);
    });

    return () => {
      active = false;
    };
  }, [navigate]);

  return (
    <div
      className="min-h-screen flex justify-center"
      style={{ background: '#07060F' }}
    >
      <div
        className="relative w-full max-w-[430px] min-h-screen flex flex-col items-center justify-center px-6"
        style={{ background: '#0D0B1E', fontFamily: 'Inter, sans-serif' }}
      >
        {/* Ambient glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none"
          style={{
            width: '320px',
            height: '320px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(79,70,229,0.18) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />

        {error ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)' }}
            >
              <span style={{ fontSize: 28 }}>⚠️</span>
            </div>
            <h2 style={{ color: '#F8FAFC', fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
              Sign-in failed
            </h2>
            <p style={{ color: '#94A3B8', fontSize: 14, lineHeight: 1.6, marginBottom: 28 }}>
              {error}
            </p>
            <button
              onClick={() => navigate('/auth', { replace: true })}
              className="px-6 py-3 rounded-2xl transition-all active:scale-95"
              style={{ background: '#4F46E5', color: '#fff', fontSize: 15, fontWeight: 700 }}
            >
              Back to sign in
            </button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 220, damping: 20 }}
            className="flex flex-col items-center text-center"
          >
            {/* Spinning brand icon */}
            <div className="relative mb-6">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 rounded-2xl"
                style={{
                  border: '2px solid transparent',
                  borderTopColor: '#4F46E5',
                  borderRightColor: 'rgba(79,70,229,0.3)',
                }}
              />
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}
              >
                <Zap size={28} color="#fff" fill="#fff" />
              </div>
            </div>

            <h2 style={{ color: '#F8FAFC', fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
              Signing you in…
            </h2>
            <p style={{ color: '#94A3B8', fontSize: 14 }}>
              Setting up your account
            </p>

            {/* Animated dots */}
            <div className="flex items-center gap-2 mt-6">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                  className="w-2 h-2 rounded-full"
                  style={{ background: '#4F46E5' }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
