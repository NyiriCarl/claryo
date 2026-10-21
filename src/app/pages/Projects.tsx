import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, ArrowRight, Trash2, Zap, Check, Search } from 'lucide-react';
import { MobileShell } from '../components/MobileShell';
import { useGoalStore } from '../store/useGoalStore';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../contexts/ThemeContext';

const CAT_EMOJI: Record<string, string> = {
  business: '🚀', learn: '💻', fitness: '💪', creative: '🎨', general: '🎯',
};
const CAT_COLOR: Record<string, string> = {
  business: '#F59E0B', learn: '#4F46E5', fitness: '#22C55E', creative: '#EC4899', general: '#8B5CF6',
};

const FILTERS = [
  { label: 'All', value: 'all' },
  { label: '🚀', value: 'business' },
  { label: '💻', value: 'learn' },
  { label: '💪', value: 'fitness' },
  { label: '🎨', value: 'creative' },
  { label: '🎯', value: 'general' },
];

export default function Projects() {
  const navigate = useNavigate();
  const { goals, deleteGoal } = useGoalStore();
  const c = useTheme();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all' ? goals : goals.filter((g) => g.category === filter);

  const handleDeleteClick = (goalId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmId(goalId);
  };

  const handleConfirmDelete = () => {
    if (!confirmId) return;
    setDeletingId(confirmId);
    setConfirmId(null);
    setTimeout(() => {
      deleteGoal(confirmId);
      setDeletingId(null);
    }, 250);
  };

  const startedCount = goals.filter((g) => g.isStarted).length;
  const completedCount = goals.filter((g) => g.executionCompleted).length;

  return (
    <MobileShell>
      <div className="flex flex-col min-h-full px-5 pt-14 pb-4">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 style={{ color: c.textPrimary, fontSize: '26px', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '3px' }}>
              My Goals
            </h1>
            <p style={{ color: c.textSecondary, fontSize: '13px' }}>
              {goals.length === 0
                ? 'Nothing here yet'
                : `${goals.length} total · ${startedCount} active · ${completedCount} done`}
            </p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="w-11 h-11 flex items-center justify-center rounded-2xl transition-all active:scale-90"
            style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', boxShadow: '0 4px 16px rgba(79,70,229,0.4)' }}
          >
            <Plus size={21} color="#fff" />
          </button>
        </div>

        {/* Category Filter */}
        {goals.length > 0 && (
          <div className="flex gap-2 mb-5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className="flex-shrink-0 px-3.5 py-2 rounded-xl transition-all active:scale-95"
                style={{
                  background: filter === f.value ? 'rgba(79,70,229,0.22)' : c.surface2,
                  border: `1.5px solid ${filter === f.value ? 'rgba(79,70,229,0.5)' : c.border}`,
                  color: filter === f.value ? '#A5B4FC' : c.textSecondary,
                  fontSize: f.value === 'all' ? 13 : 16,
                  fontWeight: filter === f.value ? 700 : 500,
                  whiteSpace: 'nowrap',
                  minWidth: f.value === 'all' ? 'auto' : '42px',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {/* Empty */}
        {goals.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div style={{ fontSize: '52px', marginBottom: '14px' }}>🎯</div>
            <h2 style={{ color: c.textPrimary, fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
              No goals yet
            </h2>
            <p style={{ color: c.textSecondary, fontSize: '14px', lineHeight: 1.6, maxWidth: '220px', marginBottom: '24px' }}>
              Type anything you want to start. I&apos;ll break it down.
            </p>
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-6 py-4 rounded-2xl transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', color: '#fff', fontSize: '15px', fontWeight: 700, boxShadow: '0 6px 20px rgba(79,70,229,0.4)' }}
            >
              <Zap size={15} fill="currentColor" />
              Start something
            </button>
          </motion.div>
        )}

        {/* Filter empty */}
        {goals.length > 0 && filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center py-16 text-center"
          >
            <p style={{ color: c.textSecondary, fontSize: '14px' }}>No goals in this category.</p>
            <button
              onClick={() => setFilter('all')}
              className="mt-3 px-4 py-2 rounded-xl"
              style={{ background: 'rgba(79,70,229,0.12)', color: '#A5B4FC', fontSize: 13, fontWeight: 600 }}
            >
              Show all
            </button>
          </motion.div>
        )}

        {/* List */}
        <AnimatePresence>
          <div className="flex flex-col gap-3">
            {filtered.map((goal, idx) => {
              const color = CAT_COLOR[goal.category] || '#4F46E5';
              const emoji = CAT_EMOJI[goal.category] || '🎯';
              const isDeleting = deletingId === goal.id;

              const done =
                (goal.startNow.completed ? 1 : 0) +
                (goal.nextStep.completed ? 1 : 0) +
                goal.miniBreakdown.filter((s) => s.completed).length +
                goal.executionSteps.filter((s) => s.completed).length;
              const total =
                1 + 1 + goal.miniBreakdown.length + goal.executionSteps.length;
              const percent = total > 0 ? Math.round((done / total) * 100) : 0;

              return (
                <motion.div
                  key={goal.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: isDeleting ? 0 : 1, scale: isDeleting ? 0.95 : 1, y: 0 }}
                  transition={{ duration: 0.22, delay: idx * 0.04 }}
                  onClick={() => navigate(`/action/${goal.id}`)}
                  className="rounded-2xl p-4 cursor-pointer transition-all active:opacity-70"
                  style={{ background: c.surface, border: `1px solid ${c.border}` }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${color}18` }}
                    >
                      <span style={{ fontSize: '20px' }}>{emoji}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p
                          style={{
                            color: c.textPrimary,
                            fontSize: '15px',
                            fontWeight: 700,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            flex: 1,
                          }}
                        >
                          {goal.rewrittenTitle}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 mb-2">
                        {goal.executionCompleted ? (
                          <span
                            className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(34,197,94,0.12)', color: '#22C55E', fontSize: '10px', fontWeight: 700 }}
                          >
                            <Check size={8} strokeWidth={2.5} />
                            DONE
                          </span>
                        ) : goal.isStarted ? (
                          <span
                            className="px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(79,70,229,0.18)', color: '#A5B4FC', fontSize: '10px', fontWeight: 700 }}
                          >
                            IN PROGRESS
                          </span>
                        ) : (
                          <span
                            className="px-2 py-0.5 rounded-full"
                            style={{ background: c.surface3, color: c.textSecondary, fontSize: '10px', fontWeight: 700 }}
                          >
                            NOT STARTED
                          </span>
                        )}
                        <span style={{ color: c.textSecondary, fontSize: '11px' }}>
                          {percent}%
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="h-1 rounded-full overflow-hidden" style={{ background: c.border }}>
                        <div
                          className="h-1 rounded-full transition-all"
                          style={{
                            width: `${percent}%`,
                            background: goal.executionCompleted
                              ? '#22C55E'
                              : goal.isStarted
                              ? 'linear-gradient(90deg, #4F46E5, #7C3AED)'
                              : c.textTertiary,
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={(e) => handleDeleteClick(goal.id, e)}
                        className="w-8 h-8 flex items-center justify-center rounded-xl transition-all active:scale-90"
                        style={{ background: c.surface2 }}
                      >
                        <Trash2 size={13} color={c.textSecondary} />
                      </button>
                      <ArrowRight size={14} color={c.textSecondary} />
                    </div>
                  </div>

                  {/* Preview next action */}
                  {!goal.isStarted && (
                    <div
                      className="mt-3 px-3 py-2 rounded-xl flex items-center gap-2"
                      style={{ background: 'rgba(79,70,229,0.1)', border: '1px solid rgba(79,70,229,0.18)' }}
                    >
                      <Zap size={11} color="#4F46E5" fill="#4F46E5" />
                      <p
                        style={{
                          color: '#A5B4FC',
                          fontSize: '12px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {goal.startNow.text}
                      </p>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>

        {/* Delete Confirm Modal */}
        <AnimatePresence>
          {confirmId && (() => {
            const target = goals.find((g) => g.id === confirmId);
            return (
              <motion.div
                key="confirm-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 flex items-end justify-center pb-8 px-5"
                style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
                onClick={() => setConfirmId(null)}
              >
                <motion.div
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 40, opacity: 0 }}
                  transition={{ type: 'spring', damping: 22, stiffness: 300 }}
                  className="w-full rounded-3xl p-6"
                  style={{ background: c.surface, border: `1.5px solid ${c.border}` }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Icon */}
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 mx-auto"
                    style={{ background: 'rgba(239,68,68,0.12)' }}
                  >
                    <Trash2 size={22} color="#EF4444" />
                  </div>

                  <h2 style={{ color: c.textPrimary, fontSize: '18px', fontWeight: 800, textAlign: 'center', marginBottom: '6px' }}>
                    Delete goal?
                  </h2>
                  <p style={{ color: c.textSecondary, fontSize: '13px', textAlign: 'center', lineHeight: 1.6, marginBottom: '22px' }}>
                    {target ? `"${target.rewrittenTitle}"` : 'This goal'} and all its progress will be permanently removed.
                  </p>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setConfirmId(null)}
                      className="flex-1 py-3.5 rounded-2xl transition-all active:scale-95"
                      style={{ background: c.surface2, border: `1px solid ${c.border}`, color: c.textPrimary, fontSize: '15px', fontWeight: 700 }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmDelete}
                      className="flex-1 py-3.5 rounded-2xl transition-all active:scale-95"
                      style={{ background: '#EF4444', color: '#fff', fontSize: '15px', fontWeight: 700, boxShadow: '0 4px 16px rgba(239,68,68,0.35)' }}
                    >
                      Delete
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            );
          })()}
        </AnimatePresence>
      </div>
    </MobileShell>
  );
}