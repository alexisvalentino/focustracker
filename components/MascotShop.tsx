'use client';
import Mascot from './Mascot';
import { MASCOT_CATALOG, type MascotId } from '../lib/gameState';

interface MascotShopProps {
  coins: number;
  ownedMascots: MascotId[];
  activeMascot: MascotId;
  onBuy: (id: MascotId) => void;
  onEquip: (id: MascotId) => void;
}

const MascotShop = ({
  coins,
  ownedMascots,
  activeMascot,
  onBuy,
  onEquip,
}: MascotShopProps) => (
  <div className="mt-3 w-full rounded-2xl border border-slate-200/70 bg-white p-4 text-left shadow-sm">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-base leading-none">🛍️</span>
        <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">
          Mascot Shop
        </p>
      </div>
      <span className="whitespace-nowrap rounded-full bg-sky-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-brand-600">
        🪙 {coins}
      </span>
    </div>

    <div className="mt-3 grid grid-cols-3 gap-2">
      {MASCOT_CATALOG.map(item => {
        const owned = ownedMascots.includes(item.id);
        const active = activeMascot === item.id;
        const affordable = coins >= item.price;
        const isStarter = item.price === 0;
        return (
          <div
            key={item.id}
            className={`relative overflow-hidden rounded-xl border p-2 text-center transition-all duration-150 ${
              active
                ? 'border-brand-300 bg-brand-50 shadow-sm'
                : 'border-slate-200 bg-white'
            }`}
          >
            <div className="absolute -right-3 -top-3 h-8 w-8 rounded-full bg-white/70" />
            <span className="absolute left-1 top-1 text-[11px]">{item.emoji}</span>
            <Mascot
              mood="idle"
              variant={item.id}
              className={`mx-auto h-14 w-14 ${active ? 'stat-pop' : ''}`}
            />
            <p className="mt-1 text-[10px] font-black text-slate-700">{item.name}</p>
            <p className="text-[9px] font-bold text-slate-400">
              {isStarter ? 'Starter' : `🪙 ${item.price}`}
            </p>
            {active ? (
              <span className="mt-1.5 block rounded-lg bg-brand-600 py-1 text-[9px] font-black uppercase tracking-wide text-white">
                ✓ Active
              </span>
            ) : owned ? (
              <button
                onClick={() => onEquip(item.id)}
                className="mt-1.5 w-full rounded-lg border border-brand-400 bg-white py-1 text-[9px] font-black uppercase tracking-wide text-brand-600 transition-transform active:scale-95"
              >
                Equip
              </button>
            ) : (
              <button
                onClick={() => onBuy(item.id)}
                disabled={!affordable}
                className={`mt-1.5 w-full rounded-lg py-1 text-[9px] font-black uppercase tracking-wide transition-transform active:scale-95 ${
                  affordable
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-white shadow-sm shadow-amber-500/30'
                    : 'cursor-not-allowed bg-slate-100 text-slate-400'
                }`}
              >
                Buy {item.price} 🪙
              </button>
            )}
          </div>
        );
      })}
    </div>
  </div>
);

export default MascotShop;
