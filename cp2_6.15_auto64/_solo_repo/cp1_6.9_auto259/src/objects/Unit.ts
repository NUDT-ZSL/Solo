import Phaser from 'phaser';
import { Board, HexCoord } from './Board';

export type UnitType = 'attack' | 'defense' | 'balanced';

export interface UnitStats {
  maxHp: number;
  attack: number;
  moveRange: number;
  attackRange: number;
}

export const UNIT_STATS: Record<UnitType, UnitStats> = {
  attack: { maxHp: 4, attack: 5, moveRange: 2, attackRange: 1 },
  defense: { maxHp: 8, attack: 2, moveRange: 2, attackRange: 1 },
  balanced: { maxHp: 4, attack: 4, moveRange: 2, attackRange: 1 }
};

export class Unit {
  public scene: Phaser.Scene;
  public board: Board;
  public type: UnitType;
  public playerId: number;
  public coord: HexCoord;
  public hp: number;
  public maxHp: number;
  public attack: number;
  public moveRange: number;
  public attackRange: number;

  public container!: Phaser.GameObjects.Container;
  public shape!: Phaser.GameObjects.Graphics;
  public glow!: Phaser.GameObjects.Graphics;
  public hpBarBg!: Phaser.GameObjects.Graphics;
  public hpBar!: Phaser.GameObjects.Graphics;

  public hasMoved: boolean = false;
  public hasAttacked: boolean = false;
  public isAlive: boolean = true;

  private particlePool: Phaser.GameObjects.Particles.Particle[] = [];
  private readonly MAX_PARTICLES = 300;

  constructor(
    scene: Phaser.Scene,
    board: Board,
    type: UnitType,
    playerId: number,
    coord: HexCoord
  ) {
    this.scene = scene;
    this.board = board;
    this.type = type;
    this.playerId = playerId;
    this.coord = { ...coord };

    const stats = UNIT_STATS[type];
    this.maxHp = stats.maxHp;
    this.hp = stats.maxHp;
    this.attack = stats.attack;
    this.moveRange = stats.moveRange;
    this.attackRange = stats.attackRange;

    this.createVisual();
  }

  private getPlayerColor(): number {
    return this.playerId === 0 ? 0xff5555 : 0x5555ff;
  }

  private getPlayerGlowColor(): number {
    return this.playerId === 0 ? 0xff8888 : 0x8888ff;
  }

  private createVisual(): void {
    const { x, y } = this.board.hexToPixel(this.coord.q, this.coord.r);

    this.container = this.scene.add.container(x, y);
    this.container.setDepth(20);
    this.container.setSize(40, 40);

    this.glow = this.scene.add.graphics();
    this.drawGlow(this.glow, this.getPlayerGlowColor(), 0.4);
    this.container.add(this.glow);

    this.shape = this.scene.add.graphics();
    this.drawShape(this.shape, this.getPlayerColor(), 0xffffff);
    this.container.add(this.shape);

    this.hpBarBg = this.scene.add.graphics();
    this.hpBarBg.fillStyle(0x000000, 0.6);
    this.hpBarBg.fillRect(-16, 22, 32, 5);
    this.container.add(this.hpBarBg);

    this.hpBar = this.scene.add.graphics();
    this.updateHpBar();
    this.container.add(this.hpBar);

    this.container.setInteractive(new Phaser.Geom.Circle(0, 0, 22), Phaser.Geom.Circle.Contains);
  }

  private drawGlow(g: Phaser.GameObjects.Graphics, color: number, alpha: number): void {
    for (let i = 4; i >= 0; i--) {
      const r = 10 + i * 4;
      const a = alpha * (1 - i * 0.15);
      g.fillStyle(color, a);
      g.fillCircle(0, 0, r);
    }
  }

  private drawShape(g: Phaser.GameObjects.Graphics, color: number, stroke: number): void {
    g.clear();
    const size = 16;

    switch (this.type) {
      case 'attack':
        this.drawTriangle(g, size, color, stroke);
        break;
      case 'defense':
        this.drawSquare(g, size, color, stroke);
        break;
      case 'balanced':
        this.drawHexagon(g, size, color, stroke);
        break;
    }
  }

  private drawTriangle(g: Phaser.GameObjects.Graphics, size: number, color: number, stroke: number): void {
    const h = size * Math.sqrt(3) / 2;
    g.fillStyle(color, 1);
    g.beginPath();
    g.moveTo(0, -h);
    g.lineTo(-size, h * 0.6);
    g.lineTo(size, h * 0.6);
    g.closePath();
    g.fillPath();
    g.lineStyle(2, stroke, 0.9);
    g.strokePath();
  }

