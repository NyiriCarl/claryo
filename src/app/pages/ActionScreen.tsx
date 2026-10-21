import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  ArrowLeft, ChevronDown, ChevronUp, Check, ArrowRight,
  Zap, Minimize2, Clock, MoreHorizontal,
} from 'lucide-react';
import { MobileShell } from '../components/MobileShell';
import { useGoalStore } from '../store/useGoalStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { InlineTimerBadge } from '../components/TaskTimer';
import { TimerSetterSheet } from '../components/TimerSetterSheet';
import { PremiumModal } from '../components/PremiumModal';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useTheme } from '../contexts/ThemeContext';

type TimerTarget =
  | { type: 'startNow' }
  | { type: 'nextStep' }
  | { type: 'mini'; stepId: string }
  | null;

export default function ActionScreen() {
  const { goalId } = useParams<{ goalId: string }>();
  const navigate = useNavigate();
  const {
    goals, completeStartNow, completeNextStep, completeMiniStep,
    markStarted, setStartNowTimer, setNextStepTimer, setMiniStepTimer,
    seekToExecutionStep,
  } = useGoalStore();
  const { settings, recordToday, vibrate } = useSettingsStore();
  const c = useTheme();

  const [showMini, setShowMini] = useState(false);
  const [simplified, setSimplified] = useState(false);
  const [showStuck, setShowStuck] = useState(false);
  const [timerTarget, setTimerTarget] = useState<TimerTarget>(null);
  const [showPremium, setShowPremium] = useState(false);

  // Reset local UI state whenever the active goal changes
  useEffect(() => {
    setShowMini(false);
    setSimplified(false);
    setShowStuck(false);
    setTimerTarget(null);
  }, [goalId]);

  const goal = goals.find((g) => g.id === goalId);

  if (!goal) {
    return (
      <MobileShell showNav={true}>
        <div className="flex items-center justify-center min-h-screen">
          <button
            onClick={() => navigate('/')}
            className="text-white px-6 py-3 rounded-xl"
            style={{ background: '#4F46E5' }}
          >
            Go Home
          </button>
        </div>
      </MobileShell>
    );
  }

  const handleStartNow = () => {
    markStarted(goal.id);
    recordToday();
    vibrate(60);
    navigate(`/execute/${goal.id}`);
  };

  const handleDoneStartNow = () => {
    markStarted(goal.id);
    completeStartNow(goal.id);
    recordToday();
    vibrate(60);
    toast.success('Step done! Launching focus mode… ⚡');
    navigate(`/execute/${goal.id}`);
  };

  const handleDoneNextStep = () => {
    completeNextStep(goal.id);
    recordToday();
    vibrate(60);
    toast.success('Nice! Opening focus mode… 🚀');
    navigate(`/execute/${goal.id}`);
  };

  const handleDoneMini = (stepId: string) => {
    completeMiniStep(goal.id, stepId);
    recordToday();
    vibrate(40);
  };

  const getCurrentTimerDuration = (target: TimerTarget): number | undefined => {
    if (!target) return undefined;
    if (target.type === 'startNow') return goal.startNow.timerSeconds;
    if (target.type === 'nextStep') return goal.nextStep.timerSeconds;
    if (target.type === 'mini') {
      return goal.miniBreakdown.find((ms) => ms.id === target.stepId)?.timerSeconds;
    }
  };

  const getCurrentStepLabel = (target: TimerTarget): string => {
    if (!target) return '';
    if (target.type === 'startNow') return goal.startNow.text;
    if (target.type === 'nextStep') return goal.nextStep.text;
    if (target.type === 'mini') {
      return goal.miniBreakdown.find((ms) => ms.id === target.stepId)?.text ?? '';
    }
    return '';
  };

  const handleSetTimer = (target: TimerTarget, seconds: number) => {
    if (!target) return;
    if (target.type === 'startNow') setStartNowTimer(goal.id, seconds);
    else if (target.type === 'nextStep') setNextStepTimer(goal.id, seconds);
    else if (target.type === 'mini') setMiniStepTimer(goal.id, target.stepId, seconds);
    toast.success('Timer set!');
  };

  const handleRemoveTimer = (target: TimerTarget) => {
    if (!target) return;
    if (target.type === 'startNow') setStartNowTimer(goal.id, undefined);
    else if (target.type === 'nextStep') setNextStepTimer(goal.id, undefined);
    else if (target.type === 'mini') setMiniStepTimer(goal.id, target.stepId, undefined);
  };

  const miniDone = goal.miniBreakdown.filter((s) => s.completed).length;
  const execDone = goal.executionSteps.filter((s) => s.completed).length;
  // Include startNow + nextStep in the full plan counts
  const totalPlanSteps = 2 + goal.executionSteps.length + goal.miniBreakdown.length;
  const totalPlanDone =
    (goal.startNow.completed ? 1 : 0) +
    (goal.nextStep.completed ? 1 : 0) +
    execDone +
    miniDone;

  // Derive progress directly from completed booleans so the % always reaches 100
  const completedCount = totalPlanDone;
  const totalCount = totalPlanSteps;
  const overallProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <MobileShell showNav={true}>
      <div className="flex flex-col min-h-full pb-10">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-14 pb-5">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-90"
            style={{ background: c.surface2 }}
          >
            <ArrowLeft size={19} color={c.textPrimary} />
          </button>

          {/* Progress pill */}
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-full"
            style={{ background: c.surface2 }}
          >
            <div className="w-2 h-2 rounded-full" style={{ background: overallProgress > 0 ? '#22C55E' : c.border2 }} />
            <span style={{ color: c.textSecondary, fontSize: '12px', fontWeight: 600 }}>
              {overallProgress}% done
            </span>
          </div>
        </div>

        {/* Progress bar (thin) */}
        <div className="px-5 mb-6">
          <div className="h-1 rounded-full overflow-hidden" style={{ background: c.border }}>
            <motion.div
              className="h-1 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${overallProgress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              style={{ background: 'linear-gradient(90deg, #4F46E5, #22C55E)' }}
            />
          </div>
        </div>

        <div className="px-5">
          {/* Goal Label */}
          <div className="mb-6">
            <p style={{ color: c.textSecondary, fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', marginBottom: '6px' }}>
              YOUR GOAL
            </p>
            <h2 style={{ color: c.textPrimary, fontSize: '24px', fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.5px' }}>
              {goal.rewrittenTitle}
            </h2>
          </div>

          {/* ⚡ PRIMARY CARD — Current active task */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="rounded-3xl p-5 mb-3"
            style={{
              background: goal.startNow.completed
                ? 'rgba(34,197,94,0.08)'
                : 'linear-gradient(145deg, rgba(79,70,229,0.22), rgba(124,58,237,0.16))',
              border: `1.5px solid ${goal.startNow.completed ? 'rgba(34,197,94,0.35)' : 'rgba(79,70,229,0.45)'}`,
            }}
          >
            {/* Card header: status badge + time */}
            <div className="flex items-center justify-between mb-4">
              <span
                className="flex items-center gap-1.5 px-3 py-1 rounded-full"
                style={{
                  background: goal.startNow.completed ? '#22C55E' : '#4F46E5',
                  color: '#fff',
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                }}
              >
                {goal.startNow.completed ? (
                  <Check size={9} strokeWidth={3} />
                ) : (
                  /* pulsing live dot */
                  <span className="relative flex items-center justify-center w-[9px] h-[9px]">
                    <span
                      className="absolute inline-flex rounded-full opacity-75 animate-ping"
                      style={{ width: 9, height: 9, background: 'rgba(255,255,255,0.55)' }}
                    />
                    <span className="relative inline-flex rounded-full w-[5px] h-[5px] bg-white" />
                  </span>
                )}
                {goal.startNow.completed ? 'STARTED ✓' : 'NOW'}
              </span>
              <span
                className="flex items-center gap-1 px-3 py-1 rounded-full"
                style={{ background: c.surface2, color: c.textSecondary, fontSize: '11px', fontWeight: 600 }}
              >
                <Clock size={10} />
                {goal.startNow.duration}
              </span>
            </div>

            {/* Task name — dominant, full attention */}
            <p
              style={{
                color: goal.startNow.completed ? c.textSecondary : c.textPrimary,
                fontSize: simplified ? '20px' : '22px',
                fontWeight: 700,
                lineHeight: 1.3,
                marginBottom: '20px',
                textDecoration: goal.startNow.completed ? 'line-through' : 'none',
                transition: 'all 0.25s',
              }}
            >
              {simplified ? goal.startNow.justStartText : goal.startNow.text}
            </p>

            {/* Timer badge */}
            {!goal.startNow.completed && goal.startNow.timerSeconds ? (
              <div className="mb-4">
                <InlineTimerBadge
                  duration={goal.startNow.timerSeconds}
                  onEdit={() => setTimerTarget({ type: 'startNow' })}
                  onRemove={() => setStartNowTimer(goal.id, undefined)}
                  onComplete={handleDoneStartNow}
                />
              </div>
            ) : !goal.startNow.completed ? (
              <button
                onClick={() => setTimerTarget({ type: 'startNow' })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl mb-4 transition-all active:opacity-70"
                style={{
                  background: c.surface2,
                  border: `1px solid ${c.border}`,
                  color: c.textSecondary,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                <Clock size={11} />
                Add timer
              </button>
            ) : null}

            {/* Primary action — dominant Start Now button */}
            {!goal.startNow.completed && (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleStartNow}
                  className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl transition-all active:scale-[0.97]"
                  style={{
                    background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                    color: '#fff',
                    fontSize: '16px',
                    fontWeight: 700,
                    boxShadow: '0 4px 20px rgba(79,70,229,0.45)',
                  }}
                >
                  <ArrowRight size={17} />
                  Start Now
                </button>
                <button
                  onClick={handleDoneStartNow}
                  className="w-14 h-14 flex items-center justify-center rounded-2xl transition-all active:scale-90"
                  style={{ background: 'rgba(34,197,94,0.14)', border: '1.5px solid rgba(34,197,94,0.3)' }}
                >
                  <Check size={20} color="#22C55E" />
                </button>
              </div>
            )}

            {goal.startNow.completed && (
              <div
                className="flex items-center gap-2 py-3 px-4 rounded-2xl"
                style={{ background: 'rgba(34,197,94,0.12)' }}
              >
                <Check size={15} color="#22C55E" />
                <span style={{ color: '#22C55E', fontSize: '14px', fontWeight: 600 }}>
                  Done! You started.
                </span>
              </div>
            )}
          </motion.div>

          {/* Simplify / Stuck — below primary card, unobtrusive */}
          {!goal.startNow.completed && (
            <div className="flex items-center gap-2 mb-5">
              <button
                onClick={() => setSimplified((s) => !s)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all active:opacity-70"
                style={{ background: c.surface2, color: c.textSecondary, fontSize: '12px', fontWeight: 500 }}
              >
                <Minimize2 size={12} />
                {simplified ? 'Back to full' : 'Make it smaller'}
              </button>
              <button
                onClick={() => setShowStuck((s) => !s)}
                className="px-3 py-2 rounded-xl transition-all active:opacity-70"
                style={{ background: c.surface2, color: c.textSecondary, fontSize: '12px', fontWeight: 500 }}
              >
                Feeling stuck?
              </button>
            </div>
          )}

          {/* Stuck Mode */}
          <AnimatePresence>
            {showStuck && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-5 rounded-2xl p-4 overflow-hidden"
                style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.25)' }}
              >
                <p style={{ color: '#EAB308', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', marginBottom: '6px' }}>
                  👉 JUST START MODE
                </p>
                <p style={{ color: c.textPrimary, fontSize: '20px', fontWeight: 700, lineHeight: 1.35, marginBottom: '4px' }}>
                  &ldquo;{goal.startNow.justStartText}&rdquo;
                </p>
                <p style={{ color: c.textSecondary, fontSize: '13px' }}>
                  That&apos;s it. Just that. Nothing else.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* → NEXT TASK PREVIEW — subordinate, always visible, never distracting */}
          {!goal.executionCompleted && goal.executionSteps.length > 0 && (() => {
            const focusStep = goal.executionSteps[goal.currentExecutionStep];
            if (!focusStep) return null;
            const stepNum = goal.currentExecutionStep + 1;
            const totalSteps = goal.executionSteps.length;
            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: goal.startNow.completed ? 1 : 0.45, y: 0 }}
                transition={{ duration: 0.35, delay: 0.1 }}
                className="rounded-2xl px-4 py-3.5 mb-5 flex items-center gap-3"
                style={{
                  background: c.surface,
                  border: `1px solid ${c.border}`,
                }}
              >
                {/* Step number chip */}
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: c.surface2 }}
                >
                  <span style={{ color: c.textSecondary, fontSize: '12px', fontWeight: 700 }}>{stepNum}</span>
                </div>

                {/* Text block */}
                <div className="flex-1 min-w-0">
                  <p style={{ color: c.textTertiary, fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', marginBottom: '2px' }}>
                    AFTER THAT · STEP {stepNum} OF {totalSteps}
                  </p>
                  <p
                    style={{
                      color: c.textSecondary,
                      fontSize: '14px',
                      fontWeight: 500,
                      lineHeight: 1.35,
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 1,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {focusStep.text}
                  </p>
                </div>

                {/* Light action */}
                <button
                  onClick={() => { markStarted(goal.id); navigate(`/execute/${goal.id}`); }}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl flex-shrink-0 transition-all active:scale-95"
                  style={{
                    background: 'rgba(79,70,229,0.1)',
                    border: '1px solid rgba(79,70,229,0.2)',
                    color: '#818CF8',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  Focus
                  <ArrowRight size={12} />
                </button>
              </motion.div>
            );
          })()}

          {/* 🧩 FULL PLAN — collapsed by default, expand on demand */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.2 }}
          >
            {/* Toggle header */}
            <button
              onClick={() => setShowMini((s) => !s)}
              className="w-full flex items-center justify-between py-3 px-1 transition-all active:opacity-70"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span style={{ color: c.textPrimary, fontSize: '14px', fontWeight: 700 }}>
                  Full plan
                </span>
                <span
                  className="px-2 py-0.5 rounded-full"
                  style={{ background: c.surface2, color: c.textSecondary, fontSize: '11px', fontWeight: 600 }}
                >
                  {totalPlanSteps} steps
                </span>
                {totalPlanDone > 0 && (
                  <span
                    className="px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E', fontSize: '11px', fontWeight: 700 }}
                  >
                    {totalPlanDone} done
                  </span>
                )}
                {goal.isStarted && !goal.executionCompleted && (
                  <span
                    className="px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(79,70,229,0.18)', color: '#A5B4FC', fontSize: '11px', fontWeight: 700 }}
                  >
                    IN PROGRESS
                  </span>
                )}
              </div>
              {showMini ? (
                <ChevronUp size={15} color={c.textSecondary} />
              ) : (
                <ChevronDown size={15} color={c.textSecondary} />
              )}
            </button>

            <AnimatePresence>
              {showMini && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  {/* ── UNIFIED FULL PLAN: startNow → nextStep → executionSteps → miniBreakdown ── */}
                  <div
                    className="rounded-2xl overflow-hidden mb-3"
                    style={{ background: c.surface, border: `1px solid ${c.border}` }}
                  >
                    {/* Header */}
                    <div
                      className="px-4 py-2.5 flex items-center gap-2"
                      style={{ borderBottom: `1px solid ${c.border}`, background: c.surface2 }}
                    >
                      <Zap size={11} color="#4F46E5" fill="#4F46E5" />
                      <span style={{ color: '#A5B4FC', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em' }}>
                        ALL STEPS · {totalPlanDone}/{totalPlanSteps} done
                      </span>
                    </div>

                    {/* ── Step 1: startNow ── */}
                    {(() => {
                      const done = goal.startNow.completed;
                      const isActive = !done;
                      return (
                        <div
                          className="px-4 py-3.5 flex items-start gap-3"
                          style={{
                            borderBottom: `1px solid ${c.border}`,
                            background: isActive && !done ? 'rgba(79,70,229,0.04)' : 'transparent',
                          }}
                        >
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                            style={{
                              background: done ? '#22C55E' : '#4F46E5',
                            }}
                          >
                            {done ? (
                              <Check size={11} color="#fff" strokeWidth={3} />
                            ) : (
                              <Zap size={10} color="#fff" fill="#fff" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span style={{ color: '#A5B4FC', fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', display: 'block', marginBottom: '2px' }}>
                              STEP 1 · {goal.startNow.duration}
                            </span>
                            <span style={{
                              color: done ? c.textSecondary : c.textPrimary,
                              fontSize: '14px',
                              fontWeight: done ? 400 : 600,
                              lineHeight: 1.4,
                              textDecoration: done ? 'line-through' : 'none',
                            }}>
                              {goal.startNow.text}
                            </span>
                          </div>
                          {!done && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDoneStartNow(); }}
                              className="w-8 h-8 flex items-center justify-center rounded-xl flex-shrink-0 transition-all active:scale-90 mt-0.5"
                              style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)' }}
                            >
                              <Check size={14} color="#22C55E" />
                            </button>
                          )}
                        </div>
                      );
                    })()}

                    {/* ── Step 2: nextStep ── */}
                    {!goal.executionCompleted && (() => {
                      const done = goal.nextStep.completed;
                      const unlocked = goal.startNow.completed;
                      return (
                        <div
                          className="px-4 py-3.5 flex items-start gap-3"
                          style={{
                            borderBottom: `1px solid ${c.border}`,
                            opacity: unlocked ? 1 : 0.45,
                          }}
                        >
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                            style={{
                              background: done ? '#22C55E' : 'transparent',
                              border: done ? 'none' : `1.5px solid ${c.border2}`,
                            }}
                          >
                            {done ? (
                              <Check size={11} color="#fff" strokeWidth={3} />
                            ) : (
                              <span style={{ color: c.textSecondary, fontSize: '10px', fontWeight: 700 }}>2</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span style={{ color: c.textTertiary, fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', display: 'block', marginBottom: '2px' }}>
                              STEP 2 · {goal.nextStep.duration}
                            </span>
                            <span style={{
                              color: done ? c.textSecondary : unlocked ? c.textPrimary : c.textSecondary,
                              fontSize: '14px',
                              fontWeight: done ? 400 : 500,
                              lineHeight: 1.4,
                              textDecoration: done ? 'line-through' : 'none',
                            }}>
                              {goal.nextStep.text}
                            </span>
                          </div>
                          {unlocked && !done && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDoneNextStep(); }}
                              className="w-8 h-8 flex items-center justify-center rounded-xl flex-shrink-0 transition-all active:scale-90 mt-0.5"
                              style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)' }}
                            >
                              <Check size={14} color="#22C55E" />
                            </button>
                          )}
                        </div>
                      );
                    })()}

                    {/* ── Execution steps (Step 3 → N) ── */}
                    {goal.executionSteps.map((step, i) => {
                      const stepNum = i + 3; // startNow=1, nextStep=2, so exec starts at 3
                      const isCurrent = i === goal.currentExecutionStep && !goal.executionCompleted && goal.isStarted;
                      const isUpcoming = !step.completed && !isCurrent;
                      return (
                        <div
                          key={step.id}
                          className="px-4 py-3.5 flex items-start gap-3"
                          style={{
                            borderBottom: `1px solid ${c.border}`,
                            background: isCurrent ? 'rgba(79,70,229,0.06)' : 'transparent',
                          }}
                        >
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                            style={{
                              background: step.completed ? '#22C55E' : isCurrent ? '#4F46E5' : c.surface2,
                              border: isUpcoming ? `1.5px solid ${c.border2}` : 'none',
                            }}
                          >
                            {step.completed ? (
                              <Check size={11} color="#fff" strokeWidth={3} />
                            ) : isCurrent ? (
                              <Zap size={10} color="#fff" fill="#fff" />
                            ) : (
                              <span style={{ color: c.textSecondary, fontSize: '10px', fontWeight: 700 }}>{stepNum}</span>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <span style={{ color: c.textTertiary, fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', display: 'block', marginBottom: '2px' }}>
                              STEP {stepNum}
                            </span>
                            <span style={{
                              color: step.completed ? c.textSecondary : isCurrent ? c.textPrimary : c.textSecondary,
                              fontSize: '14px',
                              fontWeight: isCurrent ? 600 : 400,
                              lineHeight: 1.4,
                              textDecoration: step.completed ? 'line-through' : 'none',
                            }}>
                              {step.text}
                            </span>
                            {isCurrent && (
                              <span className="flex items-center gap-1 mt-1 w-fit px-2 py-0.5 rounded-full"
                                style={{ background: 'rgba(79,70,229,0.18)', color: '#A5B4FC', fontSize: '10px', fontWeight: 700 }}>
                                ● CURRENT
                              </span>
                            )}
                          </div>

                          {!step.completed && !goal.executionCompleted && (
                            <button
                              onClick={(e) => { e.stopPropagation(); seekToExecutionStep(goal.id, i); markStarted(goal.id); navigate(`/execute/${goal.id}`); }}
                              className="flex items-center gap-1 px-2 py-1.5 rounded-xl flex-shrink-0 transition-all active:scale-90 mt-0.5"
                              style={{
                                background: isCurrent ? 'rgba(79,70,229,0.2)' : c.surface2,
                                border: isCurrent ? '1px solid rgba(79,70,229,0.4)' : `1px solid ${c.border}`,
                              }}
                            >
                              <Zap size={11} color={isCurrent ? '#818CF8' : c.textSecondary} fill={isCurrent ? '#818CF8' : 'none'} />
                              <span style={{ color: isCurrent ? '#A5B4FC' : c.textSecondary, fontSize: '10px', fontWeight: 700, letterSpacing: '0.04em' }}>
                                Focus
                              </span>
                            </button>
                          )}
                        </div>
                      );
                    })}

                    {/* ── miniBreakdown as regular steps ── */}
                    {goal.miniBreakdown.map((step, i) => {
                      const stepNum = 3 + goal.executionSteps.length + i;
                      return (
                        <div
                          key={step.id}
                          className="px-4 py-3.5 flex items-start gap-3"
                          style={{
                            borderBottom: `1px solid ${c.border}`,
                          }}
                        >
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                            style={{
                              background: step.completed ? '#22C55E' : c.surface2,
                              border: step.completed ? 'none' : `1.5px solid ${c.border2}`,
                            }}
                          >
                            {step.completed
                              ? <Check size={11} color="#fff" strokeWidth={3} />
                              : <span style={{ color: c.textSecondary, fontSize: '10px', fontWeight: 700 }}>{stepNum}</span>
                            }
                          </div>

                          <div className="flex-1 min-w-0">
                            <span style={{ color: c.textTertiary, fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', display: 'block', marginBottom: '2px' }}>
                              STEP {stepNum}
                            </span>
                            <span style={{
                              color: step.completed ? c.textSecondary : c.textPrimary,
                              fontSize: '14px',
                              fontWeight: 400,
                              lineHeight: 1.4,
                              textDecoration: step.completed ? 'line-through' : 'none',
                            }}>
                              {step.text}
                            </span>
                            {!step.completed && step.timerSeconds && (
                              <div className="mt-2">
                                <InlineTimerBadge
                                  duration={step.timerSeconds}
                                  onEdit={() => setTimerTarget({ type: 'mini', stepId: step.id })}
                                  onRemove={() => setMiniStepTimer(goal.id, step.id, undefined)}
                                  onComplete={() => handleDoneMini(step.id)}
                                />
                              </div>
                            )}
                          </div>

                          {!step.completed ? (
                            <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                              <button
                                onClick={() => setTimerTarget({ type: 'mini', stepId: step.id })}
                                className="w-7 h-7 flex items-center justify-center rounded-lg transition-all active:opacity-70"
                                style={{
                                  background: step.timerSeconds ? 'rgba(79,70,229,0.18)' : c.surface2,
                                  border: `1px solid ${step.timerSeconds ? 'rgba(79,70,229,0.4)' : c.border}`,
                                }}
                              >
                                <Clock size={11} color={step.timerSeconds ? '#4F46E5' : c.textSecondary} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDoneMini(step.id); }}
                                className="w-8 h-8 flex items-center justify-center rounded-xl transition-all active:scale-90"
                                style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)' }}
                              >
                                <Check size={14} color="#22C55E" />
                              </button>
                            </div>
                          ) : (
                            <div className="w-6 h-6 flex items-center justify-center rounded-full flex-shrink-0 mt-0.5"
                              style={{ background: 'rgba(34,197,94,0.15)' }}>
                              <Check size={11} color="#22C55E" />
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Footer */}
                    {!goal.executionCompleted && (
                      <button
                        onClick={() => { markStarted(goal.id); navigate(`/execute/${goal.id}`); }}
                        className="w-full flex items-center justify-center gap-2 py-3 transition-all active:opacity-70"
                        style={{ color: '#4F46E5', fontSize: '13px', fontWeight: 700 }}
                      >
                        <ArrowRight size={13} />
                        {goal.isStarted ? 'Continue in Focus Mode' : 'Start Focus Mode'}
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>

      <TimerSetterSheet
        open={timerTarget !== null}
        current={getCurrentTimerDuration(timerTarget)}
        stepLabel={getCurrentStepLabel(timerTarget)}
        isPremium={settings.isPremium}
        onUpgradeRequired={() => {
          setTimerTarget(null);
          setShowPremium(true);
        }}
        onSet={(secs) => {
          handleSetTimer(timerTarget, secs);
          setTimerTarget(null);
        }}
        onRemove={() => handleRemoveTimer(timerTarget)}
        onClose={() => setTimerTarget(null)}
      />

      <PremiumModal open={showPremium} onClose={() => setShowPremium(false)} />
    </MobileShell>
  );
}
