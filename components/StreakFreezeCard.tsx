'use client';
import { STREAK_FREEZE_COST, STREAK_FREEZE_MAX } from '../lib/gameState';

interface StreakFreezeCardProps {
  coins: number;
  freezes: number;
  onBuy: () => void;
}

const StreakFreezeCard = ({ coins, freezes, onBuy }: StreakFreezeCardProps) => {
  const maxed = freezes >= STREAK_FREEZE_MAX;
  const canBuy = !maxed && coins >= STREAK_FREEZE_COST;
  return (
    <div className="mt-3 w-full rounded-2xl border border-slate-200/70 bg-white p-4 text-left shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-base leading-none">🛡️</span>
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">
              Streak Freeze
            </p>
            <p className="text-[9px] font-semibold text-slate-400">
              Protects one missed day
            </p>
          </div>
        </div>
        <span className="whitespace-nowrap rounded-full bg-sky-50 px-2 py-0.5 text-[9px] font-black text-brand-600">
          🛡️ {freezes}/{STREAK_FREEZE_MAX} held
        </span>
      </div>
      <button
        onClick={onBuy}
        disabled={!canBuy}
        className={`mt-3 w-full rounded-xl py-2 text-xs font-black uppercase tracking-wide transition-transform active:scale-95 ${
          canBuy
            ? 'bg-gradient-to-r from-sky-500 to-brand-600 text-white shadow-md shadow-brand-600/25'
            : maxed
              ? 'cursor-not-allowed bg-emerald-50 text-emerald-500'
              : 'cursor-not-allowed bg-slate-100 text-slate-400'
        }`}
      >
        {maxed ? 'Freeze stock full — use them!' : `Buy 1 freeze · ${STREAK_FREEZE_COST} 🪙`}
      </button>
    </div>
  );
};

export default StreakFreezeCard;
