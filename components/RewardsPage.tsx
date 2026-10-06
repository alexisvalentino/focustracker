'use client';
import {
  DAILY_GOAL,
  DAILY_GOAL_REWARD,
  DAY_REWARDS,
  checkinMultiplier,
  checkinReward,
  todayKey,
  daysBetween,
  type AccessoryId,
  type MascotId,
  type ThemeId,
} from '../lib/gameState';
import { useCountUp } from '../lib/useCountUp';
import MascotShop from './MascotShop';
import AccessoryShop from './AccessoryShop';
import ThemeShop from './ThemeShop';
import AchievementsCard from './AchievementsCard';

interface RewardsPageProps {
  coins: number;
  currentStreak: number;
  completedToday: number;
  dailyGoalReached: boolean;
  dailyGoalClaimed: boolean;
  claimedDays: number[];
  ownedMascots: MascotId[];
  activeMascot: MascotId;
  ownedAccessories: AccessoryId[];
  equippedAccessory: AccessoryId | null;
  ownedThemes: ThemeId[];
  activeTheme: ThemeId;
  longestSession: number;
  bestStreak: number;
  trees: number;
  jackpots: number;
  totalSessions: number;
  lastFocusDate: string | null;
  lastCheckinDate: string | null;
  bubbleVisible: boolean;
  bubbleValue: number;
  onCollectBubble: () => void;
  onClaimGoal: () => void;
  onClaimDay: (day: number) => void;
  onBuyMascot: (id: MascotId) => void;
  onEquipMascot: (id: MascotId) => void;
  onBuyAccessory: (id: AccessoryId) => void;
  onEquipAccessory: (id: AccessoryId | null) => void;
  onBuyTheme: (id: ThemeId) => void;
  onEquipTheme: (id: ThemeId) => void;
}

// Render the check-in multiplier without trailing zeros (×1, ×1.5, ×2.5…).
const formatMult = (m: number): string =>
  (m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)).replace('.0', '');

