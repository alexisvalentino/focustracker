'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { IonContent } from '@ionic/react';

type Phase = 'idle' | 'running' | 'failed' | 'done';
type FailReason = 'touch' | 'left' | 'moved';

const DURATIONS = [
  { label: '30s', seconds: 30 },
  { label: '1 min', seconds: 60 },
  { label: '5 min', seconds: 300 },
  { label: '25 min', seconds: 1500 },
];

// Motion detection tuning (DeviceMotion linear acceleration, m/s²).
const MOTION_THRESHOLD = 3.0; // magnitude that counts as "the phone moved"
const MOTION_CONSECUTIVE = 3; // consecutive samples above the threshold before failing
const MOTION_GRACE_MS = 800; // ignore motion right after pressing START (the tap itself)

const formatTime = (totalSeconds: number): string => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const FocusTracker = () => {
  const [phase, setPhase] = useState<Phase>('idle');
  const [failReason, setFailReason] = useState<FailReason>('touch');
  const [duration, setDuration] = useState(60);
  const [elapsed, setElapsed] = useState(0);
  const [motionActive, setMotionActive] = useState(false);

  // Refs so the mount-once listeners always see the latest state.
  const phaseRef = useRef<Phase>('idle');
  const startedAtRef = useRef(0);
  const sessionStartAtRef = useRef(0);
  const lastTouchHandledAtRef = useRef(0);
  const motionHitsRef = useRef(0);
  const motionActiveRef = useRef(false);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const failSession = useCallback((reason: FailReason) => {
    if (phaseRef.current !== 'running') return;
    setFailReason(reason);
    setElapsed(0);
    setPhase('failed');
  }, []);

  // --- Touch detection (works on Android, iOS, and browser) ---
  useEffect(() => {
    const onTouch = () => {
      const now = Date.now();
      // The same physical touch can fire pointerdown, touchstart, and the
      // native event within a few ms — only count it once.
      if (now - lastTouchHandledAtRef.current < 150) return;
      lastTouchHandledAtRef.current = now;
      failSession('touch');
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') failSession('left');
    };
    window.addEventListener('pointerdown', onTouch);
    window.addEventListener('touchstart', onTouch);
    window.addEventListener('native-touch', onTouch); // fired by native Android
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('pointerdown', onTouch);
      window.removeEventListener('touchstart', onTouch);
      window.removeEventListener('native-touch', onTouch);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [failSession]);

  // --- Movement detection (DeviceMotion API / accelerometer + gyroscope) ---
  // Fires natively in Android WebView; on iOS it only starts after the user
  // grants motion permission (requested from the START button tap).
  useEffect(() => {
    const onDeviceMotion = (e: DeviceMotionEvent) => {
      if (!motionActiveRef.current) {
        motionActiveRef.current = true;
        setMotionActive(true);
      }
      if (phaseRef.current !== 'running') {
        motionHitsRef.current = 0;
        return;
      }
      // Prefer linear acceleration (gravity removed); fall back to raw
      // acceleration minus the ~9.8 m/s² gravity magnitude.
      const acc = e.acceleration;
      const accInc = e.accelerationIncludingGravity;
      let mag = 0;
      if (acc) mag = Math.hypot(acc.x ?? 0, acc.y ?? 0, acc.z ?? 0);
      else if (accInc)
        mag = Math.abs(Math.hypot(accInc.x ?? 0, accInc.y ?? 0, accInc.z ?? 0) - 9.8);
      if (mag < MOTION_THRESHOLD) {
        motionHitsRef.current = 0;
        return;
      }
      // Ignore the jostle caused by the START tap itself.
      if (Date.now() - sessionStartAtRef.current < MOTION_GRACE_MS) return;
      motionHitsRef.current += 1;
      if (motionHitsRef.current >= MOTION_CONSECUTIVE) {
        motionHitsRef.current = 0;
        failSession('moved');
      }
    };
    window.addEventListener('devicemotion', onDeviceMotion);
    return () => window.removeEventListener('devicemotion', onDeviceMotion);
  }, [failSession]);

  // iOS (13+) requires an explicit permission prompt for motion data, and it
  // must be requested from a user gesture — the START button tap is one.
  const requestMotionPermission = useCallback(() => {
    const DM = DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<string>;
    };
    if (typeof DM !== 'undefined' && typeof DM.requestPermission === 'function') {
      DM.requestPermission()
        .then(res => {
          if (res === 'granted') setMotionActive(true);
        })
        .catch(() => {
          // Denied or unavailable — touch detection still works.
        });
    }
  }, []);

  // Count-up timer while a session is running.
  useEffect(() => {
    if (phase !== 'running') return;
    startedAtRef.current = Date.now();
    const id = window.setInterval(() => {
      const t = Math.floor((Date.now() - startedAtRef.current) / 1000);
      if (t >= duration) {
        setElapsed(duration);
        setPhase('done');
      } else {
        setElapsed(t);
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [phase, duration]);

  const start = () => {
    setElapsed(0);
    setPhase('running');
    sessionStartAtRef.current = Date.now();
    requestMotionPermission();
  };

  const reset = () => {
    setElapsed(0);
    setPhase('idle');
  };

  const progress = Math.min(100, (elapsed / duration) * 100);

  return (
    <IonContent fullscreen style={{ '--background': '#020617' }}>
      <div className="flex h-full w-full flex-col items-center justify-center px-6">
        <div className="mb-10 text-center">
          <h1 className="text-sm font-black uppercase tracking-[0.35em] text-slate-500">
            Focus Tracker
          </h1>
        </div>

        {phase === 'idle' && (
          <div className="w-full max-w-md text-center">
            <p className="text-2xl font-bold text-slate-100">
              You are geh if you didn&apos;t pass this.
            </p>
            <p className="mt-3 text-sm text-slate-400">
              Pick a goal, press start, then put the phone down. Any touch or
              movement resets your progress back to zero.
            </p>
            <p className="mt-3 inline-block rounded-full bg-slate-800/80 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {motionActive
                ? '● Touch + movement detection armed'
                : '● Touch detection armed · movement pending/off'}
            </p>

            <div className="mt-8 grid grid-cols-4 gap-2">
              {DURATIONS.map(d => (
                <button
                  key={d.seconds}
                  onClick={() => setDuration(d.seconds)}
                  className={`rounded-xl py-2.5 text-xs font-bold transition-colors ${
                    duration === d.seconds
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>

            <button
              onClick={start}
              className="mt-8 w-full rounded-2xl bg-blue-600 py-4 text-lg font-black tracking-wide text-white shadow-lg shadow-blue-900/40 transition-transform active:scale-95"
            >
              START FOCUS
            </button>
          </div>
        )}

        {phase === 'running' && (
          <div className="w-full max-w-md text-center">
            <div className="text-8xl font-black tabular-nums text-white">
              {formatTime(elapsed)}
            </div>
            <div className="mt-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
              goal {formatTime(duration)}
            </div>

            <div className="mx-auto mt-8 h-2 w-full max-w-xs overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>

            <p className="mt-10 text-2xl font-bold text-slate-100">
              You are geh if you touch your phone.
            </p>
            <p className="mt-2 text-sm font-semibold text-amber-400">
              Don&apos;t touch it unless the time is finished.
            </p>
            <p className="mt-4 text-xs text-slate-500">
              Any touch or movement sends you back to 00:00.
            </p>
          </div>
        )}

        {phase === 'failed' && (
          <div className="w-full max-w-md text-center">
            <p className="mb-4 text-2xl font-black tabular-nums text-red-500/70">
              00:00
            </p>
            <h2 className="animate-shake select-none text-[17vw] font-black leading-[0.85] tracking-tight text-red-500">
              <span className="block">YOU ARE</span>
              <span className="block">GEH</span>
            </h2>
            <p className="mt-8 text-xl font-bold text-red-400">
              {failReason === 'touch'
                ? 'You touched your phone.'
                : failReason === 'moved'
                  ? 'You moved the phone.'
                  : 'You left the app.'}
            </p>
            <p className="mt-2 text-sm text-slate-400">
              {failReason === 'touch'
                ? 'Back to zero. Touching means starting over.'
                : failReason === 'moved'
                  ? 'Back to zero. Moving means starting over.'
                  : 'Back to zero. Leaving means starting over.'}
            </p>
            <button
              onClick={reset}
              className="mt-10 w-full rounded-2xl bg-red-600 py-4 text-lg font-black tracking-wide text-white shadow-lg shadow-red-900/40 transition-transform active:scale-95"
            >
              TRY AGAIN
            </button>
          </div>
        )}

        {phase === 'done' && (
          <div className="w-full max-w-md text-center">
            <div className="text-7xl font-black tabular-nums text-emerald-400">
              {formatTime(duration)}
            </div>
            <p className="mt-8 text-2xl font-bold text-emerald-300">
              Time&apos;s up. You didn&apos;t touch it.
            </p>
            <p className="mt-2 text-sm text-slate-400">
              You passed. Not geh today. 🏆
            </p>
            <button
              onClick={reset}
              className="mt-10 w-full rounded-2xl bg-emerald-600 py-4 text-lg font-black tracking-wide text-white shadow-lg shadow-emerald-900/40 transition-transform active:scale-95"
            >
              FINISH
            </button>
          </div>
        )}
      </div>
    </IonContent>
  );
};

export default FocusTracker;
