import { Hero } from './Hero';
import { Position, HeroStats, GamePhase, HeroData } from '../types';

const BOARD_SIZE = 6;
const INITIAL_GOLD = 5;
const MAX_GOLD = 20;
const BASE_REWARD = 2;
const FRAME_INTERVAL = 100;
const MOVE_INTERVAL = 300;
const ATTACK_INTERVAL = 500;

const HERO_TEMPLATES: HeroStats[] = [
  { name: '战士', emoji: '⚔️', cost: 1, baseAtk: 8, baseHp: 60, range: 1, speed: 1 },
  { name: '弓手', emoji: '🏹', cost: 2, baseAtk: 12, baseHp: 35, range: 2, speed: 1 },
  { name: '法师', emoji: '🔮', cost: 3, baseAtk: 18, baseHp: 25, range: 2, speed: 1 },
  { name: '骑士', emoji: '🛡️', cost: 2, baseAtk: 6, baseHp: 90, range: 1, speed: 1 },
  { name: '刺客', emoji: '🗡️', cost: 3, baseAtk: 20, baseHp: 30, range: 1, speed: 2 },
];

type EventCallback = (data?: unknown) => void;

export class GameEngine {
  private gold: number = INITIAL_GOLD;
  private round: number = 1;
  private winStreak: number = 0;
  private phase: GamePhase = 'prepare';
  private heroes: Hero[] = [];
  private enemies: Hero[] = [];
  private selectedHeroId: string | null = null;
  private animationFrameId: number | null = null;
  private lastFrameTime: number = 0;
  private frameAccumulator: number = 0;
  private eventListeners: Map<string, EventCallback[]> = new Map();
  private resultMessage: string | null = null;
  private isVictory: boolean | null = null;

  constructor() {
    this.reset();
  }

  reset(): void {
    this.gold = INITIAL_GOLD;
    this.round = 1;
    this.winStreak = 0;
    this.phase = 'prepare';
    this.heroes = [];
    this.enemies = [];
    this.selectedHeroId = null;
    this.resultMessage = null;
    this.isVictory = null;
    this.stopGameLoop();
  }

