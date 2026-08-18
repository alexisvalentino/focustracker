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
// Session tests use the real "today" so the day-rollover (normalizeForToday)
// does not reset per-day counters.
const NOW = new Date();

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
  const c1 = gs.claimDailyGoal(s);
  ok(c1.reward === 50, 'daily goal reward 50');
  ok(c1.state.coins === 50 && c1.state.dailyGoalClaimed, 'coins +50, claimed flag');
  const c2 = gs.claimDailyGoal(c1.state);
  ok(c2.reward === 0, 'cannot claim twice');
  let s2 = base();
  s2.completedToday = 2;
  s2.lastFocusDate = gs.todayKey();
  ok(gs.claimDailyGoal(s2).reward === 0, 'cannot claim before 3 sessions');
}

console.log('== 4. Check-in strip D1-D7 + jackpot + escalation ==');
{
  // Walk the full cycle: streak 1..7, claim each day
  let s = base();
  let day = 1;
  const dayNames = [10, 20, 30, 50, 80, 120, 200];
  let running = 0;
  for (const expected of dayNames) {
    s.currentStreak = day;
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

  // Cannot claim beyond streak / repeat / out of range
  let s2 = base();
  s2.currentStreak = 1;
  ok(gs.claimDayReward(s2, 2).reward === 0, 'cannot claim D2 at streak 1');
  ok(gs.claimDayReward(s2, 8).reward === 0, 'cannot claim D8');
  ok(gs.claimDayReward(s2, 0).reward === 0, 'cannot claim D0');
  const d1 = gs.claimDayReward(s2, 1);
  ok(gs.claimDayReward(d1.state, 1).reward === 0, 'cannot re-claim D1');

  // Escalation: cycle 2 rewards +50%
  let s3 = base();
  s3.jackpots = 1; // one completed cycle
  s3.currentStreak = 1;
  ok(gs.claimDayReward(s3, 1).reward === 15, 'cycle 2 D1 = 10 x1.5 = 15');
  s3.currentStreak = 7;
  ok(gs.claimDayReward(s3, 7).reward === 300, 'cycle 2 D7 = 200 x1.5 = 300');
  // Escalation cap x4 (after 6 cycles)
  let s4 = base();
  s4.jackpots = 6;
  s4.currentStreak = 7;
  ok(gs.claimDayReward(s4, 7).reward === 800, 'jackpot capped at x4 = 800');
  ok(gs.checkinMultiplier(6) === 4, 'multiplier caps at 4');
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
  // build a real miss: lastFocusDate 3 days back
  const d = new Date();
  d.setDate(d.getDate() - 3);
  const threeDaysAgo = gs.todayKey(d);
  s.lastFocusDate = threeDaysAgo;
  ok(gs.canRepairStreak(s), 'repairable after 3-day miss');
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
  poor.lastFocusDate = threeDaysAgo;
  poor.coins = 10;
  ok(!gs.repairStreak(poor).repaired, 'repair fails without 80 coins');
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
  const d2 = gs.donateToForest(funded(), 250);
  ok(d2.treesPlanted === 2 && d2.state.treeProgress === 50, 'donate 250 -> 2 trees, 50 overflow');
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
  // same-day second session does not bump streak
  const t = gs.todayKey();
  let s2 = base();
  s2.currentStreak = 4;
  s2.lastFocusDate = t;
  const r2 = gs.recordSession(s2, 60, new Date());
  ok(r2.result.streak === 4 && !r2.result.streakIncreased, 'same-day session keeps streak');
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
