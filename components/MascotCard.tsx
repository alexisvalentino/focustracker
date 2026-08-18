'use client';
import Mascot from './Mascot';
import type { AccessoryId, MascotId } from '../lib/gameState';

const MascotCard = ({
  streak,
  mascot = 'bear',
  accessory = null,
}: {
  streak: number;
  mascot?: MascotId;
  accessory?: AccessoryId | null;
}) => (
  <div className="mt-4 flex w-full items-center gap-4 rounded-2xl border border-slate-200/70 bg-white p-4 text-left shadow-sm">
    <Mascot
      mood="idle"
      variant={mascot}
      accessory={accessory}
      className="h-20 w-20 shrink-0"
    />
    <div className="min-w-0">
      <p className="text-sm font-bold text-slate-900">
        {streak > 0
          ? `${streak} day${streak === 1 ? '' : 's'} streak`
          : 'Start your focus journey'}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">
        {streak > 0
          ? "Keep the chain alive — don't let the flame die 🔥"
          : 'Complete one session to light up Day 1 🔥'}
      </p>
    </div>
  </div>
);

export default MascotCard;
