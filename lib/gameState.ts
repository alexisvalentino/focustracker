// Local-first gamification state: streak, focus coins, daily goal, and the
// Day 1-7 check-in strip. Everything persists to localStorage — no backend.

export const STORAGE_KEY = 'focus-tracker:game';
export const MIN_SESSION_SECONDS = 10;
export const MAX_SESSION_SECONDS = 4 * 60 * 60;
export const DAILY_GOAL = 3; // completed focus sessions required per day
export const DAILY_GOAL_REWARD = 50; // coins for completing the daily goal
// Rewards for consecutive focus days (Day 1..7 check-in strip).
// The strip never stalls: each completed cycle escalates every reward by
// +50% (capped at ×4) so the Day-7 jackpot keeps growing cycle after cycle.
export const DAY_REWARDS = [10, 20, 30, 50, 80, 120, 200];
export const CHECKIN_ESCALATION_PER_CYCLE = 0.5; // +50% per completed cycle
export const CHECKIN_ESCALATION_CAP = 4; // rewards stop growing at ×4

// Reward multiplier for the current check-in cycle (0 = first cycle).
// Derived from jackpots claimed, which is exactly the number of completed cycles.
export const checkinMultiplier = (cycles: number): number =>
  Math.min(1 + CHECKIN_ESCALATION_PER_CYCLE * cycles, CHECKIN_ESCALATION_CAP);

// Escalated reward for Day N of the current cycle (cycle number = jackpots).
export const checkinReward = (day: number, cycles: number): number =>
  Math.round(DAY_REWARDS[day - 1] * checkinMultiplier(cycles));
// --- Streak freeze (Duolingo model) ---
// Buy protection BEFORE a miss: each freeze covers one missed day, so the
// streak survives a gap instead of resetting. Complements the paid repair
// (repair = pay after, freeze = pay before).
export const STREAK_FREEZE_COST = 50;
export const STREAK_FREEZE_MAX = 3; // cap how many can be hoarded
// --- Forest (Ant Forest loop) ---
// Both focused minutes and donated coins grow trees. A tree needs 100 points;
// focus grants 4 points/min (25 min = 1 tree), donations grant 1 point/coin.
export const TREE_COST = 100;
export const TREE_POINTS_PER_MIN = 100 / 25; // 4 points per focused minute
const MAX_PERSISTED_TREES = 10_000;
// --- Event mechanics (the banners are real) ---
export const WEEKEND_MULTIPLIER = 2; // ×2 coins for sessions on Sat/Sun
export const RECORD_BONUS = 50; // coins for beating your longest session

// --- Mascot accessories (cosmetics) ---
export const ACCESSORY_CATALOG = [
  { id: 'flower', name: 'Flower', price: 20, emoji: '🌷' },
  { id: 'bow', name: 'Red Bow', price: 60, emoji: '🎀' },
  { id: 'party-hat', name: 'Party Hat', price: 80, emoji: '🎉' },
  { id: 'cap', name: 'Cap', price: 100, emoji: '🧢' },
  { id: 'sunglasses', name: 'Shades', price: 150, emoji: '🕶️' },
  { id: 'crown', name: 'Crown', price: 250, emoji: '👑' },
] as const;

export type AccessoryId = (typeof ACCESSORY_CATALOG)[number]['id'];

export const isAccessoryId = (id: string): id is AccessoryId =>
  ACCESSORY_CATALOG.some(a => a.id === id);

// --- App themes (cosmetic) ---
// The "blue" theme is the free default; the rest swap the brand/sky palette
// via CSS variables (see styles/global.css `[data-theme]` blocks).
export const THEME_CATALOG = [
  { id: 'blue', name: 'Sky Blue', price: 0, swatch: ['#1A6DFF', '#38BDF8'] },
  { id: 'pink', name: 'Rose Pink', price: 200, swatch: ['#E11D48', '#FB7185'] },
  { id: 'purple', name: 'Violet', price: 200, swatch: ['#7C3AED', '#A78BFA'] },
  { id: 'emerald', name: 'Emerald', price: 200, swatch: ['#059669', '#34D399'] },
] as const;

export type ThemeId = (typeof THEME_CATALOG)[number]['id'];

export const isThemeId = (id: string): id is ThemeId =>
  THEME_CATALOG.some(t => t.id === id);

