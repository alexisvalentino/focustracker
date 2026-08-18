'use client';
import type { ReactNode } from 'react';
import type { AccessoryId, MascotId } from '../lib/gameState';

type Mood = 'idle' | 'running' | 'happy' | 'sad';

const CONFETTI_COLORS = ['#38BDF8', '#F472B6', '#FBBF24', '#34D399', '#A78BFA'];

const CONFETTI = Array.from({ length: 14 }, (_, i) => ({
  left: `${6 + ((i * 37) % 88)}%`,
  delay: `${(i % 7) * 0.12}s`,
  duration: `${1.1 + (i % 5) * 0.18}s`,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
}));

// Species-specific head art. The eyes, mouth, blush, tears and eyebrows are
// shared below, so every animal gets the same moods with the same positions.
const HEADS: Record<MascotId, ReactNode> = {
  bear: (
    <g>
      <circle cx="30" cy="30" r="12" fill="#FCD34D" />
      <circle cx="90" cy="30" r="12" fill="#FCD34D" />
      <circle cx="30" cy="30" r="5" fill="#FCA5A5" opacity="0.6" />
      <circle cx="90" cy="30" r="5" fill="#FCA5A5" opacity="0.6" />
      <circle cx="60" cy="64" r="40" fill="#FCD34D" />
      <circle cx="60" cy="64" r="40" fill="none" stroke="#F59E0B" strokeWidth="3" />
    </g>
  ),
  cat: (
    <g>
      {/* clearly pointed but softly-curved ears */}
      <path
        d="M28 38 Q28 14 42 14 Q56 14 56 30 Q44 38 28 38 Z"
        fill="#FBBF77"
        stroke="#F59E0B"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M92 38 Q92 14 78 14 Q64 14 64 30 Q76 38 92 38 Z"
        fill="#FBBF77"
        stroke="#F59E0B"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M36 28 Q36 19 42 19 Q48 19 49 27 Q43 32 36 28 Z" fill="#FCA5A5" opacity="0.75" />
      <path d="M84 28 Q84 19 78 19 Q72 19 71 27 Q77 32 84 28 Z" fill="#FCA5A5" opacity="0.75" />
      {/* pink flower on the left ear (classic cute cat) */}
      <g>
        <circle cx="34" cy="16" r="3.2" fill="#F9A8D4" />
        <circle cx="41" cy="16" r="3.2" fill="#F9A8D4" />
        <circle cx="37.5" cy="12" r="3.2" fill="#F9A8D4" />
        <circle cx="34" cy="21" r="3.2" fill="#F9A8D4" />
        <circle cx="41" cy="21" r="3.2" fill="#F9A8D4" />
        <circle cx="37.5" cy="18" r="2.4" fill="#FDE047" />
      </g>
      {/* head */}
      <circle cx="60" cy="64" r="40" fill="#FBBF77" />
      <circle cx="60" cy="64" r="40" fill="none" stroke="#F59E0B" strokeWidth="3" />
      {/* white muzzle: two cheek puffs + chin (classic cat "w" face) */}
      <ellipse cx="52" cy="84" rx="9" ry="7" fill="#FFF7ED" />
      <ellipse cx="68" cy="84" rx="9" ry="7" fill="#FFF7ED" />
      <circle cx="60" cy="88" r="6.5" fill="#FFF7ED" />
      {/* tiny rounded nose */}
      <path
        d="M57 74 Q57 71 60 71 Q63 71 63 74 Q63 78 60 80 Q57 78 57 74 Z"
        fill="#F472B6"
      />
      {/* thin curved whiskers sweeping out from the muzzle (no beard-y dots) */}
      <g stroke="#C2703D" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.65">
        <path d="M45 80 Q28 76 16 76" />
        <path d="M45 84 Q27 84 15 85" />
        <path d="M45 89 Q30 93 18 95" />
        <path d="M75 80 Q92 76 104 76" />
        <path d="M75 84 Q93 84 105 85" />
        <path d="M75 89 Q90 93 102 95" />
      </g>
    </g>
  ),
  rabbit: (
    <g>
      {/* long ears with pink inner */}
      <rect x="23" y="6" width="15" height="34" rx="7.5" fill="#FFF1E6" stroke="#F5C97E" strokeWidth="2.5" />
      <rect x="27.5" y="12" width="6" height="24" rx="3" fill="#F9A8D4" />
      <rect x="82" y="6" width="15" height="34" rx="7.5" fill="#FFF1E6" stroke="#F5C97E" strokeWidth="2.5" />
      <rect x="86.5" y="12" width="6" height="24" rx="3" fill="#F9A8D4" />
      {/* head */}
      <circle cx="60" cy="64" r="40" fill="#FFF1E6" />
      <circle cx="60" cy="64" r="40" fill="none" stroke="#F5C97E" strokeWidth="3" />
      {/* tiny pink nose */}
      <path d="M57 73 Q57 70 60 70 Q63 70 63 73 Q63 77 60 79 Q57 77 57 73 Z" fill="#F472B6" />
      {/* buck teeth (the rabbit signature) */}
      <rect x="55" y="81" width="4.5" height="6" rx="1.5" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" />
      <rect x="60.5" y="81" width="4.5" height="6" rx="1.5" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" />
    </g>
  ),
  dog: (
    <g>
      {/* floppy ears — smooth rounded lobes hanging at the sides */}
      <path d="M26 40 Q8 46 10 72 Q11 90 26 90 Q38 90 37 66 Q36 48 28 42 Z" fill="#C98A4B" stroke="#A96E34" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M94 40 Q112 46 110 72 Q109 90 94 90 Q82 90 83 66 Q84 48 92 42 Z" fill="#C98A4B" stroke="#A96E34" strokeWidth="2.5" strokeLinejoin="round" />
      {/* head */}
      <circle cx="60" cy="64" r="40" fill="#E8B26A" />
      <circle cx="60" cy="64" r="40" fill="none" stroke="#C98A4B" strokeWidth="3" />
      {/* cream muzzle with a round nose */}
      <ellipse cx="60" cy="80" rx="15" ry="11" fill="#FFF3E0" />
      <ellipse cx="60" cy="72" rx="5" ry="4" fill="#1E293B" />
    </g>
  ),
  mouse: (
    <g>
      {/* big round ears with pink inner */}
      <circle cx="30" cy="25" r="13" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="2.5" />
      <circle cx="30" cy="21" r="6.5" fill="#F9A8D4" />
      <circle cx="90" cy="25" r="13" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="2.5" />
      <circle cx="90" cy="21" r="6.5" fill="#F9A8D4" />
      {/* head */}
      <circle cx="60" cy="64" r="40" fill="#F1F5F9" />
      <circle cx="60" cy="64" r="40" fill="none" stroke="#CBD5E1" strokeWidth="3" />
      {/* tiny pink nose */}
      <path d="M57 72 Q57 69 60 69 Q63 69 63 72 Q63 75 60 77 Q57 75 57 72 Z" fill="#F472B6" />
      {/* thin curved whiskers sweeping out from the muzzle */}
      <g stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.65">
        <path d="M45 80 Q28 76 16 76" />
        <path d="M45 84 Q27 84 15 85" />
        <path d="M45 89 Q30 93 18 95" />
        <path d="M75 80 Q92 76 104 76" />
        <path d="M75 84 Q93 84 105 85" />
        <path d="M75 89 Q90 93 102 95" />
      </g>
    </g>
  ),
  panda: (
    <g>
      {/* black ears */}
      <circle cx="30" cy="30" r="11" fill="#1E293B" />
      <circle cx="90" cy="30" r="11" fill="#1E293B" />
      {/* white head */}
      <circle cx="60" cy="64" r="40" fill="#FFFFFF" />
      <circle cx="60" cy="64" r="40" fill="none" stroke="#CBD5E1" strokeWidth="3" />
      {/* soft rounded eye patches (pupils render on white sclera below) */}
      <ellipse cx="45" cy="60" rx="11" ry="8.5" fill="#1E293B" />
      <ellipse cx="75" cy="60" rx="11" ry="8.5" fill="#1E293B" />
      {/* rounded nose */}
      <ellipse cx="60" cy="72" rx="4.5" ry="3.5" fill="#1E293B" />
    </g>
  ),
};

