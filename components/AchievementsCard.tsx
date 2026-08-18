'use client';
import {
  ACHIEVEMENTS,
  unlockedCount,
  type AchievementStats,
} from '../lib/gameState';

const formatDuration = (totalSeconds: number): string => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m} min`;
  return `${s}s`;
};

interface AchievementsCardProps extends AchievementStats {}

const AchievementsCard = ({
  longestSession,
  bestStreak,
  trees,
  jackpots,
  totalSessions,
}: AchievementsCardProps) => {
  const stats: AchievementStats = {
    totalSessions,
    bestStreak,
    trees,
    longestSession,
    jackpots,
  };
  const unlocked = unlockedCount(stats);
  const records = [
    { label: 'Longest', value: formatDuration(longestSession), emoji: '🏆' },
    { label: 'Trees', value: String(trees), emoji: '🌳' },
    { label: 'Best streak', value: `${bestStreak}d`, emoji: '🔥' },
    { label: 'Jackpots', value: String(jackpots), emoji: '🎰' },
  ];

  return (
    <div className="mt-3 w-full rounded-2xl border border-slate-200/70 bg-white p-4 text-left shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base leading-none">🏆</span>
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">
            Achievements
          </p>
        </div>
        <span className="whitespace-nowrap rounded-full bg-sky-50 px-2 py-0.5 text-[9px] font-black tabular-nums tracking-wider text-brand-600">
          {unlocked}/{ACHIEVEMENTS.length} unlocked
        </span>
      </div>

      {/* personal records */}
      <div className="mt-3 grid grid-cols-4 gap-2">
        {records.map(r => (
          <div
            key={r.label}
            className="relative overflow-hidden rounded-xl border border-sky-100 bg-gradient-to-b from-sky-50 to-white p-2 text-center shadow-sm"
          >
            <div className="absolute -right-3 -top-3 h-8 w-8 rounded-full bg-white/70" />
            <span className="relative block text-sm">{r.emoji}</span>
            <p className="relative mt-0.5 truncate text-[13px] font-black tabular-nums text-slate-800">
              {r.value}
            </p>
            <p className="relative mt-0.5 text-[8px] font-bold uppercase tracking-wide text-slate-500">
              {r.label}
            </p>
          </div>
        ))}
      </div>

      {/* unlock badges */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        {ACHIEVEMENTS.map(a => {
          const done = a.unlocked(stats);
          return (
            <div
              key={a.id}
              className={`relative overflow-hidden rounded-xl border p-2 text-center transition-all duration-150 ${
                done
                  ? 'border-emerald-200 bg-emerald-50'
                  : 'border-slate-200 bg-slate-50'
              }`}
            >
              <div className="absolute -right-3 -top-3 h-8 w-8 rounded-full bg-white/70" />
              <span
                className={`relative block text-xl ${done ? '' : 'opacity-60 grayscale'}`}
              >
                {a.emoji}
              </span>
              {!done && (
                <span className="absolute right-1 top-1 text-[10px]">🔒</span>
              )}
              <p
                className={`relative mt-1 text-[9px] font-black leading-tight ${
                  done ? 'text-emerald-700' : 'text-slate-400'
                }`}
              >
                {a.name}
              </p>
              <p className="relative mt-0.5 text-[8px] font-semibold leading-tight text-slate-400">
                {a.desc}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AchievementsCard;
