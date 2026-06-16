export type CardType = 'minion' | 'spell';
export type SpellEffect = 'damage' | 'heal' | 'draw';
export type TargetType = 'enemy' | 'friendly' | 'any' | 'none';
export type ActionType =
  | 'START_TURN'
  | 'END_TURN'
  | 'DRAW_CARD'
  | 'PLAY_CARD'
  | 'ATTACK'
  | 'SPELL_EFFECT'
  | 'TAKE_FATIGUE'
  | 'GAME_OVER'
  | 'SUMMON_SICKNESS'
  | 'MINION_DEATH';

export interface Card {
  id: string;
  name: string;
  cost: number;
  type: CardType;
  attack?: number;
  health?: number;
  effect?: SpellEffect;
  effectValue?: number;
  targetType?: TargetType;
  gradientFrom: string;
  gradientTo: string;
}

export interface MinionOnBoard extends Card {
  instanceId: string;
  currentHealth: number;
  maxHealth: number;
  canAttack: boolean;
  hasAttacked: boolean;
}

export interface Hero {
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
}

export interface Player {
  id: 'player' | 'ai';
  hero: Hero;
  deck: Card[];
  hand: Card[];
  board: MinionOnBoard[];
  fatigueDamage: number;
}

export interface GameState {
  turn: number;
  currentPlayer: 'player' | 'ai';
  player: Player;
  ai: Player;
  gameOver: boolean;
  winner: 'player' | 'ai' | null;
}

export interface Action {
  type: ActionType;
  player: 'player' | 'ai';
  payload?: Record<string, any>;
  timestamp: number;
}

const CARD_TEMPLATES: Omit<Card, 'id'>[] = [
  { name: '小精灵', cost: 1, type: 'minion', attack: 1, health: 2, gradientFrom: '#a8e063', gradientTo: '#56ab2f' },
  { name: '幼龙', cost: 2, type: 'minion', attack: 2, health: 3, gradientFrom: '#f7971e', gradientTo: '#ffd200' },
  { name: '战士', cost: 3, type: 'minion', attack: 3, health: 4, gradientFrom: '#8e2de2', gradientTo: '#4a00e0' },
  { name: '骑士', cost: 4, type: 'minion', attack: 4, health: 5, gradientFrom: '#e65c00', gradientTo: '#F9D423' },
  { name: '巨龙', cost: 6, type: 'minion', attack: 6, health: 6, gradientFrom: '#00c6ff', gradientTo: '#0072ff' },
  { name: '森林守卫', cost: 2, type: 'minion', attack: 2, health: 2, gradientFrom: '#134E5E', gradientTo: '#71B280' },
  { name: '暗影刺客', cost: 3, type: 'minion', attack: 4, health: 2, gradientFrom: '#42275a', gradientTo: '#734b6d' },
  { name: '圣光牧师', cost: 5, type: 'minion', attack: 4, health: 6, gradientFrom: '#fceabb', gradientTo: '#f8b500' },
  { name: '火球术', cost: 3, type: 'spell', effect: 'damage', effectValue: 4, targetType: 'any', gradientFrom: '#ff416c', gradientTo: '#ff4b2b' },
  { name: '治疗术', cost: 2, type: 'spell', effect: 'heal', effectValue: 5, targetType: 'friendly', gradientFrom: '#56ab2f', gradientTo: '#a8e063' },
  { name: '智慧', cost: 2, type: 'spell', effect: 'draw', effectValue: 2, targetType: 'none', gradientFrom: '#4facfe', gradientTo: '#00f2fe' },
  { name: '闪电箭', cost: 1, type: 'spell', effect: 'damage', effectValue: 2, targetType: 'any', gradientFrom: '#fffc00', gradientTo: '#ffd700' },
];

let idCounter = 0;
const genId = () => `id_${++idCounter}_${Date.now().toString(36)}`;
const now = () => performance.now();

function createCard(template: Omit<Card, 'id'>): Card {
  return { ...template, id: genId() };
}