// Cosmetic overlays drawn on top of the face (positions are shared across all
// animals because every head is a centered 40r circle at (60,64)).
const ACCESSORIES: Record<AccessoryId, ReactNode> = {
  flower: (
    <g>
      <circle cx="83" cy="16" r="3.2" fill="#F9A8D4" />
      <circle cx="90" cy="16" r="3.2" fill="#F9A8D4" />
      <circle cx="86.5" cy="12" r="3.2" fill="#F9A8D4" />
      <circle cx="83" cy="21" r="3.2" fill="#F9A8D4" />
      <circle cx="90" cy="21" r="3.2" fill="#F9A8D4" />
      <circle cx="86.5" cy="18" r="2.4" fill="#FDE047" />
    </g>
  ),
  bow: (
    <g>
      <path d="M46 100 L32 92 L32 108 Z" fill="#EF4444" />
      <path d="M74 100 L88 92 L88 108 Z" fill="#EF4444" />
      <circle cx="60" cy="99" r="4.5" fill="#DC2626" />
    </g>
  ),
  'party-hat': (
    <g>
      <path
        d="M60 8 L44 34 L76 34 Z"
        fill="#8B5CF6"
        stroke="#7C3AED"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="60" cy="6" r="4" fill="#FBBF24" />
      <circle cx="51" cy="25" r="1.8" fill="#FDE68A" />
      <circle cx="67" cy="19" r="1.8" fill="#FDE68A" />
    </g>
  ),
  cap: (
    <g>
      <path d="M38 34 Q38 10 60 10 Q82 10 82 34 L82 38 L38 38 Z" fill="#1A6DFF" />
      <path d="M34 36 Q20 36 16 44 Q32 42 38 38 Z" fill="#0B5AE8" />
    </g>
  ),
  sunglasses: (
    <g>
      <rect x="36" y="54" width="19" height="12" rx="4" fill="#1E293B" stroke="#FFFFFF" strokeWidth="1.5" />
      <rect x="65" y="54" width="19" height="12" rx="4" fill="#1E293B" stroke="#FFFFFF" strokeWidth="1.5" />
      <path d="M55 60 L65 60" stroke="#FFFFFF" strokeWidth="2" />
      <path d="M36 57 L26 55" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />
      <path d="M84 57 L94 55" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />
    </g>
  ),
  crown: (
    <g>
      <path
        d="M42 36 L42 18 L50 26 L60 14 L70 26 L78 18 L78 36 Z"
        fill="#FBBF24"
        stroke="#D97706"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="60" cy="29" r="3" fill="#38BDF8" />
    </g>
  ),
};