// --- Mascot catalog ---
// The bear is the starter mascot; the rest are bought with focus coins and
// replace the active one everywhere in the app.
export const MASCOT_CATALOG = [
  { id: 'bear', name: 'Bear', price: 0, emoji: '🐻' },
  { id: 'cat', name: 'Cat', price: 100, emoji: '🐱' },
  { id: 'rabbit', name: 'Rabbit', price: 150, emoji: '🐰' },
  { id: 'dog', name: 'Dog', price: 200, emoji: '🐶' },
  { id: 'mouse', name: 'Mouse', price: 250, emoji: '🐭' },
  { id: 'panda', name: 'Panda', price: 300, emoji: '🐼' },
] as const;

export type MascotId = (typeof MASCOT_CATALOG)[number]['id'];

export const isMascotId = (id: string): id is MascotId =>
  MASCOT_CATALOG.some(m => m.id === id);

// --- Temptation-tax levers ---
// A failed session still pays a crumb: 1 coin per 30s survived (vs the full
// duration/10 on success), so giving in is always a net loss.
export const FAIL_CONSOLATION_PER_30S = 1;
// Coins required to retroactively mark yesterday as focused (a paid "make-up"
// check-in) and keep the streak alive after a missed day.
export const STREAK_REPAIR_COST = 80;

export interface GameState {
  coins: number;
  currentStreak: number;
  bestStreak: number;
  lastFocusDate: string | null; // YYYY-MM-DD of the last completed session
  dailyProgressDate: string | null; // date completedToday/dailyGoalClaimed belong to
  completedToday: number;
  dailyGoalClaimed: boolean;
  dailyBonusDate: string | null; // date the floating daily bonus was collected
  claimedDays: number[]; // days claimed in the current 7-day check-in cycle
  ownedMascots: MascotId[]; // mascots bought in the shop
  activeMascot: MascotId; // the one currently equipped
  ownedAccessories: AccessoryId[]; // cosmetics bought in the shop
  equippedAccessory: AccessoryId | null; // the one worn by the mascot
  streakFreezes: number; // unused streak-freeze shields (0..STREAK_FREEZE_MAX)
  trees: number; // trees planted in the personal forest
  treeProgress: number; // progress toward the next tree (0..TREE_COST)
  treePlantedDay: number[]; // epoch day each tree was planted (parallel to tree order)
  treePlantedSession: number[]; // totalSessions at each tree's planting (parallel)
  forestFocusMinutes: number; // total focused minutes grown into the forest
  forestDonated: number; // total coins donated to the forest
  ownedThemes: ThemeId[]; // themes bought (blue is always owned)
  activeTheme: ThemeId; // the one applied to the whole app
  longestSession: number; // longest completed session in seconds (record)
  totalSessions: number; // completed sessions of all time
  jackpots: number; // Day-7 jackpots claimed (check-in cycles completed)
  lastCheckinDate: string | null; // YYYY-MM-DD of the last check-in day claimed (one per day cap)
}

export const defaultGameState = (): GameState => ({
  coins: 0,
  currentStreak: 0,
  bestStreak: 0,
  lastFocusDate: null,
  dailyProgressDate: null,
  completedToday: 0,
  dailyGoalClaimed: false,
  dailyBonusDate: null,
  claimedDays: [],
  ownedMascots: ['bear'],
  activeMascot: 'bear',
  ownedAccessories: [],
  equippedAccessory: null,
  streakFreezes: 0,
  trees: 0,
  treeProgress: 0,
  treePlantedDay: [],
  treePlantedSession: [],
  forestFocusMinutes: 0,
  forestDonated: 0,
  ownedThemes: ['blue'],
  activeTheme: 'blue',
  longestSession: 0,
  totalSessions: 0,
  jackpots: 0,
  lastCheckinDate: null,
});

// --- Forest tree lifecycle ---
// Each planted tree grows through 5 real stages: seed -> seedling -> sapling
// -> young -> mature. Growth comes from two honest sources:
//  - Age: one stage per day since planting (real trees take time).
//  - Focus: every completed session after planting advances it one stage
//    (your focus waters the tree). Oldest trees read as the most mature.
export const TREE_STAGES = 5;
export const epochDay = (d: Date = new Date()): number =>
  Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);

export const treeStage = (
  plantedDay: number,
  plantedSession: number,
  totalSessions: number,
  todayDay: number,
): number =>
  Math.min(
    TREE_STAGES - 1,
    Math.max(0, todayDay - plantedDay + (totalSessions - plantedSession)),
  );

export const todayKey = (d: Date = new Date()): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const yesterdayKey = (d: Date = new Date()): string => {
  const y = new Date(d);
  y.setDate(y.getDate() - 1);
  return todayKey(y);
};

