export interface Boss {
  id: string;
  name: string;
  level: number;
  maxHp: number;
  currentHp: number;
  baseHp: number;
}

export interface BattleResult {
  victory: boolean;
  totalDamage: number;
  battleTime: number;
  bossHpRemaining: number;
  rewards: BattleRewards;
}

export interface BattleRewards {
  expCrystals: number;
  gold: number;
}

export interface BattleTick {
  tick: number;
  teamDamage: number;
  bossDamage: number;
  bossHp: number;
}

const BASE_BOSS_HP = 10000;
const BOSS_HP_GROWTH_RATE = 0.20;
const BATTLE_INTERVAL_MS = 2000;

export function createBoss(level: number): Boss {
  const baseHp = BASE_BOSS_HP * Math.pow(1 + BOSS_HP_GROWTH_RATE, level - 1);
  const maxHp = Math.floor(baseHp);
  return {
    id: `boss_${level}`,
    name: getBossName(level),
    level,
    maxHp,
    currentHp: maxHp,
    baseHp: BASE_BOSS_HP
  };
}

function getBossName(level: number): string {
  const names = [
    '哥布林首领',
    '骷髅王',
    '巨型蜘蛛',
    '石巨人',
    '暗影龙',
    '炎魔',
    '冰霜女王',
    '深渊领主',
    '天空霸主',
    '混沌之神'
  ];
  const idx = Math.min(level - 1, names.length - 1);
  return names[idx] + ` Lv.${level}`;
}

export function simulateBattle(teamPower: number, boss: Boss): BattleResult {
  let currentHp = boss.maxHp;
  let totalDamage = 0;
  let ticks = 0;

  while (currentHp > 0) {
    const damage = teamPower;
    currentHp -= damage;
    totalDamage += damage;
    ticks++;
    if (ticks > 1000) break;
  }

  const battleTime = ticks * BATTLE_INTERVAL_MS / 1000;
  const victory = currentHp <= 0;
  const bossHpRemaining = Math.max(0, currentHp);

  const rewards: BattleRewards = {
    expCrystals: victory ? 5 + boss.level * 2 : Math.floor((1 - bossHpRemaining / boss.maxHp) * 5),
    gold: victory ? 100 + boss.level * 50 : 0
  };

  return {
    victory,
    totalDamage,
    battleTime,
    bossHpRemaining,
    rewards
  };
}

export function generateBattleTicks(teamPower: number, boss: Boss): BattleTick[] {
  const ticks: BattleTick[] = [];
  let currentHp = boss.maxHp;
  let tick = 0;

  while (currentHp > 0) {
    const damage = teamPower;
    currentHp -= damage;
    tick++;
    ticks.push({
      tick,
      teamDamage: damage,
      bossDamage: 0,
      bossHp: Math.max(0, currentHp)
    });
    if (tick > 100) break;
  }

  return ticks;
}

export function getNextBossLevel(currentLevel: number): number {
  return currentLevel + 1;
}

export function resetBoss(boss: Boss): Boss {
  return {
    ...boss,
    currentHp: boss.maxHp
  };
}
