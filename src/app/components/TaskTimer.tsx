import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { motion } from 'motion/react';

interface TaskTimerProps {
  duration: number; // seconds
  autoStart?: boolean;
  onComplete?: () => void;
  compact?: boolean;
}

export function TaskTimer({
  duration,
  autoStart = false,
  onComplete,
  compact = false,
}: TaskTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isRunning, setIsRunning] = useState(autoStart);
  const [done, setDone] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval>>();
  // Flag set inside the updater to avoid calling setState from within a setState updater
  const completionPendingRef = useRef(false);

  useEffect(() => {
    setTimeLeft(duration);
    setIsRunning(autoStart);
    setDone(false);
    completionPendingRef.current = false;
  }, [duration]);

  useEffect(() => {
    if (isRunning && !done) {
      completionPendingRef.current = false;
      tickRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            clearInterval(tickRef.current);
            completionPendingRef.current = true;
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(tickRef.current);
  }, [isRunning, done]);

  // Handle completion outside the updater — safe to call setState + callbacks here
  useEffect(() => {
    if (timeLeft === 0 && completionPendingRef.current) {
      completionPendingRef.current = false;
      setIsRunning(false);
      setDone(true);
      onComplete?.();
    }
  }, [timeLeft, onComplete]);

  const reset = () => {
    clearInterval(tickRef.current);
    completionPendingRef.current = false;
    setTimeLeft(duration);
    setIsRunning(false);
    setDone(false);
  };

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
  const progress = duration > 0 ? (duration - timeLeft) / duration : 0;

  const R = compact ? 28 : 46;
  const SIZE = compact ? 72 : 120;
  const STROKE = compact ? 3 : 5;
  const circ = 2 * Math.PI * R;
  const offset = circ * (1 - progress);

  const color = done ? '#22C55E' : timeLeft <= 10 && timeLeft > 0 ? '#EF4444' : '#4F46E5';

  return (
    <div className={`flex flex-col items-center ${compact ? 'gap-2' : 'gap-5'}`}>
      {/* Circular Progress */}
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg
          width={SIZE}
          height={SIZE}
          className="block"
          style={{ transform: 'rotate(-90deg)' }}
        >
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={STROKE}
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke={color}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.8s linear, stroke 0.3s' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {done ? (
            <span style={{ fontSize: compact ? 20 : 32 }}>✓</span>
          ) : (
            <span
              style={{
                color: timeLeft <= 10 && timeLeft > 0 ? '#EF4444' : '#F8FAFC',
                fontSize: compact ? 14 : 24,
                fontWeight: 800,
                fontFamily: 'Inter, sans-serif',
                letterSpacing: '-0.5px',
                transition: 'color 0.3s',
              }}
            >
              {timeStr}
            </span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="flex items-center justify-center rounded-full transition-all active:scale-90"
          style={{
            width: compact ? 32 : 40,
            height: compact ? 32 : 40,
            background: 'rgba(255,255,255,0.07)',
          }}
        >
          <RotateCcw size={compact ? 13 : 16} color="#94A3B8" />
        </button>

        <motion.button
          onClick={() => !done && setIsRunning((r) => !r)}
          whileTap={{ scale: 0.93 }}
          className="flex items-center justify-center rounded-full"
          style={{
            width: compact ? 40 : 56,
            height: compact ? 40 : 56,
            background: done
              ? 'rgba(34,197,94,0.25)'
              : isRunning
              ? 'rgba(79,70,229,0.3)'
              : 'linear-gradient(135deg, #4F46E5, #7C3AED)',
            boxShadow:
              done || isRunning ? 'none' : '0 4px 20px rgba(79,70,229,0.4)',
          }}
        >
          {!done &&
            (isRunning ? (
              <Pause size={compact ? 16 : 22} color="#fff" />
            ) : (
              <Play size={compact ? 16 : 22} color="#fff" fill="#fff" />
            ))}
        </motion.button>
      </div>

      {!compact && (
        <p
          style={{
            color: done ? '#22C55E' : isRunning ? '#A5B4FC' : '#94A3B8',
            fontSize: 13,
            fontWeight: 600,
            transition: 'color 0.3s',
          }}
        >
          {done ? "Time's up! Great job ✓" : isRunning ? 'Timer running…' : 'Tap ▶ to start'}
        </p>
      )}
    </div>
  );
}

// Compact inline timer badge used in ActionScreen
interface InlineTimerBadgeProps {
  duration: number;
  onEdit: () => void;
  onRemove: () => void;
  onComplete?: () => void;
}

export function InlineTimerBadge({
  duration,
  onEdit,
  onRemove,
  onComplete,
}: InlineTimerBadgeProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isRunning, setIsRunning] = useState(false);
  const [done, setDone] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval>>();
  // Flag set inside the updater to avoid calling setState from within a setState updater
  const completionPendingRef = useRef(false);

  useEffect(() => {
    setTimeLeft(duration);
    setIsRunning(false);
    setDone(false);
    completionPendingRef.current = false;
  }, [duration]);

  useEffect(() => {
    if (isRunning && !done) {
      completionPendingRef.current = false;
      tickRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            clearInterval(tickRef.current);
            completionPendingRef.current = true;
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(tickRef.current);
  }, [isRunning, done]);

  // Handle completion outside the updater — safe to call setState + callbacks here
  useEffect(() => {
    if (timeLeft === 0 && completionPendingRef.current) {
      completionPendingRef.current = false;
      setIsRunning(false);
      setDone(true);
      onComplete?.();
    }
  }, [timeLeft, onComplete]);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

  return (
    <div className="flex items-center gap-2 mt-2 flex-wrap">
      <button
        onClick={() => !done && setIsRunning((r) => !r)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all active:scale-95"
        style={{
          background: done
            ? 'rgba(34,197,94,0.15)'
            : isRunning
            ? 'rgba(79,70,229,0.2)'
            : 'rgba(255,255,255,0.07)',
          border: `1px solid ${
            done
              ? 'rgba(34,197,94,0.3)'
              : isRunning
              ? 'rgba(79,70,229,0.4)'
              : 'rgba(255,255,255,0.1)'
          }`,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: done ? '#22C55E' : isRunning ? '#A5B4FC' : '#94A3B8',
          }}
        >
          {done ? '✓ Done' : isRunning ? `⏱ ${timeStr}` : `▶ ${timeStr}`}
        </span>
      </button>
      {!done && (
        <button
          onClick={onEdit}
          style={{ color: '#4F46E5', fontSize: 12, fontWeight: 600 }}
        >
          Edit
        </button>
      )}
      {!isRunning && !done && (
        <button
          onClick={onRemove}
          style={{ color: '#EF4444', fontSize: 12, fontWeight: 600 }}
        >
          Remove
        </button>
      )}
    </div>
  );
}