const dateOrdinal = (key: string): number | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const [year, month, day] = key.split('-').map(Number);
  const time = Date.UTC(year, month - 1, day);
  const parsed = new Date(time);
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }
  return Math.floor(time / 86400000);
};

const validDateKey = (value: unknown): string | null =>
  typeof value === 'string' && dateOrdinal(value) !== null ? value : null;

const safeInt = (value: unknown, max = Number.MAX_SAFE_INTEGER): number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? Math.min(value, max)
    : 0;

const safeNumber = (value: unknown, max: number): number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.min(value, max)
    : 0;

export const loadGameState = (): GameState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultGameState();
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return defaultGameState();
    }
    const parsed = value as Partial<GameState>;
    // Coerce mascot fields so older saves (without them) get sane defaults.
    const ownedMascots: MascotId[] = Array.from(
      new Set<MascotId>([
        'bear',
        ...(Array.isArray(parsed.ownedMascots)
          ? parsed.ownedMascots.filter(isMascotId)
          : []),
      ]),
    );
    const storedActive = parsed.activeMascot;
    const activeMascot: MascotId =
      storedActive && isMascotId(storedActive) && ownedMascots.includes(storedActive)
        ? storedActive
        : (ownedMascots[0] ?? 'bear');
    const ownedAccessories: AccessoryId[] = Array.isArray(parsed.ownedAccessories)
      ? Array.from(new Set(parsed.ownedAccessories.filter(isAccessoryId)))
      : [];
    const equippedAccessory: AccessoryId | null =
      parsed.equippedAccessory &&
      isAccessoryId(parsed.equippedAccessory) &&
      ownedAccessories.includes(parsed.equippedAccessory)
        ? parsed.equippedAccessory
        : null;
    const ownedThemes: ThemeId[] = Array.isArray(parsed.ownedThemes)
      ? Array.from(new Set<ThemeId>(['blue', ...parsed.ownedThemes.filter(isThemeId)]))
      : ['blue'];
    const storedTheme = parsed.activeTheme;
    const activeTheme: ThemeId =
      storedTheme && isThemeId(storedTheme) && ownedThemes.includes(storedTheme)
        ? storedTheme
        : 'blue';
    // Older saves used lastFocusDate for both streaks and daily counters.
    const lastFocusDate = validDateKey(parsed.lastFocusDate);
    const dailyProgressDate =
      validDateKey(parsed.dailyProgressDate) ?? lastFocusDate;
    const totalSessions = safeInt(parsed.totalSessions);
    const trees = safeInt(parsed.trees, MAX_PERSISTED_TREES);
    const claimedValues = Array.isArray(parsed.claimedDays)
      ? new Set(parsed.claimedDays.filter(Number.isSafeInteger))
      : new Set<number>();
    const claimedDays: number[] = [];
    for (let day = 1; day < DAY_REWARDS.length && claimedValues.has(day); day += 1) {
      claimedDays.push(day);
    }
    // Per-tree maturity records. Older saves have none — backfill so every
    // existing tree reads as mature (planted 4+ days / sessions ago).
    const today = epochDay();
    const treePlantedDay =
      Array.isArray(parsed.treePlantedDay) &&
      parsed.treePlantedDay.length === trees &&
      parsed.treePlantedDay.every(day => Number.isSafeInteger(day) && day >= 0)
        ? parsed.treePlantedDay.map(day => Math.min(day, today))
        : Array.from({ length: trees }, (_, i) => today - 4 - i);
    const treePlantedSession =
      Array.isArray(parsed.treePlantedSession) &&
      parsed.treePlantedSession.length === trees &&
      parsed.treePlantedSession.every(
        session => Number.isSafeInteger(session) && session >= 0,
      )
        ? parsed.treePlantedSession.map(session => Math.min(session, totalSessions))
        : Array.from({ length: trees }, (_, i) => Math.max(0, totalSessions - 4 - i));
    return {
      coins: safeInt(parsed.coins),
      currentStreak: safeInt(parsed.currentStreak),
      bestStreak: safeInt(parsed.bestStreak),
      lastFocusDate,
      dailyProgressDate,
      completedToday: safeInt(parsed.completedToday),
      dailyGoalClaimed: parsed.dailyGoalClaimed === true,
      dailyBonusDate: validDateKey(parsed.dailyBonusDate),
      claimedDays,
      ownedMascots,
      activeMascot,
      ownedAccessories,
      equippedAccessory,
      streakFreezes: safeInt(parsed.streakFreezes, STREAK_FREEZE_MAX),
      trees,
      treeProgress: safeNumber(parsed.treeProgress, TREE_COST - Number.EPSILON),
      treePlantedDay,
      treePlantedSession,
      forestFocusMinutes: safeInt(parsed.forestFocusMinutes),
      forestDonated: safeInt(parsed.forestDonated),
      ownedThemes,
      activeTheme,
      longestSession: safeInt(parsed.longestSession, MAX_SESSION_SECONDS),
      totalSessions,
      jackpots: safeInt(parsed.jackpots),
      lastCheckinDate: validDateKey(parsed.lastCheckinDate),
    };
  } catch {
    return defaultGameState();
  }
};

