// End-to-end verification of every reward path in the game state (the pure
// logic layer behind the UI). Run with:
//   npx tsc lib/gameState.ts --outDir .tmp-gs --module commonjs --target es2019 --skipLibCheck --esModuleInterop
//   node tests/verify-rewards.js
// then `rm -rf .tmp-gs`. Exit code 0 = every reward flow verified.
const gs = require('../.tmp-gs/gameState');

let pass = 0;
let fail = 0;
const ok = (cond, label) => {
  if (cond) {
    pass++;
  } else {
    fail++;
    console.error('  FAIL:', label);
  }
};

const base = () => gs.defaultGameState();
// A Saturday at 10:00 (2026-08-22 is a Saturday)
const SAT = new Date(2026, 7, 22, 10, 0, 0);
// Fixed weekday keeps reward tests deterministic on weekends and in CI.
const NOW = new Date(2026, 7, 18, 10, 0, 0);

console.log('== 1. Session rewards ==');
{
  const { state, result } = gs.recordSession(base(), 300, NOW); // 5 min
  ok(result.baseCoins === 30, '300s -> 30 base coins');
  ok(!result.weekendBonus, 'weekday is not weekend');
  ok(result.newRecord && result.recordBonus === 50, 'first session beats record (+50)');
  ok(result.coinsEarned === 80, 'coins = 30 + 50 record');
  ok(state.coins === 80, 'state coins 80');
  ok(state.currentStreak === 1 && state.totalSessions === 1, 'streak 1, 1 session');
  ok(state.longestSession === 300, 'longest = 300');
  ok(state.completedToday === 1, 'completedToday 1');
  ok(!result.dailyGoalReached, 'goal not reached at 1 session');
  ok(result.streakIncreased, 'streak increased on first day');

  // No record bonus when not beating the record
  const r2 = gs.recordSession(state, 120, NOW);
  ok(r2.result.recordBonus === 0 && r2.result.newRecord === false, 'no record bonus below record');
  ok(r2.result.coinsEarned === 12, '120s -> 12 coins');
  ok(r2.state.completedToday === 2, 'completedToday 2');
  ok(r2.result.dailyGoalReached === false, '2 sessions < 3 goal');

  const r3 = gs.recordSession(r2.state, 120, NOW);
  ok(r3.result.dailyGoalReached === true, '3 sessions -> daily goal reached');
}

console.log('== 2. Weekend double points ==');
{
  const { state, result } = gs.recordSession(base(), 1500, SAT); // 25 min Saturday
  ok(result.weekendBonus === true, 'Saturday is weekend');
  ok(result.baseCoins === 150, '1500s -> 150 base');
  ok(result.coinsEarned === 300 + 50, '150 x2 + 50 record = 350');
  ok(state.coins === 350, 'state coins 350');
}

console.log('== 3. Daily goal claim ==');
{
  let s = base();
  s.completedToday = 3;
  s.lastFocusDate = gs.todayKey();
  s.dailyProgressDate = gs.todayKey();
  const c1 = gs.claimDailyGoal(s);
  ok(c1.reward === 50, 'daily goal reward 50');
  ok(c1.state.coins === 50 && c1.state.dailyGoalClaimed, 'coins +50, claimed flag');
  const c2 = gs.claimDailyGoal(c1.state);
  ok(c2.reward === 0, 'cannot claim twice');
  let s2 = base();
  s2.completedToday = 2;
  s2.lastFocusDate = gs.todayKey();
  s2.dailyProgressDate = gs.todayKey();
  ok(gs.claimDailyGoal(s2).reward === 0, 'cannot claim before 3 sessions');
}

