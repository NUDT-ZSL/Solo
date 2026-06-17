import { Card } from '../card-module/CardData';

export interface BattleLogEntry {
  id: string;
  timestamp: number;
  attackerName: string;
  defenderName: string;
  damage: number;
  defenderRemainingHealth: number;
  defenderDestroyed: boolean;
  turn: number;
  message: string;
}

export interface BattleResult {
  logs: BattleLogEntry[];
  winner: string | null;
  playerCard: Card;
  enemyCard: Card;
}

interface CombatCardState extends Card {
  currentHealth: number;
}

export function simulateBattle(
  playerCard: Card,
  enemyCard: Card
): BattleResult {
  const startTime = performance.now();

  const player: CombatCardState = {
    ...playerCard,
    currentHealth: playerCard.health
  };
  const enemy: CombatCardState = {
    ...enemyCard,
    currentHealth: enemyCard.health
  };

  const logs: BattleLogEntry[] = [];
  let turn = 1;
  let winner: string | null = null;
  const maxTurns = 100;

  while (player.currentHealth > 0 && enemy.currentHealth > 0 && turn <= maxTurns) {
    const playerDamage = player.attack;
    enemy.currentHealth -= playerDamage;
    const enemyDestroyed = enemy.currentHealth <= 0;

    logs.push({
      id: `log-${Date.now()}-${logs.length}-p`,
      timestamp: Date.now() + logs.length,
      attackerName: player.name,
      defenderName: enemy.name,
      damage: playerDamage,
      defenderRemainingHealth: Math.max(0, enemy.currentHealth),
      defenderDestroyed: enemyDestroyed,
      turn,
      message: enemyDestroyed
        ? `${player.name} 攻击 ${enemy.name}，造成 ${playerDamage} 点伤害！${enemy.name} 被消灭！`
        : `${player.name} 攻击 ${enemy.name}，造成 ${playerDamage} 点伤害，剩余生命值 ${Math.max(0, enemy.currentHealth)}`
    });

    if (enemyDestroyed) {
      winner = player.name;
      break;
    }

    const enemyDamage = enemy.attack;
    player.currentHealth -= enemyDamage;
    const playerDestroyed = player.currentHealth <= 0;

    logs.push({
      id: `log-${Date.now()}-${logs.length}-e`,
      timestamp: Date.now() + logs.length,
      attackerName: enemy.name,
      defenderName: player.name,
      damage: enemyDamage,
      defenderRemainingHealth: Math.max(0, player.currentHealth),
      defenderDestroyed: playerDestroyed,
      turn,
      message: playerDestroyed
        ? `${enemy.name} 攻击 ${player.name}，造成 ${enemyDamage} 点伤害！${player.name} 被消灭！`
        : `${enemy.name} 攻击 ${player.name}，造成 ${enemyDamage} 点伤害，剩余生命值 ${Math.max(0, player.currentHealth)}`
    });

    if (playerDestroyed) {
      winner = enemy.name;
      break;
    }

    turn++;
  }

  const finalPlayerCard: Card = {
    ...playerCard,
    health: Math.max(0, player.currentHealth)
  };
  const finalEnemyCard: Card = {
    ...enemyCard,
    health: Math.max(0, enemy.currentHealth)
  };

  const endTime = performance.now();
  const duration = endTime - startTime;
  if (duration > 10) {
    console.warn(`战斗模拟耗时 ${duration.toFixed(2)}ms，超过了10ms的性能约束`);
  }

  return {
    logs: logs.reverse(),
    winner,
    playerCard: finalPlayerCard,
    enemyCard: finalEnemyCard
  };
}
