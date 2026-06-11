import { LakeRenderer } from './lake';
import { Creature, CreatureSystem, RARITY_CONFIG, Rarity } from './creature';

export type FishingState = 'idle' | 'aiming' | 'charging' | 'throwing' | 'floating' | 'biting' | 'reeling' | 'catching' | 'result';

export interface CastTrajectory {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  progress: number;
  duration: number;
  startTime: number;
}

export interface ReelAnimation {
  creature: Creature;
  progress: number;
  duration: number;
  startTime: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  coneStartTime: number;
  particlesSpawned: boolean;
}

export interface ChargeState {
  isCharging: boolean;
  startTime: number;
  power: number;
  mouseX: number;
  mouseY: number;
}

export class FishingSystem {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private lake: LakeRenderer;
  private creatureSystem: CreatureSystem;

  private state: FishingState = 'idle';
  private width: number = 0;
  private height: number = 0;

  private charge: ChargeState = {
    isCharging: false,
    startTime: 0,
    power: 0,
    mouseX: 0,
    mouseY: 0
  };

  private trajectory: CastTrajectory | null = null;
  private reelAnim: ReelAnimation | null = null;

  private currentCreature: Creature | null = null;
  private biteStartTime: number = 0;
  private nextBiteTime: number = 0;

  private lastCatch: Creature | null = null;
  private catchResultStartTime: number = 0;

  private touchSensitivity: number = 1;

  private score: number = 0;
  private totalCaught: number = 0;
  private caughtRarities: Record<Rarity, number> = {
    common: 0, rare: 0, epic: 0, legendary: 0, mythical: 0
  };