console.log('== 4. Check-in strip D1-D7 + jackpot + escalation ==');
{
  // Walk the full cycle: streak 1..7, claim each day (one per day)
  let s = base();
  let day = 1;
  const dayNames = [10, 20, 30, 50, 80, 120, 200];
  let running = 0;
  for (const expected of dayNames) {
    s.currentStreak = day;
    s.lastFocusDate = gs.todayKey();
    // Simulate a new day: clear lastCheckinDate so the one-per-day cap resets
    s.lastCheckinDate = null;
    const c = gs.claimDayReward(s, day);
    ok(c.reward === expected, `D${day} reward = ${expected} (got ${c.reward})`);
    running += expected;
    ok(c.state.coins === running, `D${day} coins accumulate to ${running}`);
    s = c.state;
    day++;
  }
  ok(s.jackpots === 1, 'jackpot count 1 after D7');
  ok(s.claimedDays.length === 0, 'cycle resets after D7');
  ok(s.coins === 510, 'full cycle total 510 (10+20+30+50+80+120+200)');
  ok(s.lastCheckinDate === gs.todayKey(), 'lastCheckinDate set after claim');

  // Cannot claim a second time on the same day
  const sameDayBlock = gs.claimDayReward(s, 1);
  ok(sameDayBlock.reward === 0, 'cannot claim twice same day (one-per-day cap)');

  // Cannot claim beyond streak / repeat / out of range
  let s2 = base();
  s2.currentStreak = 1;
  s2.lastFocusDate = gs.todayKey();
  ok(gs.claimDayReward(s2, 2).reward === 0, 'cannot claim D2 at streak 1');
  ok(gs.claimDayReward(s2, 8).reward === 0, 'cannot claim D8');
  ok(gs.claimDayReward(s2, 0).reward === 0, 'cannot claim D0');
  const d1 = gs.claimDayReward(s2, 1);
  ok(gs.claimDayReward(d1.state, 1).reward === 0, 'cannot re-claim D1');

  // === Edge case: infinite-loop exploit (the original bug) ===
  // After D7 claimed, claimedDays resets to [] but lastCheckinDate blocks
  // same-day re-claiming of D1-D7 in a new cycle.
  let exploit = base();
  exploit.currentStreak = 7;
  exploit.lastFocusDate = gs.todayKey();
  exploit.claimedDays = [1, 2, 3, 4, 5, 6];
  const d7 = gs.claimDayReward(exploit, 7);
  ok(d7.reward > 0, 'D7 jackpot claimed');
  ok(d7.state.jackpots === 1, 'jackpot count 1');
  ok(d7.state.claimedDays.length === 0, 'claimedDays reset after D7');
  // Same day: try D1 of new cycle — must be blocked
  const exploitD1 = gs.claimDayReward(d7.state, 1);
  ok(exploitD1.reward === 0, 'cannot exploit: D1 blocked same day after D7');
  // Same day: try D7 again — also blocked
  const exploitD7 = gs.claimDayReward(d7.state, 7);
  ok(exploitD7.reward === 0, 'cannot exploit: D7 blocked same day after D7');

  // === Edge case: next day after D7 — new cycle starts ===
  // Simulate a new day by clearing lastCheckinDate
  const nextDay = { ...d7.state, lastCheckinDate: null };
  nextDay.currentStreak = 8;
  nextDay.lastFocusDate = gs.todayKey();
  const newCycleD1 = gs.claimDayReward(nextDay, 1);
  ok(newCycleD1.reward > 0, 'D1 claimable next day after D7 (new cycle)');
  ok(newCycleD1.state.jackpots === 1, 'jackpot count still 1 after D1 of cycle 2');

  // === Edge case: catch-up within cycle limited to one per day ===
  let catchup = base();
  catchup.currentStreak = 5;
  catchup.lastFocusDate = gs.todayKey();
  catchup.claimedDays = [];
  catchup.lastCheckinDate = null;
  const cu1 = gs.claimDayReward(catchup, 1);
  ok(cu1.reward > 0, 'catch-up D1 claimed');
  // Same day: try D2 — blocked by one-per-day
  const cu2 = gs.claimDayReward(cu1.state, 2);
  ok(cu2.reward === 0, 'catch-up D2 blocked same day (one-per-day)');

  // === Edge case: old save without lastCheckinDate ===
  let old = base();
  old.currentStreak = 3;
  old.lastFocusDate = gs.todayKey();
  old.lastCheckinDate = undefined; // simulates pre-fix localStorage
  const oldClaim = gs.claimDayReward(old, 1);
  ok(oldClaim.reward > 0, 'old save without lastCheckinDate can claim');

  // Escalation: cycle 2 rewards +50%
  let s3 = base();
  s3.jackpots = 1; // one completed cycle
  s3.currentStreak = 1;
  s3.lastFocusDate = gs.todayKey();
  s3.lastCheckinDate = null;
  ok(gs.claimDayReward(s3, 1).reward === 15, 'cycle 2 D1 = 10 x1.5 = 15');
  // New day for next claim
  s3.lastCheckinDate = null;
  s3.currentStreak = 7;
  s3.claimedDays = [1, 2, 3, 4, 5, 6];
  ok(gs.claimDayReward(s3, 7).reward === 300, 'cycle 2 D7 = 200 x1.5 = 300');
  // Escalation cap x4 (after 6 cycles)
  let s4 = base();
  s4.jackpots = 6;
  s4.currentStreak = 7;
  s4.lastFocusDate = gs.todayKey();
  s4.claimedDays = [1, 2, 3, 4, 5, 6];
  ok(gs.claimDayReward(s4, 7).reward === 800, 'jackpot capped at x4 = 800');
  ok(gs.checkinMultiplier(6) === 4, 'multiplier caps at 4');

  // Check-ins must be sequential and require a live streak.
  let ordered = base();
  ordered.currentStreak = 7;
  ordered.lastFocusDate = gs.todayKey();
  ok(gs.claimDayReward(ordered, 7).reward === 0, 'cannot skip directly to D7');
  const staleDate = new Date();
  staleDate.setDate(staleDate.getDate() - 2);
  ordered.lastFocusDate = gs.todayKey(staleDate);
  ok(gs.claimDayReward(ordered, 1).reward === 0, 'cannot claim against an expired streak');
}