export const saveGameState = (s: GameState): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // Storage unavailable (private mode etc.) — the game still runs in-memory.
  }
};

// A running timer is intentionally not resumed after a reload: time spent with
// the app closed cannot be verified as focused time. Persist only an interruption
// marker, never elapsed time or a reward, so a restart can explain the failure.
const SESSION_MARKER_KEY = 'focus-tracker:running-session';

export const markSessionRunning = (): void => {
  try {
    localStorage.setItem(SESSION_MARKER_KEY, 'running');
  } catch {
    // The timer still works without storage; crash recovery is unavailable.
  }
};

export const clearSessionRunning = (): void => {
  try {
    localStorage.removeItem(SESSION_MARKER_KEY);
  } catch {
    // Storage unavailable.
  }
};

export const consumeInterruptedSession = (): boolean => {
  try {
    const interrupted = localStorage.getItem(SESSION_MARKER_KEY) === 'running';
    localStorage.removeItem(SESSION_MARKER_KEY);
    return interrupted;
  } catch {
    return false;
  }
};

// A streak can remain in storage during the one-day paid-repair window, but it
// must not be shown as active unless its gap is already covered by freezes.
export const activeStreak = (s: GameState, now: Date = new Date()): number => {
  if (s.currentStreak === 0 || s.lastFocusDate === null) return 0;
  const gap = daysBetween(s.lastFocusDate, todayKey(now));
  if (gap < 0) return 0;
  return gap <= 1 || s.streakFreezes >= gap - 1 ? s.currentStreak : 0;
};

// Roll daily counters over and discard streaks that can no longer be repaired
// or protected. Keep a repairable streak in storage for one day, while the UI
// uses activeStreak to display zero until it is repaired.
// ALWAYS returns a fresh object so callers can never mutate live state.
export const normalizeForToday = (
  s: GameState,
  now: Date = new Date(),
): GameState => {
  const today = todayKey(now);
  const age = s.dailyProgressDate ? daysBetween(s.dailyProgressDate, today) : 1;
  if (age < 0) return { ...s }; // Do not overwrite future progress on clock rollback.
  const gap = s.lastFocusDate ? daysBetween(s.lastFocusDate, today) : Infinity;
  const expired =
    s.currentStreak > 0 && gap > 2 && s.streakFreezes < gap - 1;
  return {
    ...s,
    currentStreak: expired ? 0 : s.currentStreak,
    claimedDays: expired ? [] : s.claimedDays,
    dailyProgressDate: age > 0 ? today : s.dailyProgressDate,
    completedToday: age > 0 ? 0 : s.completedToday,
    dailyGoalClaimed: age > 0 ? false : s.dailyGoalClaimed,
  };
};

export const isWeekend = (d: Date = new Date()): boolean => {
  const day = d.getDay(); // 0 = Sunday, 6 = Saturday
  return day === 0 || day === 6;
};

export interface SessionResult {
  coinsEarned: number; // already includes weekend multiplier + record bonus
  baseCoins: number; // before weekend/record bonuses
  weekendBonus: boolean; // weekend double points was active
  newRecord: boolean; // beat the longest-session record
  recordBonus: number;
  treesPlanted: number; // trees grown by this session's focused minutes
  streakIncreased: boolean;
  streak: number;
  bestStreak: number;
  dailyGoalReached: boolean;
  freezeUsed: number; // streak-freeze shields consumed to save the streak
}

