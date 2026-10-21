import { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router';
import { useAuthStore } from '../store/useAuthStore';
import { motion } from 'motion/react';
import { Zap } from 'lucide-react';

function SplashScreen() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: '#0D0B1E', fontFamily: 'Inter, sans-serif' }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 250, damping: 20 }}
        className="flex flex-col items-center gap-4"
      >
        <motion.div
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ repeat: Infinity, duration: 1.8 }}
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
            boxShadow: '0 8px 32px rgba(79,70,229,0.45)',
          }}
        >
          <Zap size={30} color="#fff" fill="#fff" />
        </motion.div>
        <div
          className="w-6 h-6 rounded-full border-2 border-t-indigo-500 animate-spin"
          style={{ borderColor: 'rgba(79,70,229,0.2)', borderTopColor: '#4F46E5' }}
        />
      </motion.div>
    </div>
  );
}

export function Root() {
  const { user, loading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate('/auth', { replace: true });
      return;
    }

    // New user needs onboarding — only redirect from root
    const onboarded = localStorage.getItem('claryo_onboarded');
    if (!onboarded && location.pathname === '/') {
      navigate('/onboarding', { replace: true });
    }
  }, [user, loading, navigate, location.pathname]);

  if (loading) return <SplashScreen />;
  if (!user) return null;

  return <Outlet />;
}