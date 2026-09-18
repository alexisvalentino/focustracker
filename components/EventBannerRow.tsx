'use client';
import { useEffect, useRef, useState, type UIEvent } from 'react';

const BANNERS = [
  {
    emoji: '🎯',
    title: 'Weekend Double Points',
    sub: 'Earn ×2 focus coins all weekend',
    from: 'from-fuchsia-500',
    to: 'to-purple-600',
    tag: 'Weekend',
  },
  {
    emoji: '🌳',
    title: 'Tree Planting Challenge',
    sub: '25 min of focus plants a tree',
    from: 'from-emerald-500',
    to: 'to-teal-600',
    tag: 'Eco',
  },
  {
    emoji: '⚡',
    title: '25-Minute Achievement',
    sub: 'Push your longest session yet',
    from: 'from-sky-500',
    to: 'to-blue-600',
    tag: 'New',
  },
  {
    emoji: '🏆',
    title: '7-Day Win Streak',
    sub: 'Chain 7 days for the jackpot',
    from: 'from-amber-500',
    to: 'to-orange-600',
    tag: 'Streak',
  },
];

const CARD_W = 288; // w-72
const GAP = 12; // gap-3
const STEP = CARD_W + GAP;

// When does the weekend double-points window start / end?
// Weekends run Saturday 00:00 -> Monday 00:00 (local time).
const weekendTiming = (nowMs: number): { active: boolean; ms: number } => {
  const now = new Date(nowMs);
  const day = now.getDay(); // 0 = Sunday .. 6 = Saturday
  const active = day === 0 || day === 6;
  const target = new Date(now);
  target.setDate(now.getDate() + (active ? (8 - day) % 7 : (6 - day + 7) % 7));
  target.setHours(0, 0, 0, 0);
  return { active, ms: target.getTime() - nowMs };
};

const formatCountdown = (ms: number): string => {
  const totalMin = Math.max(0, Math.floor(ms / 60000));
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const EventBannerRow = ({
  streak = 0,
  weekend = false,
  active = true,
}: {
  streak?: number;
  weekend?: boolean;
  active?: boolean;
}) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const resumeTimerRef = useRef(0);
  const [index, setIndex] = useState(0);
  // Weekend countdown — re-render every 30s so the chip stays fresh.
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 30000);
    return () => window.clearInterval(id);
  }, [active]);

  const goTo = (i: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const target = Math.max(0, Math.min(BANNERS.length - 1, i));
    el.scrollTo({ left: target * STEP, behavior: 'smooth' });
    setIndex(target);
  };

  const onScroll = (e: UIEvent<HTMLDivElement>) => {
    const i = Math.round(e.currentTarget.scrollLeft / STEP);
    setIndex(Math.max(0, Math.min(BANNERS.length - 1, i)));
  };

  // Pause auto-advance while the user is interacting, resume a few seconds
  // after they let go.
  const pause = () => {
    pausedRef.current = true;
  };
  const resumeSoon = () => {
    window.clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = window.setTimeout(() => {
      pausedRef.current = false;
    }, 5000);
  };

  // Gentle auto-advance loop.
  useEffect(() => {
    if (!active) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => {
      if (pausedRef.current) return;
      goTo(index + 1 >= BANNERS.length ? 0 : index + 1);
    }, 4000);
    return () => window.clearInterval(id);
  }, [active, index]);

  useEffect(
    () => () => window.clearTimeout(resumeTimerRef.current),
    [],
  );

  return (
    <div className="mt-4">
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        onPointerDown={pause}
        onPointerUp={resumeSoon}
        onPointerCancel={resumeSoon}
        onPointerLeave={resumeSoon}
        className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto overflow-y-hidden rounded-2xl scroll-smooth"
      >
        {BANNERS.map(b => (
          <div
            key={b.title}
            className={`relative h-28 w-72 shrink-0 snap-start overflow-hidden rounded-2xl bg-gradient-to-br ${b.from} ${b.to} p-4 text-left shadow-md`}
          >
            {/* decorative blobs */}
            <div className="absolute -bottom-8 -right-6 h-24 w-24 rounded-full bg-white/15" />
            <div className="absolute right-9 top-3 h-2 w-2 rounded-full bg-white/25" />
            <div className="absolute right-16 bottom-10 h-1.5 w-1.5 rounded-full bg-white/20" />              <div className="relative flex h-full flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-lg shadow-inner backdrop-blur-sm">
                    {b.emoji}
                  </span>
                  {b.tag === 'Weekend' ? (
                    <span
                      className={`flex flex-col items-end rounded-full px-2 py-0.5 backdrop-blur-sm ${
                        weekend
                          ? 'bg-white text-fuchsia-700'
                          : 'bg-white/20 text-white/90'
                      }`}
                    >
                      <span className="text-[9px] font-black uppercase tracking-wider">
                        {weekend ? '\u25CF Live now' : 'Sat \u2013 Sun'}
                      </span>
                      <span className="text-[8px] font-bold tabular-nums">
                        🕒 {weekend ? 'ends in' : 'starts in'} {formatCountdown(weekendTiming(nowMs).ms)}
                      </span>
                    </span>
                  ) : b.tag === 'Streak' ? (
                    <span className="rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-black tabular-nums tracking-wider text-white/90 backdrop-blur-sm">
                      🔥 {Math.min(streak, 7)}/7
                    </span>
                  ) : (
                    <span className="rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white/90 backdrop-blur-sm">
                      {b.tag}
                    </span>
                  )}
                </div>
                <div>
                  <p className="truncate text-[15px] font-black text-white">
                    {b.title}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] font-semibold text-white/75">
                    {b.sub}
                  </p>

                  {/* live progress on the 7-day streak banner */}
                  {b.tag === 'Streak' && (
                    <div className="mt-1.5 flex items-center gap-1">
                      {Array.from({ length: 7 }, (_, i) => (
                        <span
                          key={i}
                          className={`h-1 flex-1 rounded-full ${
                            i < Math.min(streak, 7) ? 'bg-white' : 'bg-white/30'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
          </div>
        ))}
      </div>

      {/* pagination dots */}
      <div className="mt-2.5 flex items-center justify-center gap-1.5">
        {BANNERS.map((_, i) => (
          <button
            key={i}
            aria-label={`Banner ${i + 1}`}
            onClick={() => goTo(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === index ? 'w-5 bg-brand-600' : 'w-1.5 bg-slate-300'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default EventBannerRow;
