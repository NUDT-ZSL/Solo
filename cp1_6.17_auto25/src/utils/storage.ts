import { PokedexEntry, BattleLog, Monster, getPartById, Part } from './monsterData';

const POKEDEX_KEY = 'monster_pokedex';
const TEAM_KEY = 'monster_team';
const BATTLE_LOGS_KEY = 'monster_battle_logs';
const MAX_BATTLE_LOGS = 10;

export function savePokedexEntry(monster: Monster): PokedexEntry | null {
  if (!monster.parts.head || !monster.parts.torso || !monster.parts.legs || !monster.parts.tail) {
    return null;
  }

  const partIds = [
    monster.parts.head.id,
    monster.parts.torso.id,
    monster.parts.legs.id,
    monster.parts.tail.id,
  ].sort();

  const entryId = partIds.join('_');

  const existing = loadPokedex();
  const entry: PokedexEntry = {
    id: entryId,
    partIds,
    totalPower: Math.floor(monster.maxHp * 0.5 + monster.attack * 2 + monster.speed * 1.5),
    name: monster.name,
    unlockedAt: Date.now(),
  };

  if (!existing.find(e => e.id === entryId)) {
    existing.push(entry);
    localStorage.setItem(POKEDEX_KEY, JSON.stringify(existing));
  }

  return entry;
}

export function loadPokedex(): PokedexEntry[] {
  try {
    const data = localStorage.getItem(POKEDEX_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function clearPokedex(): void {
  localStorage.removeItem(POKEDEX_KEY);
}

export function saveTeam(team: Monster[]): void {
  const teamData = team.map(m => {
    if (!m.parts.head || !m.parts.torso || !m.parts.legs || !m.parts.tail) return null;
    return {
      id: m.id,
      name: m.name,
      partIds: [
        m.parts.head.id,
        m.parts.torso.id,
        m.parts.legs.id,
        m.parts.tail.id,
      ],
    };
  }).filter(Boolean);

  localStorage.setItem(TEAM_KEY, JSON.stringify(teamData));
}

export function loadTeam(): { id: string; name: string; parts: Part[] }[] {
  try {
    const data = localStorage.getItem(TEAM_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return parsed.map((item: { id: string; name: string; partIds: string[] }) => {
      const parts = item.partIds.map(id => getPartById(id)).filter((p): p is Part => !!p);
      return { id: item.id, name: item.name, parts };
    }).filter((m: { parts: Part[] }) => m.parts.length === 4);
  } catch {
    return [];
  }
}

export function clearTeam(): void {
  localStorage.removeItem(TEAM_KEY);
}

export function saveBattleLog(
  playerTeam: string[][],
  enemyTeam: string[][],
  result: 'win' | 'lose',
  turns: number
): void {
  const logs = loadBattleLogs();
  const log: BattleLog = {
    id: `battle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    playerTeam,
    enemyTeam,
    result,
    turns,
  };

  logs.unshift(log);
  while (logs.length > MAX_BATTLE_LOGS) {
    logs.pop();
  }

  localStorage.setItem(BATTLE_LOGS_KEY, JSON.stringify(logs));
}

export function loadBattleLogs(): BattleLog[] {
  try {
    const data = localStorage.getItem(BATTLE_LOGS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function clearBattleLogs(): void {
  localStorage.removeItem(BATTLE_LOGS_KEY);
}
