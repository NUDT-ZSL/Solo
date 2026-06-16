import { Player, Monster, Item, BattleState } from '../types';
import { v4 as uuidv4 } from 'uuid';

export interface BattleResult {
  player: Player;
  monster: Monster | null;
  battleState: BattleState;
  log: string[];
  monsterDefeated: boolean;
  playerDefeated: boolean;
  screenShake: boolean;
}

export const calculateDamage = (attacker: { attack: number }, defender: { defense: number }): number => {
  const baseDamage = Math.max(1, attacker.attack - defender.defense);
  const variance = Math.floor(Math.random() * Math.max(1, Math.floor(baseDamage * 0.2)));
  const isCritical = Math.random() < 0.1;
  return isCritical ? Math.floor(baseDamage * 1.5) + variance : baseDamage + variance;
};

export const battleStep = (
  player: Player,
  monster: Monster,
  action: 'attack' | 'defend' | 'item',
  item?: Item,
  bossAttackTurn: number = 0
): BattleResult => {
  const log: string[] = [];
  let updatedPlayer = { ...player };
  let updatedMonster = { ...monster };
  let monsterDefeated = false;
  let playerDefeated = false;
  let screenShake = false;
  let newBossAttackTurn = bossAttackTurn;

  updatedPlayer.isDefending = false;

  switch (action) {
    case 'attack': {
      const damage = calculateDamage(player, monster);
      updatedMonster.hp = Math.max(0, updatedMonster.hp - damage);
      log.push(`你对${monster.name}造成了 ${damage} 点伤害！`);
      break;
    }
    case 'defend': {
      updatedPlayer.isDefending = true;
      log.push('你举起护盾进入防御姿态！');
      break;
    }
    case 'item': {
      if (item) {
        const result = useItem(updatedPlayer, item);
        updatedPlayer = result.player;
        log.push(result.message);
        updatedPlayer.inventory = updatedPlayer.inventory.filter(i => i.id !== item.id);
      }
      break;
    }
  }

  if (updatedMonster.hp <= 0) {
    log.push(`${monster.name}被击败了！`);
    const goldReward = monster.isBoss ? 100 : Math.floor(Math.random() * 20) + 10;
    updatedPlayer.gold += goldReward;
    log.push(`获得 ${goldReward} 金币！`);
    monsterDefeated = true;

    const newState: BattleState = {
      isActive: false,
      monster: null,
      turn: 'player',
      playerAnimation: 'idle',
      monsterAnimation: 'idle',
      bossAttackTurn: 0,
      screenShake: false
    };

    return {
      player: updatedPlayer,
      monster: updatedMonster,
      battleState: newState,
      log,
      monsterDefeated,
      playerDefeated,
      screenShake: false
    };
  }

  newBossAttackTurn++;

  if (monster.isBoss && newBossAttackTurn >= 3) {
    const damage = 5;
    const actualDamage = updatedPlayer.isDefending ? Math.floor(damage / 2) : damage;
    updatedPlayer.hp = Math.max(0, updatedPlayer.hp - actualDamage);
    log.push(`💀 ${monster.name}释放地震攻击！屏幕剧烈震动！`);
    log.push(`你受到了 ${actualDamage} 点伤害！`);
    screenShake = true;
    newBossAttackTurn = 0;
  } else {
    let monsterDamage = calculateDamage(monster, player);
    if (updatedPlayer.isDefending) {
      monsterDamage = Math.floor(monsterDamage / 2);
      log.push(`护盾抵消了部分伤害！`);
    }
    updatedPlayer.hp = Math.max(0, updatedPlayer.hp - monsterDamage);
    log.push(`${monster.name}对你造成了 ${monsterDamage} 点伤害！`);
  }

  if (updatedPlayer.hp <= 0) {
    playerDefeated = true;
    log.push('你被击败了...');
  }

  const battleState: BattleState = {
    isActive: !monsterDefeated && !playerDefeated,
    monster: monsterDefeated ? null : updatedMonster,
    turn: playerDefeated || monsterDefeated ? 'player' : 'player',
    playerAnimation: action === 'attack' ? 'attack' : action === 'defend' ? 'defend' : 'hit',
    monsterAnimation: action === 'attack' ? 'hit' : 'attack',
    bossAttackTurn: newBossAttackTurn,
    screenShake
  };

  return {
    player: updatedPlayer,
    monster: monsterDefeated ? null : updatedMonster,
    battleState,
    log,
    monsterDefeated,
    playerDefeated,
    screenShake
  };
};

export const useItem = (player: Player, item: Item): { player: Player; message: string } => {
  const updatedPlayer = { ...player };
  let message = '';

  switch (item.type) {
    case 'potion':
      const healAmount = item.value;
      updatedPlayer.hp = Math.min(updatedPlayer.maxHp, updatedPlayer.hp + healAmount);
      message = `使用了${item.name}，恢复了 ${healAmount} 点生命值！`;
      break;
    case 'scroll':
      updatedPlayer.attack += item.value;
      message = `使用了${item.name}，攻击力永久增加 ${item.value}！`;
      break;
    case 'coin':
      updatedPlayer.gold += item.value;
      message = `获得了 ${item.value} 金币！`;
      break;
  }

  return { player: updatedPlayer, message };
};

export const generateChestLoot = (): Item => {
  const roll = Math.random();

  if (roll < 0.4) {
    return {
      id: uuidv4(),
      type: 'potion',
      name: '生命药水',
      value: Math.floor(Math.random() * 20) + 20,
      description: '恢复20-40点生命值'
    };
  } else if (roll < 0.7) {
    return {
      id: uuidv4(),
      type: 'scroll',
      name: '力量卷轴',
      value: Math.floor(Math.random() * 3) + 1,
      description: '永久增加1-3点攻击力'
    };
  } else {
    return {
      id: uuidv4(),
      type: 'coin',
      name: '金币袋',
      value: Math.floor(Math.random() *