// Called when a focus session completes successfully. `now` is injectable for
// testing (weekend double points depends on the completion day).
export const recordSession = (
  prev: GameState,
  seconds: number,
  now: Date = new Date(),
): { state: GameState; result: SessionResult } => {
  const s = normalizeForToday(prev, now);
  const t = todayKey(now);
  if (
    !Number.isSafeInteger(seconds) ||
    seconds < MIN_SESSION_SECONDS ||
    seconds > MAX_SESSION_SECONDS ||
    (s.lastFocusDate !== null && daysBetween(s.lastFocusDate, t) < 0) ||
    (s.dailyProgressDate !== null && daysBetween(s.dailyProgressDate, t) < 0)
  ) {
    return {
      state: s,
      result: {
        coinsEarned: 0,
        baseCoins: 0,
        weekendBonus: false,
        newRecord: false,
        recordBonus: 0,
        treesPlanted: 0,
        streakIncreased: false,
        streak: s.currentStreak,
        bestStreak: s.bestStreak,
        dailyGoalReached:
          !s.dailyGoalClaimed && s.completedToday >= DAILY_GOAL,
        freezeUsed: 0,
      },
    };
  }
  const weekendBonus = isWeekend(now);
  const baseCoins = Math.round(seconds / 10);
  const coinsEarned = weekendBonus ? baseCoins * WEEKEND_MULTIPLIER : baseCoins;
  const newRecord = seconds > s.longestSession;
  const recordBonus = newRecord ? RECORD_BONUS : 0;

  // Focused minutes grow the forest (25 focused min = 1 tree).
  const treePoints = (seconds / 60) * TREE_POINTS_PER_MIN;
  const treeProgress = s.treeProgress + treePoints;
  const treesPlanted = Math.floor(treeProgress / TREE_COST);
  const focusMinutes = Math.floor(seconds / 60);

  let currentStreak = s.currentStreak;
  let streakIncreased = true;
  let freezeUsed = 0;
  if (s.lastFocusDate === t) {
    streakIncreased = false; // already focused today — streak unchanged
  } else if (s.lastFocusDate === yesterdayKey(now)) {
    currentStreak += 1;
  } else if (s.lastFocusDate !== null && s.currentStreak > 0) {
    // Missed one or more full days. Each freeze shields one missed day;
    // they only get consumed if they fully cover the gap and save the streak.
    const missed = daysBetween(s.lastFocusDate, t); // >= 2
    const need = missed - 1;
    if (need > 0 && s.streakFreezes >= need) {
      currentStreak += 1;
      freezeUsed = need;
    } else {
      currentStreak = 1; // gap not fully covered — streak restarts
    }
  } else {
    currentStreak = 1; // gap of a day or more — streak restarts
  }

  const state: GameState = {
    ...s,
    currentStreak,
    bestStreak: Math.max(s.bestStreak, currentStreak),
    lastFocusDate: t,
    dailyProgressDate: t,
    coins: s.coins + coinsEarned + recordBonus,
    completedToday: s.completedToday + 1,
    streakFreezes: s.streakFreezes - freezeUsed,
    longestSession: Math.max(s.longestSession, seconds),
    totalSessions: s.totalSessions + 1,
    trees: s.trees + treesPlanted,
    treeProgress: treeProgress % TREE_COST,
    // New trees start as seeds (stage 0); age + future sessions mature them.
    treePlantedDay: [
      ...s.treePlantedDay,
      ...Array(treesPlanted).fill(epochDay(now)),
    ],
    treePlantedSession: [
      ...s.treePlantedSession,
      ...Array(treesPlanted).fill(s.totalSessions + 1),
    ],
    // A genuinely broken streak also starts a fresh check-in cycle. Freezes
    // preserve both the streak and its check-in progress.
    claimedDays:
      (s.lastFocusDate !== null &&
        s.lastFocusDate !== t &&
        s.lastFocusDate !== yesterdayKey(now) &&
        freezeUsed === 0) || s.currentStreak === 0
        ? []
        : s.claimedDays,
    forestFocusMinutes: s.forestFocusMinutes + focusMinutes,
  };

  return {
    state,
    result: {
      coinsEarned: coinsEarned + recordBonus,
      baseCoins,
      weekendBonus,
      newRecord,
      recordBonus,
      treesPlanted,
      streakIncreased,
      streak: currentStreak,
      bestStreak: state.bestStreak,
      dailyGoalReached:
        !state.dailyGoalClaimed && state.completedToday >= DAILY_GOAL,
      freezeUsed,
    },
  };
};

// Claim the daily-goal bonus (once per day, after DAILY_GOAL completions).
export const claimDailyGoal = (
  prev: GameState,
  now: Date = new Date(),
): { state: GameState; reward: number } => {
  const s = normalizeForToday(prev, now);
  if (
    s.dailyProgressDate !== todayKey(now) ||
    s.dailyGoalClaimed ||
    s.completedToday < DAILY_GOAL
  ) {
    return { state: s, reward: 0 };
  }
  return {
    state: {
      ...s,
      dailyGoalClaimed: true,
      coins: s.coins + DAILY_GOAL_REWARD,
    },
    reward: DAILY_GOAL_REWARD,
  };
};

