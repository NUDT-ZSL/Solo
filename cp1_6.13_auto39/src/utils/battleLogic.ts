import {
  HexCoord,
  TerrainMap,
  hexDistance,
  hexKey,
  aStar,
  getNeighbors,
} from './hexagonMath';

export type RaceType = 'human' | 'elf' | 'orc';

export { HexCoord, TerrainMap };

export interface Unit {
  id: string;
  name: string;
  race: RaceType;
  coord: HexCoord;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  speed: number;
  evasion: number;
}

export const RACE_STATS: Record<
  RaceType,
  {
    name: string;
    color: string;
    baseAtk: number;
    baseDef: number;
    baseHp: number;
    baseSpeed: number;
    evasionRate: number;
    atkWeight: number;
    defWeight: number;
  }
> = {
  human: {
    name: '人类',
    color: '#4A90D9',
    baseAtk: 8,
    baseDef: 6,
    baseHp: 30,
    baseSpeed: 5,
    evasionRate: 0.1,
    atkWeight: 1,
    defWeight: 1,
  },
  elf: {
    name: '精灵',
    color: '#50C878',
    baseAtk: 7,
    baseDef: 5,
    baseHp: 25,
    baseSpeed: 7,
    evasionRate: 0.3,
    atkWeight: 0.9,
    defWeight: 0.8,
  },
  orc: {
    name: '兽人',
    color: '#C0392B',
    baseAtk: 10,
    baseDef: 4,
    baseHp: 35,
    baseSpeed: 4,
    evasionRate: 0.05,
    atkWeight: 1.3,
    defWeight: 0.7,
  },
};

export type BattleLogType = 'move' | 'attack' | 'damage' | 'kill' | 'info';

export interface BattleLogEntry {
  turn: number;
  timestamp: number;
  text: string;
  type: BattleLogType;
}

export interface BattleStats {
  race: RaceType;
  remainingUnits: number;
  totalDamageDealt: number;
}

export interface BattleResult {
  winner: RaceType | 'draw';
  logs: BattleLogEntry[];
  stats: BattleStats[];
  totalTurns: number;
}

let unitIdCounter = 0;

export function createUnit(
  name: string,
  race: RaceType,
  coord: HexCoord
): Unit {
  const stats = RACE_STATS[race];
  unitIdCounter += 1;
  return {
    id: `unit_${unitIdCounter}_${Date.now()}`,
    name,
    race,
    coord: { ...coord },
    hp: stats.baseHp,
    maxHp: stats.baseHp,
    atk: Math.round(stats.baseAtk * stats.atkWeight),
    def: Math.round(stats.baseDef * stats.defWeight),
    speed: stats.baseSpeed,
    evasion: stats.evasionRate,
  };
}