console.log('== 5. Daily bonus ==');
{
  const s = base();
  const c = gs.claimDailyBonus(s);
  ok(c.reward >= 10 && c.reward <= 30, `daily bonus in 10..30 (got ${c.reward})`);
  ok(c.state.coins === c.reward, 'bonus added');
  ok(gs.claimDailyBonus(c.state).reward === 0, 'cannot claim twice same day');
  const v1 = gs.dailyBonusValue();
  const v2 = gs.dailyBonusValue();
  ok(v1 === v2, 'daily bonus value stable within the day');
}

console.log('== 6. Fail consolation ==');
{
  ok(gs.awardFailConsolation(base(), 30).reward === 1, '30s survived -> 1 coin');
  ok(gs.awardFailConsolation(base(), 89).reward === 2, '89s -> 2 coins');
  ok(gs.awardFailConsolation(base(), 29).reward === 0, 'under 30s -> 0');
  const s = gs.awardFailConsolation(base(), 60).state;
  ok(s.coins === 2, 'consolation coins added');
}

console.log('== 7. Streak repair ==');
{
  let s = base();
  s.currentStreak = 5;
  s.lastFocusDate = gs.todayKey();
  ok(!gs.canRepairStreak(s), 'not repairable same day');
  // Build a one-missed-day gap: last focus was two calendar days ago.
  const d = new Date();
  d.setDate(d.getDate() - 2);
  const twoDaysAgo = gs.todayKey(d);
  s.lastFocusDate = twoDaysAgo;
  ok(gs.canRepairStreak(s), 'repairable after one missed day');
  s.coins = 80;
  const r = gs.repairStreak(s);
  ok(r.repaired && r.state.coins === 0, 'repair costs 80');
  ok(r.state.lastFocusDate === gs.yesterdayKey(), 'repair backfills yesterday');
  // next session extends the streak instead of resetting
  const next = gs.recordSession(r.state, 60, new Date());
  ok(next.result.streak === 6, 'repaired streak continues (5 -> 6)');
  // not enough coins
  let poor = base();
  poor.currentStreak = 3;
  poor.lastFocusDate = twoDaysAgo;
  poor.coins = 10;
  ok(!gs.repairStreak(poor).repaired, 'repair fails without 80 coins');
  const oldDate = new Date();
  oldDate.setDate(oldDate.getDate() - 3);
  poor.lastFocusDate = gs.todayKey(oldDate);
  poor.coins = 80;
  ok(!gs.repairStreak(poor).repaired, 'one repair cannot erase multiple missed days');
}