  constructor(canvas: HTMLCanvasElement, lake: LakeRenderer, creatureSystem: CreatureSystem) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.lake = lake;
    this.creatureSystem = creatureSystem;
    this.resize();
    this.updateTouchSensitivity();
  }

  resize(): void {
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    this.updateTouchSensitivity();
  }

  private updateTouchSensitivity(): void {
    this.touchSensitivity = window.innerWidth < 768 ? 1.5 : 1;
  }

  getState(): FishingState {
    return this.state;
  }

  getScore(): number {
    return this.score;
  }

  getTotalCaught(): number {
    return this.totalCaught;
  }

  getCaughtRarities(): Record<Rarity, number> {
    return { ...this.caughtRarities };
  }

  getLastCatch(): Creature | null {
    return this.lastCatch;
  }

  getChargePower(): number {
    return this.charge.power;
  }

  getChargePosition(): { x: number; y: number } | null {
    if (!this.charge.isCharging) return null;
    return { x: this.charge.mouseX, y: this.charge.mouseY };
  }

  getCatchResult(): { creature: Creature; startTime: number } | null {
    if (this.state !== 'result' || !this.lastCatch) return null;
    return { creature: this.lastCatch, startTime: this.catchResultStartTime };
  }

  clearCatchResult(): void {
    if (this.state === 'result') {
      this.state = 'idle';
      this.lastCatch = null;
    }
  }

  startCharging(x: number, y: number): void {
    if (this.state !== 'idle') return;

    const adjustedX = x * this.touchSensitivity;
    const adjustedY = y * this.touchSensitivity;

    this.state = 'charging';
    this.charge = {
      isCharging: true,
      startTime: Date.now(),
      power: 0,
      mouseX: adjustedX,
      mouseY: adjustedY
    };
  }

  updateChargePosition(x: number, y: number): void {
    if (this.charge.isCharging) {
      this.charge.mouseX = x * this.touchSensitivity;
      this.charge.mouseY = y * this.touchSensitivity;
    }
  }

  releaseCast(): void {
    if (!this.charge.isCharging || this.state !== 'charging') return;

    const power = this.charge.power;
    const startX = this.width / 2;
    const startY = this.height - 100;

    const maxDistance = Math.min(this.width, this.height) * 0.8;
    const distance = maxDistance * power;

    const angle = Math.atan2(
      this.charge.mouseY - startY,
      this.charge.mouseX - startX
    );

    const endX = Math.max(100, Math.min(this.width - 100, startX + Math.cos(angle) * distance));
    const endY = Math.max(this.height * 0.3, Math.min(this.height * 0.7, startY + Math.sin(angle) * distance));

    this.trajectory = {
      startX,
      startY,
      endX,
      endY,
      progress: 0,
      duration: 800 + power * 400,
      startTime: Date.now()
    };

    this.state = 'throwing';
    this.charge.isCharging = false;
    this.charge.power = 0;
  }

  reelIn(): boolean {
    if (this.state !== 'biting') return false;

    const timeSinceBite = Date.now() - this.biteStartTime;
    if (timeSinceBite > 800) {
      this.escape();
      return false;
    }

    if (!this.currentCreature) return false;

    this.lake.stopBite();
    this.state = 'reeling';

    const float = this.lake.getFloat();
    if (!float) return false;

    this.reelAnim = {
      creature: this.currentCreature,
      progress: 0,
      duration: 1200,
      startTime: Date.now(),
      startX: float.x,
      startY: float.y,
      endX: this.width / 2,
      endY: this.height / 2 - 50,
      coneStartTime: Date.now(),
      particlesSpawned: false
    };

    this.lake.removeFloat();
    return true;
  }

  private escape(): void {
    this.lake.stopBite();
    this.state = 'idle';
    this.currentCreature = null;
    this.lake.removeFloat();
  }

  private triggerBite(): void {
    if (this.state !== 'floating') return;

    this.currentCreature = this.creatureSystem.generateCreature();
    this.state = 'biting';
    this.biteStartTime = Date.now();
    this.lake.startBite();
  }

  update(_deltaTime: number, currentTime: number): void {
    if (this.charge.isCharging) {
      const chargeElapsed = currentTime - this.charge.startTime;
      this.charge.power = Math.min(1, chargeElapsed / 1500);
    }

    switch (this.state) {
      case 'throwing':
        this.updateThrow(currentTime);
        break;
      case 'floating':
        this.updateFloating(currentTime);
        break;
      case 'biting':
        this.updateBiting(currentTime);
        break;
      case 'reeling':
        this.updateReeling(currentTime);
        break;
      case 'result':
        if (currentTime - this.catchResultStartTime > 3000) {
          this.state = 'idle';
          this.lastCatch = null;
        }
        break;
    }
  }

  private updateThrow(currentTime: number): void {
    if (!this.trajectory) return;

    const elapsed = currentTime - this.trajectory.startTime;
    this.trajectory.progress = Math.min(1, elapsed / this.trajectory.duration);

    if (this.trajectory.progress >= 1) {
      this.lake.setFloat(this.trajectory.endX, this.trajectory.endY);
      this.lake.addSplash(this.trajectory.endX, this.trajectory.endY, 15);
      this.lake.addRipple(this.trajectory.endX, this.trajectory.endY, 100, 2000);

      this.state = 'floating';
      this.floatingStartTime = currentTime;
      this.nextBiteTime = currentTime + 2000 + Math.random() * 5000;
      this.trajectory = null;
    }
  }

  private updateFloating(currentTime: number): void {
    if (currentTime >= this.nextBiteTime) {
      this.triggerBite();
    }
  }

  private updateBiting(currentTime: number): void {
    const timeSinceBite = currentTime - this.biteStartTime;
    if (timeSinceBite > 800) {
      this.escape();
    }
  }

  private updateReeling(currentTime: number): void {
    if (!this.reelAnim) return;

    const elapsed = currentTime - this.reelAnim.startTime;
    this.reelAnim.progress = Math.min(1, elapsed / this.reelAnim.duration);

    const coneProgress = Math.min(1, (currentTime - this.reelAnim.coneStartTime) / 400);
    this.lake.renderWaterCone(this.reelAnim.startX, this.reelAnim.startY, coneProgress);

    if (!this.reelAnim.particlesSpawned && this.reelAnim.progress > 0.15) {
      this.lake.addSplash(
        this.reelAnim.startX,
        this.reelAnim.startY - 20,
        30,
        this.reelAnim.creature.particleColor
      );
      this.reelAnim.particlesSpawned = true;
    }

    if (this.reelAnim.progress >= 1) {
      this.completeCatch();
    }
  }

  private completeCatch(): void {
    if (!this.reelAnim || !this.currentCreature) return;

    this.creatureSystem.collectCreature(this.currentCreature);
    this.score += this.currentCreature.score;
    this.totalCaught++;
    this.caughtRarities[this.currentCreature.rarity]++;

    this.lastCatch = this.currentCreature;
    this.catchResultStartTime = Date.now();
    this.state = 'result';

    this.reelAnim = null;
    this.currentCreature = null;
  }

  render(): void {
    if (this.charge.isCharging) {
      this.renderChargeBar();
      this.renderAimLine();
    }

    if (this.state === 'throwing' && this.trajectory) {
      this.renderThrowingFloat();
    }

    if (this.state === 'reeling' && this.reelAnim) {
      this.renderReelingCreature();
    }
  }

  private renderChargeBar(): void {
    const ctx = this.ctx;
    const x = this.charge.mouseX;
    const y = this.charge.mouseY - 40;
    const width = 80;
    const height = 8;

    ctx.save();

    ctx.fillStyle = 'rgba(10, 25, 47, 0.8)';
    ctx.strokeStyle = 'rgba(100, 255, 218, 0.5)';
    ctx.lineWidth = 1;
    this.roundRect(ctx, x - width / 2, y - height / 2, width, height, 4);
    ctx.fill();
    ctx.stroke();

    const gradient = ctx.createLinearGradient(x - width / 2, 0, x + width / 2, 0);
    gradient.addColorStop(0, '#64ffda');
    gradient.addColorStop(1, '#fbbf24');
    ctx.fillStyle = gradient;
    this.roundRect(ctx, x - width / 2 + 1, y - height / 2 + 1, (width - 2) * this.charge.power, height - 2, 3);
    ctx.fill();

    ctx.fillStyle = '#64ffda';
    ctx.font = '12px "Microsoft YaHei"';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(this.charge.power * 100)}%`, x, y - 10);

    ctx.restore();
  }

  private renderAimLine(): void {
    const ctx = this.ctx;
    const startX = this.width / 2;
    const startY = this.height - 100;
    const endX = this.charge.mouseX;
    const endY = this.charge.mouseY;

    ctx.save();
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = `rgba(100, 255, 218, ${0.3 + this.charge.power * 0.5})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(100, 255, 218, 0.5)';
    ctx.beginPath();
    ctx.arc(endX, endY, 15 + this.charge.power * 20, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private renderThrowingFloat(): void {
    if (!this.trajectory) return;

    const ctx = this.ctx;
    const t = this.trajectory.progress;
    const height = 200 * Math.sin(t * Math.PI);

    const x = this.trajectory.startX + (this.trajectory.endX - this.trajectory.startX) * t;
    const y = this.trajectory.startY + (this.trajectory.endY - this.trajectory.startY) * t - height;

    ctx.save();
    ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(x, y - 12);
    ctx.quadraticCurveTo(x + 8, y, x, y + 12);
    ctx.quadraticCurveTo(x - 8, y, x, y - 12);
    ctx.fill();
    ctx.restore();

    if (t > 0.3 && t < 0.95 && Math.random() > 0.7) {
      this.lake.addSplash(x, y + 10, 2, 'rgba(100, 255, 218, 0.6)');
    }
  }

  private renderReelingCreature(): void {
    if (!this.reelAnim) return;

    const ctx = this.ctx;
    const t = this.reelAnim.progress;
    const easeOut = 1 - Math.pow(1 - t, 3);
    const bounce = Math.sin(t * Math.PI * 2) * (1 - t) * 20;

    const x = this.reelAnim.startX + (this.reelAnim.endX - this.reelAnim.startX) * easeOut;
    const y = this.reelAnim.startY + (this.reelAnim.endY - this.reelAnim.startY) * easeOut - 100 * Math.sin(t * Math.PI) + bounce;

    const creature = this.reelAnim.creature;
    const size = creature.size * (0.5 + t * 0.5);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(t * Math.PI * 4) * 0.2 * (1 - t));

    if (t > 0.8) {
      const flashIntensity = (t - 0.8) / 0.2;
      ctx.shadowColor = RARITY_CONFIG[creature.rarity].color;
      ctx.shadowBlur = 30 * flashIntensity;
    } else {
      ctx.shadowColor = creature.glowColor;
      ctx.shadowBlur = 15;
    }

    this.drawCreature(ctx, creature, size);

    ctx.restore();
  }

  private drawCreature(ctx: CanvasRenderingContext2D, creature: Creature, size: number): void {
    let fillColor = creature.color;
    if (creature.rarity === 'mythical') {
      const gradient = ctx.createLinearGradient(-size / 2, -size / 2, size / 2, size / 2);
      gradient.addColorStop(0, '#ff6b6b');
      gradient.addColorStop(1, '#ff4757');
      fillColor = gradient as unknown as string;
    }

    ctx.fillStyle = fillColor;
    ctx.strokeStyle = RARITY_CONFIG[creature.rarity].color;
    ctx.lineWidth = 2;

    switch (creature.type) {
      case 'ghostFish':
        this.drawGhostFish(ctx, size);
        break;
      case 'treasureChest':
        this.drawTreasureChest(ctx, size);
        break;
      case 'woodSpirit':
        this.drawWoodSpirit(ctx, size);
        break;
      case 'abyssLord':
        this.drawAbyssLord(ctx, size);
        break;
      case 'starJellyfish':
        this.drawStarJellyfish(ctx, size);
        break;
    }
  }

  private drawGhostFish(ctx: CanvasRenderingContext2D, size: number): void {
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.ellipse(0, 0, size / 2, size / 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-size / 2, 0);
    ctx.lineTo(-size / 2 - size / 6, -size / 4);
    ctx.lineTo(-size / 2 - size / 6, size / 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0a192f';
    ctx.beginPath();
    ctx.arc(size / 6, -size / 10, size / 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  private drawTreasureChest(ctx: CanvasRenderingContext2D, size: number): void {
    ctx.fillRect(-size / 2, -size / 4, size, size / 2);
    ctx.strokeRect(-size / 2, -size / 4, size, size / 2);

    ctx.beginPath();
    ctx.moveTo(-size / 2, -size / 4);
    ctx.quadraticCurveTo(0, -size / 2 - size / 8, size / 2, -size / 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-size / 12, -size / 8, size / 6, size / 4);
    ctx.strokeRect(-size / 12, -size / 8, size / 6, size / 4);
  }

  private drawWoodSpirit(ctx: CanvasRenderingContext2D, size: number): void {
    ctx.beginPath();
    ctx.ellipse(0, 0, size / 3, size / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(2, 12, 27, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(0, 0, size / 4 - i * size / 10, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = '#0a192f';
    ctx.beginPath();
    ctx.arc(-size / 8, -size / 6, size / 16, 0, Math.PI * 2);
    ctx.arc(size / 8, -size / 6, size / 16, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawAbyssLord(ctx: CanvasRenderingContext2D, size: number): void {
    ctx.beginPath();
    ctx.ellipse(0, 0, size / 2, size / 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6;
      const tentacleLength = size * 0.6;
      const wave = Math.sin(Date.now() / 200 + i) * 5;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * size / 3, Math.sin(angle) * size / 3);
      ctx.quadraticCurveTo(
        Math.cos(angle) * tentacleLength * 0.5,
        Math.sin(angle) * tentacleLength * 0.5 + wave,
        Math.cos(angle) * tentacleLength,
        Math.sin(angle) * tentacleLength
      );
      ctx.lineWidth = 4;
      ctx.stroke();
    }

    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(-size / 6, -size / 12, size / 10, 0, Math.PI * 2);
    ctx.arc(size / 6, -size / 12, size / 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0a192f';
    ctx.beginPath();
    ctx.arc(-size / 6, -size / 12, size / 16, 0, Math.PI * 2);
    ctx.arc(size / 6, -size / 12, size / 16, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawStarJellyfish(ctx: CanvasRenderingContext2D, size: number): void {
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.ellipse(0, -size / 6, size / 2, size / 3, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(251, 191, 36, 0.8)';
    for (let i = 0; i < 5; i++) {
      const px = (Math.random() - 0.5) * size * 0.6;
      const py = (Math.random() - 0.5) * size * 0.3;
      ctx.beginPath();
      ctx.arc(px, py, size / 20, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const x = -size / 3 + (i * size) / 12;
      const wave = Math.sin(Date.now() / 300 + i) * 5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.quadraticCurveTo(x + wave, size / 3, x, size / 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  renderCatchResult(): void {
    if (this.state !== 'result' || !this.lastCatch) return;

    const ctx = this.ctx;
    const creature = this.lastCatch;
    const elapsed = Date.now() - this.catchResultStartTime;
    const progress = Math.min(1, elapsed / 500);

    ctx.save();
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    const bgAlpha = Math.min(0.7, progress * 0.7);
    ctx.fillStyle = `rgba(10, 25, 47, ${bgAlpha})`;
    ctx.fillRect(0, 0, this.width, this.height);

    const scale = 0.5 + progress * 0.5;
    ctx.translate(centerX, centerY);
    ctx.scale(scale, scale);

    const rarityConfig = RARITY_CONFIG[creature.rarity];
    ctx.shadowColor = rarityConfig.color;
    ctx.shadowBlur = 40 * progress;

    const displaySize = Math.min(this.width, this.height) * 0.15;

    let fillColor = creature.color;
    if (creature.rarity === 'mythical') {
      const gradient = ctx.createLinearGradient(-displaySize / 2, -displaySize / 2, displaySize / 2, displaySize / 2);
      gradient.addColorStop(0, '#ff6b6b');
      gradient.addColorStop(1, '#ff4757');
      fillColor = gradient as unknown as string;
    }

    ctx.fillStyle = fillColor;
    ctx.strokeStyle = rarityConfig.color;
    ctx.lineWidth = 3;

    this.drawCreature(ctx, { ...creature, size: displaySize }, displaySize);

    ctx.shadowBlur = 0;
    ctx.fillStyle = rarityConfig.color;
    ctx.font = 'bold 28px "Microsoft YaHei"';
    ctx.textAlign = 'center';
    ctx.fillText(creature.name, 0, displaySize / 2 + 50);

    ctx.fillStyle = '#8892b0';
    ctx.font = '16px "Microsoft YaHei"';
    ctx.fillText(`稀有度: ${rarityConfig.name}`, 0, displaySize / 2 + 80);

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 24px "Microsoft YaHei"';
    ctx.fillText(`+${creature.score} 分`, 0, displaySize / 2 + 115);

    ctx.restore();
  }
}
