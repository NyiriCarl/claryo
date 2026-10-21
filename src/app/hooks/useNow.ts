import { useEffect, useState } from 'react';

/** Re-renders every `ms` while `active`, and immediately when the app becomes visible again. */
export function useNow(active: boolean, ms = 250): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const onVisible = () => document.visibilityState === 'visible' && tick();
    document.addEventListener('visibilitychange', onVisible);
    const id = active ? setInterval(tick, ms) : undefined;
    return () => {
      if (id) clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [active, ms]);
  return now;
}
