import { useEffect, useRef, useState } from 'react';

/**
 * Animates a number toward `target` with an ease-out curve.
 * Starts from 0 on first mount, then animates between changes.
 *
 * Returns `[value, bump]` — `bump` increments every time `target` changes
 * (including the initial mount), so keying an element on it replays a
 * one-shot "pop" animation exactly once per change.
 */
export function useCountUp(target: number, duration = 600): [number, number] {
  const [value, setValue] = useState(0);
  const [bump, setBump] = useState(0);
  const prevTargetRef = useRef<number | null>(null);
  const valueRef = useRef(0);

  useEffect(() => {
    const prev = prevTargetRef.current;
    prevTargetRef.current = target;

    if (prev === null) {
      // Mount: animate from 0 up to the initial value.
      if (target === 0) {
        valueRef.current = 0;
        setValue(0);
        return;
      }
    } else if (prev === target) {
      valueRef.current = target;
      setValue(target);
      return;
    }

    setBump(b => b + 1);

    const from = prev === null ? 0 : valueRef.current;
    const start = performance.now();
    let frame = 0;

    const step = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const next = Math.round(from + (target - from) * eased);
      valueRef.current = next;
      setValue(next);
      if (p < 1) frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return [value, bump];
}