  private drawSquare(g: Phaser.GameObjects.Graphics, size: number, color: number, stroke: number): void {
    const s = size * 1.3;
    g.fillStyle(color, 1);
    g.fillRect(-s / 2, -s / 2, s, s);
    g.lineStyle(2, stroke, 0.9);
    g.strokeRect(-s / 2, -s / 2, s, s);
  }

  private drawHexagon(g: Phaser.GameObjects.Graphics, size: number, color: number, stroke: number): void {
    g.fillStyle(color, 1);
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const px = Math.cos(angle) * size;
      const py = Math.sin(angle) * size;
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.closePath();
    g.fillPath();
    g.lineStyle(2, stroke, 0.9);
    g.strokePath();
  }

  private updateHpBar(): void {
    this.hpBar.clear();
    const ratio = Math.max(0, this.hp / this.maxHp);
    const barColor = ratio > 0.5 ? 0x44ff44 : ratio > 0.25 ? 0xffff44 : 0xff4444;
    this.hpBar.fillStyle(barColor, 1);
    this.hpBar.fillRect(-16, 22, 32 * ratio, 5);
  }

  public setPosition(coord: HexCoord, animate: boolean = true): Promise<void> {
    return new Promise((resolve) => {
      this.coord = { ...coord };
      const { x, y } = this.board.hexToPixel(coord.q, coord.r);

      if (animate) {
        this.scene.tweens.add({
          targets: this.container,
          x,
          y,
          duration: 250,
          ease: 'Cubic.easeInOut',
          onComplete: () => resolve()
        });
      } else {
        this.container.setPosition(x, y);
        resolve();
      }
    });
  }

  public select(): void {
    this.scene.tweens.add({
      targets: this.container,
      scale: { from: 1, to: 1.15 },
      duration: 100,
      yoyo: true,
      ease: 'Back.easeOut'
    });
    this.glow.setAlpha(0.8);
  }

  public deselect(): void {
    this.glow.setAlpha(1);
  }

  public takeDamage(damage: number): Promise<void> {
    return new Promise((resolve) => {
      this.hp = Math.max(0, this.hp - damage);
      this.updateHpBar();

      this.scene.tweens.add({
        targets: this.container,
        scaleX: { from: 1, to: 0.85, yoyo: true },
        scaleY: { from: 1, to: 0.85, yoyo: true },
        duration: 150,
        repeat: 1,
        ease: 'Bounce.easeOut',
        onComplete: () => {
          if (this.hp <= 0) {
            this.die().then(resolve);
          } else {
            resolve();
          }
        }
      });

      this.emitHitParticles();
    });
  }