// Claim a Day N reward from the check-in strip. Claiming Day 7 completes the
// cycle and starts a fresh one, while the streak keeps counting.
export const claimDayReward = (
  prev: GameState,
  day: number,
  now: Date = new Date(),
): { state: GameState; reward: number } => {
  const s = normalizeForToday(prev, now);
  const today = todayKey(now);
  // One check-in claim per calendar day to prevent cycling infinitely.
  if (
    s.lastCheckinDate !== null &&
    daysBetween(s.lastCheckinDate, today) <= 0
  ) {
    return { state: s, reward: 0 };
  }
  const nextDay = s.claimedDays.length + 1;
  if (
    day < 1 ||
    day > DAY_REWARDS.length ||
    day !== nextDay ||
    s.lastFocusDate !== today ||
    s.currentStreak < day ||
    s.claimedDays.includes(day)
  ) {
    return { state: s, reward: 0 };
  }
  const reward = checkinReward(day, s.jackpots);
  return {
    state: {
      ...s,
      coins: s.coins + reward,
      // Day 7 completes the cycle (jackpot!) and starts a fresh one.
      claimedDays: day === DAY_REWARDS.length ? [] : [...s.claimedDays, day],
      jackpots: s.jackpots + (day === DAY_REWARDS.length ? 1 : 0),
      lastCheckinDate: today,
    },
    reward,
  };
};

// Deterministic daily bonus value (10-30 coins), stable within the same day so
// the floating bubble always shows exactly what tapping it awards.
const hashDate = (key: string): number => {
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) % 997;
  return h;
};

export const dailyBonusValue = (now: Date = new Date()): number =>
  10 + (hashDate(todayKey(now)) % 21);

export const claimDailyBonus = (
  prev: GameState,
  now: Date = new Date(),
): { state: GameState; reward: number } => {
  const s = normalizeForToday(prev, now);
  const t = todayKey(now);
  if (
    s.dailyBonusDate !== null &&
    daysBetween(s.dailyBonusDate, t) <= 0
  ) {
    return { state: s, reward: 0 };
  }
  const reward = dailyBonusValue(now);
  return {
    state: { ...s, dailyBonusDate: t, coins: s.coins + reward },
    reward,
  };
};

// Consolation for a failed session: a fraction of the success reward, so
// failing is never profitable but the effort still gets a crumb.
export const awardFailConsolation = (
  prev: GameState,
  survivedSeconds: number,
): { state: GameState; reward: number } => {
  if (!Number.isFinite(survivedSeconds) || survivedSeconds <= 0) {
    return { state: prev, reward: 0 };
  }
  const safeSeconds = Math.min(Math.floor(survivedSeconds), MAX_SESSION_SECONDS);
  const reward = Math.floor(safeSeconds / 30) * FAIL_CONSOLATION_PER_30S;
  if (reward <= 0) return { state: prev, reward: 0 };
  return { state: { ...prev, coins: prev.coins + reward }, reward };
};

// Whole days between two YYYY-MM-DD keys (Infinity if `from` is null).
export const daysBetween = (from: string | null, to: string): number => {
  if (!from) return Infinity;
  const fromDay = dateOrdinal(from);
  const toDay = dateOrdinal(to);
  if (fromDay === null || toDay === null) return Infinity;
  return toDay - fromDay;
};

// A streak is repairable when it exists and at least one full day was missed
// (the next completed session would otherwise reset it to 1).
export const canRepairStreak = (s: GameState, now: Date = new Date()): boolean => {
  if (s.currentStreak <= 0 || s.lastFocusDate === null) return false;
  // If a pre-owned freeze already covers the missed day, repair would spend
  // coins for no benefit: the next session will consume that freeze instead.
  return daysBetween(s.lastFocusDate, todayKey(now)) === 2 && s.streakFreezes === 0;
};

// Paid streak repair: spend coins to mark yesterday as focused, so the next
// session extends the streak instead of restarting it.
export const repairStreak = (
  prev: GameState,
  now: Date = new Date(),
): { state: GameState; repaired: boolean } => {
  const s = normalizeForToday(prev, now);
  if (!canRepairStreak(s, now) || s.coins < STREAK_REPAIR_COST) {
    return { state: s, repaired: false };
  }
  return {
    state: {
      ...s,
      coins: s.coins - STREAK_REPAIR_COST,
      lastFocusDate: yesterdayKey(now),
    },
    repaired: true,
  };
};

