'use client';

const COLORS = ['#38BDF8', '#F472B6', '#FBBF24', '#34D399', '#A78BFA', '#FB7185'];

// Pieces fly outward from a burst point, rotating and fading. Angles/distances
// are precomputed so no CSS trig is needed (safe for older WebViews).
const PIECES = Array.from({ length: 26 }, (_, i) => {
  const angle = ((i / 26) * 360 + ((i * 47) % 18)) * (Math.PI / 180);
  const dist = 70 + ((i * 53) % 100);
  return {
    left: 50,
    top: 32,
    x: Math.cos(angle) * dist,
    y: Math.sin(angle) * dist,
    delay: (i % 5) * 0.06,
    dur: 1.1 + (i % 4) * 0.25,
    color: COLORS[i % COLORS.length],
    w: 6 + (i % 3) * 2,
    h: 10 + (i % 4) * 3,
    round: i % 5 === 0,
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
        animation-timing-function: cubic-bezier(0.22, 0.8, 0.36, 1);
        animation-fill-mode: both;
      }
      @keyframes confettiBurst {
        0% {
          transform: translate(-50%, -50%) rotate(0deg) scale(1);
          opacity: 1;
        }
        75% {
          opacity: 1;
        }
        100% {
          transform: translate(
              calc(-50% + var(--bx)),
              calc(-50% + var(--by))
            )
            rotate(540deg) scale(0.7);
          opacity: 0;
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
            '--bx': `${p.x}px`,
            '--by': `${p.y}px`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
          } as React.CSSProperties
        }
      />
    ))}
  </div>
);

export default ConfettiBurst;
