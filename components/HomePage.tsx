'use client';
import EventBannerRow from './EventBannerRow';
import MascotCard from './MascotCard';
import LeaderboardRow from './LeaderboardRow';
import StreakRepairCard from './StreakRepairCard';
import StreakFreezeCard from './StreakFreezeCard';
import ForestCard from './ForestCard';
import type { AccessoryId, MascotId } from '../lib/gameState';

interface HomePageProps {
  streak: number;
  coins: number;
  bestStreak: number;
  completedToday: number;
  repairCost: number | null; // null when the streak is not repairable
  mascot: MascotId;
  accessory: AccessoryId | null;
  streakFreezes: number;
  trees: number;
  treeProgress: number;
  treePlantedDay: number[];
  treePlantedSession: number[];
  totalSessions: number;
  forestFocusMinutes: number;
  forestDonated: number;
  weekend: boolean;
  active?: boolean;
  onRepair: () => void;
  onBuyFreeze: () => void;
  onDonate: () => void;
}

const HomePage = ({
  streak,
  coins,
  bestStreak,
  completedToday,
  repairCost,
  mascot,
  accessory,
  streakFreezes,
  trees,
  treeProgress,
  treePlantedDay,
  treePlantedSession,
  totalSessions,
  forestFocusMinutes,
  forestDonated,
  weekend,
  active = true,
  onRepair,
  onBuyFreeze,
  onDonate,
}: HomePageProps) => (
  <div className="flex h-full w-full shrink-0 snap-start flex-col overflow-y-auto">
    <div className="my-auto w-full max-w-md px-6 py-6">
      {/* brand hero band (Alipay-style colored header) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-sky-500 to-sky-400 p-5 text-left shadow-lg shadow-brand-600/25">
        <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/10" />
        <div className="absolute -bottom-12 -left-6 h-24 w-24 rounded-full bg-white/10" />
        <div className="absolute right-10 bottom-6 h-3 w-3 rounded-full bg-white/25" />
        <div className="absolute right-24 top-8 h-2 w-2 rounded-full bg-white/25" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/70">
          Focus Tracker
        </p>
        <p className="mt-2 text-2xl font-black text-white">
          {streak > 0 ? `${streak}-day streak 🔥` : 'Start your streak 🔥'}
        </p>
        <p className="mt-1 text-xs font-semibold text-white/80">
          🪙 {coins} focus coins · keep the chain alive
        </p>
      </div>

      <EventBannerRow streak={streak} weekend={weekend} active={active} />

      <MascotCard streak={streak} mascot={mascot} accessory={accessory} />

      {repairCost !== null && (
        <StreakRepairCard
          streak={streak}
          coins={coins}
          cost={repairCost}
          onRepair={onRepair}
        />
      )}

      <StreakFreezeCard coins={coins} freezes={streakFreezes} onBuy={onBuyFreeze} />

      <ForestCard
        coins={coins}
        trees={trees}
        treeProgress={treeProgress}
        treePlantedDay={treePlantedDay}
        treePlantedSession={treePlantedSession}
        totalSessions={totalSessions}
        forestFocusMinutes={forestFocusMinutes}
        forestDonated={forestDonated}
        active={active}
        onDonate={onDonate}
      />

      <LeaderboardRow
        currentStreak={streak}
        bestStreak={bestStreak}
        completedToday={completedToday}
        coins={coins}
      />
    </div>
  </div>
);

export default HomePage;
