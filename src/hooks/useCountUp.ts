import { useEffect, useRef, useState } from 'react';

/** Eases a displayed number toward `target` whenever it changes. */
export function useCountUp(target: number, duration = 600) {
  const [value, setValue] = useState(target);
  const valueRef = useRef(target);

  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const from = valueRef.current;
    if (reduced || from === target) {
      valueRef.current = target;
      setValue(target);
      return;
    }

    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 4);
      const next = Math.round(from + (target - from) * eased);
      valueRef.current = next;
      setValue(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}