console.log('== 8. Streak freeze (buy + consume) ==');
{
  let s = base();
  s.coins = 100;
  const b1 = gs.buyStreakFreeze(s);
  ok(b1.ok && b1.state.streakFreezes === 1 && b1.state.coins === 50, 'freeze bought for 50');
  const b2 = gs.buyStreakFreeze(b1.state);
  ok(b2.ok, 'second freeze ok');
  b2.state.coins = 500;
  const b3 = gs.buyStreakFreeze(b2.state);
  ok(b3.ok, 'third freeze ok');
  const b4 = gs.buyStreakFreeze(b3.state);
  ok(!b4.ok, 'capped at 3 freezes');
  ok(!gs.buyStreakFreeze(base()).ok, 'cannot buy with 0 coins');

  // Freeze saves a missed-day streak
  let f = base();
  f.currentStreak = 2;
  f.streakFreezes = 1;
  f.coins = 0;
  const d = new Date();
  d.setDate(d.getDate() - 2); // missed 1 full day
  f.lastFocusDate = gs.todayKey(d);
  const fs = gs.recordSession(f, 60, new Date());
  ok(fs.result.streak === 3, 'freeze saves streak (2 -> 3)');
  ok(fs.result.freezeUsed === 1, 'freeze consumed');
  ok(fs.state.streakFreezes === 0, 'shield spent');

  // Gap too large to fully cover -> streak resets, freeze NOT consumed
  let g = base();
  g.currentStreak = 2;
  g.streakFreezes = 1;
  const d2 = new Date();
  d2.setDate(d2.getDate() - 4); // missed 3 full days, need 3 freezes
  g.lastFocusDate = gs.todayKey(d2);
  const gs2 = gs.recordSession(g, 60, new Date());
  ok(gs2.result.streak === 1, 'uncovered gap resets streak');
  ok(gs2.result.freezeUsed === 0 && gs2.state.streakFreezes === 1, 'freeze kept when not fully covering');
}

console.log('== 9. Forest: focus trees + lifecycle + donate ==');
{
  // 25 focused minutes -> exactly 1 tree
  const { state, result } = gs.recordSession(base(), 1500, NOW);
  ok(result.treesPlanted === 1, '25 min plants 1 tree');
  ok(state.trees === 1 && state.treeProgress === 0, 'tree count 1, progress reset');
  ok(state.treePlantedDay.length === 1 && state.treePlantedSession.length === 1, 'maturity records pushed');
  ok(state.forestFocusMinutes === 25, '25 focus minutes tracked');

  // 15 min onto 40% progress -> 1 more tree, overflow carries
  let s = base();
  s.trees = 0;
  s.treeProgress = 40;
  const r2 = gs.recordSession(s, 900, NOW); // 15 min = 60 points
  ok(r2.result.treesPlanted === 1, '60pts onto 40% -> 1 tree');
  ok(r2.state.trees === 1 && r2.state.treeProgress === 0, 'progress 0 after plant (100 -> 100)');

  // Donation: 100 -> 1 tree; 250 -> 2 trees + 50 overflow
  const funded = () => Object.assign(base(), { coins: 500 });
  const d1 = gs.donateToForest(funded(), 100);
  ok(d1.treesPlanted === 1 && d1.state.trees === 1 && d1.state.treeProgress === 0, 'donate 100 -> 1 tree');
  ok(d1.state.forestDonated === 100, 'donated counter');
  ok(d1.state.treePlantedDay.length === 1 && d1.state.treePlantedSession.length === 1, 'donated tree gets maturity metadata');
  const d2 = gs.donateToForest(funded(), 250);
  ok(d2.treesPlanted === 2 && d2.state.treeProgress === 50, 'donate 250 -> 2 trees, 50 overflow');
  ok(d2.state.treePlantedDay.length === 2 && d2.state.treePlantedSession.length === 2, 'all donated trees get metadata');
  const d3 = gs.donateToForest(base(), 1000);
  ok(d3.donated === 0 && d3.treesPlanted === 0, 'donate with 0 coins -> nothing');
  let rich = base();
  rich.coins = 40;
  const d4 = gs.donateToForest(rich, 1000);
  ok(d4.donated === 40, 'donation clamped to coins');

  // Tree lifecycle stages
  const today = gs.epochDay();
  ok(gs.treeStage(today, 5, 5, today) === 0, 'new tree stage 0 (seed)');
  ok(gs.treeStage(today - 1, 4, 5, today) === 2, '1 day + 1 session -> stage 2');
  ok(gs.treeStage(today - 4, 0, 5, today) === 4, '4 days -> mature');
  ok(gs.treeStage(today - 10, 0, 5, today) === 4, 'maturity caps at 4');
}

