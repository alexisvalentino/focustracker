'use client';

const COLORS = ['#38BDF8', '#F472B6', '#FBBF24', '#34D399', '#A78BFA', '#FB7185', '#60A5FA'];

// Pieces fly outward from a burst point in an explosive arc with gravity
const PIECES = Array.from({ length: 30 }, (_, i) => {
  const angle = (i * 137.5 * Math.PI) / 180;
  const dist = 65 + ((i * 49) % 95);
  const bx = Math.round(Math.cos(angle) * dist);
  const by = Math.round(Math.sin(angle) * dist - 25);
  const gy = 50 + ((i * 29) % 60);
  const isCircle = i % 4 === 0;

  return {
    left: 50,
    top: 32,
    bx: `${bx}px`,
    by: `${by}px`,
    gy: `${gy}px`,
    delay: `${((i % 6) * 0.02).toFixed(3)}s`,
    dur: `${(1.2 + (i % 4) * 0.12).toFixed(2)}s`,
    color: COLORS[i % COLORS.length],
    w: isCircle ? 7 : 6 + (i % 3) * 2,
    h: isCircle ? 7 : 10 + (i % 4) * 3,
    round: isCircle,
    r1: `${((i * 47) % 180) - 90}deg`,
    r2: `${((i * 89) % 360) - 180}deg`,
    r3: `${((i * 191) % 720) + 360}deg`,
  };
});

const ConfettiBurst = () => (
  <div className="pointer-events-none absolute inset-0 z-10 overflow-visible">
    <style>{`
      .confetti-burst-piece {
        position: absolute;
        top: 0;
        left: 0;
        opacity: 0;
        animation-name: confettiBurst;
        animation-timing-function: cubic-bezier(0.14, 0.82, 0.3, 1);
        animation-fill-mode: forwards;
      }
      @keyframes confettiBurst {
        0% {
          transform: translate(-50%, -50%) translate3d(0, 0, 0) scale(0) rotate(0deg);
          opacity: 0;
        }
        5% {
          opacity: 1;
          transform: translate(-50%, -50%) translate3d(calc(var(--bx) * 0.35), calc(var(--by) * 0.35), 0) scale(1.25) rotate(var(--r1));
        }
        32% {
          opacity: 1;
          transform: translate(-50%, -50%) translate3d(var(--bx), var(--by), 0) scale(1) rotate(var(--r2));
        }
        68% {
          opacity: 1;
          transform: translate(-50%, -50%) translate3d(calc(var(--bx) * 1.06), calc(var(--by) + var(--gy) * 0.5), 0) scale(0.9) rotate(calc(var(--r2) + 90deg));
        }
        100% {
          opacity: 0;
          transform: translate(-50%, -50%) translate3d(calc(var(--bx) * 1.12), calc(var(--by) + var(--gy)), 0) scale(0.4) rotate(var(--r3));
        }
      }
    `}</style>
    {PIECES.map((p, i) => (
      <span
        key={i}
        className="confetti-burst-piece"
        style={
          {
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.w,
            height: p.h,
            background: p.color,
            borderRadius: p.round ? '50%' : '2px',
            '--bx': p.bx,
            '--by': p.by,
            '--gy': p.gy,
            '--r1': p.r1,
            '--r2': p.r2,
            '--r3': p.r3,
            animationDelay: p.delay,
            animationDuration: p.dur,
          } as React.CSSProperties
        }
      />
    ))}
  </div>
);

export default ConfettiBurst;