// --- Achievements (records + unlock badges) ---
// The subset of state the badge conditions read — GameState satisfies it.
export interface AchievementStats {
  totalSessions: number;
  bestStreak: number;
  trees: number;
  longestSession: number;
  jackpots: number;
}

export interface Achievement {
  id: string;
  emoji: string;
  name: string;
  desc: string;
  unlocked: (s: AchievementStats) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first',
    emoji: '🌱',
    name: 'First Focus',
    desc: 'Complete your first session',
    unlocked: s => s.totalSessions >= 1,
  },
  {
    id: 'streak3',
    emoji: '⚡',
    name: 'On a Roll',
    desc: 'Reach a 3-day streak',
    unlocked: s => s.bestStreak >= 3,
  },
  {
    id: 'streak7',
    emoji: '🔥',
    name: 'Week Warrior',
    desc: 'Reach a 7-day streak',
    unlocked: s => s.bestStreak >= 7,
  },
  {
    id: 'tree1',
    emoji: '🌳',
    name: 'Tree Planter',
    desc: 'Plant your first tree',
    unlocked: s => s.trees >= 1,
  },
  {
    id: 'tree10',
    emoji: '🌲',
    name: 'Forest Keeper',
    desc: 'Plant 10 trees',
    unlocked: s => s.trees >= 10,
  },
  {
    id: 'record25',
    emoji: '🏆',
    name: 'Record Breaker',
    desc: 'Complete a 25-min session',
    unlocked: s => s.longestSession >= 1500,
  },
  {
    id: 'record60',
    emoji: '⏱️',
    name: 'Marathoner',
    desc: 'Complete a 1-hour session',
    unlocked: s => s.longestSession >= 3600,
  },
  {
    id: 'jackpot1',
    emoji: '🎰',
    name: 'Jackpot',
    desc: 'Claim the Day-7 jackpot',
    unlocked: s => s.jackpots >= 1,
  },
  {
    id: 'jackpot3',
    emoji: '👑',
    name: 'Jackpot Master',
    desc: 'Claim the jackpot 3 times',
    unlocked: s => s.jackpots >= 3,
  },
  {
    id: 'sess10',
    emoji: '🎯',
    name: 'Double Digits',
    desc: 'Complete 10 sessions',
    unlocked: s => s.totalSessions >= 10,
  },
  {
    id: 'sess50',
    emoji: '💎',
    name: 'Focus Machine',
    desc: 'Complete 50 sessions',
    unlocked: s => s.totalSessions >= 50,
  },
  {
    id: 'streak14',
    emoji: '🛡️',
    name: 'Fortnight',
    desc: 'Reach a 14-day streak',
    unlocked: s => s.bestStreak >= 14,
  },
  {
    id: 'streak30',
    emoji: '🌟',
    name: 'Month Master',
    desc: 'Reach a 30-day streak',
    unlocked: s => s.bestStreak >= 30,
  },
  {
    id: 'tree25',
    emoji: '🌳',
    name: 'Forester',
    desc: 'Plant 25 trees',
    unlocked: s => s.trees >= 25,
  },
  {
    id: 'tree50',
    emoji: '🌲',
    name: 'Forest Lord',
    desc: 'Plant 50 trees',
    unlocked: s => s.trees >= 50,
  },
  {
    id: 'record45',
    emoji: '🚀',
    name: 'Deep Work',
    desc: 'Complete a 45-min session',
    unlocked: s => s.longestSession >= 2700,
  },
  {
    id: 'record90',
    emoji: '🦅',
    name: 'Ultra Focus',
    desc: 'Complete a 90-min session',
    unlocked: s => s.longestSession >= 5400,
  },
  {
    id: 'jackpot5',
    emoji: '🏅',
    name: 'Jackpot Legend',
    desc: 'Claim 5 jackpots',
    unlocked: s => s.jackpots >= 5,
  },
];

export const unlockedCount = (s: AchievementStats): number =>
  ACHIEVEMENTS.filter(a => a.unlocked(s)).length;

// --- Mascot shop ---

// Buy an accessory with coins (auto-equips it).
export const buyAccessory = (
  prev: GameState,
  id: AccessoryId,
): { state: GameState; ok: boolean; cost: number } => {
  const s = normalizeForToday(prev);
  const item = ACCESSORY_CATALOG.find(a => a.id === id);
  if (!item || s.ownedAccessories.includes(id) || s.coins < item.price) {
    return { state: s, ok: false, cost: item?.price ?? 0 };
  }
  return {
    state: {
      ...s,
      coins: s.coins - item.price,
      ownedAccessories: [...s.ownedAccessories, id],
      equippedAccessory: id,
    },
    ok: true,
    cost: item.price,
  };
};