console.log('== 10. Mascot / accessory / theme shops ==');
{
  // Accessory: buy auto-equips, re-buy fails, equip/remove works
  let s = base();
  s.coins = 100;
  const ab = gs.buyAccessory(s, 'bow');
  ok(ab.ok && ab.cost === 60 && ab.state.coins === 40, 'bow bought for 60');
  ok(ab.state.ownedAccessories.includes('bow') && ab.state.equippedAccessory === 'bow', 'auto-equipped');
  ok(!gs.buyAccessory(ab.state, 'bow').ok, 'cannot re-buy');
  const f = gs.buyAccessory(ab.state, 'flower');
  ok(f.ok && f.state.equippedAccessory === 'flower', 'flower bought + equipped');
  const eq = gs.equipAccessory(f.state, 'bow');
  ok(eq.ok && eq.state.equippedAccessory === 'bow', 'swap to bow');
  ok(!gs.equipAccessory(f.state, 'crown').ok, 'cannot equip unowned');
  const rem = gs.equipAccessory(eq.state, null);
  ok(rem.ok && rem.state.equippedAccessory === null, 'remove accessory');
  ok(!gs.equipAccessory(rem.state, null).ok, 'no-op remove');

  // Theme: buy + equip
  let t = base();
  t.coins = 500;
  const tb = gs.buyTheme(t, 'pink');
  ok(tb.ok && tb.cost === 200 && tb.state.coins === 300, 'pink theme for 200');
  ok(tb.state.activeTheme === 'pink' && tb.state.ownedThemes.includes('pink'), 'theme applied');
  ok(!gs.buyTheme(tb.state, 'pink').ok, 'cannot re-buy theme');
  ok(!gs.buyTheme(base(), 'emerald').ok, 'cannot buy theme with 0 coins');
  const te = gs.equipTheme(tb.state, 'blue');
  ok(te.ok && te.state.activeTheme === 'blue', 'equip blue back');
  ok(!gs.equipTheme(tb.state, 'purple').ok, 'cannot equip unowned theme');

  // Mascot: buy + equip
  let m = base();
  m.coins = 400;
  const mb = gs.buyMascot(m, 'cat');
  ok(mb.ok && mb.cost === 100 && mb.state.coins === 300, 'cat for 100');
  ok(mb.state.activeMascot === 'cat', 'cat active');
  ok(!gs.buyMascot(mb.state, 'cat').ok, 'cannot re-buy mascot');
  ok(!gs.buyMascot(base(), 'panda').ok, 'cannot buy panda with 0 coins');
  const me = gs.equipMascot(mb.state, 'bear');
  ok(me.ok && me.state.activeMascot === 'bear', 'equip bear');
  ok(!gs.equipMascot(mb.state, 'panda').ok, 'cannot equip unowned mascot');
}