  on(event: string, callback: EventCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: EventCallback): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: unknown): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((cb) => cb(data));
    }
  }

  getGold(): number {
    return this.gold;
  }

  getRound(): number {
    return this.round;
  }

  getWinStreak(): number {
    return this.winStreak;
  }

  getPhase(): GamePhase {
    return this.phase;
  }

  getHeroes(): Hero[] {
    return this.heroes.map((h) => h.clone());
  }

  getEnemies(): Hero[] {
    return this.enemies.map((h) => h.clone());
  }

  getBoardHeroes(): (Hero | null)[][] {
    const board: (Hero | null)[][] = [];
    for (let y = 0; y < BOARD_SIZE; y++) {
      board[y] = [];
      for (let x = 0; x < BOARD_SIZE; x++) {
        board[y][x] = null;
      }
    }
    const allUnits = [...this.heroes, ...this.enemies];
    for (const unit of allUnits) {
      if (unit.pos && unit.isAlive()) {
        const { x, y } = unit.pos;
        if (x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE) {
          board[y][x] = unit.clone();
        }
      }
    }
    return board;
  }

  getSelectedHeroId(): string | null {
    return this.selectedHeroId;
  }

  getHeroTemplates(): HeroStats[] {
    return HERO_TEMPLATES;
  }

  getResultMessage(): string | null {
    return this.resultMessage;
  }

  getIsVictory(): boolean | null {
    return this.isVictory;
  }

  getBoardHeroCount(): number {
    return this.heroes.filter((h) => h.pos !== null && h.isAlive()).length;
  }

  canBuyHero(templateIndex: number): boolean {
    if (this.phase !== 'prepare') return false;
    const template = HERO_TEMPLATES[templateIndex];
    if (!template) return false;
    return this.gold >= template.cost;
  }

  buyHero(templateIndex: number): Hero | null {
    if (!this.canBuyHero(templateIndex)) return null;
    const template = HERO_TEMPLATES[templateIndex];
    const hero = new Hero(template);
    this.heroes.push(hero);
    this.gold -= template.cost;

    const emptyPos = this.findEmptyPosition();
    if (emptyPos) {
      hero.pos = emptyPos;
    }

    this.emitStateUpdate();
    return hero;
  }

  private findEmptyPosition(): Position | null {
    for (let y = BOARD_SIZE - 1; y >= 0; y--) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        if (!this.isPositionOccupied({ x, y })) {
          return { x, y };
        }
      }
    }
    return null;
  }

  placeHero(heroId: string, pos: Position): boolean {
    if (this.phase !== 'prepare') return false;
    if (pos.x < 0 || pos.x >= BOARD_SIZE || pos.y < 0 || pos.y >= BOARD_SIZE) return false;

    const hero = this.heroes.find((h) => h.id === heroId);
    if (!hero || hero.isEnemy) return false;

    const occupied = this.isPositionOccupied(pos);
    if (occupied) {
      const otherHero = this.heroes.find(
        (h) => h.pos && h.pos.x === pos.x && h.pos.y === pos.y
      );
      if (otherHero && otherHero.id !== heroId) {
        const oldPos = hero.pos;
        if (oldPos) {
          otherHero.pos = { ...oldPos };
        } else {
          otherHero.pos = null;
        }
        hero.pos = { ...pos };
        this.emitStateUpdate();
        return true;
      }
      return false;
    }

    hero.pos = { ...pos };
    this.emitStateUpdate();
    return true;
  }

  private isPositionOccupied(pos: Position): boolean {
    const allUnits = [...this.heroes, ...this.enemies];
    return allUnits.some(
      (u) => u.pos && u.pos.x === pos.x && u.pos.y === pos.y && u.isAlive()
    );
  }

  selectHero(heroId: string | null): void {
    this.selectedHeroId = heroId;
    this.emitStateUpdate();
  }

  canUpgradeHero(templateIndex: number): boolean {
    if (this.phase !== 'prepare') return false;
    const template = HERO_TEMPLATES[templateIndex];
    if (!template) return false;

    for (let star = 1; star <= 2; star++) {
      const sameHeroes = this.heroes.filter(
        (h) => h.name === template.name && h.star === star
      );
      if (sameHeroes.length >= 2) {
        return true;
      }
    }
    return false;
  }

  upgradeHero(templateIndex: number): boolean {
    if (!this.canUpgradeHero(templateIndex)) return false;
    const template = HERO_TEMPLATES[templateIndex];

    for (let star = 1; star <= 2; star++) {
      const sameHeroes = this.heroes.filter(
        (h) => h.name === template.name && h.star === star
      );

      if (sameHeroes.length >= 2) {
        const baseHero = sameHeroes[0];
        baseHero.upgrade();

        const removeHero = sameHeroes[1];
        const index = this.heroes.findIndex((h) => h.id === removeHero.id);
        if (index > -1) {
          this.heroes.splice(index, 1);
        }

        if (this.selectedHeroId === removeHero.id) {
          this.selectedHeroId = baseHero.id;
        }

        this.emitStateUpdate();
        return true;
      }
    }

    return false;
  }

  startRound(): boolean {
    if (this.phase !== 'prepare') return false;
    if (this.getBoardHeroCount() === 0) return false;

    this.phase = 'battle';
    this.resultMessage = null;
    this.isVictory = null;
    this.spawnEnemies();
    this.startGameLoop();
    this.emitStateUpdate();
    return true;
  }

  private spawnEnemies(): void {
    this.enemies = [];
    const rows = [0, 1, 2];

    for (const row of rows) {
      for (let i = 0; i < 2; i++) {
        const col = BOARD_SIZE - 1 - i;
        const hp = 20 + Math.floor(Math.random() * 21) + (this.round - 1) * 5;
        const atk = 3 + Math.floor(Math.random() * 4) + Math.floor((this.round - 1) * 0.5);

        const enemy = new Hero(
          {
            name: '骷髅',
            emoji: '💀',
            cost: 0,
            baseAtk: atk,
            baseHp: hp,
            range: 1,
            speed: 1,
            isEnemy: true,
          },
          { x: col, y: row }
        );
        this.enemies.push(enemy);
      }
    }
  }

  private startGameLoop(): void {
    this.stopGameLoop();
    this.lastFrameTime = performance.now();
    this.frameAccumulator = 0;
    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  }

  private stopGameLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private gameLoop = (currentTime: number): void => {
    if (this.phase !== 'battle') return;

    const deltaTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;
    this.frameAccumulator += deltaTime;

    while (this.frameAccumulator >= FRAME_INTERVAL) {
      this.update(FRAME_INTERVAL);
      this.frameAccumulator -= FRAME_INTERVAL;
    }

    this.emitStateUpdate();
    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  private update(deltaTime: number): void {
    const aliveHeroes = this.heroes.filter((h) => h.isAlive() && h.pos);
    const aliveEnemies = this.enemies.filter((h) => h.isAlive() && h.pos);

    if (aliveHeroes.length === 0) {
      this.endRound(false);
      return;
    }

    if (aliveEnemies.length === 0) {
      this.endRound(true);
      return;
    }

    for (const hero of aliveHeroes) {
      this.unitAction(hero, aliveEnemies);
    }

    for (const enemy of aliveEnemies) {
      if (enemy.isAlive()) {
        this.unitAction(enemy, aliveHeroes);
      }
    }

    const stillAliveHeroes = this.heroes.filter((h) => h.isAlive() && h.pos);
    const stillAliveEnemies = this.enemies.filter((h) => h.isAlive() && h.pos);

    if (stillAliveHeroes.length === 0) {
      this.endRound(false);
    } else if (stillAliveEnemies.length === 0) {
      this.endRound(true);
    }
  }

  private unitAction(unit: Hero, targets: Hero[]): void {
    const aliveTargets = targets.filter((t) => t.isAlive() && t.pos);
    if (aliveTargets.length === 0 || !unit.pos) return;

    let nearestTarget: Hero | null = null;
    let minDistance = Infinity;

    for (const target of aliveTargets) {
      if (!target.pos) continue;
      const dist = unit.getDistance(target.pos);
      if (dist < minDistance) {
        minDistance = dist;
        nearestTarget = target;
      }
    }

    if (!nearestTarget || !nearestTarget.pos) return;

    const now = performance.now();

    if (unit.isInRange(nearestTarget)) {
      if (now - unit.lastAttackTime >= ATTACK_INTERVAL) {
        unit.attack(nearestTarget);
        unit.lastAttackTime = now;
      }
    } else {
      if (now - unit.lastMoveTime >= MOVE_INTERVAL) {
        const newPos = unit.moveToward(nearestTarget.pos);
        const occupied = this.isPositionOccupiedByOther(newPos, unit);
        if (!occupied && newPos.x >= 0 && newPos.x < BOARD_SIZE && newPos.y >= 0 && newPos.y < BOARD_SIZE) {
          unit.pos = newPos;
          unit.lastMoveTime = now;
        }
      }
    }
  }

  private isPositionOccupiedByOther(pos: Position, unit: Hero): boolean {
    const allUnits = [...this.heroes, ...this.enemies];
    return allUnits.some(
      (u) =>
        u.id !== unit.id &&
        u.pos &&
        u.pos.x === pos.x &&
        u.pos.y === pos.y &&
        u.isAlive()
    );
  }

  private endRound(victory: boolean): void {
    this.stopGameLoop();
    this.phase = 'roundEnd';
    this.isVictory = victory;

    if (victory) {
      this.winStreak++;
      const reward = BASE_REWARD + this.winStreak - 1;
      this.gold = Math.min(MAX_GOLD, this.gold + reward);
      this.resultMessage = `恭喜获胜！获得 ${reward} 金币`;
    } else {
      this.winStreak = 0;
      this.phase = 'gameOver';
      this.resultMessage = `游戏结束！存活 ${this.round} 回合`;
    }

    this.enemies = [];
    this.emit('roundEnd', { victory });
    this.emitStateUpdate();
  }

  nextRound(): boolean {
    if (this.phase !== 'roundEnd') return false;
    this.round++;
    this.phase = 'prepare';
    this.resultMessage = null;
    this.isVictory = null;
    this.heroes = this.heroes.filter((h) => h.isAlive());
    for (const hero of this.heroes) {
      hero.hp = hero.maxHp;
    }
    this.emitStateUpdate();
    return true;
  }

  restartGame(): void {
    this.reset();
    this.emitStateUpdate();
  }

  private emitStateUpdate(): void {
    const state = this.getState();
    this.emit('stateUpdate', state);
  }

  getState(): {
    gold: number;
    round: number;
    winStreak: number;
    phase: GamePhase;
    heroes: HeroData[];
    enemies: HeroData[];
    boardHeroes: (HeroData | null)[][];
    selectedHeroId: string | null;
    resultMessage: string | null;
    isVictory: boolean | null;
    boardHeroCount: number;
  } {
    const board = this.getBoardHeroes();
    const boardData: (HeroData | null)[][] = board.map((row) =>
      row.map((h) => (h ? this.heroToData(h) : null))
    );

    return {
      gold: this.gold,
      round: this.round,
      winStreak: this.winStreak,
      phase: this.phase,
      heroes: this.heroes.map((h) => this.heroToData(h)),
      enemies: this.enemies.map((h) => this.heroToData(h)),
      boardHeroes: boardData,
      selectedHeroId: this.selectedHeroId,
      resultMessage: this.resultMessage,
      isVictory: this.isVictory,
      boardHeroCount: this.getBoardHeroCount(),
    };
  }

  private heroToData(hero: Hero): HeroData {
    return {
      id: hero.id,
      name: hero.name,
      emoji: hero.emoji,
      star: hero.star,
      atk: hero.atk,
      hp: hero.hp,
      maxHp: hero.maxHp,
      range: hero.range,
      speed: hero.speed,
      pos: hero.pos ? { ...hero.pos } : null,
      isEnemy: hero.isEnemy,
      cost: hero.cost,
    };
  }

  destroy(): void {
    this.stopGameLoop();
    this.eventListeners.clear();
  }
}
