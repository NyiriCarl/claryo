import { useState } from 'react';
import { X, Check, Zap, Star, Clock, Target, TrendingUp, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSettingsStore } from '../store/useSettingsStore';

const FEATURES = [
  {
    icon: Target,
    label: 'Unlimited Goals',
    sub: 'No cap on active goals',
    free: '5 goals',
    premium: 'Unlimited',
  },
  {
    icon: Clock,
    label: 'Full Timer Control',
    sub: 'Custom durations for every step',
    free: 'Presets only',
    premium: 'Custom + Presets',
  },
  {
    icon: TrendingUp,
    label: 'Streak Insights',
    sub: 'Deep weekly analytics',
    free: 'Basic',
    premium: 'Advanced',
  },
  {
    icon: Zap,
    label: 'Auto-Advance Timer',
    sub: 'Auto next step on timer end',
    free: false,
    premium: true,
  },
  {
    icon: Shield,
    label: 'Priority Support',
    sub: 'Direct line to our team',
    free: false,
    premium: true,
  },
];

interface PremiumModalProps {
  open: boolean;
  onClose: () => void;
}

export function PremiumModal({ open, onClose }: PremiumModalProps) {
  const { setPremium, settings } = useSettingsStore();
  const [upgraded, setUpgraded] = useState(false);
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual');

  const handleUpgrade = () => {
    setUpgraded(true);
    setTimeout(() => {
      setPremium(true);
      onClose();
      setUpgraded(false);
    }, 1800);
  };

  /* ── Already Premium ── */
  if (settings.isPremium) {
    return (
      <AnimatePresence>
        {open && (
          /* Full-screen backdrop */
          <motion.div
            key="premium-already-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(10px)' }}
            onClick={onClose}
          >
            {/* Card — constrained to mobile shell width */}
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="w-full mx-4 rounded-3xl p-8 text-center"
              style={{
                maxWidth: 360,
                background: '#16142A',
                border: '1.5px solid rgba(79,70,229,0.4)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}
              >
                <Star size={28} color="#fff" fill="#fff" />
              </div>
              <h2
                style={{
                  color: '#F8FAFC',
                  fontSize: 22,
                  fontWeight: 800,
                  marginBottom: 8,
                }}
              >
                You're on Pro! ✨
              </h2>
              <p style={{ color: '#94A3B8', fontSize: 15, marginBottom: 24, lineHeight: 1.6 }}>
                All features are unlocked. Keep executing and building momentum.
              </p>
              <button
                onClick={onClose}
                className="w-full py-4 rounded-2xl"
                style={{
                  background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: 700,
                }}
              >
                Keep Going 🚀
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  /* ── Upgrade Flow ── */
  return (
    <AnimatePresence>
      {open && (
        /* Full-screen backdrop */
        <motion.div
          key="premium-upgrade-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
          onClick={onClose}
        >
          {/* Bottom-sheet panel */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            className="w-full flex flex-col"
            style={{
              maxWidth: 430,
              maxHeight: '92dvh',
              background: '#0D0B1E',
              borderRadius: '24px 24px 0 0',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {upgraded ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-16 px-6 text-center"
              >
                <motion.div
                  animate={{ rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.6 }}
                  className="text-6xl mb-6"
                >
                  🎉
                </motion.div>
                <h1
                  style={{
                    color: '#F8FAFC',
                    fontSize: 32,
                    fontWeight: 800,
                    letterSpacing: '-0.5px',
                    marginBottom: 12,
                  }}
                >
                  Welcome to Pro!
                </h1>
                <p style={{ color: '#94A3B8', fontSize: 17, lineHeight: 1.6 }}>
                  All features unlocked. Time to execute.
                </p>
              </motion.div>
            ) : (
              <>
                {/* Drag handle */}
                <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                  <div
                    className="w-10 h-1 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.15)' }}
                  />
                </div>

                {/* Header */}
                <div
                  className="relative px-6 pt-6 pb-7 text-center flex-shrink-0"
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(79,70,229,0.22) 0%, transparent 100%)',
                  }}
                >
                  <button
                    onClick={onClose}
                    className="absolute top-4 right-5 w-9 h-9 flex items-center justify-center rounded-full"
                    style={{ background: 'rgba(255,255,255,0.08)' }}
                  >
                    <X size={16} color="#F8FAFC" />
                  </button>

                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', delay: 0.1 }}
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3"
                    style={{
                      background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                      boxShadow: '0 12px 40px rgba(79,70,229,0.5)',
                    }}
                  >
                    <Star size={30} color="#fff" fill="#fff" />
                  </motion.div>

                  <h1
                    style={{
                      color: '#F8FAFC',
                      fontSize: 26,
                      fontWeight: 800,
                      letterSpacing: '-0.5px',
                      marginBottom: 4,
                    }}
                  >
                    Claryo Pro
                  </h1>
                  <p style={{ color: '#94A3B8', fontSize: 14 }}>
                    Unlock your full execution engine
                  </p>
                </div>

                {/* Scrollable body */}
                <div
                  className="flex-1 overflow-y-auto px-5 pb-8"
                  style={{ WebkitOverflowScrolling: 'touch' }}
                >
                  {/* Billing toggle */}
                  <div
                    className="flex items-center rounded-2xl p-1 mb-4"
                    style={{ background: 'rgba(255,255,255,0.05)' }}
                  >
                    {(['monthly', 'annual'] as const).map((b) => (
                      <button
                        key={b}
                        onClick={() => setBilling(b)}
                        className="flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all"
                        style={{
                          background: billing === b ? '#4F46E5' : 'transparent',
                          color: billing === b ? '#fff' : '#94A3B8',
                          fontSize: 14,
                          fontWeight: 700,
                        }}
                      >
                        {b === 'monthly' ? 'Monthly' : 'Annual'}
                        {b === 'annual' && (
                          <span
                            style={{
                              background:
                                billing === 'annual'
                                  ? 'rgba(34,197,94,0.3)'
                                  : 'rgba(34,197,94,0.15)',
                              color: '#22C55E',
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: 6,
                            }}
                          >
                            -33%
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Price card */}
                  <div
                    className="rounded-2xl p-4 mb-4"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(79,70,229,0.2), rgba(124,58,237,0.15))',
                      border: '1.5px solid rgba(79,70,229,0.4)',
                    }}
                  >
                    <div className="flex items-baseline gap-1 mb-1">
                      <span
                        style={{
                          color: '#F8FAFC',
                          fontSize: 38,
                          fontWeight: 800,
                          letterSpacing: '-1px',
                        }}
                      >
                        {billing === 'monthly' ? '$4.99' : '$3.33'}
                      </span>
                      <span style={{ color: '#94A3B8', fontSize: 15 }}>/month</span>
                    </div>
                    <p style={{ color: '#94A3B8', fontSize: 13, marginBottom: 10 }}>
                      {billing === 'annual'
                        ? 'Billed annually · $39.99/year · Save $19.89'
                        : 'Billed monthly · Cancel anytime'}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: '#22C55E' }} />
                      <span style={{ color: '#22C55E', fontSize: 13, fontWeight: 600 }}>
                        7-day free trial included
                      </span>
                    </div>
                  </div>

                  {/* Features table */}
                  <div
                    className="rounded-2xl overflow-hidden mb-4"
                    style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <div
                      className="grid grid-cols-3 py-2.5 px-4"
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        borderBottom: '1px solid rgba(255,255,255,0.07)',
                      }}
                    >
                      <span
                        style={{
                          color: '#94A3B8',
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: '0.08em',
                        }}
                      >
                        FEATURE
                      </span>
                      <span
                        style={{
                          color: '#94A3B8',
                          fontSize: 11,
                          fontWeight: 700,
                          textAlign: 'center',
                          letterSpacing: '0.08em',
                        }}
                      >
                        FREE
                      </span>
                      <span
                        style={{
                          color: '#A5B4FC',
                          fontSize: 11,
                          fontWeight: 700,
                          textAlign: 'center',
                          letterSpacing: '0.08em',
                        }}
                      >
                        PRO
                      </span>
                    </div>
                    {FEATURES.map((f, i) => (
                      <div
                        key={f.label}
                        className="grid grid-cols-3 items-center px-4 py-3"
                        style={{
                          borderBottom:
                            i < FEATURES.length - 1
                              ? '1px solid rgba(255,255,255,0.05)'
                              : 'none',
                          background: 'rgba(255,255,255,0.02)',
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <f.icon size={13} color="#4F46E5" />
                          <div>
                            <p
                              style={{
                                color: '#F8FAFC',
                                fontSize: 12,
                                fontWeight: 600,
                                lineHeight: 1.2,
                              }}
                            >
                              {f.label}
                            </p>
                            <p style={{ color: '#94A3B8', fontSize: 10 }}>{f.sub}</p>
                          </div>
                        </div>
                        <div className="flex justify-center">
                          {f.free === false ? (
                            <span style={{ color: '#EF4444', fontSize: 16 }}>✗</span>
                          ) : (
                            <span
                              style={{
                                color: '#94A3B8',
                                fontSize: 11,
                                fontWeight: 600,
                                textAlign: 'center',
                              }}
                            >
                              {f.free}
                            </span>
                          )}
                        </div>
                        <div className="flex justify-center">
                          {f.premium === true ? (
                            <Check size={16} color="#22C55E" strokeWidth={2.5} />
                          ) : (
                            <span
                              style={{
                                color: '#A5B4FC',
                                fontSize: 11,
                                fontWeight: 600,
                                textAlign: 'center',
                              }}
                            >
                              {f.premium as string}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <motion.button
                    onClick={handleUpgrade}
                    whileTap={{ scale: 0.97 }}
                    className="w-full py-5 rounded-2xl flex items-center justify-center gap-2 mb-3"
                    style={{
                      background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                      color: '#fff',
                      fontSize: 17,
                      fontWeight: 800,
                      boxShadow: '0 8px 32px rgba(79,70,229,0.45)',
                    }}
                  >
                    <Star size={20} fill="#fff" />
                    Start Free Trial
                  </motion.button>

                  <p
                    style={{
                      color: 'rgba(148,163,184,0.5)',
                      fontSize: 12,
                      textAlign: 'center',
                      lineHeight: 1.6,
                    }}
                  >
                    Cancel anytime · No commitment · Secure payment
                  </p>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
