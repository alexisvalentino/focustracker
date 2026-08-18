'use client';

export type TabKey = 'home' | 'focus' | 'rewards';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'home', label: 'Home', icon: '🏠' },
  { key: 'focus', label: 'Focus', icon: '⏱️' },
  { key: 'rewards', label: 'Rewards', icon: '🎁' },
];

const TabBar = ({
  active,
  onChange,
  disabled = false,
}: {
  active: TabKey;
  onChange: (key: TabKey) => void;
  disabled?: boolean;
}) => (
  <div className="flex shrink-0 items-center justify-around border-t border-slate-200/70 bg-white/90 px-2 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur-sm">      {TABS.map(t => {
        const isActive = active === t.key;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            disabled={disabled}
            aria-current={isActive ? 'page' : undefined}
            className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 transition-colors ${
              isActive ? 'text-brand-600' : 'text-slate-400'
            } ${disabled ? 'opacity-50' : ''}`}
          >
          <span
            className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${
              isActive ? 'bg-sky-100' : ''
            }`}
          >
            <span
              className={`text-xl leading-none transition-transform ${
                isActive ? 'scale-110' : ''
              }`}
            >
              {t.icon}
            </span>
          </span>
          <span className="text-[10px] font-black uppercase tracking-wide">
            {t.label}
          </span>
        </button>
      );
    })}
  </div>
);

export default TabBar;