  private emitHitParticles(): void {
    const worldPos = {
      x: this.container.x,
      y: this.container.y
    };
    const colors = [0xff4444, 0xffffff, 0xffff44];

    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      const speed = 40 + Math.random() * 60;
      const color = Phaser.Utils.Array.GetRandom(colors);

      const particle = this.scene.add.circle(worldPos.x, worldPos.y, 3 + Math.random() * 2, color, 1);
      particle.setDepth(50);

      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      this.scene.tweens.add({
        targets: particle,
        x: worldPos.x + vx * 0.8,
        y: worldPos.y + vy * 0.8,
        alpha: { from: 1, to: 0 },
        scale: { from: 1, to: 0.2 },
        duration: 400 + Math.random() * 200,
        ease: 'Cubic.easeOut',
        onComplete: () => particle.destroy()
      });
    }
  }

  public die(): Promise<void> {
    return new Promise((resolve) => {
      this.isAlive = false;

      const worldPos = { x: this.container.x, y: this.container.y };
      const color = this.getPlayerColor();

      for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 50 + Math.random() * 100;
        const particle = this.scene.add.circle(worldPos.x, worldPos.y, 2 + Math.random() * 4, color, 1);
        particle.setDepth(50);

        this.scene.tweens.add({
          targets: particle,
          x: worldPos.x + Math.cos(angle) * speed,
          y: worldPos.y + Math.sin(angle) * speed,
          alpha: { from: 1, to: 0 },
          scale: { from: 1, to: 0 },
          duration: 600 + Math.random() * 400,
          ease: 'Cubic.easeOut',
          onComplete: () => particle.destroy()
        });
      }

      this.scene.tweens.add({
        targets: this.container,
        scale: { from: 1, to: 0 },
        alpha: { from: 1, to: 0 },
        duration: 400,
        ease: 'Cubic.easeIn',
        onComplete: () => {
          this.container.destroy();
          resolve();
        }
      });
    });
  }

  public playAttackAnimation(target: Unit): Promise<void> {
    return new Promise((resolve) => {
      const startX = this.container.x;
      const startY = this.container.y;
      const tx = target.container.x;
      const ty = target.container.y;
      const dx = tx - startX;
      const dy = ty - startY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const ratio = 35 / dist;
      const midX = startX + dx * (1 - ratio);
      const midY = startY + dy * (1 - ratio);

      this.scene.tweens.add({
        targets: this.container,
        x: midX,
        y: midY,
        duration: 150,
        ease: 'Cubic.easeOut',
        yoyo: true,
        hold: 50,
        onComplete: () => resolve()
      });

      this.emitAttackParticles(tx, ty);
    });
  }

  private emitAttackParticles(tx: number, ty: number): void {
    const sx = this.container.x;
    const sy = this.container.y;
    const color = this.getPlayerColor();

    for (let i = 0; i < 15; i++) {
      const t = i / 15;
      const delay = t * 200;
      const px = sx + (tx - sx) * t + (Math.random() - 0.5) * 10;
      const py = sy + (ty - sy) * t + (Math.random() - 0.5) * 10;

      this.scene.time.delayedCall(delay, () => {
        const particle = this.scene.add.circle(px, py, 2 + Math.random() * 2, color, 0.9);
        particle.setDepth(45);
        this.scene.tweens.add({
          targets: particle,
          alpha: { from: 1, to: 0 },
          scale: { from: 1, to: 0.3 },
          duration: 250,
          ease: 'Cubic.easeOut',
          onComplete: () => particle.destroy()
        });
      });
    }

    this.scene.time.delayedCall(320, () => {
      for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 30 + Math.random() * 80;
        const size = 2 + Math.random() * 4;
        const c = Math.random() < 0.5 ? 0xffffff : 0xffffaa;
        const flash = this.scene.add.circle(tx, ty, size, c, 1);
        flash.setDepth(48);

        this.scene.tweens.add({
          targets: flash,
          x: tx + Math.cos(angle) * speed,
          y: ty + Math.sin(angle) * speed,
          alpha: { from: 1, to: 0 },
          scale: { from: 1.5, to: 0 },
          duration: 400 + Math.random() * 200,
          ease: 'Cubic.easeOut',
          onComplete: () => flash.destroy()
        });
      }

      const bigFlash = this.scene.add.circle(tx, ty, 30, 0xffffff, 0.8);
      bigFlash.setDepth(47);
      this.scene.tweens.add({
        targets: bigFlash,
        scale: { from: 0.5, to: 2 },
        alpha: { from: 0.9, to: 0 },
        duration: 300,
        ease: 'Cubic.easeOut',
        onComplete: () => bigFlash.destroy()
      });
    });
  }

  public emitMoveParticles(fromX: number, fromY: number, toX: number, toY: number): void {
    const color = this.getPlayerColor();

    for (let i = 0; i < 10; i++) {
      const t = i / 10;
      const px = fromX + (toX - fromX) * t;
      const py = fromY + (toY - fromY) * t;
      const offsetX = (Math.random() - 0.5) * 15;
      const offsetY = (Math.random() - 0.5) * 15;

      const particle = this.scene.add.circle(px + offsetX, py + offsetY, 2 + Math.random() * 2, color, 0.8);
      particle.setDepth(40);

      this.scene.tweens.add({
        targets: particle,
        alpha: { from: 0.9, to: 0 },
        scale: { from: 1, to: 0.3 },
        duration: 400,
        delay: t * 100,
        ease: 'Cubic.easeOut',
        onComplete: () => particle.destroy()
      });
    }
  }

  public startNewTurn(): void {
    this.hasMoved = false;
    this.hasAttacked = false;
  }

  public getMoveTargets(occupiedPositions: Set<string>): HexCoord[] {
    const cellsInRange = this.board.getCellsWithinRange(this.coord.q, this.coord.r, this.moveRange);
    return cellsInRange.filter(c =>
      this.board.canStandOn(c.q, c.r, this.playerId, occupiedPositions)
    );
  }

  public getAttackTargets(units: Unit[]): Unit[] {
    const targets: Unit[] = [];
    const inRange = this.board.getCellsWithinRange(this.coord.q, this.coord.r, this.attackRange);
    for (const coord of inRange) {
      const key = Board.coordKey(coord.q, coord.r);
      const target = units.find(u =>
        u.isAlive &&
        u.playerId !== this.playerId &&
        Board.coordKey(u.coord.q, u.coord.r) === key
      );
      if (target) targets.push(target);
    }
    return targets;
  }

  public destroy(): void {
    if (this.container && this.container.active) {
      this.container.destroy();
    }
  }
}
