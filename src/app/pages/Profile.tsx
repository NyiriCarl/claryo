import { useState } from 'react';
import {
  ChevronRight, Zap, Edit2, Star, Bell, Brain, Smartphone,
  Flame, Target, Download, MessageSquare, Trash2, Lock, Check, ImageDown,
  Sun, Moon, LogOut,
} from 'lucide-react';
import { MobileShell } from '../components/MobileShell';
import { useGoalStore } from '../store/useGoalStore';
import { useSettingsStore, submitFeedback } from '../store/useSettingsStore';
import { useAuthStore } from '../store/useAuthStore';
import { PremiumModal } from '../components/PremiumModal';
import { ScreenExportModal } from '../components/ScreenExportModal';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useTheme } from '../contexts/ThemeContext';

function ToggleSwitch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const c = useTheme();
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onChange(!value); }}
      className="relative transition-all active:scale-90 flex-shrink-0"
      style={{
        width: 44,
        height: 26,
        borderRadius: 13,
        background: value ? '#4F46E5' : c.surface3,
        transition: 'background 0.2s',
      }}
    >
      <motion.div
        animate={{ x: value ? 20 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        style={{
          position: 'absolute',
          top: 3,
          width: 20,
          height: 20,
          borderRadius: 10,
          background: '#fff',
          boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
        }}
      />
    </button>
  );
}

