import { describe, expect, it } from 'vitest';
import * as timer from '../../src/app/lib/timer';

describe('focus timer (timestamp based)', () => {
  it('counts down across a long gap, as when the app was backgrounded', () => {
    let s = timer.start(timer.idleTimer(600), 1_000);
    expect(timer.remainingMs(s, 1_000)).toBe(600_000);
    expect(timer.remainingMs(s, 1_000 + 120_000)).toBe(480_000); // 2 minutes "in the background"
    expect(timer.isTimeUp(s, 1_000 + 700_000)).toBe(true);
    expect(timer.remainingMs(s, 1_000 + 700_000)).toBe(0);
  });

  it('pauses and resumes without losing or gaining time', () => {
    let s = timer.start(timer.idleTimer(300), 0);
    s = timer.pause(s, 60_000);
    expect(timer.remainingMs(s, 10_000_000)).toBe(240_000); // time doesn't move while paused
    s = timer.resume(s, 10_000_000);
    expect(timer.remainingMs(s, 10_030_000)).toBe(210_000);
  });

  it('resets to the chosen duration and supports no-timer (elapsed) mode', () => {
    let s = timer.start(timer.idleTimer(300), 0);
    s = timer.reset(s);
    expect(s.state).toBe('idle');
    expect(timer.remainingMs(s, 99_999)).toBe(300_000);
    const open = timer.start(timer.idleTimer(null), 0);
    expect(timer.remainingMs(open, 5000)).toBeNull();
    expect(timer.elapsedMs(open, 5000)).toBe(5000);
    expect(timer.isTimeUp(open, 1e9)).toBe(false);
  });

  it('extends after time is up', () => {
    const s = timer.start(timer.idleTimer(60), 0);
    const e = timer.extend(s, 90_000, 300);
    expect(timer.remainingMs(e, 90_000)).toBe(300_000);
  });

  it('formats clock values', () => {
    expect(timer.formatClock(0)).toBe('0:00');
    expect(timer.formatClock(599_001)).toBe('10:00');
    expect(timer.formatClock(3_725_000)).toBe('1:02:05');
  });
});
