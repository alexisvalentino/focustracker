'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { IonContent } from '@ionic/react';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { App } from '@capacitor/app';
import Mascot from './Mascot';
import ConfettiBurst from './ConfettiBurst';
import HomePage from './HomePage';
import RewardsPage from './RewardsPage';
import TabBar, { type TabKey } from './TabBar';
import DevTip from './DevTip';
import { useGameState } from '../lib/useGameState';
import { syncStatusBar } from '../lib/statusBar';
import {
  DAILY_GOAL,
  DAILY_GOAL_REWARD,
  RECORD_BONUS,
  STREAK_REPAIR_COST,
  TREE_COST,
  activeStreak,
  awardFailConsolation,
  buyAccessory,
  buyMascot,
  buyStreakFreeze,
  buyTheme,
  canRepairStreak,
  claimDailyBonus,
  claimDayReward,
  claimDailyGoal,
  clearSessionRunning,
  consumeInterruptedSession,
  dailyBonusValue,
  daysBetween,
  donateToForest,
  equipAccessory,
  equipMascot,
  equipTheme,
  isWeekend,
  markSessionRunning,
  recordSession,
  repairStreak,
  todayKey,
  type AccessoryId,
  type MascotId,
  type ThemeId,
} from '../lib/gameState';

type Phase = 'idle' | 'running' | 'failed' | 'done';
type FailReason = 'touch' | 'left' | 'moved' | 'interrupted';

const TAB_KEYS: TabKey[] = ['home', 'focus', 'rewards'];

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
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0)
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

// Human label for custom durations, e.g. 2700 -> "45 min", 3665 -> "1 h 1 min".
const formatDurationLabel = (totalSeconds: number): string => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const parts: string[] = [];
  if (h) parts.push(`${h} h`);
  if (m) parts.push(`${m} min`);
  if (s) parts.push(`${s} s`);
  return parts.join(' ') || '0 s';
};

// --- Sound feedback (Web Audio API — synthesized, no audio assets needed) ---
// A single AudioContext is shared and lazily created. It is unlocked on the
// START tap (a user gesture), which iOS requires before audio can play.
let audioCtx: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) audioCtx = new Ctor();
  if (audioCtx.state === 'suspended') void audioCtx.resume();
  return audioCtx;
};

