'use client';
import { useEffect, useState } from 'react';
import {
  TREE_COST,
  TREE_POINTS_PER_MIN,
  TREE_STAGES,
  epochDay,
  treeStage,
} from '../lib/gameState';

interface ForestCardProps {
  coins: number;
  trees: number;
  treeProgress: number;
  treePlantedDay: number[];
  treePlantedSession: number[];
  totalSessions: number;
  forestFocusMinutes: number;
  forestDonated: number;
  onDonate: () => void;
}

// Rank flavor for the forest — gives the tree count a visible identity and
// never dead-ends: there is always a next rank to reach (Jungle is not the
// end — Eden, Rainforest, World Forest and Legendary keep coming).
const RANKS = [
  { at: 0, name: 'Seedling' },
  { at: 5, name: 'Grove' },
  { at: 10, name: 'Woodland' },
  { at: 25, name: 'Forest' },
  { at: 50, name: 'Jungle' },
  { at: 75, name: 'Eden' },
  { at: 100, name: 'Rainforest' },
  { at: 150, name: 'World Forest' },
  { at: 250, name: 'Legendary' },
];

const rankFor = (trees: number) => {
  let rank = RANKS[0];
  for (const r of RANKS) if (trees >= r.at) rank = r;
  const next = RANKS.find(r => r.at > trees);
  return { rank, next };
};

// Scene decorations that bloom as the forest grows (Ant Forest style). The
// butterfly and rainbow are special-cased (interactive / real SVG arch).
const DECOR = [
  { at: 1, emoji: '🌼', cls: 'left-2 bottom-0.5', delay: '0s', size: 'text-sm' },
  { at: 5, emoji: '🌸', cls: 'right-2 bottom-1', delay: '1.8s', size: 'text-xs' },
  { at: 8, emoji: '🍄', cls: 'left-5 bottom-0.5', delay: '0.5s', size: 'text-xs' },
  { at: 20, emoji: '🌟', cls: 'right-6 top-0', delay: '2.2s', size: 'text-xs' },
];

// Deterministic pseudo-random per index — gives each tree its own shade and
// nudge without storing any state.
const treeVariant = (i: number) => ({
  x: ((i * 47) % 13) - 6, // -6..6 px horizontal nudge
  s: 0.8 + ((i * 29) % 5) / 10, // 0.8..1.2 scale
  hue: 145 + ((i * 17) % 35), // 145..180 green family
  flip: i % 3 === 0,
});

/**
 * The REAL tree lifecycle — five visually distinct stages (viewBox 0 0 32 40),
 * not just the same tree scaled. Stage 0 is a seed in soil, stage 4 is a
 * mature tree with trunk, branches and a layered crown.
 */