// Equip an owned accessory, or pass null to take it off.
export const equipAccessory = (
  prev: GameState,
  id: AccessoryId | null,
): { state: GameState; ok: boolean } => {
  const s = normalizeForToday(prev);
  if (id !== null && !s.ownedAccessories.includes(id)) {
    return { state: s, ok: false };
  }
  if (s.equippedAccessory === id) return { state: s, ok: false };
  return { state: { ...s, equippedAccessory: id }, ok: true };
};

// Buy streak-freeze protection (capped so coins stay meaningful).
export const buyStreakFreeze = (
  prev: GameState,
): { state: GameState; ok: boolean } => {
  const s = normalizeForToday(prev);
  // A freeze is advance protection, not a cheaper retroactive repair.
  if (
    (s.currentStreak > 0 && activeStreak(s) === 0) ||
    s.streakFreezes >= STREAK_FREEZE_MAX ||
    s.coins < STREAK_FREEZE_COST
  ) {
    return { state: s, ok: false };
  }
  return {
    state: {
      ...s,
      streakFreezes: s.streakFreezes + 1,
      coins: s.coins - STREAK_FREEZE_COST,
    },
    ok: true,
  };
};

// Donate coins to the forest. Donations count toward the next tree (TREE_COST
// coins each) and any overflow carries over.
export const donateToForest = (
  prev: GameState,
  amount: number,
): { state: GameState; treesPlanted: number; donated: number } => {
  const s = normalizeForToday(prev);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { state: s, treesPlanted: 0, donated: 0 };
  }
  const donated = Math.min(Math.floor(amount), s.coins);
  if (donated <= 0) return { state: s, treesPlanted: 0, donated: 0 };
  const progress = s.treeProgress + donated;
  const treesPlanted = Math.floor(progress / TREE_COST);
  return {
    state: {
      ...s,
      coins: s.coins - donated,
      trees: s.trees + treesPlanted,
      treeProgress: progress % TREE_COST,
      treePlantedDay: [
        ...s.treePlantedDay,
        ...Array(treesPlanted).fill(epochDay()),
      ],
      treePlantedSession: [
        ...s.treePlantedSession,
        ...Array(treesPlanted).fill(s.totalSessions),
      ],
      forestDonated: s.forestDonated + donated,
    },
    treesPlanted,
    donated,
  };
};

// Buy a theme (auto-applies it).
export const buyTheme = (
  prev: GameState,
  id: ThemeId,
): { state: GameState; ok: boolean; cost: number } => {
  const s = normalizeForToday(prev);
  const item = THEME_CATALOG.find(t => t.id === id);
  if (!item || item.price <= 0 || s.ownedThemes.includes(id)) {
    return { state: s, ok: false, cost: item?.price ?? 0 };
  }
  if (s.coins < item.price) return { state: s, ok: false, cost: item.price };
  return {
    state: {
      ...s,
      coins: s.coins - item.price,
      ownedThemes: [...s.ownedThemes, id],
      activeTheme: id,
    },
    ok: true,
    cost: item.price,
  };
};

export const equipTheme = (
  prev: GameState,
  id: ThemeId,
): { state: GameState; ok: boolean } => {
  const s = normalizeForToday(prev);
  if (!s.ownedThemes.includes(id) || s.activeTheme === id) {
    return { state: s, ok: false };
  }
  return { state: { ...s, activeTheme: id }, ok: true };
};

// Buy a mascot with coins (auto-equips it) or swap to one already owned.
export const buyMascot = (
  prev: GameState,
  id: MascotId,
): { state: GameState; ok: boolean; cost: number } => {
  const s = normalizeForToday(prev);
  const item = MASCOT_CATALOG.find(m => m.id === id);
  if (!item || item.price <= 0 || s.ownedMascots.includes(id)) {
    return { state: s, ok: false, cost: item?.price ?? 0 };
  }
  if (s.coins < item.price) return { state: s, ok: false, cost: item.price };
  return {
    state: {
      ...s,
      coins: s.coins - item.price,
      ownedMascots: [...s.ownedMascots, id],
      activeMascot: id,
    },
    ok: true,
    cost: item.price,
  };
};

export const equipMascot = (
  prev: GameState,
  id: MascotId,
): { state: GameState; ok: boolean } => {
  const s = normalizeForToday(prev);
  if (!s.ownedMascots.includes(id) || s.activeMascot === id) {
    return { state: s, ok: false };
  }
  return { state: { ...s, activeMascot: id }, ok: true };
};
