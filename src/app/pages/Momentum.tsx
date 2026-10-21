import { useNavigate } from 'react-router';
import { ArrowRight, Flame, Zap, Check, Target, TrendingUp, Star, Calendar } from 'lucide-react';
import { MobileShell } from '../components/MobileShell';
import { useGoalStore } from '../store/useGoalStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { PremiumModal } from '../components/PremiumModal';
import { motion } from 'motion/react';
import { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

const MESSAGES = [
  { threshold: 0, text: 'Your first step is waiting.', sub: 'Start anything. Right now.' },
  { threshold: 1, text: 'You started today.', sub: 'That already puts you ahead of most people.' },
  { threshold: 3, text: "You're building momentum.", sub: "Keep going. Don't stop now." },
  { threshold: 7, text: "You're on a streak.", sub: 'Consistency is how it becomes real.' },
  { threshold: 15, text: "You're unstoppable.", sub: 'Small steps. Big results. Keep moving.' },
];

export default function Momentum() {
  const navigate = useNavigate();
  const { goals, getStats } = useGoalStore();
  const { settings, getStreak, getWeekDots } = useSettingsStore();
  const c = useTheme();
  const [showPremium, setShowPremium] = useState(false);

  const stats = getStats();
  const streak = getStreak();
  const weekDots = getWeekDots();
  const hasActivity = stats.totalSteps > 0;

  const msg =
    [...MESSAGES].reverse().find((m) => stats.totalSteps >= m.threshold) ||
    MESSAGES[0];

  const resumeGoal = goals.find((g) => g.isStarted && !g.executionCompleted) || null;

  return (
    <MobileShell>
      <div className="flex flex-col min-h-full px-5 pt-14 pb-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-7">
          <div>
            <h1 style={{ color: c.textPrimary, fontSize: '26px', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '3px' }}>
              Momentum
            </h1>
            <p style={{ color: c.textSecondary, fontSize: '14px' }}>Every step counts.</p>
          </div>
          {streak > 0 && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl"
              style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}
            >
              <Flame size={15} color="#F59E0B" fill="#F59E0B" />
              <span style={{ color: '#F59E0B', fontSize: '15px', fontWeight: 800 }}>{streak}</span>
            </motion.div>
          )}
        </div>

        {/* Main Momentum Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="rounded-3xl p-5 mb-4"
          style={{
            background: hasActivity
              ? 'linear-gradient(145deg, rgba(79,70,229,0.22), rgba(124,58,237,0.16))'
              : c.surface,
            border: `1.5px solid ${hasActivity ? 'rgba(79,70,229,0.38)' : c.border}`,
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Flame size={17} color={hasActivity ? '#F59E0B' : c.textSecondary} fill={hasActivity ? '#F59E0B' : 'none'} />
              <span
                style={{
                  color: hasActivity ? '#F59E0B' : c.textSecondary,
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                }}
              >
                {hasActivity ? 'MOMENTUM ACTIVE' : 'NOT STARTED YET'}
              </span>
            </div>
            {streak > 0 && (
              <div
                className="flex items-center gap-1 px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(245,158,11,0.15)' }}
              >
                <span style={{ color: '#F59E0B', fontSize: '12px', fontWeight: 700 }}>
                  {streak} day streak 🔥
                </span>
              </div>
            )}
          </div>

          <h2
            style={{
              color: c.textPrimary,
              fontSize: '26px',
              fontWeight: 800,
              lineHeight: 1.2,
              letterSpacing: '-0.5px',
              marginBottom: '6px',
            }}
          >
            {msg.text}
          </h2>
          <p style={{ color: c.textSecondary, fontSize: '14px', lineHeight: 1.55, marginBottom: stats.totalSteps > 0 ? 14 : 0 }}>
            {msg.sub}
          </p>

          {stats.totalSteps > 0 && (
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-2xl"
              style={{ background: 'rgba(79,70,229,0.18)' }}
            >
              <Zap size={14} color="#4F46E5" fill="#4F46E5" />
              <span style={{ color: '#A5B4FC', fontSize: '14px', fontWeight: 700 }}>
                {stats.totalSteps} step{stats.totalSteps !== 1 ? 's' : ''} completed
              </span>
            </div>
          )}
        </motion.div>

        {/* Stats Row */}
        <div className="flex gap-3 mb-4">
          {[
            { label: 'Goals', value: stats.total, icon: Target, color: '#4F46E5', bg: 'rgba(79,70,229,0.12)' },
            { label: 'Steps', value: stats.totalSteps, icon: Check, color: '#22C55E', bg: 'rgba(34,197,94,0.12)' },
            { label: 'Done', value: stats.executing, icon: TrendingUp, color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.06 }}
              className="flex-1 rounded-2xl p-3 flex flex-col items-center gap-1"
              style={{ background: c.surface, border: `1px solid ${c.border}` }}
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: s.bg }}
              >
                <s.icon size={15} color={s.color} />
              </div>
              <span style={{ color: c.textPrimary, fontSize: '22px', fontWeight: 800, lineHeight: 1 }}>{s.value}</span>
              <span style={{ color: c.textSecondary, fontSize: '11px' }}>{s.label}</span>
            </motion.div>
          ))}
        </div>

        {/* Week Activity */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl p-4 mb-4"
          style={{ background: c.surface, border: `1px solid ${c.border}` }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={14} color={c.textSecondary} />
            <p style={{ color: c.textPrimary, fontSize: '13px', fontWeight: 700 }}>
              This week
            </p>
          </div>

          <div className="flex items-end justify-between gap-1">
            {weekDots.map((dot) => (
              <div key={dot.key} className="flex flex-col items-center gap-2 flex-1">
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-full rounded-xl flex items-center justify-center"
                  style={{
                    height: 36,
                    background: dot.active
                      ? 'linear-gradient(135deg, #4F46E5, #7C3AED)'
                      : dot.isToday
                      ? 'rgba(79,70,229,0.12)'
                      : c.surface2,
                    border: dot.isToday && !dot.active
                      ? '1.5px dashed rgba(79,70,229,0.4)'
                      : 'none',
                    boxShadow: dot.active ? '0 4px 12px rgba(79,70,229,0.3)' : 'none',
                  }}
                >
                  {dot.active && <Check size={13} color="#fff" strokeWidth={2.5} />}
                  {dot.isToday && !dot.active && (
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#4F46E5' }} />
                  )}
                </motion.div>
                <span
                  style={{
                    color: dot.isToday ? '#A5B4FC' : c.textSecondary,
                    fontSize: 10,
                    fontWeight: dot.isToday ? 700 : 400,
                  }}
                >
                  {dot.label}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Premium Analytics Teaser */}
        {!settings.isPremium && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
            onClick={() => setShowPremium(true)}
            className="rounded-2xl p-4 mb-4 w-full text-left transition-all active:scale-[0.98]"
            style={{
              background: 'rgba(79,70,229,0.07)',
              border: '1px solid rgba(79,70,229,0.18)',
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Star size={12} color="#A5B4FC" fill="#A5B4FC" />
              <span style={{ color: '#A5B4FC', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em' }}>
                CLARYO PRO
              </span>
            </div>
            <p style={{ color: c.textPrimary, fontSize: '14px', fontWeight: 600, marginBottom: 2 }}>
              Unlock deep streak insights
            </p>
            <p style={{ color: c.textSecondary, fontSize: '12px' }}>
              Monthly charts, longest streak, completion rate & more →
            </p>
          </motion.button>
        )}

        {/* Resume Goal */}
        {resumeGoal && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }}
            className="rounded-2xl p-4 mb-4 cursor-pointer transition-all active:opacity-80"
            style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.22)' }}
            onClick={() => navigate(`/action/${resumeGoal.id}`)}
          >
            <p style={{ color: '#22C55E', fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', marginBottom: '4px' }}>
              CONTINUE WHERE YOU LEFT OFF
            </p>
            <p style={{ color: c.textPrimary, fontSize: '15px', fontWeight: 600, marginBottom: '10px', lineHeight: 1.3 }}>
              {resumeGoal.rewrittenTitle}
            </p>
            <div
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl w-fit transition-all active:scale-95"
              style={{ background: '#22C55E' }}
            >
              <ArrowRight size={14} color="#000" />
              <span style={{ color: '#000', fontSize: '13px', fontWeight: 700 }}>Resume</span>
            </div>
          </motion.div>
        )}

        {/* Active Goals */}
        {goals.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32 }}
            className="mb-4"
          >
            <p style={{ color: c.textPrimary, fontSize: '15px', fontWeight: 700, marginBottom: '10px' }}>
              Active goals
            </p>
            <div className="flex flex-col gap-2.5">
              {goals.slice(0, 4).map((goal, i) => {
                const done =
                  (goal.startNow.completed ? 1 : 0) +
                  (goal.nextStep.completed ? 1 : 0) +
                  goal.miniBreakdown.filter((s) => s.completed).length +
                  goal.executionSteps.filter((s) => s.completed).length;
                const total = goal.executionSteps.length + 1 + 1 + goal.miniBreakdown.length;
                const percent = total > 0 ? Math.round((done / total) * 100) : 0;
                return (
                  <motion.div
                    key={goal.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35 + i * 0.05 }}
                    onClick={() => navigate(`/action/${goal.id}`)}
                    className="rounded-xl p-3.5 flex items-center gap-3 cursor-pointer transition-all active:opacity-70"
                    style={{ background: c.surface, border: `1px solid ${c.border}` }}
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(79,70,229,0.12)' }}
                    >
                      <span style={{ fontSize: '16px' }}>
                        {goal.category === 'business' ? '🚀' : goal.category === 'learn' ? '💻' : goal.category === 'fitness' ? '💪' : goal.category === 'creative' ? '🎨' : '🎯'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        style={{
                          color: c.textPrimary,
                          fontSize: '13px',
                          fontWeight: 600,
                          marginBottom: '6px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {goal.rewrittenTitle}
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1 rounded-full" style={{ background: c.border }}>
                          <div
                            className="h-1 rounded-full transition-all"
                            style={{
                              width: `${percent}%`,
                              background: goal.isStarted ? 'linear-gradient(90deg, #4F46E5, #7C3AED)' : c.textTertiary,
                            }}
                          />
                        </div>
                        <span style={{ color: c.textSecondary, fontSize: '11px', flexShrink: 0 }}>
                          {percent}%
                        </span>
                      </div>
                    </div>
                    <ArrowRight size={14} color={c.textSecondary} />
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* CTA */}
        <div className="mt-auto pt-2">
          <button
            onClick={() => navigate('/')}
            className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
            style={{
              background: hasActivity ? 'rgba(79,70,229,0.12)' : 'linear-gradient(135deg, #4F46E5, #7C3AED)',
              border: hasActivity ? '1px solid rgba(79,70,229,0.3)' : 'none',
              color: hasActivity ? '#A5B4FC' : '#fff',
              fontSize: '15px',
              fontWeight: 700,
              boxShadow: hasActivity ? 'none' : '0 6px 20px rgba(79,70,229,0.35)',
            }}
          >
            <Zap size={15} fill="currentColor" />
            {hasActivity ? 'Start a new goal' : 'Start your first goal'}
          </button>
        </div>
      </div>

      <PremiumModal open={showPremium} onClose={() => setShowPremium(false)} />
    </MobileShell>
  );
}