const TreeStageSvg = ({ stage, hue }: { stage: number; hue: number }) => {
  switch (stage) {
    case 0: // seed + first sprout
      return (
        <svg viewBox="0 0 32 40" className="h-6 w-5" aria-hidden>
          <ellipse cx="16" cy="34" rx="7" ry="3" fill="#7c5a3a" />
          <path d="M16 34 Q15 26 16 24" stroke={`hsl(${hue} 55% 45%)`} strokeWidth="1.4" fill="none" strokeLinecap="round" />
          <path d="M16 25 Q12 23 11 20 Q14 20 16 24Z" fill={`hsl(${hue} 65% 60%)`} />
          <path d="M16 25 Q20 23 21 20 Q18 20 16 24Z" fill={`hsl(${hue + 8} 65% 55%)`} />
        </svg>
      );
    case 1: // seedling — thin stem with a few leaves
      return (
        <svg viewBox="0 0 32 40" className="h-8 w-6" aria-hidden>
          <path d="M16 38 Q15 28 16 20" stroke={`hsl(${hue} 55% 42%)`} strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <path d="M16 24 Q10 22 8 18 Q13 19 16 22Z" fill={`hsl(${hue} 62% 58%)`} />
          <path d="M16 20 Q22 18 24 14 Q19 15 16 18Z" fill={`hsl(${hue + 10} 62% 52%)`} />
          <path d="M16 30 Q11 29 10 26 Q14 27 16 29Z" fill={`hsl(${hue + 4} 58% 55%)`} />
        </svg>
      );
    case 2: // sapling — a slender trunk with a small crown
      return (
        <svg viewBox="0 0 32 40" className="h-9 w-7" aria-hidden>
          <rect x="14.6" y="20" width="2.8" height="18" rx="1.2" fill="#8b5e3c" />
          <circle cx="16" cy="17" r="5" fill={`hsl(${hue} 48% 42%)`} />
          <circle cx="12.5" cy="14" r="3.4" fill={`hsl(${hue + 6} 56% 52%)`} />
          <circle cx="19.5" cy="14" r="3.4" fill={`hsl(${hue + 6} 56% 52%)`} />
        </svg>
      );
    case 3: // young tree — thicker trunk, more branches, fuller crown
      return (
        <svg viewBox="0 0 32 40" className="h-10 w-8" aria-hidden>
          <path d="M14 38 L14.6 24 M18 38 L17.4 24" stroke="#7a5230" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M14.6 24 Q16 22 16 24 Q17 22 17.4 24" stroke="#7a5230" strokeWidth="2" fill="none" />
          <circle cx="16" cy="18" r="6" fill={`hsl(${hue} 46% 40%)`} />
          <circle cx="11.5" cy="14.5" r="4" fill={`hsl(${hue + 6} 54% 50%)`} />
          <circle cx="20.5" cy="14.5" r="4" fill={`hsl(${hue + 6} 54% 50%)`} />
          <circle cx="16" cy="11" r="4.2" fill={`hsl(${hue + 12} 62% 58%)`} />
        </svg>
      );
    default: // mature tree — thick tapered trunk, branches, big layered crown
      return (
        <svg viewBox="0 0 32 40" className="h-12 w-9" aria-hidden>
          <path d="M12.5 39 Q14 28 14.5 22 Q16 20.5 17.5 22 Q18 28 19.5 39" fill="#7a5230" />
          <path d="M15 27 Q11 25 9.5 22.5 M17 26 Q21 24 22.5 21.5" stroke="#7a5230" strokeWidth="2.4" strokeLinecap="round" fill="none" />
          <circle cx="16" cy="16" r="7.5" fill={`hsl(${hue} 44% 38%)`} />
          <circle cx="10" cy="12.5" r="5" fill={`hsl(${hue + 6} 52% 48%)`} />
          <circle cx="22" cy="12.5" r="5" fill={`hsl(${hue + 6} 52% 48%)`} />
          <circle cx="16" cy="8.5" r="5.4" fill={`hsl(${hue + 12} 60% 56%)`} />
          <circle cx="13" cy="14" r="2.6" fill={`hsl(${hue + 8} 58% 52%)`} />
        </svg>
      );
  }
};

// Map tree-progress percent onto the same 5 real stages for the growing tree.
/** A real rainbow arch rising from the horizon behind the trees. */
const RainbowSvg = () => (
  <svg viewBox="0 0 64 34" className="h-8 w-16 drop-shadow-sm" aria-hidden>
    {['#f87171', '#fb923c', '#fbbf24', '#4ade80', '#60a5fa', '#a78bfa'].map((c, i) => (
      <path
        key={c}
        d={`M ${8 + i * 2} 32 A ${24 - i * 2} ${24 - i * 2} 0 0 0 ${56 - i * 2} 32`}
        stroke={c}
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        opacity="0.95"
      />
    ))}
  </svg>
);

const stageForProgress = (pct: number) =>
  Math.min(TREE_STAGES - 1, Math.floor((pct / 100) * TREE_STAGES));