function SettingRow({
  icon,
  label,
  sub,
  right,
  onClick,
  locked,
}: {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  right?: React.ReactNode;
  onClick?: () => void;
  locked?: boolean;
}) {
  const c = useTheme();
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
      className="w-full flex items-center gap-3 px-4 py-4 transition-all active:opacity-70 text-left"
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: c.surface2 }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p style={{ color: c.textPrimary, fontSize: '15px', fontWeight: 600 }}>{label}</p>
          {locked && (
            <span
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(79,70,229,0.2)', color: '#A5B4FC', fontSize: 9, fontWeight: 700 }}
            >
              <Star size={7} fill="#A5B4FC" />
              PRO
            </span>
          )}
        </div>
        {sub && <p style={{ color: c.textSecondary, fontSize: '12px' }}>{sub}</p>}
      </div>
      {right ?? <ChevronRight size={16} color={c.textSecondary} />}
    </div>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const { getStats, goals } = useGoalStore();
  const {
    settings,
    setName,
    setNotifications, setAiMode, setHaptics, setAutoAdvance, setDailyGoal, setDarkMode,
    clearAll, getStreak, vibrate,
  } = useSettingsStore();
  const { signOut } = useAuthStore();
  const c = useTheme();

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(settings.name);
  const [showPremium, setShowPremium] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showScreenExport, setShowScreenExport] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const stats = getStats();
  const streak = getStreak();
  const isDark = settings.darkMode !== false;

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleSaveName = () => {
    const trimmed = editName.trim();
    if (trimmed) {
      setName(trimmed);
      toast.success('Name updated!');
    }
    setEditing(false);
  };

  const handleNotificationsToggle = async (newVal: boolean) => {
    if (newVal && 'Notification' in window) {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        setNotifications(true);
        vibrate(40);
        toast.success('Notifications enabled! 🔔');
        setTimeout(() => {
          new Notification('Claryo', {
            body: "You're all set! We'll remind you to take action daily.",
          });
        }, 1000);
      } else {
        toast.error('Notification permission denied. Check browser settings.');
      }
    } else {
      setNotifications(newVal);
      toast.success(newVal ? 'Notifications enabled!' : 'Notifications disabled');
    }
  };

  const handleHapticsToggle = (val: boolean) => {
    setHaptics(val);
    if (val && navigator.vibrate) navigator.vibrate(60);
    toast.success(val ? 'Haptics on' : 'Haptics off');
  };

  const handleAutoAdvanceToggle = (val: boolean) => {
    if (!settings.isPremium) {
      setShowPremium(true);
      return;
    }
    setAutoAdvance(val);
    toast.success(val ? 'Auto-advance enabled ⚡' : 'Auto-advance disabled');
  };

  const handleThemeToggle = (val: boolean) => {
    setDarkMode(val);
    vibrate(30);
    toast.success(val ? '🌙 Dark mode on' : '☀️ Light mode on');
  };

  const handleExportData = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      settings: {
        name: settings.name,
        isPremium: settings.isPremium,
        streak,
        dailyGoalSteps: settings.dailyGoalSteps,
        activeDays: settings.activeDays,
      },
      goals: goals.map((g) => ({
        title: g.rewrittenTitle,
        category: g.category,
        stepsCompleted: g.stepsCompleted,
        isStarted: g.isStarted,
        executionCompleted: g.executionCompleted,
        createdAt: g.createdAt,
      })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `claryo_data_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Data exported! 📦');
  };

  const handleSendFeedback = async () => {
    if (!feedbackText.trim()) return;
    setSendingFeedback(true);
    const ok = await submitFeedback(feedbackText.trim());
    setSendingFeedback(false);
    if (ok) {
      toast.success('Feedback sent! Thank you 🙏');
      setFeedbackText('');
      setShowFeedback(false);
    } else {
      toast.error('Failed to send feedback. Try again.');
    }
  };

  const handleClearAll = () => {
    clearAll();
    toast.success('All data cleared.');
    setShowClearConfirm(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out');
      navigate('/auth', { replace: true });
    } catch {
      toast.error('Sign out failed');
    }
    setShowSignOutConfirm(false);
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  const sectionStyle = {
    background: c.surface,
    border: `1px solid ${c.border}`,
  };
  const dividerStyle = { borderBottom: `1px solid ${c.border}` };
  const sheetBg = isDark ? '#16142A' : '#FFFFFF';
  const sheetBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  return (
    <MobileShell>
      <div className="flex flex-col min-h-full px-5 pt-14 pb-10">

        {/* Avatar + Name */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center mb-7"
        >
          <div className="relative mb-4">
            <div
              className="rounded-full flex items-center justify-center"
              style={{
                width: '84px',
                height: '84px',
                background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                boxShadow: '0 0 0 3px rgba(79,70,229,0.22), 0 8px 24px rgba(79,70,229,0.3)',
              }}
            >
              <span style={{ fontSize: '34px', fontWeight: 800, color: '#fff' }}>
                {settings.name[0]?.toUpperCase() || 'Y'}
              </span>
            </div>
            <button
              onClick={() => { setEditName(settings.name); setEditing(true); }}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: '#4F46E5', border: `2px solid ${c.bg}` }}
            >
              <Edit2 size={11} color="#fff" />
            </button>
          </div>

          {editing ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                className="bg-transparent outline-none text-center border-b"
                style={{
                  color: c.textPrimary, fontSize: '22px', fontWeight: 800,
                  borderColor: '#4F46E5', maxWidth: '180px',
                }}
              />
              <button onClick={handleSaveName}>
                <Check size={17} color="#22C55E" />
              </button>
            </div>
          ) : (
            <h2 style={{ color: c.textPrimary, fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>
              {settings.name}
            </h2>
          )}

          <div className="flex items-center gap-2 mt-1.5">
            <span
              className="px-3 py-1 rounded-full"
              style={{
                background: settings.isPremium ? 'rgba(79,70,229,0.25)' : 'rgba(79,70,229,0.12)',
                color: '#A5B4FC',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              {settings.isPremium ? '⭐ Claryo Pro' : 'Claryo Free'}
            </span>
            {streak > 0 && (
              <span
                className="flex items-center gap-1 px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B', fontSize: '12px', fontWeight: 700 }}
              >
                <Flame size={10} fill="#F59E0B" />
                {streak}d
              </span>
            )}
          </div>
        </motion.div>

        {/* Stats */}
        <div
          className="flex rounded-2xl mb-5"
          style={sectionStyle}
        >
          {[
            { value: stats.total, label: 'Goals' },
            { value: stats.totalSteps, label: 'Steps Done' },
            { value: stats.executing, label: 'Completed' },
          ].map((item, i) => (
            <div
              key={item.label}
              className="flex-1 flex flex-col items-center py-4"
              style={{ borderRight: i < 2 ? `1px solid ${c.border}` : 'none' }}
            >
              <span style={{ color: c.textPrimary, fontSize: '24px', fontWeight: 800 }}>{item.value}</span>
              <span style={{ color: c.textSecondary, fontSize: '11px', marginTop: '2px' }}>{item.label}</span>
            </div>
          ))}
        </div>

        {/* Pro Banner */}
        {!settings.isPremium ? (
          <button
            onClick={() => setShowPremium(true)}
            className="rounded-2xl p-4 mb-5 w-full flex items-center justify-between transition-all active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, rgba(79,70,229,0.18), rgba(124,58,237,0.16))',
              border: '1px solid rgba(79,70,229,0.35)',
            }}
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Star size={13} color="#EAB308" fill="#EAB308" />
                <span style={{ color: c.textPrimary, fontSize: '14px', fontWeight: 700 }}>Claryo Pro</span>
              </div>
              <p style={{ color: c.textSecondary, fontSize: '12px' }}>Unlimited · Custom timers · Auto-advance</p>
            </div>
            <div
              className="px-3.5 py-2 rounded-xl"
              style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', color: '#fff', fontSize: '13px', fontWeight: 700 }}
            >
              Upgrade
            </div>
          </button>
        ) : (
          <div
            className="rounded-2xl p-4 mb-5 flex items-center gap-3"
            style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.18)' }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(34,197,94,0.15)' }}
            >
              <Star size={16} color="#22C55E" fill="#22C55E" />
            </div>
            <div>
              <p style={{ color: '#22C55E', fontSize: '13px', fontWeight: 700 }}>You&apos;re on Pro ✓</p>
              <p style={{ color: c.textSecondary, fontSize: '12px' }}>All features unlocked. Keep executing.</p>
            </div>
          </div>
        )}

        {/* Daily Goal Setting */}
        <div
          className="rounded-2xl p-4 mb-5"
          style={sectionStyle}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target size={15} color="#4F46E5" />
              <span style={{ color: c.textPrimary, fontSize: '14px', fontWeight: 600 }}>Daily step goal</span>
            </div>
            <span style={{ color: '#A5B4FC', fontSize: '15px', fontWeight: 800 }}>
              {settings.dailyGoalSteps} steps
            </span>
          </div>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 5, 7, 10].map((n) => (
              <button
                key={n}
                onClick={() => { setDailyGoal(n); vibrate(30); }}
                className="flex-1 py-2 rounded-xl transition-all active:scale-90 text-center"
                style={{
                  background: settings.dailyGoalSteps === n ? 'rgba(79,70,229,0.28)' : c.surface2,
                  border: `1.5px solid ${settings.dailyGoalSteps === n ? 'rgba(79,70,229,0.55)' : c.border}`,
                  color: settings.dailyGoalSteps === n ? '#A5B4FC' : c.textSecondary,
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Appearance + Settings */}
        <div
          className="rounded-2xl overflow-hidden mb-5"
          style={sectionStyle}
        >
          <div style={dividerStyle}>
            <SettingRow
              icon={isDark
                ? <Moon size={15} color="#A5B4FC" />
                : <Sun size={15} color="#F59E0B" />
              }
              label="Appearance"
              sub={isDark ? 'Dark mode is on' : 'Light mode is on'}
              right={
                <div className="flex items-center gap-2">
                  <Sun size={12} color={isDark ? c.textSecondary : '#F59E0B'} />
                  <ToggleSwitch value={isDark} onChange={handleThemeToggle} />
                  <Moon size={12} color={isDark ? '#A5B4FC' : c.textSecondary} />
                </div>
              }
            />
          </div>
          <div style={dividerStyle}>
            <SettingRow
              icon={<Bell size={15} color={c.textSecondary} />}
              label="Daily reminders"
              sub="Push when you slow down"
              right={<ToggleSwitch value={settings.notifications} onChange={handleNotificationsToggle} />}
            />
          </div>
          <div style={dividerStyle}>
            <SettingRow
              icon={<Brain size={15} color={c.textSecondary} />}
              label="AI Mode"
              sub="Execution engine · always on"
              right={<ToggleSwitch value={settings.aiMode} onChange={(v) => { setAiMode(v); toast.success(v ? 'AI Mode on' : 'AI Mode off'); }} />}
            />
          </div>
          <div style={dividerStyle}>
            <SettingRow
              icon={<Smartphone size={15} color={c.textSecondary} />}
              label="Haptics"
              sub="Vibration feedback on actions"
              right={<ToggleSwitch value={settings.haptics} onChange={handleHapticsToggle} />}
            />
          </div>
          <div style={dividerStyle}>
            <SettingRow
              icon={<Flame size={15} color={c.textSecondary} />}
              label="Auto-advance on timer"
              sub={settings.isPremium ? 'Move to next step when timer ends' : 'Upgrade to Pro to unlock'}
              locked={!settings.isPremium}
              right={<ToggleSwitch value={settings.autoAdvanceOnTimer} onChange={handleAutoAdvanceToggle} />}
            />
          </div>
          <div>
            <SettingRow
              icon={<Lock size={15} color={c.textSecondary} />}
              label="Privacy"
              sub="Data stored on your device + cloud"
              right={<span style={{ color: '#22C55E', fontSize: 11, fontWeight: 600 }}>Secure ✓</span>}
              onClick={() => toast.info('Your goals are encrypted and stored securely in your Supabase cloud.')}
            />
          </div>
        </div>

        {/* Account Actions */}
        <div
          className="rounded-2xl overflow-hidden mb-5"
          style={sectionStyle}
        >
          <div style={dividerStyle}>
            <SettingRow
              icon={<Download size={15} color={c.textSecondary} />}
              label="Export data"
              sub="Download your goals as JSON"
              onClick={handleExportData}
            />
          </div>
          <div style={dividerStyle}>
            <SettingRow
              icon={<MessageSquare size={15} color={c.textSecondary} />}
              label="Send feedback"
              sub="Help us build better"
              onClick={() => setShowFeedback(true)}
            />
          </div>
          <div style={dividerStyle}>
            <SettingRow
              icon={<Trash2 size={15} color="#EF4444" />}
              label="Clear all data"
              sub="Remove goals and settings"
              onClick={() => setShowClearConfirm(true)}
              right={<ChevronRight size={15} color="#EF4444" />}
            />
          </div>
          <div>
            <SettingRow
              icon={<ImageDown size={15} color="#A5B4FC" />}
              label="Export screens to PNG"
              sub="Download every screen as an image"
              onClick={() => setShowScreenExport(true)}
              right={<ChevronRight size={15} color="#A5B4FC" />}
            />
          </div>
        </div>

        {/* Start CTA */}
        <button
          onClick={() => navigate('/')}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl transition-all active:scale-[0.97] mb-3"
          style={{ background: 'rgba(79,70,229,0.12)', border: '1px solid rgba(79,70,229,0.25)', color: '#A5B4FC', fontSize: '14px', fontWeight: 700 }}
        >
          <Zap size={14} fill="currentColor" />
          Start a new goal
        </button>

        {/* Sign Out */}
        <button
          onClick={() => setShowSignOutConfirm(true)}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl transition-all active:scale-[0.97]"
          style={{ background: c.surface, border: `1px solid ${c.border}`, color: '#EF4444', fontSize: '14px', fontWeight: 700 }}
        >
          <LogOut size={14} />
          Sign Out
        </button>

        <p style={{ color: c.textTertiary, fontSize: '12px', textAlign: 'center', marginTop: '20px', lineHeight: 1.6 }}>
          &ldquo;If we can help you start,<br />we can help you change your life.&rdquo;
        </p>
      </div>

      {/* Screen Export Modal */}
      <ScreenExportModal open={showScreenExport} onClose={() => setShowScreenExport(false)} />

      {/* Premium Modal */}
      <PremiumModal open={showPremium} onClose={() => setShowPremium(false)} />

      {/* Feedback Sheet */}
      <AnimatePresence>
        {showFeedback && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
              onClick={() => setShowFeedback(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50 rounded-t-3xl"
              style={{ background: sheetBg, border: `1px solid ${sheetBorder}` }}
            >
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 rounded-full" style={{ background: c.border2 }} />
              </div>
              <div className="px-6 pb-10 pt-2">
                <h3 style={{ color: c.textPrimary, fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
                  Send Feedback
                </h3>
                <p style={{ color: c.textSecondary, fontSize: 14, marginBottom: 16, lineHeight: 1.5 }}>
                  Tell us what&apos;s working and what could be better. Every message is read.
                </p>
                <textarea
                  autoFocus
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="What's on your mind?"
                  rows={5}
                  className="w-full bg-transparent outline-none resize-none rounded-2xl p-4 mb-4"
                  style={{
                    color: c.textPrimary,
                    fontSize: 15,
                    border: '1.5px solid rgba(79,70,229,0.4)',
                    background: c.surface,
                  }}
                />
                <button
                  onClick={handleSendFeedback}
                  disabled={!feedbackText.trim() || sendingFeedback}
                  className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
                  style={{
                    background: feedbackText.trim() ? 'linear-gradient(135deg, #4F46E5, #7C3AED)' : c.surface2,
                    color: feedbackText.trim() ? '#fff' : c.textSecondary,
                    fontSize: 16,
                    fontWeight: 700,
                  }}
                >
                  {sendingFeedback ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Sending…
                    </>
                  ) : (
                    'Send Feedback'
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Clear Confirm Sheet */}
      <AnimatePresence>
        {showClearConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
              onClick={() => setShowClearConfirm(false)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[340px] z-50 rounded-3xl p-6"
              style={{ background: sheetBg, border: '1px solid rgba(239,68,68,0.3)' }}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 mx-auto"
                style={{ background: 'rgba(239,68,68,0.15)' }}
              >
                <Trash2 size={24} color="#EF4444" />
              </div>
              <h3 style={{ color: c.textPrimary, fontSize: 18, fontWeight: 800, textAlign: 'center', marginBottom: 8 }}>
                Clear all data?
              </h3>
              <p style={{ color: c.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 1.5, marginBottom: 24 }}>
                This will permanently delete all your goals, progress, and settings. This cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 py-3 rounded-2xl"
                  style={{ background: c.surface2, color: c.textPrimary, fontSize: 15, fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearAll}
                  className="flex-1 py-3 rounded-2xl"
                  style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', color: '#EF4444', fontSize: 15, fontWeight: 700 }}
                >
                  Clear All
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Sign Out Confirm */}
      <AnimatePresence>
        {showSignOutConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
              onClick={() => setShowSignOutConfirm(false)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[340px] z-50 rounded-3xl p-6"
              style={{ background: sheetBg, border: `1px solid ${sheetBorder}` }}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 mx-auto"
                style={{ background: 'rgba(79,70,229,0.15)' }}
              >
                <LogOut size={24} color="#4F46E5" />
              </div>
              <h3 style={{ color: c.textPrimary, fontSize: 18, fontWeight: 800, textAlign: 'center', marginBottom: 8 }}>
                Sign out?
              </h3>
              <p style={{ color: c.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 1.5, marginBottom: 24 }}>
                Your data is safely synced to the cloud. You can sign back in anytime.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSignOutConfirm(false)}
                  className="flex-1 py-3 rounded-2xl"
                  style={{ background: c.surface2, color: c.textPrimary, fontSize: 15, fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSignOut}
                  className="flex-1 py-3 rounded-2xl"
                  style={{ background: 'rgba(79,70,229,0.15)', border: '1px solid rgba(79,70,229,0.3)', color: '#A5B4FC', fontSize: 15, fontWeight: 700 }}
                >
                  Sign Out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </MobileShell>
  );
}