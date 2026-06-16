import { v4 as uuidv4 } from 'uuid';
import type { Card, BattleUnit, BattleState, BattleLogEntry, EffectType } from '../types';

const MAX_MANA = 10;
const MAX_FIELD_SIZE = 5;
const STARTING_HEALTH = 30;
const STARTING_HAND_SIZE = 3;

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function createBattleUnit(card: Card, owner: 'player' | 'ai'): BattleUnit {
  return {
    ...card,
    instanceId: uuidv4(),
    currentHealth: card.health,
    currentAttack: card.attack,
    hasAttacked: false,
    owner
  };
}

function addLog(state: BattleState, actor: 'player' | 'ai', action: string, details: string): void {
  const entry: BattleLogEntry = {
    turn: state.turn,
    actor,
    action,
    details,
    timestamp: Date.now()
  };
  state.logs.push(entry);
}

function checkGameOver(state: BattleState): boolean {
  if (state.playerHealth <= 0) {
    state.gameOver = true;
    state.winner = 'ai';
    return true;
  }
  if (state.aiHealth <= 0) {
    state.gameOver = true;
    state.winner = 'player';
    return true;
  }
  return false;
}

export function createBattleState(playerDeckCards: Card[], aiDeckCards: Card[]): BattleState {
  const playerDeck = shuffle([...playerDeckCards]);
  const aiDeck = shuffle([...aiDeckCards]);
  
  const playerHand: Card[] = [];
  const aiHand: Card[] = [];
  
  for (let i = 0; i < STARTING_HAND_SIZE; i++) {
    const pc = playerDeck.shift();
    const ac = aiDeck.shift();
    if (pc) playerHand.push(pc);
    if (ac) aiHand.push(ac);
  }
  
  return {
    turn: 1,
    currentPlayer: 'player',
    phase: 'MAIN',
    playerHealth: STARTING_HEALTH,
    aiHealth: STARTING_HEALTH,
    playerMana: 1,
    playerMaxMana: 1,
    aiMana: 1,
    aiMaxMana: 1,
    playerHand,
    aiHand,
    playerDeck,
    aiDeck,
    playerField: [],
    aiField: [],
    selectedHandCard: null,
    selectedFieldUnit: null,
    pendingEffect: null,
    gameOver: false,
    winner: null,
    logs: []
  };
}

export function drawCard(state: BattleState, player: 'player' | 'ai'): void {
  const deck = player === 'player' ? state.playerDeck : state.aiDeck;
  const hand = player === 'player' ? state.playerHand : state.aiHand;
  
  if (deck.length > 0 && hand.length < 10) {
    const card = deck.shift()!;
    hand.push(card);
    addLog(state, player, '抽牌', `抽到了 ${card.name}`);
  }
}

function processDamageAll(state: BattleState, value: number, source: 'player' | 'ai'): void {
  const targetField = source === 'player' ? state.aiField : state.playerField;
  targetField.forEach(unit => {
    unit.currentHealth -= value;
  });
  
  const deadUnits = targetField.filter(u => u.currentHealth <= 0);
  deadUnits.forEach(unit => {
    addLog(state, source, '消灭', `${unit.name} 被消灭`);
  });
  
  if (source === 'player') {
    state.aiField = state.aiField.filter(u => u.currentHealth > 0);
  } else {
    state.playerField = state.playerField.filter(u => u.currentHealth > 0);
  }
}

function processHealSelf(state: BattleState, value: number, source: 'player' | 'ai'): void {
  if (source === 'player') {
    state.playerHealth = Math.min(STARTING_HEALTH, state.playerHealth + value);
  } else {
    state.aiHealth = Math.min(STARTING_HEALTH, state.aiHealth + value);
  }
  addLog(state, source, '治疗', `恢复 ${value} 点生命值`);
}

function processBuffAtk(state: BattleState, unit: BattleUnit, value: number): void {
  unit.currentAttack += value;
  addLog(state, unit.owner, '增益', `${unit.name} 攻击力+${value}`);
}

function processDrawCard(state: BattleState, value: number, source: 'player' | 'ai'): void {
  for (let i = 0; i < value; i++) {
    drawCard(state, source);
  }
}

export function processEffect(
  state: BattleState,
  effectType: EffectType,
  effectValue: number,
  effectName: string,
  source: 'player' | 'ai',
  sourceUnit?: BattleUnit
): void {
  state.pendingEffect = { name: effectName };
  
  switch (effectType) {
    case 'DAMAGE_ALL':
      processDamageAll(state, effectValue, source);
      break;
    case 'HEAL_SELF':
      processHealSelf(state, effectValue, source);
      break;
    case 'BUFF_ATK':
      if (sourceUnit) {
        processBuffAtk(state, sourceUnit, effectValue);
      }
      break;
    case 'DRAW_CARD':
      processDrawCard(state, effectValue, source);
      break;
  }
  
  checkGameOver(state);
}

