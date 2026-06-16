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
  { name: '刺客', emoji: '🗡️', cost: 3, baseAtk: 20, baseHp: 30, range: 1, speed: 1 },
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
  private destroyed: boolean = false;

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
    this.destroyed = false;
    this.stopGameLoop();
  }

  on(event: string, callback: EventCallback): void {
    const list = this.eventListeners.get(event) || [];
    list.push(callback);
    this.eventListeners.set(event, list);
  }

  off(event: string, callback: EventCallback): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const idx = listeners.indexOf(callback);
      if (idx !== -1) listeners.splice(idx, 1);
    }
  }

  private emit(event: string, data?: unknown): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.slice().forEach(cb => {
        try { cb(data); } catch (e) { /* ignore */ }
      });
    }
  }

  getGold(): number { return this.gold; }
  getRound(): number { return this.round; }
  getWinStreak(): number { return this.winStreak; }
  getPhase(): GamePhase { return this.phase; }
  getSelectedHeroId(): string | null { return this.selectedHeroId; }
  getHeroTemplates(): HeroStats[] { return HERO_TEMPLATES; }
  getResultMessage(): string | null { return this.resultMessage; }
  getIsVictory(): boolean | null { return this.isVictory; }

  getHeroes(): Hero[] {
    return this.heroes.map(h => h.clone());
  }

  getEnemies(): Hero[] {
    return this.enemies.map(h => h.clone());
  }

  getBoardHeroes(): (Hero | null)[][] {
    const board: (Hero | null)[][] = Array.from({ length: BOARD_SIZE }, () =>
      Array.from({ length: BOARD_SIZE }, () => null)
    );
    for (const unit of [...this.heroes, ...this.enemies]) {
      if (unit.pos && unit.isAlive() &&
          unit.pos.x >= 0 && unit.pos.x < BOARD_SIZE &&
          unit.pos.y >= 0 && unit.pos.y < BOARD_SIZE) {
        board[unit.pos.y][unit.pos.x] = unit.clone();
      }
    }
    return board;
  }

  getBoardHeroCount(): number {
    return this.heroes.filter(h => h.pos && h.isAlive()).length;
  }

  canBuyHero(templateIndex: number): boolean {
    if (this.phase !== 'prepare') return false;
    const tpl = HERO_TEMPLATES[templateIndex];
    if (!tpl) return false;
    return this.gold >= tpl.cost;
  }

  buyHero(templateIndex: number): Hero | null {
    if (!this.canBuyHero(templateIndex)) return null;
    const template = HERO_TEMPLATES[templateIndex];
    const hero = new Hero(template);

    this.heroes.push(hero);
    this.gold = Math.max(0, this.gold - template.cost);
    this.gold = Math.min(MAX_GOLD, this.gold);

    const emptyPos = this.findEmptyPosition();
    if (emptyPos) {
      const placed = this.placeHero(hero.id, emptyPos);
      if (!placed) {
        hero.pos = emptyPos;
      }
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

    const hero = this.heroes.find(h => h.id === heroId);
    if (!hero || hero.isEnemy || !hero.isAlive()) return false;

    const occupant = this.getUnitAt(pos);

    if (occupant) {
      if (occupant.id === heroId) {
        return true;
      }
      if (!occupant.isEnemy) {
        const oldHeroPos = hero.pos ? { ...hero.pos } : null;
        hero.pos = { ...pos };
        occupant.pos = oldHeroPos;
        this.emitStateUpdate();
        return true;
      }
      return false;
    }

    hero.pos = { ...pos };
    this.emitStateUpdate();
    return true;
  }

  private getUnitAt(pos: Position): Hero | null {
    for (const u of [...this.heroes, ...this.enemies]) {
      if (u.pos && u.pos.x === pos.x && u.pos.y === pos.y && u.isAlive()) {
        return u;
      }
    }
    return null;
  }

  private isPositionOccupied(pos: Position): boolean {
    return this.getUnitAt(pos) !== null;
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
      const matches = this.heroes.filter(
        h => h.name === template.name && h.star === star && h.isAlive()
      );
      if (matches.length >= 2) return true;
    }
    return false;
  }

  upgradeHero(templateIndex: number): boolean {
    if (!this.canUpgradeHero(templateIndex)) return false;
    const template = HERO_TEMPLATES[templateIndex];

    for (let star = 1; star <= 2; star++) {
      const matches = this.heroes.filter(
        h => h.name === template.name && h.star === star && h.isAlive()
      );

      if (matches.length >= 2) {
        const h1 = matches[0];
        const h2 = matches[1];

        const pos1 = h1.pos ? { ...h1.pos } : null;
        const pos2 = h2.pos ? { ...h2.pos } : null;

        h1.upgrade();

        if (!h1.pos && pos1) {
          h1.pos = pos1;
        }

        if (this.selectedHeroId === h2.id) {
          this.selectedHeroId = h1.id;
        }

        const idx2 = this.heroes.findIndex(h => h.id === h2.id);
        if (idx2 !== -1) {
          this.heroes.splice(idx2, 1);
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
    this.selectedHeroId = null;
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
        this.enemies.push(new Hero(
          { name: '骷髅', emoji: '💀', cost: 0, baseAtk: atk, baseHp: hp, range: 1, speed: 1, isEnemy: true },
          { x: col, y: row }
        ));
      }
    }
  }

  private startGameLoop(): void {
    this.stopGameLoop();
    this.lastFrameTime = performance.now();
    this.frameAccumulator = 0;
    this.destroyed = false;
    this.tickLoop();
  }

  private stopGameLoop(): void {
    this.destroyed = true;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private tickLoop = (): void => {
    if (this.destroyed) return;
    if (this.phase !== 'battle') return;

    const now = performance.now();
    const delta = now - this.lastFrameTime;
    this.lastFrameTime = now;
    this.frameAccumulator += delta;

    let safety = 10;
    while (this.frameAccumulator >= FRAME_INTERVAL && safety-- > 0) {
      this.tickUpdate();
      this.frameAccumulator -= FRAME_INTERVAL;
    }

    this.emitStateUpdate();

    if (this.phase === 'battle' && !this.destroyed) {
      this.animationFrameId = requestAnimationFrame(this.tickLoop);
    }
  };

  private tickUpdate(): void {
    const aliveHeroes = this.heroes.filter(h => h.isAlive() && h.pos);
    const aliveEnemies = this.enemies.filter(h => h.isAlive() && h.pos);

    if (aliveHeroes.length === 0) { this.endRound(false); return; }
    if (aliveEnemies.length === 0) { this.endRound(true); return; }

    for (const hero of aliveHeroes) {
      this.unitAct(hero, aliveEnemies);
    }
    for (const enemy of aliveEnemies) {
      if (enemy.isAlive()) this.unitAct(enemy, aliveHeroes);
    }

    const hAlive = this.heroes.filter(h => h.isAlive() && h.pos);
    const eAlive = this.enemies.filter(h => h.isAlive() && h.pos);
    if (hAlive.length === 0) this.endRound(false);
    else if (eAlive.length === 0) this.endRound(true);
  }

  private unitAct(unit: Hero, targets: Hero[]): void {
    if (!unit.pos) return;
    const alive = targets.filter(t => t.isAlive() && t.pos);
    if (alive.length === 0) return;

    let nearest: Hero | null = null;
    let minD = Infinity;
    for (const t of alive) {
      if (!t.pos) continue;
      const d = unit.getDistance(t.pos);
      if (d < minD) { minD = d; nearest = t; }
    }
    if (!nearest || !nearest.pos) return;

    const now = performance.now();

    if (unit.isInRange(nearest)) {
      if (now - unit.lastAttackTime >= ATTACK_INTERVAL) {
        unit.attack(nearest);
        unit.lastAttackTime = now;
      }
    } else {
      if (now - unit.lastMoveTime >= MOVE_INTERVAL) {
        const np = unit.moveToward(nearest.pos);
        if (np.x >= 0 && np.x < BOARD_SIZE && np.y >= 0 && np.y < BOARD_SIZE) {
          const blocked = this.isBlockedByOther(np, unit);
          if (!blocked) {
            unit.pos = np;
            unit.lastMoveTime = now;
          }
        }
      }
    }
  }

  private isBlockedByOther(pos: Position, self: Hero): boolean {
    for (const u of [...this.heroes, ...this.enemies]) {
      if (u.id !== self.id && u.pos && u.pos.x === pos.x && u.pos.y === pos.y && u.isAlive()) {
        return true;
      }
    }
    return false;
  }

  private endRound(victory: boolean): void {
    this.stopGameLoop();
    this.phase = victory ? 'roundEnd' : 'gameOver';
    this.isVictory = victory;

    if (victory) {
      this.winStreak++;
      const reward = BASE_REWARD + Math.max(0, this.winStreak - 1);
      this.gold = Math.min(MAX_GOLD, this.gold + reward);
      this.resultMessage = `恭喜获胜！获得 ${reward} 金币`;
    } else {
      this.winStreak = 0;
      this.resultMessage = `游戏结束！存活 ${this.round} 回合`;
    }

    this.enemies = [];
    try { this.emit('roundEnd', { victory }); } catch (e) { /* ignore */ }
    this.emitStateUpdate();
  }

  nextRound(): boolean {
    if (this.phase !== 'roundEnd') return false;
    this.round++;
    this.phase = 'prepare';
    this.resultMessage = null;
    this.isVictory = null;
    this.heroes = this.heroes.filter(h => h.isAlive());
    for (const h of this.heroes) { h.hp = h.maxHp; }
    this.emitStateUpdate();
    return true;
  }

  restartGame(): void {
    this.reset();
    this.emitStateUpdate();
  }

  private emitStateUpdate(): void {
    if (this.destroyed) return;
    try {
      this.emit('stateUpdate', this.getState());
    } catch (e) {
      /* swallow listener errors to avoid breaking loop */
    }
  }

  getState() {
    const board = this.getBoardHeroes();
    const boardData: (HeroData | null)[][] = board.map(row =>
      row.map(h => h ? this.heroToData(h) : null)
    );
    return {
      gold: this.gold,
      round: this.round,
      winStreak: this.winStreak,
      phase: this.phase,
      heroes: this.heroes.map(h => this.heroToData(h)),
      enemies: this.enemies.map(h => this.heroToData(h)),
      boardHeroes: boardData,
      selectedHeroId: this.selectedHeroId,
      resultMessage: this.resultMessage,
      isVictory: this.isVictory,
      boardHeroCount: this.getBoardHeroCount(),
    };
  }

  private heroToData(h: Hero): HeroData {
    return {
      id: h.id,
      name: h.name,
      emoji: h.emoji,
      star: h.star,
      atk: h.atk,
      hp: h.hp,
      maxHp: h.maxHp,
      range: h.range,
      speed: h.speed,
      pos: h.pos ? { ...h.pos } : null,
      isEnemy: h.isEnemy,
      cost: h.cost,
    };
  }

  destroy(): void {
    this.stopGameLoop();
    this.eventListeners.clear();
  }
}