console.log('== 11. Achievements ==');
{
  const stats = (o) => ({ totalSessions: 0, bestStreak: 0, trees: 0, longestSession: 0, jackpots: 0, ...o });
  ok(gs.unlockedCount(stats({})) === 0, '0/18 at fresh state');
  ok(gs.unlockedCount(stats({ totalSessions: 1 })) === 1, 'First Focus at 1 session');
  ok(gs.unlockedCount(stats({ totalSessions: 10 })) === 2, '+ Double Digits at 10 sessions');
  ok(gs.unlockedCount(stats({ totalSessions: 50 })) === 3, '+ Focus Machine at 50');
  ok(gs.unlockedCount(stats({ bestStreak: 3 })) === 1, 'On a Roll at 3-day');
  ok(gs.unlockedCount(stats({ bestStreak: 7 })) === 2, '+ Week Warrior at 7-day');
  ok(gs.unlockedCount(stats({ bestStreak: 14 })) === 3, '+ Fortnight');
  ok(gs.unlockedCount(stats({ bestStreak: 30 })) === 4, '+ Month Master');
  ok(gs.unlockedCount(stats({ trees: 1 })) === 1, 'Tree Planter at 1 tree');
  ok(gs.unlockedCount(stats({ trees: 10 })) === 2, '+ Forest Keeper at 10');
  ok(gs.unlockedCount(stats({ trees: 25 })) === 3, '+ Forester at 25');
  ok(gs.unlockedCount(stats({ trees: 50 })) === 4, '+ Forest Lord at 50');
  ok(gs.unlockedCount(stats({ longestSession: 1500 })) === 1, 'Record Breaker at 25 min');
  ok(gs.unlockedCount(stats({ longestSession: 2700 })) === 2, '+ Deep Work at 45 min');
  ok(gs.unlockedCount(stats({ longestSession: 5400 })) === 4, '+ Ultra Focus at 90 min (4: record+deep+marathon+ultra)');
  ok(gs.unlockedCount(stats({ longestSession: 3600 })) >= 2, 'Marathoner unlocks at 60 min');
  ok(gs.unlockedCount(stats({ jackpots: 1 })) === 1, 'Jackpot at 1');
  ok(gs.unlockedCount(stats({ jackpots: 3 })) === 2, '+ Jackpot Master at 3');
  ok(gs.unlockedCount(stats({ jackpots: 5 })) === 3, '+ Jackpot Legend at 5');
  // Full house
  const full = stats({ totalSessions: 50, bestStreak: 30, trees: 50, longestSession: 5400, jackpots: 5 });
  ok(gs.unlockedCount(full) === 18, 'all 18 unlock at max stats');
}

console.log('== 12. Streak edge cases (missed day resets) ==');
{
  let s = base();
  s.currentStreak = 2;
  s.bestStreak = 2;
  const d = new Date();
  d.setDate(d.getDate() - 3); // missed 2+ days, no freeze
  s.lastFocusDate = gs.todayKey(d);
  const r = gs.recordSession(s, 60, new Date());
  ok(r.result.streak === 1, 'missed day without freeze resets to 1');
  ok(r.state.bestStreak === 2, 'best streak preserved');
  s.claimedDays = [1, 2];
  const resetCheckins = gs.recordSession(s, 60, new Date());
  ok(resetCheckins.state.claimedDays.length === 0, 'broken streak resets check-in progress');
  // same-day second session does not bump streak
  const t = gs.todayKey();
  let s2 = base();
  s2.currentStreak = 4;
  s2.lastFocusDate = t;
  const r2 = gs.recordSession(s2, 60, new Date());
  ok(r2.result.streak === 4 && !r2.result.streakIncreased, 'same-day session keeps streak');
}

console.log('== 13. Daily rollover is independent from streak repair ==');
{
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  let s = base();
  s.lastFocusDate = gs.todayKey(yesterday);
  s.dailyProgressDate = gs.todayKey(yesterday);
  s.completedToday = 3;
  s.dailyGoalClaimed = true;
  const normalized = gs.normalizeForToday(s);
  ok(normalized.completedToday === 0 && !normalized.dailyGoalClaimed, 'daily counters reset on a new day');
  ok(normalized.lastFocusDate === s.lastFocusDate, 'daily rollover does not rewrite streak history');

  normalized.currentStreak = 4;
  normalized.coins = 80;
  const older = new Date();
  older.setDate(older.getDate() - 2);
  normalized.lastFocusDate = gs.todayKey(older);
  normalized.completedToday = 2;
  const repaired = gs.repairStreak(normalized);
  ok(repaired.repaired, 'streak repair succeeds for one missed day');
  ok(repaired.state.completedToday === 2, 'streak repair does not erase current daily progress');
}

