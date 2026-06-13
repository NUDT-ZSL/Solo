import { v4 as uuidv4 } from 'uuid';
import type {
  Card,
  Unit,
  GameState,
  PlayerState,
  LogEntry,
  Target,
  GameStats,
} from '../../shared/types';

const INITIAL_HEALTH = 20;
const INITIAL_HAND_SIZE = 3;
const DECK_SIZE = 40;
const MAX_LOG_SIZE = 20;

function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function createDeck(cardPool: Card[]): Card[] {
  const deck: Card[] = [];
  const copiesNeeded = Math.ceil(DECK_SIZE / cardPool.length);
  for (let i = 0; i < copiesNeeded && deck.length < DECK_SIZE; i++) {
    for (const card of cardPool) {
      if (deck.length >= DECK_SIZE) break;
      deck.push({ ...card, id: `${card.id}_${uuidv4()}` });
    }
  }
  return shuffle(deck);
}

function createInitialPlayerState(deck: Card[]): PlayerState {
  const hand: Card[] = [];
  const remainingDeck = [...deck];
  for (let i = 0; i < INITIAL_HAND_SIZE; i++) {
    const card = remainingDeck.pop();
    if (card) hand.push(card);
  }
  return {
    hero: {
      health: INITIAL_HEALTH,
      maxHealth: INITIAL_HEALTH,
      shield: 0,
    },
    hand,
    deck: remainingDeck,
    field: [],
  };
}

function applyDamage(target: { hero: { health: number; shield: number } }, damage: number): { actualDamage: number; shieldAbsorbed: number } {
  let remainingDamage = damage;
  let shieldAbsorbed = 0;
  if (target.hero.shield > 0) {
    shieldAbsorbed = Math.min(target.hero.shield, remainingDamage);
    target.hero.shield -= shieldAbsorbed;
    remainingDamage -= shieldAbsorbed;
  }
  target.hero.health = Math.max(0, target.hero.health - remainingDamage);
  return { actualDamage: remainingDamage, shieldAbsorbed };
}