function createDeck(): Card[] {
  const deck: Card[] = [];
  for (let i = 0; i < 30; i++) {
    const tpl = CARD_TEMPLATES[i % CARD_TEMPLATES.length];
    deck.push(createCard(tpl));
  }
  return shuffle(deck);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function createPlayer(id: 'player' | 'ai'): Player {
  return {
    id,
    hero: { health: 30, maxHealth: 30, mana: 0, maxMana: 0 },
    deck: createDeck(),
    hand: [],
    board: [],
    fatigueDamage: 0,
  };
}

export class Engine {
  private state: GameState;

  constructor() {
    this.state = {
      turn: 0,
      currentPlayer: 'player',
      player: createPlayer('player'),
      ai: createPlayer('ai'),
      gameOver: false,
      winner: null,
    };
  }

  getState(): Readonly<GameState> {
    return this.state;
  }

  private getSelf(id: 'player' | 'ai'): Player {
    return id === 'player' ? this.state.player : this.state.ai;
  }

  private getOpponent(id: 'player' | 'ai'): Player {
    return id === 'player' ? this.state.ai : this.state.player;
  }

  private drawCard(playerId: 'player' | 'ai', actions: Action[]) {
    const p = this.getSelf(playerId);
    if (p.deck.length === 0) {
      p.fatigueDamage += 1;
      const dmg = p.fatigueDamage;
      p.hero.health -= dmg;
      actions.push({
        type: 'TAKE_FATIGUE',
        player: playerId,
        payload: { damage: dmg },
        timestamp: now(),
      });
      this.checkGameOver(actions);
      return;
    }
    const card = p.deck.shift()!;
    if (p.hand.length < 10) {
      p.hand.push(card);
      actions.push({
        type: 'DRAW_CARD',
        player: playerId,
        payload: { cardId: card.id, cardName: card.name },
        timestamp: now(),
      });
    }
  }

  private checkGameOver(actions: Action[]) {
    if (this.state.gameOver) return;
    if (this.state.player.hero.health <= 0 && this.state.ai.hero.health <= 0) {
      this.state.gameOver = true;
      this.state.winner = null;
      actions.push({ type: 'GAME_OVER', player: 'player', payload: { winner: 'draw' }, timestamp: now() });
    } else if (this.state.player.hero.health <= 0) {
      this.state.gameOver = true;
      this.state.winner = 'ai';
      actions.push({ type: 'GAME_OVER', player: 'ai', payload: { winner: 'ai' }, timestamp: now() });
    } else if (this.state.ai.hero.health <= 0) {
      this.state.gameOver = true;
      this.state.winner = 'player';
      actions.push({ type: 'GAME_OVER', player: 'player', payload: { winner: 'player' }, timestamp: now() });
    }
  }

  startGame(): Action[] {
    const actions: Action[] = [];
    for (let i = 0; i < 3; i++) this.drawCard('player', actions);
    for (let i = 0; i < 4; i++) this.drawCard('ai', actions);
    actions.push(...this.startTurn('player'));
    return actions;
  }

  private startTurn(playerId: 'player' | 'ai'): Action[] {
    const actions: Action[] = [];
    if (playerId === 'player') this.state.turn += 1;
    this.state.currentPlayer = playerId;
    const p = this.getSelf(playerId);
    p.hero.maxMana = Math.min(10, p.hero.maxMana + 1);
    p.hero.mana = p.hero.maxMana;
    p.board.forEach((m) => {
      m.canAttack = true;
      m.hasAttacked = false;
    });
    actions.push({
      type: 'START_TURN',
      player: playerId,
      payload: { turn: this.state.turn, mana: p.hero.mana, maxMana: p.hero.maxMana },
      timestamp: now(),
    });
    this.drawCard(playerId, actions);
    return actions;
  }

  playCard(playerId: 'player' | 'ai', cardId: string, targetInstanceId?: string): Action[] {
    const actions: Action[] = [];
    if (this.state.gameOver) return actions;
    if (this.state.currentPlayer !== playerId) return actions;

    const p = this.getSelf(playerId);
    const cardIdx = p.hand.findIndex((c) => c.id === cardId);
    if (cardIdx < 0) return actions;
    const card = p.hand[cardIdx];
    if (card.cost > p.hero.mana) return actions;

    if (card.type === 'minion') {
      if (p.board.length >= 5) return actions;
      p.hero.mana -= card.cost;
      p.hand.splice(cardIdx, 1);
      const minion: MinionOnBoard = {
        ...card,
        instanceId: genId(),
        currentHealth: card.health!,
        maxHealth: card.health!,
        canAttack: false,
        hasAttacked: false,
      };
      p.board.push(minion);
      actions.push({
        type: 'PLAY_CARD',
        player: playerId,
        payload: {
          cardId: card.id,
          cardName: card.name,
          instanceId: minion.instanceId,
          type: 'minion',
          boardPosition: p.board.length - 1,
        },
        timestamp: now(),
      });
      actions.push({
        type: 'SUMMON_SICKNESS',
        player: playerId,
        payload: { instanceId: minion.instanceId },
        timestamp: now(),
      });
    } else if (card.type === 'spell') {
      p.hero.mana -= card.cost;
      p.hand.splice(cardIdx, 1);
      actions.push({
        type: 'PLAY_CARD',
        player: playerId,
        payload: { cardId: card.id, cardName: card.name, type: 'spell' },
        timestamp: now(),
      });
      this.applySpell(playerId, card, targetInstanceId, actions);
    }
    this.checkGameOver(actions);
    return actions;
  }

  private applySpell(
    casterId: 'player' | 'ai',
    card: Card,
    targetInstanceId: string | undefined,
    actions: Action[],
  ) {
    const self = this.getSelf(casterId);
    const opp = this.getOpponent(casterId);
    let targetOwner: 'player' | 'ai' = casterId;
    let targetMinion: MinionOnBoard | undefined;

    if (card.targetType && card.targetType !== 'none' && targetInstanceId) {
      targetMinion = self.board.find((m) => m.instanceId === targetInstanceId);
      targetOwner = casterId;
      if (!targetMinion) {
        targetMinion = opp.board.find((m) => m.instanceId === targetInstanceId);
        targetOwner = casterId === 'player' ? 'ai' : 'player';
      }
    }

    if (card.effect === 'damage') {
      const val = card.effectValue!;
      let targetIsHero = false;
      if (targetInstanceId === 'hero_enemy') {
        opp.hero.health -= val;
        targetOwner = casterId === 'player' ? 'ai' : 'player';
        targetIsHero = true;
      } else if (targetInstanceId === 'hero_self') {
        self.hero.health -= val;
        targetIsHero = true;
      } else if (targetMinion) {
        targetMinion.currentHealth -= val;
      } else {
        opp.hero.health -= val;
        targetOwner = casterId === 'player' ? 'ai' : 'player';
        targetIsHero = true;
      }
      actions.push({
        type: 'SPELL_EFFECT',
        player: casterId,
        payload: {
          effect: 'damage',
          value: val,
          targetInstanceId: targetMinion?.instanceId,
          targetOwner,
          targetIsHero,
          spellName: card.name,
        },
        timestamp: now(),
      });
      if (targetMinion && targetMinion.currentHealth <= 0) {
        this.removeDeadMinion(targetOwner, targetMinion.instanceId, actions);
      }
    } else if (card.effect === 'heal') {
      const val = card.effectValue!;
      if (targetMinion) {
        targetMinion.currentHealth = Math.min(targetMinion.maxHealth, targetMinion.currentHealth + val);
        actions.push({
          type: 'SPELL_EFFECT',
          player: casterId,
          payload: {
            effect: 'heal',
            value: val,
            targetInstanceId: targetMinion.instanceId,
            targetOwner,
            targetIsHero: false,
            spellName: card.name,
          },
          timestamp: now(),
        });
      } else {
        self.hero.health = Math.min(self.hero.maxHealth, self.hero.health + val);
        actions.push({
          type: 'SPELL_EFFECT',
          player: casterId,
          payload: {
            effect: 'heal',
            value: val,
            targetOwner: casterId,
            targetIsHero: true,
            spellName: card.name,
          },
          timestamp: now(),
        });
      }
    } else if (card.effect === 'draw') {
      const val = card.effectValue!;
      for (let i = 0; i < val; i++) this.drawCard(casterId, actions);
      actions.push({
        type: 'SPELL_EFFECT',
        player: casterId,
        payload: { effect: 'draw', value: val, spellName: card.name },
        timestamp: now(),
      });
    }
  }

  private removeDeadMinion(ownerId: 'player' | 'ai', instanceId: string, actions: Action[]) {
    const p = this.getSelf(ownerId);
    const idx = p.board.findIndex((m) => m.instanceId === instanceId);
    if (idx < 0) return;
    const [dead] = p.board.splice(idx, 1);
    actions.push({
      type: 'MINION_DEATH',
      player: ownerId,
      payload: { instanceId, cardName: dead.name },
      timestamp: now(),
    });
  }

  attack(attackerInstanceId: string, targetInstanceId: string | 'hero'): Action[] {
    const actions: Action[] = [];
    if (this.state.gameOver) return actions;
    const cp = this.state.currentPlayer;
    const self = this.getSelf(cp);
    const opp = this.getOpponent(cp);

    const attacker = self.board.find((m) => m.instanceId === attackerInstanceId);
    if (!attacker || !attacker.canAttack || attacker.hasAttacked) return actions;

    if (targetInstanceId === 'hero') {
      opp.hero.health -= attacker.attack!;
      attacker.hasAttacked = true;
      attacker.canAttack = false;
      actions.push({
        type: 'ATTACK',
        player: cp,
        payload: {
          attackerInstanceId,
          attackerName: attacker.name,
          targetInstanceId: 'hero',
          targetOwner: opp.id,
          targetIsHero: true,
          damageToTarget: attacker.attack,
        },
        timestamp: now(),
      });
    } else {
      const target = opp.board.find((m) => m.instanceId === targetInstanceId);
      if (!target) return actions;
      attacker.currentHealth -= target.attack!;
      target.currentHealth -= attacker.attack!;
      attacker.hasAttacked = true;
      attacker.canAttack = false;
      actions.push({
        type: 'ATTACK',
        player: cp,
        payload: {
          attackerInstanceId,
          attackerName: attacker.name,
          targetInstanceId,
          targetOwner: opp.id,
          targetIsHero: false,
          targetName: target.name,
          damageToTarget: attacker.attack,
          damageToAttacker: target.attack,
        },
        timestamp: now(),
      });
      if (target.currentHealth <= 0) this.removeDeadMinion(opp.id, target.instanceId, actions);
      if (attacker.currentHealth <= 0) this.removeDeadMinion(cp, attacker.instanceId, actions);
    }
    this.checkGameOver(actions);
    return actions;
  }

  endTurn(): Action[] {
    const actions: Action[] = [];
    if (this.state.gameOver) return actions;
    const cp = this.state.currentPlayer;
    actions.push({ type: 'END_TURN', player: cp, payload: {}, timestamp: now() });
    const next = cp === 'player' ? 'ai' : 'player';
    actions.push(...this.startTurn(next));
    return actions;
  }

  aiDecide(): { actions: Action[]; delay: number } {
    const actions: Action[] = [];
    const delay = 500 + Math.floor(Math.random() * 500);
    if (this.state.gameOver) return { actions, delay };
    if (this.state.currentPlayer !== 'ai') return { actions, delay };

    const ai = this.state.ai;
    const player = this.state.player;

    const playableSpells = ai.hand
      .filter((c) => c.type === 'spell' && c.cost <= ai.hero.mana)
      .sort((a, b) => a.cost - b.cost);

    for (const spell of playableSpells) {
      if (spell.cost > ai.hero.mana) continue;
      let target: string | undefined;
      if (spell.targetType === 'enemy' || spell.targetType === 'any') {
        if (spell.effect === 'damage') {
          const weak = [...player.board].sort((a, b) => a.currentHealth - b.currentHealth)[0];
          target = weak?.instanceId || 'hero_enemy';
        }
      } else if (spell.targetType === 'friendly' && spell.effect === 'heal') {
        const wounded = ai.board
          .filter((m) => m.currentHealth < m.maxHealth)
          .sort((a, b) => b.maxHealth - a.currentHealth - (b.maxHealth - b.currentHealth))[0];
        if (!wounded && ai.hero.health < ai.hero.maxHealth - 3) target = undefined;
        else target = wounded?.instanceId;
        if (!target && ai.hero.health >= ai.hero.maxHealth - 3) continue;
      }
      actions.push(...this.playCard('ai', spell.id, target));
    }

    const playableMinions = ai.hand
      .filter((c) => c.type === 'minion' && c.cost <= ai.hero.mana)
      .sort((a, b) => a.cost - b.cost);

    for (const minion of playableMinions) {
      if (ai.board.length >= 5) break;
      if (minion.cost > ai.hero.mana) continue;
      actions.push(...this.playCard('ai', minion.id));
    }

    const attackers = ai.board.filter((m) => m.canAttack && !m.hasAttacked);
    for (const atk of attackers) {
      if (this.state.gameOver) break;
      let target: string | 'hero' = 'hero';
      const playerMinions = [...player.board].sort((a, b) => a.currentHealth - b.currentHealth);
      if (playerMinions.length > 0) {
        const killable = playerMinions.find((m) => m.currentHealth <= atk.attack!);
        if (killable) {
          target = killable.instanceId;
        } else if (atk.currentHealth > playerMinions[0].attack! || playerMinions.length === 0) {
          target = 'hero';
        } else {
          target = playerMinions[0].instanceId;
        }
      }
      actions.push(...this.attack(atk.instanceId, target));
    }

    return { actions, delay };
  }
}
