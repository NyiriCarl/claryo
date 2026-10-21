import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { ArrowRight, Zap } from 'lucide-react';
import { useSettingsStore } from '../store/useSettingsStore';
import { useAuthStore } from '../store/useAuthStore';
import { motion } from 'motion/react';

const STEPS = [
  { emoji: '⚡', label: 'One step at a time' },
  { emoji: '🎯', label: 'Zero overthinking' },
  { emoji: '🔥', label: 'Pure momentum' },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { setName } = useSettingsStore();
  const { user } = useAuthStore();
  const [name, setNameInput] = useState('');

  // Pre-fill from Google account if available
  const googleName = user?.user_metadata?.full_name || user?.user_metadata?.name || '';
  const displayName = name || googleName;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const finalName = displayName.trim() || 'You';
    setName(finalName);
    localStorage.setItem('claryo_onboarded', 'true');
    navigate('/', { replace: true });
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: '#0D0B1E', fontFamily: 'Inter, sans-serif' }}
    >
      {/* Glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(79,70,229,0.15) 0%, transparent 70%)',
          filter: 'blur(50px)',
        }}
      />

      <div className="w-full max-w-[380px] relative">
        {/* Brand mark */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 250, damping: 20 }}
          className="flex justify-center mb-10"
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
              boxShadow: '0 8px 40px rgba(79,70,229,0.45)',
            }}
          >
            <Zap size={32} color="#fff" fill="#fff" />
          </div>
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-8"
        >
          <h1
            style={{
              color: '#F8FAFC',
              fontSize: 32,
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: '-0.8px',
              marginBottom: 10,
            }}
          >
            Welcome to Claryo
          </h1>
          <p style={{ color: '#94A3B8', fontSize: 16, lineHeight: 1.5 }}>
            The execution engine for people who take action.
          </p>
        </motion.div>

        {/* Feature pills */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="flex flex-col gap-2 mb-10"
        >
          {STEPS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.22 + i * 0.07 }}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl"
              style={{
                background: 'rgba(79,70,229,0.08)',
                border: '1px solid rgba(79,70,229,0.2)',
              }}
            >
              <span style={{ fontSize: 20 }}>{s.emoji}</span>
              <span style={{ color: '#A5B4FC', fontSize: 15, fontWeight: 600 }}>{s.label}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Name Form */}
        <motion.form
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.34 }}
          onSubmit={handleSubmit}
        >
          <p style={{ color: '#F8FAFC', fontSize: 17, fontWeight: 700, marginBottom: 10 }}>
            What should we call you?
          </p>
          <div
            className="flex items-center gap-3 rounded-2xl px-4 mb-4"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: `1.5px solid ${displayName ? 'rgba(79,70,229,0.5)' : 'rgba(255,255,255,0.1)'}`,
              transition: 'border-color 0.2s',
            }}
          >
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder={googleName || 'Your first name…'}
              maxLength={40}
              className="flex-1 bg-transparent outline-none py-4"
              style={{ color: '#F8FAFC', fontSize: 16 }}
            />
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-5 rounded-2xl transition-all active:scale-[0.97]"
            style={{
              background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
              color: '#fff',
              fontSize: 17,
              fontWeight: 700,
              boxShadow: '0 8px 32px rgba(79,70,229,0.4)',
            }}
          >
            <span>Let&apos;s start executing</span>
            <ArrowRight size={20} />
          </button>
        </motion.form>

        <p
          style={{
            color: 'rgba(148,163,184,0.35)',
            fontSize: 12,
            textAlign: 'center',
            marginTop: 20,
          }}
        >
          You can always change this in Profile →
        </p>
      </div>
    </div>
  );
}