function formatTime(): string {
  const now = new Date();
  return now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export class GameEngine {
  private state: GameState;
  private stats: GameStats;

  constructor(cardPool: Card[]) {
    const playerDeck = createDeck(cardPool);
    const aiDeck = createDeck(cardPool);
    
    this.stats = {
      totalDamage: 0,
      totalShield: 0,
      unitsKilled: 0,
      totalTurns: 0,
    };

    this.state = {
      turn: 1,
      currentPlayer: 'player',
      phase: 'start',
      player: createInitialPlayerState(playerDeck),
      ai: createInitialPlayerState(aiDeck),
      battleLog: [],
      winner: null,
    };
    
    this.addLog('system', '游戏开始！你的回合。');
    this.state.phase = 'playing';
  }

  getState(): GameState {
    return JSON.parse(JSON.stringify(this.state));
  }

  getStats(): GameStats {
    return { ...this.stats };
  }

  addLog(actor: 'player' | 'ai' | 'system', message: string): void {
    const entry: LogEntry = {
      id: uuidv4(),
      timestamp: formatTime(),
      actor,
      message,
    };
    this.state.battleLog.push(entry);
    if (this.state.battleLog.length > MAX_LOG_SIZE) {
      this.state.battleLog.shift();
    }
  }

  drawCard(player: 'player' | 'ai'): Card | null {
    const playerState = this.state[player];
    if (playerState.deck.length === 0) {
      this.addLog('system', `${player === 'player' ? '你' : 'AI'}的牌库已空！`);
      return null;
    }
    const card = playerState.deck.pop()!;
    playerState.hand.push(card);
    return card;
  }

  playCard(
    player: 'player' | 'ai',
    cardId: string,
    target: Target
  ): { success: boolean; newState: GameState } {
    if (this.state.phase === 'end') {
      return { success: false, newState: this.getState() };
    }
    if (this.state.currentPlayer !== player) {
      return { success: false, newState: this.getState() };
    }

    const playerState = this.state[player];
    const opponentState = this.state[player === 'player' ? 'ai' : 'player'];
    
    const cardIndex = playerState.hand.findIndex(c => c.id === cardId);
    if (cardIndex === -1) {
      return { success: false, newState: this.getState() };
    }

    const card = playerState.hand[cardIndex];
    const actorName = player === 'player' ? '玩家' : 'AI';

    switch (card.type) {
      case 'attack': {
        if (target.type === 'hero' && target.owner !== player) {
          const result = applyDamage(opponentState, card.value);
          if (result.shieldAbsorbed > 0) {
            this.addLog(player, `${actorName}使用${card.name}对敌方英雄造成${result.actualDamage}点伤害，护盾吸收${result.shieldAbsorbed}点`);
          } else {
            this.addLog(player, `${actorName}使用${card.name}对敌方英雄造成${card.value}点伤害`);
          }
          if (player === 'player') {
            this.stats.totalDamage += result.actualDamage;
          }
        } else if (target.type === 'unit' && target.id) {
          const unitIndex = opponentState.field.findIndex(u => u.id === target.id);
          if (unitIndex !== -1) {
            const unit = opponentState.field[unitIndex];
            unit.health -= card.value;
            this.addLog(player, `${actorName}使用${card.name}对敌方单位造成${card.value}点伤害`);
            if (player === 'player') {
              this.stats.totalDamage += card.value;
            }
            if (unit.health <= 0) {
              opponentState.field.splice(unitIndex, 1);
              this.addLog(player, `敌方单位被消灭！`);
              if (player === 'player') {
                this.stats.unitsKilled++;
              }
            }
          } else {
            return { success: false, newState: this.getState() };
          }
        } else {
          return { success: false, newState: this.getState() };
        }
        break;
      }

      case 'defense': {
        playerState.hero.shield += card.value;
        this.addLog(player, `${actorName}使用${card.name}获得${card.value}点护盾`);
        if (player === 'player') {
          this.stats.totalShield += card.value;
        }
        break;
      }

      case 'summon': {
        const newUnit: Unit = {
          id: uuidv4(),
          owner: player,
          attack: card.value,
          health: card.value2 || 1,
          maxHealth: card.value2 || 1,
          hasAttacked: false,
        };
        playerState.field.push(newUnit);
        this.addLog(player, `${actorName}使用${card.name}在场上放置了一个攻击力${card.value}生命值${card.value2}的单位`);
        break;
      }
    }

    playerState.hand.splice(cardIndex, 1);
    this.checkGameOver();
    
    return { success: true, newState: this.getState() };
  }

  unitAttack(
    attackerId: string,
    target: Target
  ): { success: boolean; newState: GameState } {
    if (this.state.phase === 'end') {
      return { success: false, newState: this.getState() };
    }

    const attackerOwner = this.state.player.field.find(u => u.id === attackerId) ? 'player' : 'ai';
    if (this.state.currentPlayer !== attackerOwner) {
      return { success: false, newState: this.getState() };
    }

    const attackerState = this.state[attackerOwner];
    const defenderState = this.state[attackerOwner === 'player' ? 'ai' : 'player'];

    const attackerIndex = attackerState.field.findIndex(u => u.id === attackerId);
    if (attackerIndex === -1) {
      return { success: false, newState: this.getState() };
    }

    const attacker = attackerState.field[attackerIndex];
    if (attacker.hasAttacked) {
      return { success: false, newState: this.getState() };
    }

    const actorName = attackerOwner === 'player' ? '玩家' : 'AI';

    if (target.type === 'hero' && target.owner !== attackerOwner) {
      const result = applyDamage(defenderState, attacker.attack);
      if (result.shieldAbsorbed > 0) {
        this.addLog(attackerOwner, `${actorName}的单位攻击敌方英雄，造成${result.actualDamage}点伤害，护盾吸收${result.shieldAbsorbed}点`);
      } else {
        this.addLog(attackerOwner, `${actorName}的单位攻击敌方英雄，造成${attacker.attack}点伤害`);
      }
      if (attackerOwner === 'player') {
        this.stats.totalDamage += result.actualDamage;
      }
    } else if (target.type === 'unit' && target.id) {
      const defenderIndex = defenderState.field.findIndex(u => u.id === target.id);
      if (defenderIndex === -1) {
        return { success: false, newState: this.getState() };
      }
      const defender = defenderState.field[defenderIndex];
      defender.health -= attacker.attack;
      attacker.health -= defender.attack;
      this.addLog(attackerOwner, `${actorName}的单位与敌方单位交战，双方互相造成伤害`);
      if (attackerOwner === 'player') {
        this.stats.totalDamage += attacker.attack;
      }
      if (defender.health <= 0) {
        defenderState.field.splice(defenderIndex, 1);
        this.addLog(attackerOwner, `敌方单位被消灭！`);
        if (attackerOwner === 'player') {
          this.stats.unitsKilled++;
        }
      }
      if (attacker.health <= 0) {
        attackerState.field.splice(attackerIndex, 1);
        this.addLog(attackerOwner, `${actorName}的单位被消灭！`);
      }
    } else {
      return { success: false, newState: this.getState() };
    }

    attacker.hasAttacked = true;
    this.checkGameOver();
    
    return { success: true, newState: this.getState() };
  }

  endTurn(): GameState {
    if (this.state.phase === 'end') {
      return this.getState();
    }

    const currentPlayer = this.state.currentPlayer;
    const nextPlayer = currentPlayer === 'player' ? 'ai' : 'player';

    this.state[currentPlayer].hero.shield = 0;
    this.state[currentPlayer].field.forEach(unit => {
      unit.hasAttacked = false;
    });

    if (nextPlayer === 'player') {
      this.state.turn++;
      this.stats.totalTurns = this.state.turn;
    }

    this.state.currentPlayer = nextPlayer;
    
    this.drawCard(nextPlayer);
    
    const playerName = nextPlayer === 'player' ? '你' : 'AI';
    this.addLog('system', `回合 ${this.state.turn}：${playerName}的回合`);

    return this.getState();
  }

  checkGameOver(): 'player' | 'ai' | null {
    if (this.state.player.hero.health <= 0) {
      this.state.winner = 'ai';
      this.state.phase = 'end';
      this.addLog('system', '游戏结束，AI获胜！');
      return 'ai';
    }
    if (this.state.ai.hero.health <= 0) {
      this.state.winner = 'player';
      this.state.phase = 'end';
      this.addLog('system', '游戏结束，你获胜了！');
      return 'player';
    }
    return null;
  }
}
