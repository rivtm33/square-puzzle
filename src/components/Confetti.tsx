import { useMemo } from 'react';
import { COLORS, COLOR_ORDER } from '../game/colors';

/** クリア時の紙吹雪。CSS アニメーションだけで完結させる */
export function Confetti({ count = 70 }: { count?: number }) {
  const bits = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        dx: (Math.random() - 0.5) * 220,
        rot: 360 + Math.random() * 1080,
        dur: 2.2 + Math.random() * 1.8,
        delay: Math.random() * 0.7,
        color: COLORS[COLOR_ORDER[i % COLOR_ORDER.length]].base,
        w: 6 + Math.random() * 6,
      })),
    [count],
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden" aria-hidden>
      {bits.map((b) => (
        <span
          key={b.id}
          className="confetti-bit"
          style={{
            left: `${b.left}%`,
            width: b.w,
            background: b.color,
            ['--dx' as string]: `${b.dx}px`,
            ['--rot' as string]: `${b.rot}deg`,
            ['--dur' as string]: `${b.dur}s`,
            ['--delay' as string]: `${b.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