export function clearPendingEffect(state: BattleState): void {
  state.pendingEffect = null;
}

export function playCard(
  state: BattleState,
  card: Card,
  targetSlot: number,
  player: 'player' | 'ai'
): { success: boolean; message: string } {
  const mana = player === 'player' ? state.playerMana : state.aiMana;
  const field = player === 'player' ? state.playerField : state.aiField;
  const hand = player === 'player' ? state.playerHand : state.aiHand;
  
  if (card.cost > mana) {
    return { success: false, message: '法力值不足' };
  }
  
  if (field.length >= MAX_FIELD_SIZE) {
    return { success: false, message: '战场已满' };
  }
  
  if (targetSlot < 0 || targetSlot >= MAX_FIELD_SIZE) {
    return { success: false, message: '无效的位置' };
  }
  
  const cardIndex = hand.findIndex(c => c === card);
  if (cardIndex === -1) {
    return { success: false, message: '卡牌不在手牌中' };
  }
  
  hand.splice(cardIndex, 1);
  
  if (player === 'player') {
    state.playerMana -= card.cost;
  } else {
    state.aiMana -= card.cost;
  }
  
  const unit = createBattleUnit(card, player);
  field.splice(targetSlot, 0, unit);
  
  addLog(state, player, '部署', `部署了 ${card.name}`);
  
  if (card.effectType === 'DAMAGE_ALL' || card.effectType === 'HEAL_SELF' || card.effectType === 'DRAW_CARD') {
    processEffect(state, card.effectType, card.effectValue, card.effectName, player, unit);
  }
  
  state.selectedHandCard = null;
  return { success: true, message: '卡牌部署成功' };
}

export function attack(
  state: BattleState,
  attacker: BattleUnit,
  defender: BattleUnit
): { success: boolean; message: string } {
  if (attacker.hasAttacked) {
    return { success: false, message: '该单位本回合已攻击' };
  }
  
  if (attacker.owner === defender.owner) {
    return { success: false, message: '不能攻击己方单位' };
  }
  
  const attackerField = attacker.owner === 'player' ? state.playerField : state.aiField;
  const defenderField = defender.owner === 'player' ? state.playerField : state.aiField;
  
  if (!attackerField.some(u => u.instanceId === attacker.instanceId)) {
    return { success: false, message: '攻击者不在场上' };
  }
  
  if (!defenderField.some(u => u.instanceId === defender.instanceId)) {
    return { success: false, message: '防御者不在场上' };
  }
  
  defender.currentHealth -= attacker.currentAttack;
  attacker.currentHealth -= defender.currentAttack;
  attacker.hasAttacked = true;
  
  addLog(state, attacker.owner, '攻击', `${attacker.name} 攻击 ${defender.name}`);
  
  if (attacker.currentHealth <= 0) {
    const index = attackerField.findIndex(u => u.instanceId === attacker.instanceId);
    if (index !== -1) {
      attackerField.splice(index, 1);
      addLog(state, attacker.owner, '消灭', `${attacker.name} 被消灭`);
    }
  }
  
  if (defender.currentHealth <= 0) {
    const index = defenderField.findIndex(u => u.instanceId === defender.instanceId);
    if (index !== -1) {
      defenderField.splice(index, 1);
      addLog(state, defender.owner, '消灭', `${defender.name} 被消灭`);
    }
  }
  
  checkGameOver(state);
  state.selectedFieldUnit = null;
  return { success: true, message: '攻击完成' };
}

export function attackHero(state: BattleState, attacker: BattleUnit, target: 'player' | 'ai'): { success: boolean; message: string } {
  if (attacker.hasAttacked) {
    return { success: false, message: '该单位本回合已攻击' };
  }
  
  const attackerField = attacker.owner === 'player' ? state.playerField : state.aiField;
  if (!attackerField.some(u => u.instanceId === attacker.instanceId)) {
    return { success: false, message: '攻击者不在场上' };
  }
  
  if (attacker.owner === target) {
    return { success: false, message: '不能攻击己方英雄' };
  }
  
  const enemyField = target === 'player' ? state.playerField : state.aiField;
  if (enemyField.length > 0) {
    return { success: false, message: '敌方有嘲讽单位，必须先消灭它们' };
  }
  
  if (target === 'player') {
    state.playerHealth -= attacker.currentAttack;
  } else {
    state.aiHealth -= attacker.currentAttack;
  }
  
  attacker.hasAttacked = true;
  addLog(state, attacker.owner, '攻击英雄', `${attacker.name} 对敌方英雄造成 ${attacker.currentAttack} 点伤害`);
  
  checkGameOver(state);
  state.selectedFieldUnit = null;
  return { success: true, message: '攻击完成' };
}

