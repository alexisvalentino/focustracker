'use client';
import { useCountUp } from '../lib/useCountUp';

interface LeaderboardRowProps {
  currentStreak: number;
  bestStreak: number;
  completedToday: number;
  coins: number;
}

// Scale the value font down as the number grows, so the 4-tile grid never
// overflows — e.g. 9999 fits at text-base, 123456 needs text-[11px].
const sizeFor = (v: number): string => {
  const len = String(v).length;
  if (len <= 4) return 'text-base';
  if (len === 5) return 'text-[13px]';
  if (len === 6) return 'text-[11px]';
  return 'text-[10px]';
};

const LeaderboardRow = ({
  currentStreak,
  bestStreak,
  completedToday,
  coins,
}: LeaderboardRowProps) => {
  const [today, todayBump] = useCountUp(completedToday);
  const [streak, streakBump] = useCountUp(currentStreak);
  const [best, bestBump] = useCountUp(bestStreak);
  const [coinCount, coinBump] = useCountUp(coins);

  const tiles = [
    {
      label: 'Today',
      value: today,
      bump: todayBump,
      unit: '×',
      emoji: '🎯',
      color: 'text-sky-600',
      face: 'border-sky-100 bg-gradient-to-b from-sky-50 to-white',
    },
    {
      label: 'Streak',
      value: streak,
      bump: streakBump,
      unit: 'd',
      emoji: '🔥',
      color: 'text-amber-500',
      face: 'border-amber-100 bg-gradient-to-b from-amber-50 to-white',
    },
    {
      label: 'Best',
      value: best,
      bump: bestBump,
      unit: 'd',
      emoji: '🏅',
      color: 'text-fuchsia-500',
      face: 'border-fuchsia-100 bg-gradient-to-b from-fuchsia-50 to-white',
      crown: true,
    },
    {
      label: 'Coins',
      value: coinCount,
      bump: coinBump,
      unit: '',
      emoji: '🪙',
      color: 'text-emerald-600',
      face: 'border-emerald-100 bg-gradient-to-b from-emerald-50 to-white',
    },
  ];

  return (
    <div className="mt-3 w-full rounded-2xl border border-slate-200/70 bg-white p-4 text-left shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-base leading-none">🏆</span>
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">
            My Leaderboard
          </p>
        </div>
        <span className="whitespace-nowrap rounded-full bg-sky-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-brand-600">
          Personal Best
        </span>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {tiles.map(t => (
          <div
            key={t.label}
            className={`relative overflow-hidden rounded-xl border ${t.face} p-2 text-center shadow-sm transition-transform duration-150 active:scale-90`}
          >
            {/* decorative corner blob */}
            <div className="absolute -right-3 -top-3 h-8 w-8 rounded-full bg-white/70" />
            {t.crown && (
              <span className="absolute right-1 top-1 text-[10px]">👑</span>
            )}
            <span className="relative block text-sm">{t.emoji}</span>
            <p
              className={`relative mt-0.5 font-black tabular-nums ${sizeFor(t.value)} ${t.color}`}
            >
              <span key={t.bump} className="stat-pop inline-block">
                {t.value}
                {t.unit}
              </span>
            </p>
            <p className="relative mt-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-500">
              {t.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LeaderboardRow;