const playTone = (
  freq: number,
  delay: number,
  dur: number,
  type: OscillatorType = 'sine',
  volume = 0.25,
) => {
  const ctx = getAudioContext();
  if (!ctx) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  // Quick attack/release envelope so the tone doesn't click.
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(volume, t0 + 0.02);
  gain.gain.setValueAtTime(volume, t0 + dur - 0.06);
  gain.gain.linearRampToValueAtTime(0, t0 + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
};

const playSuccessSound = () => {
  playTone(659.25, 0, 0.16); // E5
  playTone(880, 0.18, 0.34); // A5 — rising "you win" chime
};

// Triumphant fanfare for milestones (new record / tree planted): a rising
// C-E-G-C arpeggio with a high sparkle, layered after the base chime.
const playCelebrationSound = () => {
  playTone(523.25, 0.55, 0.12, 'sine', 0.22); // C5
  playTone(659.25, 0.67, 0.12, 'sine', 0.22); // E5
  playTone(783.99, 0.79, 0.12, 'sine', 0.22); // G5
  playTone(1046.5, 0.91, 0.42, 'sine', 0.26); // C6 (held)
  playTone(1567.98, 0.91, 0.42, 'triangle', 0.1); // G6 sparkle
};

const hapticCelebration = () => {
  void Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
  window.setTimeout(() => {
    void Haptics.notification({ type: NotificationType.Success }).catch(() => {});
  }, 260);
};

const playFailSound = () => {
  playTone(220, 0, 0.35, 'square', 0.14);
  playTone(165, 0.12, 0.45, 'square', 0.14); // low descending buzz
};

// --- Haptic feedback (@capacitor/haptics) ---
// On web this maps to navigator.vibrate; desktop browsers without it reject,
// so swallow the error (touch/motion detection still carries the UX).
const hapticSuccess = () => {
  void Haptics.notification({ type: NotificationType.Success }).catch(() => {});
};

const hapticFail = () => {
  void Haptics.notification({ type: NotificationType.Error }).catch(() => {});
};

// Small rising "pop" for collecting rewards (bubble, check-in, daily goal).
const playCollectSound = () => {
  playTone(880, 0, 0.07, 'sine', 0.18);
  playTone(1174.66, 0.07, 0.12, 'sine', 0.18);
};

const hapticCollect = () => {
  void Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
};

const FocusTracker = () => {
  const [phase, setPhase] = useState<Phase>('idle');
  const [failReason, setFailReason] = useState<FailReason>('touch');
  const [duration, setDuration] = useState(60);
  const [elapsed, setElapsed] = useState(0);
  const [customOpen, setCustomOpen] = useState(false);
  const [customMin, setCustomMin] = useState('');
  const [customSec, setCustomSec] = useState('');
  const { game, gameRef, update } = useGameState();
  const [lastCoinsEarned, setLastCoinsEarned] = useState(0);
  const [lastFreezeUsed, setLastFreezeUsed] = useState(0);
  const [lastWeekendBonus, setLastWeekendBonus] = useState(false);
  const [lastNewRecord, setLastNewRecord] = useState(false);
  const [lastTreesPlanted, setLastTreesPlanted] = useState(0);
  const [bubblePopped, setBubblePopped] = useState(false);
  const [popText, setPopText] = useState<string | null>(null);
  const [failResult, setFailResult] = useState<{
    seconds: number;
    reward: number;
  } | null>(null);

  // Swipeable pages + bottom tab bar. The tracker (focus) tab is the default.
  const carouselRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('focus');

  const scrollToTab = useCallback((key: TabKey, smooth = true) => {
    const el = carouselRef.current;
    if (!el) return;
    const idx = TAB_KEYS.indexOf(key);
    el.scrollTo({
      left: idx * el.clientWidth,
      behavior: smooth ? 'smooth' : 'auto',
    });
    setActiveTab(key);
  }, []);

  // Land on the tracker without a swipe animation on first paint. IonContent
  // sizes and settles its scrollable area asynchronously, and the browser's
  // initial scroll-snap can yank the position back to 0 — so keep correcting
  // every frame until the layout has settled (a few hundred ms is plenty).
  useLayoutEffect(() => {
    let raf = 0;
    let checks = 0;
    const tick = () => {
      const el = carouselRef.current;
      if (el && el.clientWidth > 0 && el.scrollLeft < el.clientWidth - 1) {
        scrollToTab('focus', false);
      }
      checks += 1;
      if (checks < 20) raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [scrollToTab]);

  useEffect(() => {
    const alignActivePage = () => scrollToTab(activeTab, false);
    window.addEventListener('resize', alignActivePage);
    return () => window.removeEventListener('resize', alignActivePage);
  }, [activeTab, scrollToTab]);

  const onCarouselScroll = () => {
    const el = carouselRef.current;
    if (!el || el.clientWidth === 0) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    const key = TAB_KEYS[Math.max(0, Math.min(TAB_KEYS.length - 1, idx))];
    if (key !== activeTab) setActiveTab(key);
  };

  // Refs so the mount-once listeners always see the latest state.
  const phaseRef = useRef<Phase>('idle');
  const sessionStartMonotonicRef = useRef(0);
  const lastTouchHandledAtRef = useRef(0);
  const motionHitsRef = useRef(0);
  const successHandledRef = useRef(false);
  const popTimerRef = useRef(0);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    if (consumeInterruptedSession()) {
      phaseRef.current = 'failed';
      setFailReason('interrupted');
      setPhase('failed');
    }
  }, []);

  useEffect(() => {
    if (game.dailyProgressDate === todayKey()) setBubblePopped(false);
  }, [game.dailyProgressDate]);

  useEffect(() => () => window.clearTimeout(popTimerRef.current), []);

  // A session can only end by failing or completing — make sure the user is
  // looking at the tracker when that happens (a swipe mid-session may have
  // carried them to another tab before the touch registered as a fail).
  useEffect(() => {
    if (phase === 'failed' || phase === 'done') scrollToTab('focus');
  }, [phase, scrollToTab]);

  // Native status bar follows the app theme on both platforms.
  useEffect(() => {
    syncStatusBar();
  }, [game.activeTheme]);

  const failSession = useCallback(
    (reason: FailReason) => {
      if (phaseRef.current !== 'running') return;
      const sessionMs = performance.now() - sessionStartMonotonicRef.current;
      // The deadline may pass between timer ticks. A touch after the goal is a
      // completion, not a failure; leave the pending tick to finalize it.
      if (sessionMs >= duration * 1000) return;
      // Close the session synchronously. Pointer, touch, and native-touch can
      // arrive before React commits the failed phase.
      phaseRef.current = 'failed';
      clearSessionRunning();
      // Temptation tax: even a failed session pays a small consolation based on
      // how long you resisted, but far less than completing it would have.
      const seconds = Math.floor(sessionMs / 1000);
      const { state, reward } = awardFailConsolation(gameRef.current, seconds);
      if (reward > 0) update(() => state);
      setFailResult({ seconds, reward });
      setFailReason(reason);
      setElapsed(0);
      setPhase('failed');
      // A swipe/tab tap during a session fails it — bring the user back to the
      // tracker so they actually see the failure.
      scrollToTab('focus');
      playFailSound();
      hapticFail();
    },
    [duration, gameRef, update, scrollToTab],
  );

  // --- Touch detection (works on Android, iOS, and browser) ---
  useEffect(() => {
    const onTouch = () => {
      // The START tap fires before the session begins. Do not let it suppress
      // an actual touch immediately after START via the deduplication window.
      if (phaseRef.current !== 'running') return;
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

  useEffect(() => {
    let disposed = false;
    let removeListener: (() => Promise<void>) | undefined;
    void App.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) failSession('left');
    }).then(handle => {
      if (disposed) void handle.remove();
      else removeListener = () => handle.remove();
    });
    return () => {
      disposed = true;
      if (removeListener) void removeListener();
    };
  }, [failSession]);

  // --- Movement detection (DeviceMotion API / accelerometer + gyroscope) ---
  // Fires natively in Android WebView; on iOS it only starts after the user
  // grants motion permission (requested from the START button tap).
  useEffect(() => {
    const onDeviceMotion = (e: DeviceMotionEvent) => {
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
      if (performance.now() - sessionStartMonotonicRef.current < MOTION_GRACE_MS) return;
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
    const DM = window.DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<string>;
    } | undefined;
    if (DM && typeof DM.requestPermission === 'function') {
      DM.requestPermission()
        .then(() => {
          // Granted — accelerometer events now flow into devicemotion.
        })
        .catch(() => {
          // Denied or unavailable — touch detection still works.
        });
    }
  }, []);

  // Count-up timer while a session is running.
  useEffect(() => {
    if (phase !== 'running') return;
    const id = window.setInterval(() => {
      // A failure closes phaseRef synchronously; a queued tick must not award
      // a completed session before React cleans up this interval.
      if (phaseRef.current !== 'running') return;
      const t = Math.floor(
        (performance.now() - sessionStartMonotonicRef.current) / 1000,
      );
      if (t >= duration) {
        setElapsed(duration);
        // Guard against a stray extra tick before the interval is torn down.
        if (!successHandledRef.current) {
          successHandledRef.current = true;
          phaseRef.current = 'done';
          clearSessionRunning();
          playSuccessSound();
          hapticSuccess();
          const { state, result } = recordSession(gameRef.current, duration);
          update(() => state);
          setLastCoinsEarned(result.coinsEarned);
          setLastFreezeUsed(result.freezeUsed);
          setLastWeekendBonus(result.weekendBonus);
          setLastNewRecord(result.newRecord);
          setLastTreesPlanted(result.treesPlanted);
          // Big milestones get the fanfare + stronger haptic on top.
          if (result.newRecord || result.treesPlanted > 0) {
            playCelebrationSound();
            hapticCelebration();
          }
        }
        setPhase('done');
      } else {
        setElapsed(t);
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [phase, duration, gameRef, update]);

  // Custom duration: clamp to 10s – 4h, then keep the previous goal if invalid.
  const applyCustom = () => {
    const m = Math.max(0, Math.min(240, parseInt(customMin || '0', 10) || 0));
    const s = Math.max(0, Math.min(59, parseInt(customSec || '0', 10) || 0));
    const total = m * 60 + s;
    setCustomOpen(false);
    if (total < 10) return;
    setDuration(total);
    setCustomMin(String(m));
    setCustomSec(String(s));
  };

  const start = () => {
    markSessionRunning();
    setElapsed(0);
    setFailResult(null);
    lastTouchHandledAtRef.current = 0;
    sessionStartMonotonicRef.current = performance.now();
    phaseRef.current = 'running';
    setPhase('running');
    successHandledRef.current = false;
    requestMotionPermission();
    // Create/resume the AudioContext from this user gesture so iOS allows
    // audio playback when the session ends later.
    getAudioContext();
  };

  const reset = () => {
    setElapsed(0);
    phaseRef.current = 'idle';
    setPhase('idle');
  };

  const showPop = (text: string) => {
    window.clearTimeout(popTimerRef.current);
    setPopText(text);
    popTimerRef.current = window.setTimeout(() => setPopText(null), 1400);
  };

  const collectBubble = () => {
    if (bubblePopped) return;
    setBubblePopped(true);
    const { state, reward } = claimDailyBonus(gameRef.current);
    update(() => state);
    showPop(`+${reward} 🪙`);
    playCollectSound();
    hapticCollect();
  };

  const claimGoal = () => {
    const { state, reward } = claimDailyGoal(gameRef.current);
    if (reward === 0) return;
    update(() => state);
    showPop(`+${reward} 🪙`);
    playCollectSound();
    hapticCollect();
  };

  const claimDay = (day: number) => {
    const { state, reward } = claimDayReward(gameRef.current, day);
    if (reward === 0) return;
    update(() => state);
    showPop(`Day ${day} reward +${reward} 🪙`);
    playCollectSound();
    hapticCollect();
  };

  const repairStreakHandler = () => {
    const { state, repaired } = repairStreak(gameRef.current);
    if (!repaired) return;
    update(() => state);
    showPop('Streak repaired 🔥');
    playCollectSound();
    hapticCollect();
  };

  const buyMascotHandler = (id: MascotId) => {
    const { state, ok } = buyMascot(gameRef.current, id);
    if (!ok) return;
    update(() => state);
    showPop('New mascot unlocked 🎉');
    playCollectSound();
    hapticCollect();
  };

  const equipMascotHandler = (id: MascotId) => {
    const { state, ok } = equipMascot(gameRef.current, id);
    if (!ok) return;
    update(() => state);
    showPop('Mascot equipped');
    hapticCollect();
  };

  const buyAccessoryHandler = (id: AccessoryId) => {
    const { state, ok } = buyAccessory(gameRef.current, id);
    if (!ok) return;
    update(() => state);
    showPop('Accessory unlocked 🎀');
    playCollectSound();
    hapticCollect();
  };

  const equipAccessoryHandler = (id: AccessoryId | null) => {
    const { state, ok } = equipAccessory(gameRef.current, id);
    if (!ok) return;
    update(() => state);
    showPop(id ? 'Accessory worn' : 'Accessory removed');
    hapticCollect();
  };

  const buyFreezeHandler = () => {
    const { state, ok } = buyStreakFreeze(gameRef.current);
    if (!ok) return;
    update(() => state);
    showPop('Streak freeze added 🛡️');
    playCollectSound();
    hapticCollect();
  };

  const donateHandler = () => {
    const { state, treesPlanted, donated } = donateToForest(
      gameRef.current,
      TREE_COST,
    );
    if (donated <= 0) return;
    update(() => state);
    showPop(treesPlanted > 0 ? 'Tree planted 🌳' : `+${donated} 🪙 donated`);
    playCollectSound();
    hapticCollect();
  };

  const buyThemeHandler = (id: ThemeId) => {
    const { state, ok } = buyTheme(gameRef.current, id);
    if (!ok) return;
    update(() => state);
    showPop('Theme unlocked 🎨');
    playCollectSound();
    hapticCollect();
  };

  const equipThemeHandler = (id: ThemeId) => {
    const { state, ok } = equipTheme(gameRef.current, id);
    if (!ok) return;
    update(() => state);
    showPop('Theme applied');
    hapticCollect();
  };

  const progress = Math.min(100, (elapsed / duration) * 100);
  const dailyGoalReached =
    game.dailyProgressDate === todayKey() &&
    !game.dailyGoalClaimed &&
    game.completedToday >= DAILY_GOAL;
  const bonusAge = game.dailyBonusDate
    ? daysBetween(game.dailyBonusDate, todayKey())
    : Infinity;
  const bubbleVisible = !bubblePopped && bonusAge > 0;
  const weekend = isWeekend();

  return (
    <IonContent
      fullscreen
      data-theme={game.activeTheme}
      style={{ '--background': 'rgb(var(--sky-50, 240 249 255))' }}
    >
      <div
        data-theme={game.activeTheme}
        className="relative flex h-full w-full flex-col bg-gradient-to-b from-sky-100 via-sky-50 to-white"
      >
        {/* reward toast (floats above whatever page is visible) */}
        {popText && (
          <div
            role="status"
            aria-live="polite"
            className="pointer-events-none absolute inset-x-0 top-3 z-30 flex justify-center"
          >
            <span className="animate-bounce rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-black text-emerald-600 shadow-sm">
              {popText}
            </span>
          </div>
        )}

        {/* swipeable pages: Home | Focus (primary) | Rewards */}
        <div
          ref={carouselRef}
          onScroll={onCarouselScroll}
          className={`no-scrollbar flex flex-1 snap-x snap-mandatory ${
            phase === 'idle' ? 'overflow-x-auto' : 'overflow-x-hidden'
          }`}
        >
          <HomePage
            streak={activeStreak(game)}
            repairableStreak={game.currentStreak}
            coins={game.coins}
            bestStreak={game.bestStreak}
            completedToday={game.completedToday}
            repairCost={canRepairStreak(game) ? STREAK_REPAIR_COST : null}
            mascot={game.activeMascot}
            accessory={game.equippedAccessory}
            streakFreezes={game.streakFreezes}
            canBuyFreeze={game.currentStreak === 0 || activeStreak(game) > 0}
            trees={game.trees}
            treeProgress={game.treeProgress}
            treePlantedDay={game.treePlantedDay}
            treePlantedSession={game.treePlantedSession}
            totalSessions={game.totalSessions}
            forestFocusMinutes={game.forestFocusMinutes}
            forestDonated={game.forestDonated}
            weekend={weekend}
            active={activeTab === 'home'}
            onRepair={repairStreakHandler}
            onBuyFreeze={buyFreezeHandler}
            onDonate={donateHandler}
          />

          {/* Focus page — the tracker, the priority */}
          <div className="flex h-full w-full shrink-0 snap-start flex-col overflow-y-auto">
            <div className="my-auto w-full max-w-md px-6 py-6">
              {phase !== 'idle' && (
                <div className="mb-10 text-center">
                  <h1 className="text-sm font-black uppercase tracking-[0.35em] text-brand-600">
                    Focus Tracker
                  </h1>
                </div>
              )}

              {phase === 'idle' && (
                <div className="text-center">
                  <div className="mb-5 flex items-center justify-center gap-2">
                    <span className="rounded-full border border-amber-200 bg-white/80 px-3 py-1 text-xs font-bold text-amber-500 shadow-sm">
                      🔥 {activeStreak(game)} day{activeStreak(game) === 1 ? '' : 's'}
                    </span>
                    <span className="rounded-full border border-sky-100 bg-white/80 px-3 py-1 text-xs font-bold text-brand-600 shadow-sm">
                      🪙 {game.coins}
                    </span>
                  </div>

                  {/* tracker hero card */}
                  <div className="rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-sm backdrop-blur-sm">
                    <Mascot
                      mood="idle"
                      variant={game.activeMascot}
                      accessory={game.equippedAccessory}
                      className="mx-auto mb-4 h-28 w-28"
                    />

                    <h2 className="text-xl font-black leading-snug text-slate-900">
                      You are geh if you didn&apos;t pass this.
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-slate-500">
                      Pick a goal, press start, then put the phone down. Any
                      touch or movement resets your progress back to zero.
                    </p>
                    <div className="mt-6 grid grid-cols-4 gap-2">
                      {DURATIONS.map(d => (
                        <button
                          key={d.seconds}
                          onClick={() => {
                            setDuration(d.seconds);
                            setCustomOpen(false);
                          }}
                          className={`rounded-xl py-2.5 text-xs font-bold transition-all ${
                            duration === d.seconds
                              ? 'bg-brand-600 text-white shadow-sm'
                              : 'border border-slate-200 bg-white text-slate-600 shadow-sm active:scale-95'
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>

                    {/* custom duration */}
                    {customOpen ? (
                      <div className="mt-2 rounded-xl border border-brand-200 bg-brand-50 p-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            max={240}
                            inputMode="numeric"
                            placeholder="min"
                            value={customMin}
                            onChange={e => setCustomMin(e.target.value)}
                            className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-2 text-center text-sm font-bold text-slate-800 focus:border-brand-400 focus:outline-none"
                          />
                          <span className="text-sm font-black text-slate-500">:</span>
                          <input
                            type="number"
                            min={0}
                            max={59}
                            inputMode="numeric"
                            placeholder="sec"
                            value={customSec}
                            onChange={e => setCustomSec(e.target.value)}
                            className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-2 text-center text-sm font-bold text-slate-800 focus:border-brand-400 focus:outline-none"
                          />
                          <button
                            onClick={applyCustom}
                            className="flex-1 rounded-lg bg-brand-600 py-2 text-xs font-black uppercase tracking-wide text-white transition-transform active:scale-95"
                          >
                            Set
                          </button>
                          <button
                            onClick={() => setCustomOpen(false)}
                            aria-label="Cancel custom duration"
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold text-slate-500 active:scale-95"
                          >
                            ✕
                          </button>
                        </div>
                        <p className="mt-1.5 text-[10px] font-semibold text-slate-400">
                          Range 10 sec – 4 h · coins are minted per 10 sec focused
                        </p>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setCustomOpen(true);
                          // Pre-fill the editor from the active custom goal.
                          if (!DURATIONS.some(d => d.seconds === duration)) {
                            setCustomMin(String(Math.floor(duration / 60)));
                            setCustomSec(String(duration % 60));
                          }
                        }}
                        className={`mt-2 w-full rounded-xl border border-dashed py-2.5 text-xs font-bold transition-all ${
                          !DURATIONS.some(d => d.seconds === duration)
                            ? 'border-brand-400 bg-brand-50 text-brand-600'
                            : 'border-slate-300 bg-white/60 text-slate-500 active:scale-[0.99]'
                        }`}
                      >
                        {!DURATIONS.some(d => d.seconds === duration)
                          ? `Custom · ${formatDurationLabel(duration)}`
                          : '＋ Custom duration'}
                      </button>
                    )}

                    <button
                      onClick={start}
                      className="mt-5 w-full rounded-2xl bg-gradient-to-r from-sky-500 to-brand-600 py-4 text-lg font-black tracking-wide text-white shadow-lg shadow-brand-600/30 transition-transform active:scale-95"
                    >
                      START FOCUS
                    </button>
                  </div>
                </div>
              )}

              {phase === 'running' && (
                <div className="text-center">
                  <Mascot
                    mood="running"
                    variant={game.activeMascot}
                    accessory={game.equippedAccessory}
                    className="mx-auto mb-6 h-16 w-16"
                  />

                  {/* circular gradient progress ring */}
                  <div
                    role="progressbar"
                    aria-label="Focus session progress"
                    aria-valuemin={0}
                    aria-valuemax={duration}
                    aria-valuenow={elapsed}
                    aria-valuetext={`${formatTime(elapsed)} elapsed of ${formatTime(duration)}`}
                    className="relative mx-auto h-60 w-60"
                  >
                    <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                      <defs>
                        <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" style={{ stopColor: 'rgb(var(--sky-400, 56 189 248))' }} />
                          <stop offset="100%" style={{ stopColor: 'rgb(var(--brand-600, 26 109 255))' }} />
                        </linearGradient>
                      </defs>
                      <circle
                        cx="60"
                        cy="60"
                        r="52"
                        fill="none"
                        stroke="rgb(var(--sky-100, 224 242 254))"
                        strokeWidth="9"
                      />
                      <circle
                        cx="60"
                        cy="60"
                        r="52"
                        fill="none"
                        stroke="url(#ringGrad)"
                        strokeWidth="9"
                        strokeLinecap="round"
                        style={{
                          strokeDasharray: 2 * Math.PI * 52,
                          strokeDashoffset:
                            2 * Math.PI * 52 * (1 - progress / 100),
                          transition: 'stroke-dashoffset 0.2s linear',
                        }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="text-5xl font-black tabular-nums text-slate-900">
                        {formatTime(elapsed)}
                      </div>
                      <div className="mt-1 text-xs font-semibold uppercase tracking-widest text-slate-500">
                        goal {formatTime(duration)}
                      </div>
                    </div>
                  </div>

                  <p className="mt-8 text-2xl font-bold text-slate-800">
                    You are geh if you touch your phone.
                  </p>
                  <p className="mt-2 text-sm font-semibold text-amber-500">
                    Don&apos;t touch it unless the time is finished.
                  </p>
                  <p className="mt-4 text-xs text-slate-500">
                    Any touch or movement sends you back to 00:00.
                  </p>
                </div>
              )}

              {phase === 'failed' && (
                <div className="text-center" role="alert">
                  <Mascot
                    mood="sad"
                    variant={game.activeMascot}
                    accessory={game.equippedAccessory}
                    className="mx-auto mb-6 h-28 w-28"
                  />
                  <p className="mb-4 text-2xl font-black tabular-nums text-red-500/70">
                    00:00
                  </p>
                  <h2 className="animate-shake select-none text-[17vw] font-black leading-[0.85] tracking-tight text-red-500">
                    <span className="block">YOU ARE</span>
                    <span className="block">GEH</span>
                  </h2>
                  <p className="mt-8 text-xl font-bold text-red-500">
                    {failReason === 'touch'
                      ? 'You touched your phone.'
                      : failReason === 'moved'
                        ? 'You moved the phone.'
                        : failReason === 'interrupted'
                          ? 'Your session was interrupted.'
                        : 'You left the app.'}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    {failReason === 'touch'
                      ? 'Back to zero. Touching means starting over.'
                      : failReason === 'moved'
                        ? 'Back to zero. Moving means starting over.'
                        : failReason === 'interrupted'
                          ? 'Back to zero. A reloaded session cannot be verified.'
                        : 'Back to zero. Leaving means starting over.'}
                  </p>
                  {failResult && failResult.reward > 0 && (
                    <p className="mt-3 inline-block rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600">
                      Survived {failResult.seconds}s · +{failResult.reward} 🪙
                      consolation
                    </p>
                  )}
                  <button
                    onClick={reset}
                    className="mt-10 w-full rounded-2xl bg-gradient-to-r from-red-500 to-red-600 py-4 text-lg font-black tracking-wide text-white shadow-lg shadow-red-500/30 transition-transform active:scale-95"
                  >
                    TRY AGAIN
                  </button>
                </div>
              )}

              {phase === 'done' && (
                <div className="relative text-center" role="status" aria-live="polite">
                  {(lastNewRecord || lastTreesPlanted > 0) && <ConfettiBurst />}
                  <Mascot
                    mood="happy"
                    variant={game.activeMascot}
                    accessory={game.equippedAccessory}
                    className="mx-auto mb-6 h-28 w-28"
                  />
                  <div className="text-7xl font-black tabular-nums text-emerald-500">
                    {formatTime(duration)}
                  </div>
                  <p className="mt-8 text-2xl font-bold text-emerald-600">
                    Time&apos;s up. You didn&apos;t touch it.
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    You passed. Not geh today. 🏆
                  </p>
                  <p className="mt-2 text-sm font-bold text-slate-600">
                    +{lastCoinsEarned} 🪙 · {activeStreak(game)}-day streak 🔥
                  </p>
                  {lastFreezeUsed > 0 && (
                    <p className="mt-1 text-xs font-black text-sky-600">
                      🛡️ Freeze saved your streak!
                    </p>
                  )}
                  {lastWeekendBonus && (
                    <p className="mt-1 text-xs font-black text-fuchsia-600">
                      ✖️2 Weekend double points!
                    </p>
                  )}
                  {lastNewRecord && (
                    <p className="mt-1 text-xs font-black text-amber-600">
                      🏆 New longest session! +{RECORD_BONUS} 🪙
                    </p>
                  )}
                  {lastTreesPlanted > 0 && (
                    <p className="mt-1 text-xs font-black text-emerald-600">
                      🌳 +{lastTreesPlanted} tree{lastTreesPlanted === 1 ? '' : 's'} planted!
                    </p>
                  )}
                  {dailyGoalReached && (
                    <p className="mt-1 text-xs font-semibold text-emerald-600">
                      Daily goal reached! Claim +{DAILY_GOAL_REWARD} 🪙 on the
                      Rewards tab
                    </p>
                  )}
                  <button
                    onClick={reset}
                    className="mt-10 w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-4 text-lg font-black tracking-wide text-white shadow-lg shadow-emerald-500/30 transition-transform active:scale-95"
                  >
                    FINISH
                  </button>
                </div>
              )}
            </div>
          </div>

          <RewardsPage
            coins={game.coins}
            currentStreak={activeStreak(game)}
            completedToday={game.completedToday}
            dailyGoalReached={dailyGoalReached}
            dailyGoalClaimed={game.dailyGoalClaimed}
            claimedDays={game.claimedDays}
            ownedMascots={game.ownedMascots}
            activeMascot={game.activeMascot}
            ownedAccessories={game.ownedAccessories}
            equippedAccessory={game.equippedAccessory}
            ownedThemes={game.ownedThemes}
            activeTheme={game.activeTheme}
            longestSession={game.longestSession}
            bestStreak={game.bestStreak}
            trees={game.trees}
            jackpots={game.jackpots}
            totalSessions={game.totalSessions}
            lastFocusDate={game.lastFocusDate}
            lastCheckinDate={game.lastCheckinDate}
            bubbleVisible={bubbleVisible}
            bubbleValue={dailyBonusValue()}
            onCollectBubble={collectBubble}
            onClaimGoal={claimGoal}
            onClaimDay={claimDay}
            onBuyMascot={buyMascotHandler}
            onEquipMascot={equipMascotHandler}
            onBuyAccessory={buyAccessoryHandler}
            onEquipAccessory={equipAccessoryHandler}
            onBuyTheme={buyThemeHandler}
            onEquipTheme={equipThemeHandler}
          />
        </div>

        {/* bottom navigation — locked while a session is in progress or shown */}
        <TabBar
          active={activeTab}
          onChange={scrollToTab}
          disabled={phase !== 'idle'}
        />

        {/* occasional dev tip — Buy me a coffee (random, dismissible) */}
        <DevTip enabled={phase === 'idle'} />
      </div>
    </IonContent>
  );
};

export default FocusTracker;
