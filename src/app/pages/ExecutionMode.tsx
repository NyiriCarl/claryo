import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router';
import { ArrowLeft, ArrowRight, Check, Clock, Star, Zap } from 'lucide-react';
import { MobileShell } from '../components/MobileShell';
import { useGoalStore } from '../store/useGoalStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { TaskTimer } from '../components/TaskTimer';
import { TimerSetterSheet } from '../components/TimerSetterSheet';
import { PremiumModal } from '../components/PremiumModal';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useTheme } from '../contexts/ThemeContext';

export default function ExecutionMode() {
  const { goalId } = useParams<{ goalId: string }>();
  const [searchParams] = useSearchParams();
  const miniId = searchParams.get('mini'); // milestone step focus
  const navigate = useNavigate();
  const { goals, advanceExecutionStep, setExecutionStepTimer, completeMiniStep } = useGoalStore();
  const { settings, recordToday, vibrate } = useSettingsStore();
  const c = useTheme();

  const [timerOpen, setTimerOpen] = useState(false);
  const [showPremium, setShowPremium] = useState(false);

  const goal = goals.find((g) => g.id === goalId);

  if (!goal) {
    return (
      <MobileShell showNav={false}>
        <div className="flex items-center justify-center min-h-screen">
          <button onClick={() => navigate('/')} style={{ color: c.textPrimary }}>
            Go Home
          </button>
        </div>
      </MobileShell>
    );
  }

  // ─── Milestone (mini) single-step focus mode ──────────────────────────────
  const miniStep = miniId ? goal.miniBreakdown.find((s) => s.id === miniId) : null;
  const miniInvalid = !!miniId && (!miniStep || miniStep.completed);

  // Guard: if the mini step doesn't exist or is already done, redirect — but do it in an effect, not during render
  useEffect(() => {
    if (miniInvalid) {
      navigate(`/action/${goal.id}`, { replace: true });
    }
  }, [miniInvalid, goal.id, navigate]);

  if (miniInvalid) return null;

  // ─── Milestone (mini) single-step focus mode ──────────────────────────────
  if (miniId && miniStep) {
    const handleMiniDone = () => {
      completeMiniStep(goal.id, miniId);
      recordToday();
      vibrate(60);
      toast.success('Step done! ⚡');
      navigate(`/action/${goal.id}`);
    };

    return (
      <MobileShell showNav={false}>
        <div className="flex flex-col min-h-full px-6 pt-14 pb-10" style={{ background: c.bg }}>
          <button
            onClick={() => navigate(`/action/${goal.id}`)}
            className="w-10 h-10 flex items-center justify-center rounded-full mb-10"
            style={{ background: c.surface2 }}
          >
            <ArrowLeft size={19} color={c.textPrimary} />
          </button>

          {/* Progress dots — single dot, active */}
          <div className="flex items-center gap-1.5 mb-12 justify-center">
            <motion.div animate={{ width: 26, background: '#4F46E5' }} className="h-1.5 rounded-full" />
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-5">
              <div
                className="px-3 py-1 rounded-full"
                style={{ background: 'rgba(79,70,229,0.15)', border: '1px solid rgba(79,70,229,0.3)' }}
              >
                <span style={{ color: '#A5B4FC', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em' }}>
                  👉 DO THIS
                </span>
              </div>
            </div>

            <h1
              style={{
                color: c.textPrimary,
                fontSize: '32px',
                fontWeight: 800,
                lineHeight: 1.18,
                letterSpacing: '-0.5px',
                marginBottom: '16px',
              }}
            >
              {miniStep.text}
            </h1>
            <p style={{ color: c.textTertiary, fontSize: '15px', lineHeight: 1.6 }}>
              That&apos;s it. Just this. Nothing else.
            </p>
          </div>

          <div className="mt-10">
            <motion.button
              onClick={handleMiniDone}
              whileTap={{ scale: 0.97 }}
              className="w-full flex items-center justify-center gap-3 py-5 rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                color: '#fff',
                fontSize: '18px',
                fontWeight: 700,
                boxShadow: '0 8px 28px rgba(79,70,229,0.4)',
              }}
            >
              <Check size={20} strokeWidth={2.5} />
              Done
            </motion.button>
            <p style={{ color: c.textTertiary, fontSize: '13px', textAlign: 'center', marginTop: '14px' }}>
              Action creates momentum.
            </p>
          </div>
        </div>
      </MobileShell>
    );
  }

  const total = goal.executionSteps.length;
  const current = goal.currentExecutionStep;
  const step = goal.executionSteps[current];
  const isLast = current === total - 1;
  const isComplete = goal.executionCompleted;

  // Find the next goal that still has work to do — prefer already-started ones
  const nextGoal =
    goals.find((g) => g.id !== goal.id && g.isStarted && !g.executionCompleted) ??
    goals.find((g) => g.id !== goal.id && !g.executionCompleted) ??
    null;

  const handleNext = () => {
    advanceExecutionStep(goal.id);
    recordToday();
    vibrate(60);
    if (!isLast) toast.success(`Step ${current + 1} done! Keep going ⚡`);
  };

  const handleTimerComplete = () => {
    if (settings.isPremium && settings.autoAdvanceOnTimer) {
      handleNext();
    } else {
      vibrate(80);
      toast.success("Time's up! Tap Done when ready ✓");
    }
  };

  // ─── Completion screen ────────────────────────────────────────────────────

  if (isComplete) {
    return (
      <MobileShell showNav={false}>
        <div
          className="flex flex-col min-h-full px-6 pt-14 pb-10"
          style={{ background: c.bg }}
        >
          <button
            onClick={() => navigate(`/action/${goal.id}`)}
            className="w-10 h-10 flex items-center justify-center rounded-full mb-10"
            style={{ background: c.surface2 }}
          >
            <ArrowLeft size={19} color={c.textPrimary} />
          </button>

          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 18 }}
            className="flex flex-col items-center text-center flex-1 justify-center"
          >
            {/* Success ring */}
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 2.8 }}
              className="relative mb-8"
            >
              <div
                className="w-28 h-28 rounded-full flex items-center justify-center"
                style={{
                  background: 'radial-gradient(circle, rgba(34,197,94,0.18) 0%, rgba(34,197,94,0.06) 100%)',
                  border: '2px solid rgba(34,197,94,0.5)',
                  boxShadow: '0 0 40px rgba(34,197,94,0.2)',
                }}
              >
                <Check size={48} color="#22C55E" strokeWidth={2.5} />
              </div>
              {/* Orbit dots */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0"
              >
                <div
                  className="w-3 h-3 rounded-full absolute -top-1.5 left-1/2 -translate-x-1/2"
                  style={{ background: '#22C55E', opacity: 0.6 }}
                />
              </motion.div>
            </motion.div>

            <h1
              style={{
                color: c.textPrimary,
                fontSize: '34px',
                fontWeight: 800,
                lineHeight: 1.1,
                letterSpacing: '-1px',
                marginBottom: '12px',
              }}
            >
              You started.<br />That&apos;s real.
            </h1>
            <p style={{ color: c.textSecondary, fontSize: '16px', lineHeight: 1.6, marginBottom: '14px' }}>
              Most people never even get this far.
            </p>
            <div
              className="flex items-center gap-2 px-4 py-2.5 rounded-full mb-12"
              style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}
            >
              <Zap size={14} color="#22C55E" fill="#22C55E" />
              <span style={{ color: '#22C55E', fontSize: '13px', fontWeight: 700 }}>
                {goal.stepsCompleted} step{goal.stepsCompleted !== 1 ? 's' : ''} completed
              </span>
            </div>

            <div className="w-full flex flex-col gap-3">
              <button
                onClick={() =>
                  nextGoal
                    ? navigate(`/action/${nextGoal.id}`)
                    : navigate('/projects')
                }
                className="w-full py-5 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
                style={{
                  background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                  color: '#fff',
                  fontSize: '17px',
                  fontWeight: 700,
                  boxShadow: '0 8px 28px rgba(79,70,229,0.4)',
                }}
              >
                <ArrowRight size={18} />
                {nextGoal ? 'Start next goal' : 'View all goals'}
              </button>
              <button
                onClick={() => navigate(`/action/${goal.id}`)}
                className="w-full py-4 rounded-2xl transition-all active:scale-[0.97]"
                style={{
                  background: c.surface2,
                  color: c.textPrimary,
                  fontSize: '16px',
                  fontWeight: 600,
                  border: `1px solid ${c.border}`,
                }}
              >
                Back to this goal
              </button>
              <button
                onClick={() => navigate('/momentum')}
                className="w-full py-4 rounded-2xl transition-all active:scale-[0.97]"
                style={{
                  background: 'transparent',
                  color: c.textSecondary,
                  fontSize: '15px',
                  fontWeight: 500,
                }}
              >
                View my momentum
              </button>
            </div>
          </motion.div>
        </div>
      </MobileShell>
    );
  }

  // ─── Execution step ───────────────────────────────────────────────────────

  return (
    <MobileShell showNav={false}>
      <div className="flex flex-col min-h-full px-6 pt-14 pb-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate(`/action/${goal.id}`)}
            className="w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-90"
            style={{ background: c.surface2 }}
          >
            <ArrowLeft size={19} color={c.textPrimary} />
          </button>

          <div className="flex items-center gap-2">
            <span style={{ color: c.textSecondary, fontSize: '13px', fontWeight: 600 }}>
              {current + 1} / {total}
            </span>
          </div>

          <button
            onClick={() => setTimerOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-90"
            style={{
              background: step.timerSeconds ? 'rgba(79,70,229,0.18)' : c.surface2,
              border: step.timerSeconds ? '1px solid rgba(79,70,229,0.4)' : '1px solid transparent',
            }}
          >
            <Clock size={17} color={step.timerSeconds ? '#4F46E5' : c.textSecondary} />
          </button>
        </div>

        {/* Progress Dots */}
        <div className="flex items-center gap-1.5 mb-12 justify-center">
          {goal.executionSteps.map((s, i) => (
            <motion.div
              key={s.id}
              animate={{
                width: i === current ? 26 : 7,
                background:
                  i < current
                    ? '#22C55E'
                    : i === current
                    ? '#4F46E5'
                    : c.border2,
                opacity: i > current + 1 ? 0.5 : 1,
              }}
              transition={{ duration: 0.3 }}
              className="h-1.5 rounded-full"
            />
          ))}
        </div>

        {/* Step Content */}
        <div className="flex-1 flex flex-col justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.22 }}
            >
              {/* Step label */}
              <div className="flex items-center gap-2 mb-5">
                <div
                  className="px-3 py-1 rounded-full"
                  style={{ background: 'rgba(79,70,229,0.15)', border: '1px solid rgba(79,70,229,0.3)' }}
                >
                  <span style={{ color: '#A5B4FC', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em' }}>
                    👉 DO THIS
                  </span>
                </div>
              </div>

              <h1
                style={{
                  color: c.textPrimary,
                  fontSize: '32px',
                  fontWeight: 800,
                  lineHeight: 1.18,
                  letterSpacing: '-0.5px',
                  marginBottom: '16px',
                }}
              >
                {step.text}
              </h1>
              <p style={{ color: c.textTertiary, fontSize: '15px', lineHeight: 1.6, marginBottom: '28px' }}>
                That&apos;s it. Just this. Nothing else.
              </p>

              {/* Timer widget */}
              {step.timerSeconds && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-center"
                >
                  <TaskTimer
                    key={`${current}-${step.timerSeconds}`}
                    duration={step.timerSeconds}
                    autoStart={true}
                    onComplete={handleTimerComplete}
                  />
                </motion.div>
              )}

              {step.timerSeconds && settings.isPremium && settings.autoAdvanceOnTimer && (
                <p style={{ color: '#A5B4FC', fontSize: 12, textAlign: 'center', marginTop: 10 }}>
                  ⚡ Auto-advance on · moves to next step when timer ends
                </p>
              )}

              {step.timerSeconds && !settings.isPremium && (
                <button
                  onClick={() => setShowPremium(true)}
                  className="flex items-center gap-1.5 mx-auto mt-3 px-3 py-1.5 rounded-xl transition-all active:opacity-70"
                  style={{
                    background: 'rgba(79,70,229,0.1)',
                    border: '1px solid rgba(79,70,229,0.2)',
                  }}
                >
                  <Star size={10} color="#A5B4FC" fill="#A5B4FC" />
                  <span style={{ color: '#A5B4FC', fontSize: 11, fontWeight: 600 }}>
                    Get Pro for auto-advance
                  </span>
                </button>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* CTA */}
        <div className="mt-10">
          <motion.button
            onClick={handleNext}
            whileTap={{ scale: 0.97 }}
            className="w-full flex items-center justify-center gap-3 py-5 rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
              color: '#fff',
              fontSize: '18px',
              fontWeight: 700,
              boxShadow: '0 8px 28px rgba(79,70,229,0.4)',
            }}
          >
            {isLast ? (
              <>
                <Check size={20} strokeWidth={2.5} />
                Done
              </>
            ) : (
              <>
                Next
                <ArrowRight size={20} />
              </>
            )}
          </motion.button>

          <p style={{ color: c.textTertiary, fontSize: '13px', textAlign: 'center', marginTop: '14px' }}>
            Action creates momentum.
          </p>
        </div>
      </div>

      <TimerSetterSheet
        open={timerOpen}
        current={step.timerSeconds}
        stepLabel={step.text}
        isPremium={settings.isPremium}
        onUpgradeRequired={() => {
          setTimerOpen(false);
          setShowPremium(true);
        }}
        onSet={(secs) => {
          setExecutionStepTimer(goal.id, current, secs);
          setTimerOpen(false);
          toast.success('Timer set for this step!');
        }}
        onRemove={() => setExecutionStepTimer(goal.id, current, undefined)}
        onClose={() => setTimerOpen(false)}
      />

      <PremiumModal open={showPremium} onClose={() => setShowPremium(false)} />
    </MobileShell>
  );
}