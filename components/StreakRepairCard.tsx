'use client';

const StreakRepairCard = ({
  streak,
  coins,
  cost,
  onRepair,
}: {
  streak: number;
  coins: number;
  cost: number;
  onRepair: () => void;
}) => {
  const canAfford = coins >= cost;
  return (
    <div className="mt-3 w-full rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black text-amber-600">⚠️ Streak at risk</p>
          <p className="mt-1 text-[11px] font-semibold leading-relaxed text-slate-600">
            You missed yesterday — your {streak}-day streak is about to break
          </p>
        </div>
        <button
          onClick={onRepair}
          disabled={!canAfford}
          className={`shrink-0 rounded-xl px-3 py-2 text-xs font-black uppercase tracking-wide transition-transform active:scale-95 ${
            canAfford
              ? 'bg-amber-500 text-white shadow-sm'
              : 'cursor-not-allowed bg-slate-200 text-slate-400'
          }`}
        >
          Repair {cost}🪙
        </button>
      </div>
    </div>
  );
};

export default StreakRepairCard;