const ForestCard = ({
  coins,
  trees,
  treeProgress,
  treePlantedDay,
  treePlantedSession,
  totalSessions,
  forestFocusMinutes,
  forestDonated,
  onDonate,
}: ForestCardProps) => {
  const donateAmount = Math.min(coins, TREE_COST);
  const pct = Math.min(100, Math.round((treeProgress / TREE_COST) * 100));
  const { rank, next } = rankFor(trees);
  // A tree needs 100 points at 4 pts/min — show the honest time-to-tree.
  const minsToTree = Math.max(1, Math.ceil((TREE_COST - treeProgress) / TREE_POINTS_PER_MIN));
  const visible = Math.min(trees, 6);
  const today = epochDay();

  // Per-tree maturity — oldest planted trees read as the most mature.
  const stages = Array.from({ length: trees }, (_, i) =>
    treeStage(treePlantedDay[i] ?? today, treePlantedSession[i] ?? 0, totalSessions, today),
  );

  // Tap interactions — pure delight, no economy.
  const [tapped, setTapped] = useState<number | null>(null);
  const popTree = (i: number) => {
    setTapped(null);
    requestAnimationFrame(() => setTapped(i));
  };
  const [sunKey, setSunKey] = useState(0);
  const [rainCloud, setRainCloud] = useState<number | null>(null);
  const makeItRain = (key: number) => {
    setRainCloud(key);
    window.setTimeout(() => setRainCloud(c => (c === key ? null : c)), 1500);
  };
  // Butterfly — wanders the scene on its own (new spot every few seconds)
  // and darts away when tapped. It is never stuck in one place.
  const [butterfly, setButterfly] = useState({ x: 70, y: 14 });
  const wanderButterfly = () =>
    setButterfly({
      x: 8 + Math.floor(Math.random() * 68), // % across the scene
      y: 8 + Math.floor(Math.random() * 38), // % down the scene
    });
  useEffect(() => {
    const id = window.setInterval(wanderButterfly, 3500);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="mt-3 w-full rounded-2xl border border-slate-200/70 bg-white p-4 text-left shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-base leading-none">🌳</span>
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">
            My Forest
          </p>
        </div>
        <span className="whitespace-nowrap rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-600">
          {rank.name}
          {next ? ` · ${next.at - trees} to ${next.name}` : ' · Peak!'}
        </span>
      </div>

      {/* --- the living scene --- */}
      <div className="relative mt-3 h-32 select-none overflow-hidden rounded-xl border border-emerald-100 bg-gradient-to-b from-sky-100 via-sky-50 to-emerald-100">
        {/* sun — tap it for a burst */}
        <button
          aria-label="Sun"
          onClick={() => setSunKey(k => k + 1)}
          className="absolute right-3 top-2 h-7 w-7 outline-none"
        >
          <span
            key={sunKey}
            className={`block h-7 w-7 rounded-full bg-gradient-to-br from-amber-200 to-amber-300 shadow-[0_0_14px_4px_rgba(251,191,36,0.35)] ${
              sunKey > 0 ? 'animate-sun-burst' : ''
            }`}
          />
        </button>

        {/* clouds — tap one to make it rain (SVG puffs, rain below the base) */}
        {[
          { key: 0, cls: 'left-0 top-2', dur: '16s', delay: '0s', size: 'h-9 w-14', rainTop: 'top-7' },
          { key: 1, cls: 'left-16 top-6', dur: '19s', delay: '-7s', size: 'h-6 w-9', rainTop: 'top-5' },
        ].map(c => (
          <button
            key={c.key}
            aria-label="Cloud"
            onClick={() => makeItRain(c.key)}
            className={`animate-drift absolute ${c.cls} outline-none`}
            style={{ animationDuration: c.dur, animationDelay: c.delay }}
          >
            {/* hand-drawn puffy cloud (soft blue under-shadow, white body) */}
            <svg viewBox="0 0 64 40" className={`block ${c.size} drop-shadow-sm`} aria-hidden>
              <g opacity="0.18" fill="#0284c7" transform="translate(0 2)">
                <ellipse cx="20" cy="30" rx="16" ry="9" />
                <ellipse cx="36" cy="27" rx="18" ry="11" />
                <ellipse cx="47" cy="31" rx="13" ry="7" />
              </g>
              <g fill="#ffffff">
                <ellipse cx="20" cy="30" rx="16" ry="9" />
                <ellipse cx="36" cy="27" rx="18" ry="11" />
                <ellipse cx="47" cy="31" rx="13" ry="7" />
                <ellipse cx="32" cy="23" rx="14" ry="8" />
              </g>
            </svg>
            {/* rain — only while this cloud is tapped, falling from the base */}
            {rainCloud === c.key && (
              <span
                className={`pointer-events-none absolute left-1/2 -translate-x-1/2 ${c.rainTop}`}
              >
                {Array.from({ length: 6 }, (_, i) => (
                  <span
                    key={i}
                    className="animate-rain-drop absolute block h-2.5 w-[3px] rounded-full bg-sky-400"
                    style={{ left: `${i * 6 - 15}px`, animationDelay: `${i * 0.09}s` }}
                  />
                ))}
              </span>
            )}
          </button>
        ))}

        {/* ground hill */}
        <div className="absolute -bottom-3 left-0 right-0 h-10 rounded-[100%] bg-gradient-to-b from-emerald-200 to-emerald-300" />

        {/* milestone decorations — bloom as the forest grows */}
        {DECOR.filter(d => trees >= d.at).map(d => (
          <span
            key={d.emoji}
            className={`animate-float-soft pointer-events-none absolute ${d.cls} ${d.size}`}
            style={{ animationDelay: d.delay }}
          >
            {d.emoji}
          </span>
        ))}

        {/* rainbow — a real arch rising from the horizon behind the trees */}
        {trees >= 12 && (
          <span className="pointer-events-none absolute bottom-0 left-1/2 -ml-8">
            <RainbowSvg />
          </span>
        )}

        {/* butterfly — flutters around on its own; tap to make it dart away */}
        {trees >= 3 && (
          <button
            aria-label="Butterfly"
            onClick={wanderButterfly}
            className="absolute left-0 top-0 outline-none"
            style={{
              left: `${butterfly.x}%`,
              top: `${butterfly.y}%`,
              transition:
                'left 1.8s cubic-bezier(0.34, 1.56, 0.64, 1), top 1.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            <span className="animate-flutter block text-sm drop-shadow-sm">🦋</span>
          </button>
        )}

        {/* planted trees along the ground — each at its real lifecycle stage */}
        <div className="absolute bottom-1 left-2 right-2 flex items-end justify-center gap-0.5">
          {Array.from({ length: visible }, (_, i) => {
            const v = treeVariant(i);
            const stage = stages[i] ?? 0;
            return (
              <button
                key={i}
                onClick={() => popTree(i)}
                aria-label={`Tree ${i + 1} — ${STAGE_NAMES[stage]}`}
                className={`relative -mb-1 outline-none ${tapped === i ? 'animate-tree-wiggle' : ''}`}
                style={{ transform: `translateY(${v.x > 0 ? v.x * -0.4 : 0}px) scale(${v.s})` }}
              >
                <span
                  className={`animate-leaf-pop pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 text-xs ${
                    tapped === i ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  🌿
                </span>
                <TreeStageSvg stage={stage} hue={v.hue} />
              </button>
            );
          })}
          {/* the sapling growing toward the next tree — same real stages */}
          <div className="relative -mb-1 animate-float-soft" style={{ animationDelay: '0.4s' }}>
            <TreeStageSvg stage={stageForProgress(pct)} hue={155} />
          </div>
          {trees > 6 && (
            <span className="mb-0.5 ml-1 text-[10px] font-black text-emerald-700">
              +{trees - 6}
            </span>
          )}
        </div>
      </div>

      {/* progress to the next tree */}
      <div className="mt-2.5 h-1.5 rounded-full bg-emerald-200/60">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-center text-[9px] font-bold text-emerald-700">
        {pct}% · ≈ {minsToTree} min of focus to the next tree
      </p>

      {/* what went into the forest */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-2 text-center">
          <p className="text-sm">🌳</p>
          <p className="mt-0.5 text-[13px] font-black tabular-nums text-emerald-700">{trees}</p>
          <p className="mt-0.5 text-[8px] font-bold uppercase tracking-wide text-emerald-600/70">
            Planted
          </p>
        </div>
        <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-2 text-center">
          <p className="text-sm">⏱️</p>
          <p className="mt-0.5 text-[13px] font-black tabular-nums text-sky-700">
            {forestFocusMinutes}
          </p>
          <p className="mt-0.5 text-[8px] font-bold uppercase tracking-wide text-sky-600/70">
            Focus min
          </p>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-2 text-center">
          <p className="text-sm">🪙</p>
          <p className="mt-0.5 text-[13px] font-black tabular-nums text-amber-600">
            {forestDonated}
          </p>
          <p className="mt-0.5 text-[8px] font-bold uppercase tracking-wide text-amber-600/70">
            Donated
          </p>
        </div>
      </div>

      <button
        onClick={onDonate}
        disabled={coins <= 0}
        className={`mt-3 w-full rounded-xl py-2 text-xs font-black uppercase tracking-wide transition-transform active:scale-95 ${
          coins > 0
            ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-500/30'
            : 'cursor-not-allowed bg-slate-100 text-slate-400'
        }`}
      >
        {coins > 0
          ? `Boost tree · donate ${donateAmount} 🪙`
          : 'Focus 25 min or earn coins to grow trees'}
      </button>
    </div>
  );
};

const STAGE_NAMES = ['seed', 'seedling', 'sapling', 'young tree', 'mature tree'];

export default ForestCard;