const RewardsPage = ({
  coins,
  currentStreak,
  completedToday,
  dailyGoalReached,
  dailyGoalClaimed,
  claimedDays,
  ownedMascots,
  activeMascot,
  ownedAccessories,
  equippedAccessory,
  ownedThemes,
  activeTheme,
  longestSession,
  bestStreak,
  trees,
  jackpots,
  totalSessions,
  lastFocusDate,
  lastCheckinDate,
  bubbleVisible,
  bubbleValue,
  onCollectBubble,
  onClaimGoal,
  onClaimDay,
  onBuyMascot,
  onEquipMascot,
  onBuyAccessory,
  onEquipAccessory,
  onBuyTheme,
  onEquipTheme,
}: RewardsPageProps) => {
  const [coinCount, coinBump] = useCountUp(coins);

  return (
    <div className="flex h-full w-full shrink-0 snap-start flex-col overflow-y-auto">
      <style>{`
        @keyframes rw-pop {
          0% { transform: scale(0.4); }
          60% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        .rw-pop { animation: rw-pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
      `}</style>

      <div className="my-auto w-full max-w-md px-6 py-6">
        <h1 className="text-sm font-black uppercase tracking-[0.35em] text-brand-600">
          Rewards
        </h1>

        {/* coin wallet hero */}
        <div className="relative mt-4 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-sky-500 to-sky-400 p-4 text-white shadow-lg shadow-brand-500/25">
          <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/15" />
          <div className="absolute -bottom-10 -left-6 h-24 w-24 rounded-full bg-white/10" />
          <div className="absolute right-14 bottom-8 h-2 w-2 rounded-full bg-white/25" />
          <div className="relative flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/75">
                Coin Wallet
              </p>
              <p className="mt-1 text-3xl font-black tabular-nums drop-shadow-sm">
                <span key={coinBump} className="stat-pop inline-block">
                  🪙 {coinCount}
                </span>
              </p>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-black backdrop-blur-sm">
                🔥 {currentStreak}-day streak
              </span>
              <p className="mt-1.5 text-[10px] font-semibold text-white/75">
                Keep the chain alive
              </p>
            </div>
          </div>
        </div>

        {/* daily goal card + floating daily bonus bubble */}
        <div className="relative mt-3 w-full rounded-2xl border border-slate-200/70 bg-white p-4 text-left shadow-sm">
          {bubbleVisible && (
            <button
              onClick={onCollectBubble}
              aria-label="Collect daily bonus"
              className="absolute -top-4 right-2 z-10 flex h-16 w-16 animate-float flex-col items-center justify-center rounded-full border-2 border-amber-300/70 bg-amber-400 text-slate-900 shadow-lg shadow-amber-500/40 transition-transform active:scale-90"
            >
              <span className="text-[8px] font-black uppercase">Bonus</span>
              <span className="text-sm font-black">+{bubbleValue}🪙</span>
            </button>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base leading-none">🎯</span>
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                Daily Goal
              </p>
            </div>
            <p className="text-xs font-bold text-slate-500">
              {Math.min(completedToday, DAILY_GOAL)}/{DAILY_GOAL} sessions
            </p>
          </div>
          <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-sky-100">
            <div
              className={`relative h-full overflow-hidden rounded-full bg-gradient-to-r transition-all duration-500 ${
                dailyGoalReached
                  ? 'from-emerald-400 to-emerald-600'
                  : 'from-sky-400 to-brand-600'
              }`}
              style={{
                width: `${Math.min(100, (completedToday / DAILY_GOAL) * 100)}%`,
              }}
            >
              <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent bg-[length:200%_100%]" />
            </div>
          </div>
          {dailyGoalClaimed ? (
            <p className="mt-3 flex items-center justify-center gap-1 text-[11px] font-black text-emerald-600">
              <span className="rw-pop inline-block">✓</span> Claimed today — come back tomorrow
            </p>
          ) : dailyGoalReached ? (
            <button
              onClick={onClaimGoal}
              className="mt-3 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-2.5 text-xs font-black uppercase tracking-wide text-white shadow-md shadow-emerald-500/30 transition-transform active:scale-95"
            >
              Claim reward +{DAILY_GOAL_REWARD} 🪙
            </button>
          ) : (
            <p className="mt-3 text-[11px] font-semibold text-slate-500">
              Complete {DAILY_GOAL} sessions to claim the daily reward
            </p>
          )}
        </div>

        {/* Day 1-7 check-in strip */}
        <div className="mt-3 w-full rounded-2xl border border-slate-200/70 bg-white p-4 text-left shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base leading-none">📅</span>
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                Check-in Streak
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="whitespace-nowrap rounded-full bg-brand-50 px-2 py-0.5 text-[9px] font-black tracking-wide text-brand-600">
                Cycle {jackpots + 1} · ×{formatMult(checkinMultiplier(jackpots))}
              </span>
              <p className="text-xs font-bold text-amber-500">
                🔥 {currentStreak}-day streak
              </p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-7 gap-1.5">
            {DAY_REWARDS.map((reward, i) => {
              const day = i + 1;
              const escalated = checkinReward(day, jackpots);
              const claimed = claimedDays.includes(day);
              const todayAlreadyClaimed = lastCheckinDate === todayKey();
              const nextDay = claimedDays.length + 1;
              const focusedToday = lastFocusDate === todayKey();
              const checkinDateValid =
                lastCheckinDate === null ||
                daysBetween(lastCheckinDate, todayKey()) > 0;
              const claimable =
                day === nextDay &&
                !claimed &&
                currentStreak >= day &&
                focusedToday &&
                checkinDateValid &&
                !todayAlreadyClaimed;
              const isJackpot = day === DAY_REWARDS.length;
              return (
                <button
                  key={day}
                  disabled={!claimable}
                  onClick={() => onClaimDay(day)}
                  className={`relative flex flex-col items-center gap-0.5 overflow-hidden rounded-lg border px-1 py-1.5 transition-all duration-200 active:scale-90 ${
                    claimed
                      ? 'border-emerald-300 bg-emerald-50'
                      : claimable
                        ? 'animate-pulse border-amber-300 bg-gradient-to-b from-amber-100 to-amber-50 shadow-md shadow-amber-500/20'
                        : 'border-slate-200 bg-slate-50 opacity-70'
                  }`}
                >
                  {claimable && (
                    <div className="absolute -right-2 -top-2 h-5 w-5 rounded-full bg-amber-300/40" />
                  )}
                  <span
                    key={`d-${day}-${claimed ? 'c' : claimable ? 'a' : 'l'}`}
                    className={`rw-pop text-[9px] font-bold ${
                      claimed
                        ? 'text-emerald-600'
                        : claimable
                          ? 'text-amber-600'
                          : 'text-slate-500'
                    }`}
                  >
                    {isJackpot && !claimed ? '👑' : `D${day}`}
                  </span>
                  <span className="text-[10px] font-black text-slate-700">
                    🪙{escalated}
                  </span>
                  <span
                    key={`s-${day}-${claimed ? 'c' : claimable ? 'a' : 'l'}`}
                    className={`rw-pop text-[9px] font-black ${
                      claimed
                        ? 'text-emerald-600'
                        : claimable
                          ? 'text-amber-600'
                          : 'text-slate-400'
                    }`}
                  >
                  {claimed ? '✓' : claimable ? 'GET' : '🔒'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <AchievementsCard
        longestSession={longestSession}
        bestStreak={bestStreak}
        trees={trees}
        jackpots={jackpots}
        totalSessions={totalSessions}
      />

      <MascotShop
        coins={coins}
        ownedMascots={ownedMascots}
        activeMascot={activeMascot}
        onBuy={onBuyMascot}
        onEquip={onEquipMascot}
      />

      <AccessoryShop
        coins={coins}
        ownedAccessories={ownedAccessories}
        equippedAccessory={equippedAccessory}
        onBuy={onBuyAccessory}
        onEquip={onEquipAccessory}
      />

      <ThemeShop
        coins={coins}
        ownedThemes={ownedThemes}
        activeTheme={activeTheme}
        onBuy={onBuyTheme}
        onEquip={onEquipTheme}
      />
    </div>
  </div>
);
};

export default RewardsPage;