console.log('== 13b. Streak expiry, repair window, and advance freezes ==');
{
  const now = new Date(2026, 7, 20, 12);
  const missed = { ...base(), currentStreak: 5, bestStreak: 5,
    lastFocusDate: '2026-08-18', dailyProgressDate: '2026-08-18',
    claimedDays: [1, 2, 3, 4, 5], coins: 200 };
  const rolled = gs.normalizeForToday(missed, now);
  ok(gs.activeStreak(rolled, now) === 0, 'missed day shows zero active streak');
  ok(rolled.currentStreak === 5 && gs.canRepairStreak(rolled, now), 'old streak retained only for repair window');
  ok(rolled.bestStreak === 5, 'personal best retained after miss');
  // The store validates the same rule against the actual current date.
  const realYesterday = new Date(); realYesterday.setDate(realYesterday.getDate() - 2);
  const repairWindow = { ...missed, lastFocusDate: gs.todayKey(realYesterday) };
  ok(!gs.buyStreakFreeze(repairWindow).ok, 'cannot buy freeze after missed day');
  const uncovered = gs.recordSession(rolled, 60, now);
  ok(uncovered.state.currentStreak === 1 && uncovered.state.claimedDays.length === 0, 'unprotected session restarts streak and check-ins');
  const protectedState = { ...missed, streakFreezes: 1 };
  const frozen = gs.recordSession(protectedState, 60, now);
  ok(gs.activeStreak(protectedState, now) === 5 && frozen.state.currentStreak === 6 && frozen.result.freezeUsed === 1, 'pre-owned freeze protects and is consumed');
  ok(!gs.canRepairStreak(protectedState, now) && !gs.repairStreak(protectedState, now).repaired, 'covered gap cannot charge for an unnecessary repair');
  const late = gs.normalizeForToday(missed, new Date(2026, 7, 23, 12));
  ok(late.currentStreak === 0 && late.claimedDays.length === 0 && late.bestStreak === 5, 'unrepairable streak and check-ins expire on rollover');
  ok(gs.recordSession(late, 60, new Date(2026, 7, 23, 12)).state.currentStreak === 1, 'first later session starts a fresh streak');
}

console.log('== 14. Clock rollback protection ==');
{
  const day1 = new Date(2026, 8, 18, 10, 0, 0);
  const day2 = new Date(2026, 8, 19, 10, 0, 0);
  const prior = new Date(2026, 8, 17, 10, 0, 0);
  let s = base();
  s.currentStreak = 2;
  s.lastFocusDate = gs.todayKey(day1);
  const first = gs.claimDayReward(s, 1, day1);
  ok(first.reward > 0, 'fixed-date D1 claim succeeds');
  ok(gs.claimDayReward(first.state, 2, prior).reward === 0, 'clock rollback cannot advance check-ins');
  ok(gs.claimDayReward(first.state, 2, day2).reward === 0, 'check-in requires a focus session today');
  const focused = gs.recordSession(first.state, 60, day2);
  const second = gs.claimDayReward(focused.state, 2, day2);
  ok(second.reward > 0, 'next calendar day advances check-ins after focusing');

  const bonus = gs.claimDailyBonus(base(), day1);
  ok(bonus.reward > 0, 'fixed-date daily bonus succeeds');
  ok(gs.claimDailyBonus(bonus.state, prior).reward === 0, 'clock rollback cannot repeat daily bonus');
  ok(gs.claimDailyBonus(bonus.state, day2).reward > 0, 'daily bonus returns on a later day');

  let future = base();
  future.lastFocusDate = gs.todayKey(day2);
  future.dailyProgressDate = gs.todayKey(day2);
  const blocked = gs.recordSession(future, 60, day1);
  ok(blocked.result.coinsEarned === 0 && blocked.state.totalSessions === 0, 'clock rollback cannot record sessions before saved progress');
}