export function simulateBattle(
  units: Unit[],
  terrain: TerrainMap,
  maxTurns = 10
): BattleResult {
  const battleUnits: Unit[] = units.map((u) => ({
    ...u,
    coord: { ...u.coord },
  }));
  const logs: BattleLogEntry[] = [];
  const damageMap: Record<RaceType, number> = {
    human: 0,
    elf: 0,
    orc: 0,
  };
  let currentTurn = 0;

  const addLog = (turn: number, text: string, type: BattleLogType) => {
    logs.push({
      turn,
      timestamp: Date.now() + logs.length,
      text,
      type,
    });
  };

  const getAliveUnits = () => battleUnits.filter((u) => u.hp > 0);

  const getOccupiedSet = (excludedId?: string): Set<string> => {
    const set = new Set<string>();
    for (const u of battleUnits) {
      if (u.hp > 0 && u.id !== excludedId) {
        set.add(hexKey(u.coord));
      }
    }
    return set;
  };

  const findNearestEnemy = (unit: Unit): Unit | null => {
    const alive = getAliveUnits().filter((u) => u.race !== unit.race);
    if (alive.length === 0) return null;
    let nearest: Unit | null = null;
    let minDist = Infinity;
    for (const enemy of alive) {
      const dist = hexDistance(unit.coord, enemy.coord);
      if (dist < minDist) {
        minDist = dist;
        nearest = enemy;
      }
    }
    return nearest;
  };

  const racesAlive = (): RaceType[] => {
    const set = new Set<RaceType>();
    for (const u of getAliveUnits()) {
      set.add(u.race);
    }
    return Array.from(set);
  };

  addLog(0, `=== 战斗开始！${battleUnits.length} 个单位进入战场 ===`, 'info');

  for (let turn = 1; turn <= maxTurns; turn++) {
    currentTurn = turn;
    addLog(turn, `--- 第 ${turn} 回合 ---`, 'info');

    const aliveUnits = getAliveUnits().sort((a, b) => b.speed - a.speed);

    for (const unit of aliveUnits) {
      if (unit.hp <= 0) continue;

      const enemy = findNearestEnemy(unit);
      if (!enemy) break;

      const dist = hexDistance(unit.coord, enemy.coord);

      if (dist <= 1) {
        addLog(
          turn,
          `${RACE_STATS[unit.race].name}【${unit.name}】攻击 ${RACE_STATS[enemy.race].name}【${enemy.name}】`,
          'attack'
        );

        if (Math.random() < enemy.evasion) {
          addLog(
            turn,
            `${RACE_STATS[enemy.race].name}【${enemy.name}】闪避了攻击！`,
            'info'
          );
        } else {
          const rawAtk = unit.atk * (0.9 + 0.2 * Math.random());
          const damage = Math.max(1, Math.round(rawAtk - enemy.def));
          enemy.hp -= damage;
          damageMap[unit.race] += damage;
          addLog(
            turn,
            `${RACE_STATS[enemy.race].name}【${enemy.name}】受到 ${damage} 点伤害（剩余 ${Math.max(0, enemy.hp)} HP）`,
            'damage'
          );
          if (enemy.hp <= 0) {
            addLog(
              turn,
              `${RACE_STATS[enemy.race].name}【${enemy.name}】被击败！`,
              'kill'
            );
          }
        }
      } else {
        const occupied = getOccupiedSet(unit.id);
        const moveTerrain: TerrainMap = { ...terrain };
        for (const key of occupied) {
          if (moveTerrain[key]) {
            moveTerrain[key] = { ...moveTerrain[key], passable: false };
          }
        }
        const goalKey = hexKey(enemy.coord);
        if (moveTerrain[goalKey]) {
          moveTerrain[goalKey] = { ...moveTerrain[goalKey], passable: true };
        }

        const path = aStar(unit.coord, enemy.coord, moveTerrain, unit.speed);

        if (path && path.length > 0) {
          let cumulativeCost = 0;
          let stepsToMove = 0;
          for (let i = 0; i < path.length; i++) {
            const stepKey = hexKey(path[i]);
            const stepTerrain = terrain[stepKey];
            if (!stepTerrain) break;
            const cost = stepTerrain.moveCost;
            if (cost === Infinity) break;
            if (cumulativeCost + cost > unit.speed) break;
            cumulativeCost += cost;
            stepsToMove = i + 1;
          }

          if (stepsToMove > 0) {
            const actualSteps = Math.min(stepsToMove, path.length - 1);
            if (actualSteps > 0) {
              const targetCoord = path[actualSteps - 1];
              unit.coord = { ...targetCoord };
              addLog(
                turn,
                `${RACE_STATS[unit.race].name}【${unit.name}】移动至 (${targetCoord.q},${targetCoord.r})（消耗 ${cumulativeCost} 行动力）`,
                'move'
              );

              const newDist = hexDistance(unit.coord, enemy.coord);
              if (newDist <= 1) {
                addLog(
                  turn,
                  `${RACE_STATS[unit.race].name}【${unit.name}】攻击 ${RACE_STATS[enemy.race].name}【${enemy.name}】`,
                  'attack'
                );
                if (Math.random() < enemy.evasion) {
                  addLog(
                    turn,
                    `${RACE_STATS[enemy.race].name}【${enemy.name}】闪避了攻击！`,
                    'info'
                  );
                } else {
                  const rawAtk = unit.atk * (0.9 + 0.2 * Math.random());
                  const damage = Math.max(1, Math.round(rawAtk - enemy.def));
                  enemy.hp -= damage;
                  damageMap[unit.race] += damage;
                  addLog(
                    turn,
                    `${RACE_STATS[enemy.race].name}【${enemy.name}】受到 ${damage} 点伤害（剩余 ${Math.max(0, enemy.hp)} HP）`,
                    'damage'
                  );
                  if (enemy.hp <= 0) {
                    addLog(
                      turn,
                      `${RACE_STATS[enemy.race].name}【${enemy.name}】被击败！`,
                      'kill'
                    );
                  }
                }
              }
            } else {
              addLog(
                turn,
                `${RACE_STATS[unit.race].name}【${unit.name}】行动力不足，无法移动`,
                'info'
              );
            }
          } else {
            addLog(
              turn,
              `${RACE_STATS[unit.race].name}【${unit.name}】行动力不足，无法移动`,
              'info'
            );
          }
        } else {
          const neighbors = getNeighbors(unit.coord);
          let moved = false;
          let remainingSpeed = unit.speed;
          for (const n of neighbors) {
            const nKey = hexKey(n);
            const nTerrain = terrain[nKey];
            if (
              nTerrain &&
              nTerrain.passable &&
              nTerrain.moveCost !== Infinity &&
              nTerrain.moveCost <= remainingSpeed &&
              !occupied.has(nKey)
            ) {
              const nDist = hexDistance(n, enemy.coord);
              if (nDist < dist) {
                unit.coord = { ...n };
                remainingSpeed -= nTerrain.moveCost;
                moved = true;
                addLog(
                  turn,
                  `${RACE_STATS[unit.race].name}【${unit.name}】向敌人靠近至 (${n.q},${n.r})`,
                  'move'
                );
                break;
              }
            }
          }
          if (!moved) {
            addLog(
              turn,
              `${RACE_STATS[unit.race].name}【${unit.name}】无法找到可行路径`,
              'info'
            );
          }
        }
      }

      const alive = racesAlive();
      if (alive.length <= 1) break;
    }

    const aliveAfter = racesAlive();
    if (aliveAfter.length <= 1) {
      addLog(turn, `=== 战斗提前结束 ===`, 'info');
      break;
    }
  }

  const stats: BattleStats[] = (['human', 'elf', 'orc'] as RaceType[]).map(
    (race) => ({
      race,
      remainingUnits: battleUnits.filter((u) => u.race === race && u.hp > 0)
        .length,
      totalDamageDealt: damageMap[race],
    })
  );

  const aliveRaces = racesAlive();
  let winner: RaceType | 'draw';
  if (aliveRaces.length === 0) {
    winner = 'draw';
  } else if (aliveRaces.length === 1) {
    winner = aliveRaces[0];
  } else {
    let bestRace: RaceType | null = null;
    let bestScore = -1;
    let tied = false;
    for (const s of stats) {
      const score = s.remainingUnits * 10000 + s.totalDamageDealt;
      if (score > bestScore) {
        bestScore = score;
        bestRace = s.race;
        tied = false;
      } else if (score === bestScore) {
        tied = true;
      }
    }
    winner = tied || !bestRace ? 'draw' : bestRace;
  }

  addLog(
    currentTurn,
    winner === 'draw'
      ? `=== 战斗结果：平局 ===`
      : `=== 战斗结果：${RACE_STATS[winner].name}获胜！ ===`,
    'info'
  );

  return {
    winner,
    logs,
    stats,
    totalTurns: currentTurn,
  };
}