export function processEndOfTurnBuffs(state: BattleState, player: 'player' | 'ai'): void {
  const field = player === 'player' ? state.playerField : state.aiField;
  field.forEach(unit => {
    if (unit.effectType === 'BUFF_ATK') {
      processBuffAtk(state, unit, unit.effectValue);
    }
  });
}

export function endTurn(state: BattleState): void {
  const current = state.currentPlayer;
  
  processEndOfTurnBuffs(state, current);
  
  state.currentPlayer = current === 'player' ? 'ai' : 'player';
  
  if (state.currentPlayer === 'player') {
    state.turn++;
    state.playerMaxMana = Math.min(MAX_MANA, state.playerMaxMana + 1);
    state.playerMana = state.playerMaxMana;
    state.playerField.forEach(u => u.hasAttacked = false);
    drawCard(state, 'player');
  } else {
    state.aiMaxMana = Math.min(MAX_MANA, state.aiMaxMana + 1);
    state.aiMana = state.aiMaxMana;
    state.aiField.forEach(u => u.hasAttacked = false);
    drawCard(state, 'ai');
  }
  
  state.phase = 'MAIN';
  state.selectedHandCard = null;
  state.selectedFieldUnit = null;
  
  checkGameOver(state);
}

export interface AIDecision {
  type: 'play_card' | 'attack' | 'attack_hero' | 'end_turn';
  card?: Card;
  targetSlot?: number;
  attacker?: BattleUnit;
  defender?: BattleUnit;
}

export function aiDecision(state: BattleState): AIDecision {
  const startTime = performance.now();
  
  const playableCards = state.aiHand.filter(c => c.cost <= state.aiMana);
  if (playableCards.length > 0 && state.aiField.length < MAX_FIELD_SIZE) {
    playableCards.sort((a, b) => b.cost - a.cost);
    const card = playableCards[0];
    const emptySlots = Array.from({ length: MAX_FIELD_SIZE }, (_, i) => i)
      .filter(i => i >= state.aiField.length);
    
    if (emptySlots.length > 0) {
      const decision: AIDecision = {
        type: 'play_card',
        card,
        targetSlot: emptySlots[0]
      };
      return decision;
    }
  }
  
  const availableAttackers = state.aiField.filter(u => !u.hasAttacked && u.currentAttack > 0);
  if (availableAttackers.length > 0) {
    const attacker = availableAttackers[0];
    
    if (state.playerField.length > 0) {
      const sortedTargets = [...state.playerField].sort((a, b) => a.currentHealth - b.currentHealth);
      const killable = sortedTargets.find(t => t.currentHealth <= attacker.currentAttack);
      
      if (killable) {
        return {
          type: 'attack',
          attacker,
          defender: killable
        };
      }
      
      return {
        type: 'attack',
        attacker,
        defender: sortedTargets[0]
      };
    } else {
      return {
        type: 'attack_hero',
        attacker
      };
    }
  }
  
  const elapsed = performance.now() - startTime;
  if (elapsed > 45) {
    console.warn(`AI决策耗时: ${elapsed.toFixed(2)}ms`);
  }
  
  return { type: 'end_turn' };
}

export function executeAIDecision(state: BattleState, decision: AIDecision): { success: boolean; message: string } {
  switch (decision.type) {
    case 'play_card':
      if (decision.card && decision.targetSlot !== undefined) {
        return playCard(state, decision.card, decision.targetSlot, 'ai');
      }
      return { success: false, message: '无效的出牌决策' };
    case 'attack':
      if (decision.attacker && decision.defender) {
        return attack(state, decision.attacker, decision.defender);
      }
      return { success: false, message: '无效的攻击决策' };
    case 'attack_hero':
      if (decision.attacker) {
        return attackHero(state, decision.attacker, 'player');
      }
      return { success: false, message: '无效的攻击英雄决策' };
    case 'end_turn':
      endTurn(state);
      return { success: true, message: '回合结束' };
    default:
      return { success: false, message: '未知决策类型' };
  }
}

export function runAITurn(state: BattleState): AIDecision[] {
  const decisions: AIDecision[] = [];
  let safetyCounter = 0;
  const maxDecisions = 20;
  
  while (state.currentPlayer === 'ai' && !state.gameOver && safetyCounter < maxDecisions) {
    safetyCounter++;
    const decision = aiDecision(state);
    
    if (decision.type === 'end_turn') {
      decisions.push(decision);
      executeAIDecision(state, decision);
      break;
    }
    
    const result = executeAIDecision(state, decision);
    if (result.success) {
      decisions.push(decision);
    } else {
      break;
    }
  }
  
  return decisions;
}