console.log('== 15. Invalid transition inputs ==');
{
  for (const seconds of [0, -1, 1.5, NaN, Infinity, gs.MAX_SESSION_SECONDS + 1]) {
    const result = gs.recordSession(base(), seconds, NOW);
    ok(result.result.coinsEarned === 0 && result.state.totalSessions === 0, `invalid session rejected: ${seconds}`);
  }
  for (const seconds of [-1, NaN, Infinity]) {
    const result = gs.awardFailConsolation(base(), seconds);
    ok(result.reward === 0 && result.state.coins === 0, `invalid consolation rejected: ${seconds}`);
  }
  const capped = gs.awardFailConsolation(base(), 999999999);
  ok(capped.reward === gs.MAX_SESSION_SECONDS / 30, 'consolation is capped to maximum session');
  for (const amount of [-1, 0.5, NaN, Infinity]) {
    const funded = Object.assign(base(), { coins: 500 });
    const result = gs.donateToForest(funded, amount);
    ok(result.donated === 0 && result.state.coins === 500, `invalid donation rejected: ${amount}`);
  }
}

console.log('== 16. Malformed save recovery ==');
{
  const savedLocalStorage = global.localStorage;
  const load = value => {
    global.localStorage = { getItem: () => value, setItem: () => {} };
    return gs.loadGameState();
  };
  const malformed = load(JSON.stringify({
    coins: '100',
    currentStreak: -4,
    completedToday: Infinity,
    dailyGoalClaimed: 'false',
    claimedDays: [1, 3, 2, 2, 99],
    trees: -2,
    streakFreezes: 99,
    lastFocusDate: '2026-02-30',
    ownedMascots: ['cat', 'cat', 'invalid'],
    ownedThemes: ['pink', 'pink', 'invalid'],
  }));
  ok(malformed.coins === 0 && malformed.currentStreak === 0, 'invalid numeric save fields are sanitized');
  ok(malformed.trees === 0 && malformed.treePlantedDay.length === 0, 'invalid tree count is sanitized');
  ok(malformed.streakFreezes === gs.STREAK_FREEZE_MAX, 'freeze count is clamped');
  ok(malformed.lastFocusDate === null && malformed.dailyGoalClaimed === false, 'invalid dates and booleans are sanitized');
  ok(malformed.claimedDays.join(',') === '1,2,3', 'check-in save is canonicalized to a prefix');
  ok(malformed.ownedMascots.join(',') === 'bear,cat', 'mascot ownership is valid and deduplicated');
  ok(malformed.ownedThemes.join(',') === 'blue,pink', 'theme ownership is valid and deduplicated');
  ok(load('null').coins === 0 && load('[]').coins === 0, 'non-object saves recover to defaults');

  const treeState = load(JSON.stringify({
    trees: 2,
    totalSessions: 5,
    treePlantedDay: ['bad', 1],
    treePlantedSession: [99, -1],
  }));
  ok(treeState.treePlantedDay.length === 2 && treeState.treePlantedSession.length === 2, 'invalid tree metadata is rebuilt');
  ok(treeState.treePlantedSession.every(n => Number.isSafeInteger(n) && n >= 0), 'rebuilt tree sessions are valid');
  global.localStorage = savedLocalStorage;
}

console.log('== 17. Calendar date arithmetic ==');
{
  ok(gs.daysBetween('2024-03-09', '2024-03-11') === 2, 'calendar days ignore DST-length differences');
  ok(gs.daysBetween('2024-02-28', '2024-03-01') === 2, 'leap day is counted');
  ok(gs.daysBetween('2026-02-30', '2026-03-01') === Infinity, 'invalid calendar date is rejected');
  ok(gs.daysBetween('bad', '2026-03-01') === Infinity, 'malformed date is rejected');
}

console.log('== 18. Interrupted session recovery ==');
{
  const savedLocalStorage = global.localStorage;
  const items = new Map();
  global.localStorage = {
    getItem: key => items.get(key) ?? null,
    setItem: (key, value) => items.set(key, value),
    removeItem: key => items.delete(key),
  };
  gs.markSessionRunning();
  ok(gs.consumeInterruptedSession(), 'reload detects an interrupted running session');
  ok(!gs.consumeInterruptedSession(), 'interruption is reported only once');
  gs.markSessionRunning();
  gs.clearSessionRunning();
  ok(!gs.consumeInterruptedSession(), 'completed or failed session leaves no interruption');
  ok(items.size === 0, 'interruption marker is not stored in game rewards');
  global.localStorage = savedLocalStorage;
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
