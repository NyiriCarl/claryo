import { useState } from 'react';
import { X, Clock, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const PRESETS = [
  { label: '1 min', seconds: 60 },
  { label: '2 min', seconds: 120 },
  { label: '5 min', seconds: 300 },
  { label: '10 min', seconds: 600 },
  { label: '15 min', seconds: 900 },
  { label: '25 min', seconds: 1500 },
];

interface TimerSetterSheetProps {
  open: boolean;
  current?: number;
  onSet: (seconds: number) => void;
  onRemove?: () => void;
  onClose: () => void;
  stepLabel?: string;
  isPremium?: boolean;
  onUpgradeRequired?: () => void;
}

export function TimerSetterSheet({
  open,
  current,
  onSet,
  onRemove,
  onClose,
  stepLabel,
  isPremium = false,
  onUpgradeRequired,
}: TimerSetterSheetProps) {
  const [customMins, setCustomMins] = useState('');
  const [customSecs, setCustomSecs] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const handlePreset = (secs: number) => {
    onSet(secs);
    setShowCustom(false);
    onClose();
  };

  const handleCustomSet = () => {
    const m = parseInt(customMins || '0');
    const s = parseInt(customSecs || '0');
    const total = m * 60 + s;
    if (total > 0) {
      onSet(total);
      setCustomMins('');
      setCustomSecs('');
      setShowCustom(false);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50 rounded-t-3xl"
            style={{
              background: '#16142A',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div
                className="w-10 h-1 rounded-full"
                style={{ background: 'rgba(255,255,255,0.15)' }}
              />
            </div>

            <div className="px-6 pb-10 pt-2">
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(79,70,229,0.2)' }}
                  >
                    <Clock size={16} color="#4F46E5" />
                  </div>
                  <div>
                    <h3
                      style={{
                        color: '#F8FAFC',
                        fontSize: 17,
                        fontWeight: 700,
                        lineHeight: 1.2,
                      }}
                    >
                      {current ? 'Change Timer' : 'Add Timer'}
                    </h3>
                    {stepLabel && (
                      <p
                        style={{
                          color: '#94A3B8',
                          fontSize: 12,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: 200,
                        }}
                      >
                        {stepLabel}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-full"
                  style={{ background: 'rgba(255,255,255,0.07)' }}
                >
                  <X size={16} color="#94A3B8" />
                </button>
              </div>

              {/* Current timer indicator */}
              {current && (
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-xl mb-4"
                  style={{
                    background: 'rgba(79,70,229,0.15)',
                    border: '1px solid rgba(79,70,229,0.3)',
                  }}
                >
                  <Clock size={14} color="#4F46E5" />
                  <span style={{ color: '#A5B4FC', fontSize: 13, fontWeight: 600 }}>
                    Current: {Math.floor(current / 60)}m {current % 60 > 0 ? `${current % 60}s` : ''}
                  </span>
                </div>
              )}

              {/* Presets grid */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {PRESETS.map((p) => (
                  <button
                    key={p.seconds}
                    onClick={() => handlePreset(p.seconds)}
                    className="py-4 rounded-2xl flex items-center justify-center transition-all active:scale-95"
                    style={{
                      background:
                        current === p.seconds
                          ? 'rgba(79,70,229,0.3)'
                          : 'rgba(255,255,255,0.05)',
                      border: `1.5px solid ${
                        current === p.seconds
                          ? 'rgba(79,70,229,0.6)'
                          : 'rgba(255,255,255,0.08)'
                      }`,
                      color: current === p.seconds ? '#A5B4FC' : '#F8FAFC',
                      fontSize: 15,
                      fontWeight: 700,
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Custom */}
              {showCustom ? (
                <div
                  className="rounded-2xl p-4 mb-4"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  <p
                    style={{
                      color: '#94A3B8',
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      marginBottom: 12,
                    }}
                  >
                    CUSTOM DURATION
                  </p>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 text-center">
                      <input
                        type="number"
                        inputMode="numeric"
                        value={customMins}
                        onChange={(e) => setCustomMins(e.target.value)}
                        placeholder="00"
                        min="0"
                        max="99"
                        className="w-full text-center rounded-xl py-3 bg-transparent outline-none"
                        style={{
                          color: '#F8FAFC',
                          fontSize: 28,
                          fontWeight: 800,
                          border: '1.5px solid rgba(79,70,229,0.4)',
                        }}
                      />
                      <p
                        style={{
                          color: '#94A3B8',
                          fontSize: 11,
                          marginTop: 4,
                          fontWeight: 600,
                        }}
                      >
                        MIN
                      </p>
                    </div>
                    <span
                      style={{
                        color: '#F8FAFC',
                        fontSize: 32,
                        fontWeight: 800,
                        paddingBottom: 20,
                      }}
                    >
                      :
                    </span>
                    <div className="flex-1 text-center">
                      <input
                        type="number"
                        inputMode="numeric"
                        value={customSecs}
                        onChange={(e) => setCustomSecs(e.target.value)}
                        placeholder="00"
                        min="0"
                        max="59"
                        className="w-full text-center rounded-xl py-3 bg-transparent outline-none"
                        style={{
                          color: '#F8FAFC',
                          fontSize: 28,
                          fontWeight: 800,
                          border: '1.5px solid rgba(79,70,229,0.4)',
                        }}
                      />
                      <p
                        style={{
                          color: '#94A3B8',
                          fontSize: 11,
                          marginTop: 4,
                          fontWeight: 600,
                        }}
                      >
                        SEC
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleCustomSet}
                    className="w-full py-3 rounded-xl transition-all active:scale-[0.98]"
                    style={{
                      background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                      color: '#fff',
                      fontSize: 15,
                      fontWeight: 700,
                    }}
                  >
                    Set Custom Timer
                  </button>
                </div>
              ) : isPremium ? (
                <button
                  onClick={() => setShowCustom(true)}
                  className="w-full py-3 rounded-2xl mb-3 transition-all active:opacity-70"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: '#94A3B8',
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  + Custom duration
                </button>
              ) : (
                <button
                  onClick={onUpgradeRequired}
                  className="w-full py-3 rounded-2xl mb-3 transition-all active:opacity-70 flex items-center justify-center gap-2"
                  style={{
                    background: 'rgba(79,70,229,0.08)',
                    border: '1px solid rgba(79,70,229,0.2)',
                    color: '#A5B4FC',
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  <Star size={13} color="#A5B4FC" fill="#A5B4FC" />
                  Custom duration · Pro
                </button>
              )}

              {/* Remove timer */}
              {current !== undefined && onRemove && (
                <button
                  onClick={() => {
                    onRemove();
                    onClose();
                  }}
                  className="w-full py-3 rounded-2xl transition-all active:opacity-70"
                  style={{
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.15)',
                    color: '#EF4444',
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  Remove timer
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}