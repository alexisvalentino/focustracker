'use client';

const KO_FI_URL = 'https://ko-fi.com/M6Y5258XR7';

const SupportCard = () => (
  <div className="mt-3 w-full overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-4 text-left shadow-sm">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-base leading-none">☕</span>
        <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">
          Support the Dev
        </p>
      </div>
      <span className="whitespace-nowrap rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-600">
        💛 Appreciation
      </span>
    </div>

    <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
      The dev runs on 100% coffee, 0% sleep. Every ☕ keeps the developer
      alive — the streak is just a bonus 🔥
    </p>

    <a
      href={KO_FI_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-3 flex items-center justify-center"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- external Ko-fi badge, not optimizable */}
      <img
        src="https://storage.ko-fi.com/cdn/kofi3.png?v=6"
        alt="Buy Me a Coffee at ko-fi.com"
        style={{ border: '0px', height: '36px' }}
      />
    </a>
  </div>
);

export default SupportCard;
