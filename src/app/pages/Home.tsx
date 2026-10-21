import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ArrowRight, Zap, Star, Sparkles } from 'lucide-react';
import { MobileShell } from '../components/MobileShell';
import { generateGoalBreakdown } from '../utils/goalBreakdown';
import { useGoalStore } from '../store/useGoalStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { PremiumModal } from '../components/PremiumModal';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../contexts/ThemeContext';

const FREE_GOAL_LIMIT = 5;

const CHIPS = [
  { emoji: '🚀', text: 'Start a business' },
  { emoji: '💻', text: 'Learn to code' },
  { emoji: '💪', text: 'Get fit' },
  { emoji: '🎨', text: 'Create something' },
  { emoji: '📚', text: 'Learn a new skill' },
];

function getGreeting(name: string) {
  const h = new Date().getHours();
  const first = name.split(' ')[0];
  if (h < 12) return `Good morning, ${first} ☀️`;
  if (h < 17) return `Good afternoon, ${first} ⚡`;
  return `Good evening, ${first} 🌙`;
}

export default function Home() {
  const navigate = useNavigate();
  const { addGoal, goals, getResumeGoal } = useGoalStore();
  const { settings } = useSettingsStore();
  const c = useTheme();
  const [goal, setGoal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPremium, setShowPremium] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resumeGoal = getResumeGoal();

  // Next goal in sequence: find the first non-completed goal that appears AFTER resumeGoal in the list
  const resumeGoalIndex = resumeGoal ? goals.findIndex((g) => g.id === resumeGoal.id) : -1;
  const nextGoal =
    resumeGoalIndex >= 0
      ? goals.slice(resumeGoalIndex + 1).find((g) => !g.executionCompleted) ?? null
      : null;

  const atLimit = !settings.isPremium && goals.length >= FREE_GOAL_LIMIT;
  const isOnboarded = !!localStorage.getItem('claryo_onboarded');
  const showGreeting = isOnboarded && settings.name && settings.name !== 'You';

  const handleGo = async () => {
    const trimmed = goal.trim();
    if (!trimmed) {
      inputRef.current?.focus();
      return;
    }
    if (atLimit) {
      setShowPremium(true);
      return;
    }
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    const newGoal = generateGoalBreakdown(trimmed);
    addGoal(newGoal);
    setIsLoading(false);
    navigate(`/action/${newGoal.id}`);
  };

  const handleChip = (text: string) => {
    if (atLimit) return;
    setGoal(text);
    inputRef.current?.focus();
  };

  return (
    <MobileShell>
      <div className="flex flex-col min-h-full px-5 pt-14 pb-10">

        {/* Brand + Greeting */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-7 h-7 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}
              >
                <Zap size={14} color="#fff" fill="#fff" />
              </div>
              <span style={{ color: c.textPrimary, fontSize: '17px', fontWeight: 700, letterSpacing: '-0.3px' }}>
                Claryo
              </span>
              {settings.isPremium && (
                <span
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(79,70,229,0.2)', color: '#A5B4FC', fontSize: 9, fontWeight: 700 }}
                >
                  <Star size={7} fill="#A5B4FC" />
                  PRO
                </span>
              )}
            </div>
            {showGreeting && (
              <p style={{ color: c.textSecondary, fontSize: '14px' }}>
                {getGreeting(settings.name)}
              </p>
            )}
          </div>

          {/* Goals count badge */}
          {goals.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl cursor-pointer active:opacity-70"
              style={{ background: c.surface2, border: `1px solid ${c.border}` }}
              onClick={() => navigate('/projects')}
            >
              <span style={{ color: c.textSecondary, fontSize: '12px', fontWeight: 600 }}>
                {goals.length} goal{goals.length !== 1 ? 's' : ''} →
              </span>
            </motion.div>
          )}
        </div>

        {/* Resume Flow */}
        <AnimatePresence>
          {resumeGoal && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-2 rounded-2xl p-4 cursor-pointer active:opacity-80 transition-opacity"
              style={{
                background: 'rgba(34,197,94,0.08)',
                border: '1.5px solid rgba(34,197,94,0.25)',
              }}
              onClick={() => navigate(`/action/${resumeGoal.id}`)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p style={{ color: '#22C55E', fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', marginBottom: '4px' }}>
                    ⚡ IN PROGRESS
                  </p>
                  <p style={{ color: c.textPrimary, fontSize: '14px', fontWeight: 600, marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {resumeGoal.rewrittenTitle}
                  </p>
                  <p style={{ color: c.textSecondary, fontSize: '12px' }}>
                    {resumeGoal.stepsCompleted} step{resumeGoal.stepsCompleted !== 1 ? 's' : ''} done
                  </p>
                </div>
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ml-3"
                  style={{ background: 'rgba(34,197,94,0.15)' }}
                >
                  <ArrowRight size={16} color="#22C55E" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* After that — next goal in queue, hidden when resumeGoal is the last goal */}
        <AnimatePresence>
          {resumeGoal && nextGoal && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 rounded-2xl px-4 py-3 cursor-pointer active:opacity-70 transition-opacity"
              style={{
                background: c.surface,
                border: `1px solid ${c.border}`,
                opacity: 0.72,
              }}
              onClick={() => navigate(`/action/${nextGoal.id}`)}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-1 self-stretch rounded-full flex-shrink-0"
                  style={{ background: c.border2 }}
                />
                <div className="flex-1 min-w-0">
                  <p style={{ color: c.textSecondary, fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', marginBottom: '3px' }}>
                    → AFTER THAT
                  </p>
                  <p style={{ color: c.textSecondary, fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {nextGoal.rewrittenTitle}
                  </p>
                </div>
                <ArrowRight size={13} color={c.textTertiary} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Spacer when neither card shows */}
        {!resumeGoal && <div className="mb-6" />}

        {/* Free Limit Banner */}
        <AnimatePresence>
          {atLimit && (
            <motion.button
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPremium(true)}
              className="mb-5 rounded-2xl p-4 text-left w-full transition-all active:scale-[0.98]"
              style={{ background: 'rgba(79,70,229,0.1)', border: '1px solid rgba(79,70,229,0.3)' }}
            >
              <div className="flex items-center gap-2 mb-1">
                <Star size={12} color="#A5B4FC" fill="#A5B4FC" />
                <span style={{ color: '#A5B4FC', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em' }}>
                  FREE LIMIT REACHED
                </span>
              </div>
              <p style={{ color: c.textPrimary, fontSize: '14px', fontWeight: 600, marginBottom: '2px' }}>
                You&apos;ve used all {FREE_GOAL_LIMIT} free goals
              </p>
              <p style={{ color: c.textSecondary, fontSize: '12px' }}>
                Upgrade to Pro for unlimited goals →
              </p>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Hero Heading */}
        <div className="mb-8">
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            style={{
              color: c.textPrimary,
              fontSize: '36px',
              fontWeight: 800,
              lineHeight: 1.08,
              letterSpacing: '-1.2px',
              marginBottom: '10px',
            }}
          >
            What do you<br />want to{' '}
            <span style={{ color: '#4F46E5' }}>start?</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.06 }}
            style={{ color: c.textSecondary, fontSize: '15px', lineHeight: 1.55 }}
          >
            Type anything. I&apos;ll tell you exactly what to do first.
          </motion.p>
        </div>

        {/* Input */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="rounded-2xl px-4 mb-4"
          style={{
            background: c.surface2,
            border: `1.5px solid ${isFocused ? '#4F46E5' : goal ? 'rgba(79,70,229,0.4)' : c.border}`,
            transition: 'border-color 0.2s',
            opacity: atLimit ? 0.5 : 1,
            boxShadow: isFocused ? '0 0 0 3px rgba(79,70,229,0.12)' : 'none',
          }}
        >
          <div className="flex items-center gap-3">
            <Sparkles size={16} color={isFocused || goal ? '#4F46E5' : c.textTertiary} style={{ flexShrink: 0, transition: 'color 0.2s' }} />
            <input
              ref={inputRef}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGo()}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={atLimit ? 'Upgrade to add more goals…' : 'e.g. Start a clothing brand…'}
              className="flex-1 bg-transparent outline-none py-4"
              style={{ color: c.textPrimary, fontSize: '16px' }}
              readOnly={atLimit}
            />
            <AnimatePresence>
              {goal && !atLimit && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  onClick={handleGo}
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all active:scale-90"
                  style={{ background: '#4F46E5' }}
                >
                  <ArrowRight size={17} color="#fff" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Chips */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.14 }}
          className="flex gap-2 mb-8 overflow-x-auto pb-1"
          style={{ scrollbarWidth: 'none' }}
        >
          {CHIPS.map((chip) => (
            <button
              key={chip.text}
              onClick={() => handleChip(chip.text)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full transition-all active:scale-95 flex-shrink-0"
              style={{
                background: goal === chip.text ? 'rgba(79,70,229,0.22)' : c.surface2,
                border: `1px solid ${goal === chip.text ? 'rgba(79,70,229,0.5)' : c.border}`,
                color: goal === chip.text ? '#A5B4FC' : c.textSecondary,
                fontSize: '13px',
                opacity: atLimit ? 0.4 : 1,
              }}
            >
              <span style={{ fontSize: '14px' }}>{chip.emoji}</span>
              <span>{chip.text}</span>
            </button>
          ))}
        </motion.div>

        {/* CTA Button */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.18 }}
          onClick={atLimit ? () => setShowPremium(true) : handleGo}
          disabled={isLoading || (!atLimit && !goal.trim())}
          className="w-full flex items-center justify-center gap-3 rounded-2xl py-5 transition-all active:scale-[0.97]"
          style={{
            background: atLimit
              ? 'linear-gradient(135deg, #4F46E5, #7C3AED)'
              : goal.trim()
              ? 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)'
              : c.surface2,
            color: (atLimit || goal.trim()) ? '#fff' : c.textSecondary,
            fontSize: '17px',
            fontWeight: 700,
            boxShadow: (atLimit || goal.trim()) ? '0 8px 28px rgba(79,70,229,0.35)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              <span>Building your first step…</span>
            </>
          ) : atLimit ? (
            <>
              <Star size={19} fill="currentColor" />
              <span>Upgrade to continue</span>
            </>
          ) : (
            <>
              <Zap size={19} fill={goal.trim() ? 'currentColor' : 'none'} />
              <span>Let&apos;s go</span>
            </>
          )}
        </motion.button>

        <p style={{ color: c.textTertiary, fontSize: '13px', textAlign: 'center', marginTop: '18px' }}>
          You don&apos;t need a plan. You need a start.
        </p>
      </div>

      <PremiumModal open={showPremium} onClose={() => setShowPremium(false)} />
    </MobileShell>
  );
}