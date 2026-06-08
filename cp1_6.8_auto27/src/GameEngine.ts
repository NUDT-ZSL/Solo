import {
  GameState,
  GamePhase,
  TurnPhase,
  PlayerState,
  EnergyPool,
  Card,
  Deck,
  ComboResult,
  GameEffect,
  ElementType,
  RuneType,
  MAX_ENERGY_POOL,
  PLAYER_MAX_HP,
  PLAYER_MAX_ENERGY,
  ENERGY_PER_TURN,
  BuffEffectType,
} from './types';
import {
  buildCardListFromDeck,
  shuffleDeck,
  drawInitialHand,
  drawCards,
  removeCardFromHand,
  discardToGraveyard,
  DEFAULT_ENEMY_DECK,
} from './CardManager';
import { tickBuffs, processBuffTickEffects, applyCardBuffsToEnemy, getPowerBoostMultiplier } from './BuffSystem';
import {
  detectCombo,
  applyComboEffects,
  canUseFinishingMove,
  executeFinishingMove,
  getFinishingMove,
  getDominantElement,
} from './ComboSystem';

export type StateChangeCallback = (state: GameState) => void;
export type EffectCallback = (effects: GameEffect[]) => void;

export class GameEngine {
  private state: GameState;
  private onStateChangeCallbacks: StateChangeCallback[] = [];
  private onEffectCallbacks: EffectCallback[] = [];
  private turnPlayedCards: Card[] = [];

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      phase: GamePhase.Menu,
      turnPhase: TurnPhase.Draw,
      turn: 0,
      player: this.createEmptyPlayer(),
      enemy: this.createEmptyPlayer(),
      energyPool: { playerEnergy: 0, enemyEnergy: 0, maxEnergy: MAX_ENERGY_POOL },
      lastCombo: null,
      effects: [],
      battleLog: [],
      winner: null,
      isShaking: false,
      showFinishingMove: false,
      finishingMoveTarget: null,
    };
  }

  private createEmptyPlayer(): PlayerState {
    return {
      hp: PLAYER_MAX_HP,
      maxHp: PLAYER_MAX_HP,
      hand: [],
      deck: [],
      graveyard: [],
      buffs: [],
      energy: 0,
      maxEnergy: PLAYER_MAX_ENERGY,
      shield: 0,
      isStunned: false,
    };
  }

  onStateChange(cb: StateChangeCallback): () => void {
    this.onStateChangeCallbacks.push(cb);
    return () => {
      this.onStateChangeCallbacks = this.onStateChangeCallbacks.filter((c) => c !== cb);
    };
  }

  onEffect(cb: EffectCallback): () => void {
    this.onEffectCallbacks.push(cb);
    return () => {
      this.onEffectCallbacks = this.onEffectCallbacks.filter((c) => c !== cb);
    };
  }

  private notifyStateChange(): void {
    const snapshot = this.getState();
    for (const cb of this.onStateChangeCallbacks) {
      cb(snapshot);
    }
  }

  private notifyEffects(effects: GameEffect[]): void {
    for (const cb of this.onEffectCallbacks) {
      cb(effects);
    }
  }

  getState(): GameState {
    return JSON.parse(JSON.stringify(this.state));
  }

  startGame(playerDeck: Deck, enemyDeck?: Deck): void {
    const enemyD = enemyDeck || DEFAULT_ENEMY_DECK;
    const playerCards = shuffleDeck(buildCardListFromDeck(playerDeck));
    const enemyCards = shuffleDeck(buildCardListFromDeck(enemyD));

    let player = { ...this.createEmptyPlayer(), deck: playerCards };
    let enemy = { ...this.createEmptyPlayer(), deck: enemyCards };

    player = drawInitialHand(player);
    enemy = drawInitialHand(enemy);

    this.state = {
      ...this.createInitialState(),
      phase: GamePhase.Playing,
      turnPhase: TurnPhase.Draw,
      turn: 1,
      player,
      enemy,
      energyPool: { playerEnergy: 0, enemyEnergy: 0, maxEnergy: MAX_ENERGY_POOL },
      battleLog: ['对战开始！'],
    };

    this.startPlayerTurn();
  }

  private startPlayerTurn(): void {
    let player = { ...this.state.player };

    player = tickBuffs(player);
    player = processBuffTickEffects(player);

    if (player.isStunned) {
      this.state = {
        ...this.state,
        turnPhase: TurnPhase.EnemyTurn,
        player: { ...player, isStunned: false },
        battleLog: [...this.state.battleLog, `第${this.state.turn}回合 — 你被眩晕，跳过回合`],
      };
      this.notifyStateChange();
      setTimeout(() => this.executeEnemyTurn(), 800);
      return;
    }

    player.energy = Math.min(player.maxEnergy, player.energy + ENERGY_PER_TURN);
    if (player.deck.length > 0 && player.hand.length < 7) {
      player = drawCards(player, 1);
    }

    this.turnPlayedCards = [];
    this.state = {
      ...this.state,
      turnPhase: TurnPhase.Play,
      player,
      battleLog: [...this.state.battleLog, `第${this.state.turn}回合 — 你的回合`],
    };
    this.notifyStateChange();
  }

  playCard(handIndex: number): boolean {
    if (this.state.phase !== GamePhase.Playing || this.state.turnPhase !== TurnPhase.Play) {
      return false;
    }

    const result = removeCardFromHand(this.state.player, handIndex);
    if (!result) return false;

    const { player: newPlayer, card } = result;

    if (card.cost > newPlayer.energy) {
      return false;
    }

    let player = { ...newPlayer, energy: newPlayer.energy - card.cost };
    let enemy = { ...this.state.enemy };
    let energyPool = { ...this.state.energyPool };
    let battleLog = [...this.state.battleLog];
    let effects: GameEffect[] = [];
    let lastCombo: ComboResult | null = null;

    player = discardToGraveyard(player, card);
    this.turnPlayedCards.push(card);

    const multiplier = getPowerBoostMultiplier(player);
    const effectivePower = Math.round(card.power * multiplier);

    switch (card.category) {
      case 'rune': {
        switch (card.runeType) {
          case RuneType.Attack: {
            const dmg = effectivePower;
            let shield = enemy.shield;
            let hp = enemy.hp;
            if (shield >= dmg) {
              shield -= dmg;
            } else {
              const rem = dmg - shield;
              shield = 0;
              hp -= rem;
            }
            enemy = { ...enemy, shield, hp: Math.max(0, hp) };
            battleLog.push(`你使用【${card.name}】，造成${dmg}点伤害`);
            effects.push({
              type: 'damage',
              position: { x: 0.5, y: 0.3 },
              duration: 600,
              intensity: dmg,
              element: undefined,
              color: card.inkColor,
            });
            break;
          }
          case RuneType.Defense: {
            player = { ...player, shield: player.shield + effectivePower };
            battleLog.push(`你使用【${card.name}】，获得${effectivePower}点防御`);
            effects.push({
              type: 'shield',
              position: { x: 0.5, y: 0.7 },
              duration: 500,
              intensity: effectivePower,
              element: undefined,
              color: card.inkColor,
            });
            break;
          }
          case RuneType.Heal: {
            const heal = effectivePower;
            player = { ...player, hp: Math.min(player.maxHp, player.hp + heal) };
            battleLog.push(`你使用【${card.name}】，回复${heal}点生命`);
            effects.push({
              type: 'heal',
              position: { x: 0.5, y: 0.7 },
              duration: 500,
              intensity: heal,
              element: undefined,
              color: card.inkColor,
            });
            break;
          }
          case RuneType.Disrupt: {
            const dmg = effectivePower;
            let shield = enemy.shield;
            let hp = enemy.hp;
            if (shield >= dmg) {
              shield -= dmg;
            } else {
              const rem = dmg - shield;
              shield = 0;
              hp -= rem;
            }
            enemy = { ...enemy, shield, hp: Math.max(0, hp) };
            enemy = applyCardBuffsToEnemy(enemy, card.id);
            battleLog.push(`你使用【${card.name}】，造成${dmg}点伤害并施加负面效果`);
            effects.push({
              type: 'cardPlay',
              position: { x: 0.5, y: 0.3 },
              duration: 600,
              intensity: dmg,
              element: undefined,
              color: card.inkColor,
            });
            break;
          }
        }
        break;
      }
      case 'element': {
        const dmg = effectivePower;
        let shield = enemy.shield;
        let hp = enemy.hp;
        if (shield >= dmg) {
          shield -= dmg;
        } else {
          const rem = dmg - shield;
          shield = 0;
          hp -= rem;
        }
        enemy = { ...enemy, shield, hp: Math.max(0, hp) };
        enemy = applyCardBuffsToEnemy(enemy, card.id);
        battleLog.push(`你使用【${card.name}】，造成${dmg}点${card.elementType}元素伤害`);
        effects.push({
          type: 'cardPlay',
          position: { x: 0.5, y: 0.3 },
          duration: 700,
          intensity: dmg,
          element: card.elementType,
          color: card.inkColor,
        });
        break;
      }
    }

    energyPool.playerEnergy = Math.min(energyPool.maxEnergy, energyPool.playerEnergy + card.cost);

    if (this.turnPlayedCards.length >= 2) {
      const combo = detectCombo(this.turnPlayedCards);
      if (combo) {
        lastCombo = combo;
        const comboResult = applyComboEffects(combo, enemy, player);
        enemy = comboResult.target;
        player = comboResult.caster;
        battleLog.push(`触发组合技【${combo.comboName}】！`);
        effects.push({
          type: 'combo',
          position: { x: 0.5, y: 0.5 },
          duration: 1000,
          intensity: 10,
          element: combo.element,
          color: '#ffdd00',
        });
      }
    }

    this.state = {
      ...this.state,
      player,
      enemy,
      energyPool,
      lastCombo,
      effects: [...this.state.effects, ...effects],
      battleLog,
    };

    this.notifyEffects(effects);
    this.notifyStateChange();

    if (enemy.hp <= 0) {
      this.endGame('player');
    }

    return true;
  }

  endTurn(): void {
    if (this.state.phase !== GamePhase.Playing || this.state.turnPhase !== TurnPhase.Play) {
      return;
    }

    this.state = {
      ...this.state,
      turnPhase: TurnPhase.Resolve,
      battleLog: [...this.state.battleLog, '你结束了回合'],
    };
    this.notifyStateChange();

    setTimeout(() => this.executeEnemyTurn(), 600);
  }

  useFinishingMove(): boolean {
    if (!canUseFinishingMove(this.state.energyPool.playerEnergy)) return false;
    if (this.state.turnPhase !== TurnPhase.Play) return false;

    const dominantElement = getDominantElement(this.turnPlayedCards.length > 0 ? this.turnPlayedCards : this.state.player.graveyard.slice(-5));
    const move = getFinishingMove(dominantElement);
    const result = executeFinishingMove(move, this.state.enemy, this.state.player);

    this.state = {
      ...this.state,
      player: result.caster,
      enemy: result.target,
      energyPool: { ...this.state.energyPool, playerEnergy: 0 },
      isShaking: true,
      showFinishingMove: true,
      finishingMoveTarget: 'enemy',
      battleLog: [...this.state.battleLog, `释放终结技【${move.name}】！造成${result.damageDealt}点伤害！`],
    };

    const effects: GameEffect[] = [
      {
        type: 'finishingMove',
        position: { x: 0.5, y: 0.5 },
        duration: 2000,
        intensity: result.damageDealt,
        element: dominantElement,
        color: move.inkColor,
      },
    ];

    this.notifyEffects(effects);
    this.notifyStateChange();

    setTimeout(() => {
      this.state = { ...this.state, isShaking: false, showFinishingMove: false };
      this.notifyStateChange();
      if (this.state.enemy.hp <= 0) {
        this.endGame('player');
      }
    }, 1500);

    return true;
  }

  private executeEnemyTurn(): void {
    let enemy = { ...this.state.enemy };

    enemy = tickBuffs(enemy);
    enemy = processBuffTickEffects(enemy);

    if (enemy.isStunned) {
      this.state = {
        ...this.state,
        enemy: { ...enemy, isStunned: false },
        battleLog: [...this.state.battleLog, '敌方被眩晕，跳过回合'],
      };
      this.notifyStateChange();
      setTimeout(() => this.finishRound(), 600);
      return;
    }

    enemy.energy = Math.min(enemy.maxEnergy, enemy.energy + ENERGY_PER_TURN);
    if (enemy.deck.length > 0 && enemy.hand.length < 7) {
      enemy = drawCards(enemy, 1);
    }

    this.state = {
      ...this.state,
      turnPhase: TurnPhase.EnemyTurn,
      enemy,
    };
    this.notifyStateChange();

    this.aiPlayCards();
  }

  private aiPlayCards(): void {
    let enemy = { ...this.state.enemy };
    let player = { ...this.state.player };
    let energyPool = { ...this.state.energyPool };
    let battleLog = [...this.state.battleLog];
    let allEffects: GameEffect[] = [];
    let enemyPlayedCards: Card[] = [];

    const playableCards = enemy.hand.filter((c) => c.cost <= enemy.energy);

    const scored = playableCards.map((card) => {
      let score = 0;
      switch (card.category) {
        case 'rune':
          switch (card.runeType) {
            case RuneType.Attack:
              score = card.power * 2;
              if (player.hp <= card.power * 1.5) score += 20;
              break;
            case RuneType.Defense:
              score = card.power;
              if (enemy.shield < 3) score += 5;
              if (enemy.hp < enemy.maxHp * 0.4) score += 8;
              break;
            case RuneType.Heal:
              score = card.power;
              if (enemy.hp < enemy.maxHp * 0.5) score += 15;
              if (enemy.hp < enemy.maxHp * 0.3) score += 25;
              break;
            case RuneType.Disrupt:
              score = card.power * 1.5;
              if (player.shield > 0) score += 5;
              break;
          }
          break;
        case 'element':
          score = card.power * 1.8;
          break;
      }
      return { card, score };
    });

    scored.sort((a, b) => b.score - a.score);

    let cardsPlayed = 0;
    const maxCards = 3;

    for (const { card } of scored) {
      if (card.cost > enemy.energy || cardsPlayed >= maxCards) break;

      const idx = enemy.hand.findIndex((c) => c.id === card.id);
      if (idx === -1) continue;

      enemy.energy -= card.cost;
      enemy.hand = enemy.hand.filter((_, i) => i !== idx);
      enemy.graveyard = [...enemy.graveyard, card];
      enemyPlayedCards.push(card);
      cardsPlayed++;

      const multiplier = getPowerBoostMultiplier(enemy);
      const effectivePower = Math.round(card.power * multiplier);

      switch (card.category) {
        case 'rune':
          switch (card.runeType) {
            case RuneType.Attack: {
              const dmg = effectivePower;
              let shield = player.shield;
              let hp = player.hp;
              if (shield >= dmg) { shield -= dmg; } else { const rem = dmg - shield; shield = 0; hp -= rem; }
              player = { ...player, shield, hp: Math.max(0, hp) };
              battleLog.push(`敌方使用【${card.name}】，对你造成${dmg}点伤害`);
              allEffects.push({ type: 'damage', position: { x: 0.5, y: 0.7 }, duration: 600, intensity: dmg, color: card.inkColor });
              break;
            }
            case RuneType.Defense:
              enemy = { ...enemy, shield: enemy.shield + effectivePower };
              battleLog.push(`敌方使用【${card.name}】，获得${effectivePower}点防御`);
              break;
            case RuneType.Heal:
              enemy = { ...enemy, hp: Math.min(enemy.maxHp, enemy.hp + effectivePower) };
              battleLog.push(`敌方使用【${card.name}】，回复${effectivePower}点生命`);
              break;
            case RuneType.Disrupt: {
              const dmg = effectivePower;
              let shield = player.shield;
              let hp = player.hp;
              if (shield >= dmg) { shield -= dmg; } else { const rem = dmg - shield; shield = 0; hp -= rem; }
              player = { ...player, shield, hp: Math.max(0, hp) };
              battleLog.push(`敌方使用【${card.name}】，对你造成${dmg}点伤害并施加减益`);
              allEffects.push({ type: 'damage', position: { x: 0.5, y: 0.7 }, duration: 600, intensity: dmg, color: card.inkColor });
              break;
            }
          }
          break;
        case 'element': {
          const dmg = effectivePower;
          let shield = player.shield;
          let hp = player.hp;
          if (shield >= dmg) { shield -= dmg; } else { const rem = dmg - shield; shield = 0; hp -= rem; }
          player = { ...player, shield, hp: Math.max(0, hp) };
          battleLog.push(`敌方使用【${card.name}】，对你造成${dmg}点元素伤害`);
          allEffects.push({ type: 'cardPlay', position: { x: 0.5, y: 0.7 }, duration: 700, intensity: dmg, element: card.elementType, color: card.inkColor });
          break;
        }
      }

      energyPool.enemyEnergy = Math.min(energyPool.maxEnergy, energyPool.enemyEnergy + card.cost);
    }

    if (canUseFinishingMove(energyPool.enemyEnergy)) {
      const dominantEl = getDominantElement(enemyPlayedCards.length > 0 ? enemyPlayedCards : enemy.graveyard.slice(-5));
      const move = getFinishingMove(dominantEl);
      const result = executeFinishingMove(move, player, enemy);
      player = result.target;
      enemy = result.caster;
      energyPool.enemyEnergy = 0;
      battleLog.push(`敌方释放终结技【${move.name}】！造成${result.damageDealt}点伤害！`);
      allEffects.push({
        type: 'finishingMove',
        position: { x: 0.5, y: 0.5 },
        duration: 2000,
        intensity: result.damageDealt,
        element: dominantEl,
        color: move.inkColor,
      });
      this.state = { ...this.state, isShaking: true, showFinishingMove: true, finishingMoveTarget: 'player' };
    }

    if (enemyPlayedCards.length >= 2) {
      const combo = detectCombo(enemyPlayedCards);
      if (combo) {
        const comboResult = applyComboEffects(combo, player, enemy);
        player = comboResult.target;
        enemy = comboResult.caster;
        battleLog.push(`敌方触发组合技【${combo.comboName}】！`);
      }
    }

    this.state = {
      ...this.state,
      player,
      enemy,
      energyPool,
      battleLog,
      effects: [...this.state.effects, ...allEffects],
    };

    this.notifyEffects(allEffects);
    this.notifyStateChange();

    setTimeout(() => {
      this.state = { ...this.state, isShaking: false, showFinishingMove: false };
      this.notifyStateChange();

      if (player.hp <= 0) {
        this.endGame('enemy');
      } else {
        this.finishRound();
      }
    }, 1200);
  }

  private finishRound(): void {
    let player = { ...this.state.player };
    player.shield = Math.floor(player.shield * 0.5);

    let enemy = { ...this.state.enemy };
    enemy.shield = Math.floor(enemy.shield * 0.5);

    this.state = {
      ...this.state,
      turn: this.state.turn + 1,
      player,
      enemy,
      lastCombo: null,
    };

    this.startPlayerTurn();
  }

  private endGame(winner: 'player' | 'enemy'): void {
    this.state = {
      ...this.state,
      phase: GamePhase.GameOver,
      winner,
      battleLog: [...this.state.battleLog, winner === 'player' ? '你赢了！' : '你输了...'],
    };
    this.notifyStateChange();
  }

  returnToMenu(): void {
    this.state = this.createInitialState();
    this.notifyStateChange();
  }

  goToDeckBuilder(): void {
    this.state = { ...this.state, phase: GamePhase.DeckBuilder };
    this.notifyStateChange();
  }

  returnFromDeckBuilder(): void {
    this.state = { ...this.state, phase: GamePhase.Menu };
    this.notifyStateChange();
  }

  clearEffects(): void {
    this.state = { ...this.state, effects: [] };
  }
}