const Mascot = ({
  mood,
  variant = 'bear',
  accessory = null,
  className,
}: {
  mood: Mood;
  variant?: MascotId;
  accessory?: AccessoryId | null;
  className?: string;
}) => {
  const sad = mood === 'sad';
  const happy = mood === 'happy';
  // Panda eyes sit on black patches, so they render in white to stay visible.
  const eyeColor = variant === 'panda' ? '#FFFFFF' : '#1E293B';

  const animationClass = sad
    ? 'mascot-wobble'
    : happy
      ? 'mascot-happy-bounce'
      : mood === 'running'
        ? 'mascot-bob'
        : 'mascot-breathe';

  return (
    <div className={`relative ${className ?? ''}`}>
      {/* Confetti burst behind the happy mascot */}
      {happy && (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-full overflow-visible">
          {CONFETTI.map((c, i) => (
            <span
              key={i}
              className="mascot-confetti"
              style={{
                left: c.left,
                background: c.color,
                animationDelay: c.delay,
                animationDuration: c.duration,
              }}
            />
          ))}
        </div>
      )}

      <svg viewBox="0 0 120 120" className={`h-full w-full ${animationClass}`} aria-hidden="true">
        {HEADS[variant]}

        {/* blush */}
        <ellipse cx="37" cy="78" rx="6" ry="3.5" fill="#FCA5A5" opacity="0.55" />
        <ellipse cx="83" cy="78" rx="6" ry="3.5" fill="#FCA5A5" opacity="0.55" />

        {/* eyes */}
        {happy ? (
          <g stroke={eyeColor} strokeWidth="4" strokeLinecap="round" fill="none">
            <path d="M40 60 Q45 53 50 60" />
            <path d="M70 60 Q75 53 80 60" />
          </g>
        ) : sad ? (
          <g stroke={eyeColor} strokeWidth="4" strokeLinecap="round" fill="none">
            <path d="M40 62 Q45 68 50 62" />
            <path d="M70 62 Q75 68 80 62" />
          </g>
        ) : (
          <g className={mood === 'idle' ? 'mascot-blink' : undefined}>
            {/* white sclera under the pupils (classic cute panda eyes) */}
            {variant === 'panda' && (
              <>
                <circle cx="45" cy="60" r="6" fill="#FFFFFF" />
                <circle cx="75" cy="60" r="6" fill="#FFFFFF" />
              </>
            )}
            <circle cx="45" cy="60" r="4.8" fill="#1E293B" />
            <circle cx="75" cy="60" r="4.8" fill="#1E293B" />
            <circle cx="46.6" cy="58.2" r="1.6" fill="#FFFFFF" />
            <circle cx="76.6" cy="58.2" r="1.6" fill="#FFFFFF" />
          </g>
        )}

        {/* focused eyebrows while a session is running */}
        {mood === 'running' && (
          <g stroke="#B45309" strokeWidth="3" strokeLinecap="round">
            <path d="M38 50 L50 53" />
            <path d="M82 50 L70 53" />
          </g>
        )}

        {/* tears */}
        {sad && (
          <g fill="#38BDF8">
            <path className="mascot-tear mascot-tear-left" d="M45 68 q3 5 0 9 q-3 -4 0 -9z" />
            <path className="mascot-tear mascot-tear-right" d="M75 68 q3 5 0 9 q-3 -4 0 -9z" />
          </g>
        )}

        {/* mouth */}
        {happy ? (
          <g>
            <path d="M50 76 Q60 94 70 76 Z" fill="#1E293B" />
            <ellipse cx="60" cy="84" rx="6" ry="3.5" fill="#F87171" />
          </g>
        ) : sad ? (
          <path
            d="M50 86 Q60 78 70 86"
            stroke="#1E293B"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
        ) : mood === 'running' ? (
          <path d="M54 82 L66 82" stroke="#1E293B" strokeWidth="4" strokeLinecap="round" />
        ) : variant === 'cat' ? (
          /* cats get the classic tiny "w" mouth */
          <path
            d="M54 84 Q57 87 60 84 Q63 87 66 84"
            stroke="#1E293B"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
        ) : (
          <path d="M52 80 Q60 87 68 80" stroke="#1E293B" strokeWidth="4" strokeLinecap="round" fill="none" />
        )}

        {/* equipped cosmetic accessory (on top of everything) */}
        {accessory && ACCESSORIES[accessory]}
      </svg>

      {/* Self-contained animation styles (unique mascot-* prefix) */}
      <style>{`
        .mascot-breathe {
          animation: mascotBreathe 3.2s ease-in-out infinite;
          transform-origin: 50% 70%;
        }
        @keyframes mascotBreathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }

        .mascot-blink {
          transform-box: fill-box;
          transform-origin: center;
          animation: mascotBlink 4s ease-in-out infinite;
        }
        @keyframes mascotBlink {
          0%, 92%, 100% { transform: scaleY(1); }
          95% { transform: scaleY(0.08); }
        }

        .mascot-bob {
          animation: mascotBob 1s ease-in-out infinite;
        }
        @keyframes mascotBob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }

        .mascot-happy-bounce {
          animation: mascotHappyBounce 0.7s ease-in-out infinite alternate;
        }
        @keyframes mascotHappyBounce {
          from { transform: translateY(0); }
          to { transform: translateY(-8px); }
        }

        .mascot-wobble {
          animation: mascotWobble 0.5s ease-in-out infinite alternate;
        }
        @keyframes mascotWobble {
          from { transform: rotate(-3deg); }
          to { transform: rotate(3deg); }
        }

        .mascot-tear {
          transform-box: fill-box;
          transform-origin: center;
          opacity: 0;
          animation: mascotTear 1.5s ease-in infinite;
        }
        .mascot-tear-right { animation-delay: 0.75s; }
        @keyframes mascotTear {
          0% { transform: translateY(0) scale(1); opacity: 0; }
          10% { opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateY(24px) scale(0.6); opacity: 0; }
        }

        .mascot-confetti {
          position: absolute;
          top: 0;
          width: 8px;
          height: 12px;
          border-radius: 2px;
          opacity: 0;
          animation-name: mascotConfetti;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        @keyframes mascotConfetti {
          0% { transform: translateY(-6px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(140px) rotate(360deg); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
};

export default Mascot;
