import Phaser from 'phaser';
import { Rover } from '../objects/Rover';
import { Crystal } from '../objects/Crystal';
import { DustStorm } from '../effects/DustStorm';
import { MeteorRain, ExplosionEvent } from '../effects/MeteorRain';

interface GoldParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export class GameScene extends Phaser.Scene {
  private terrain!: Phaser.GameObjects.Graphics;
  private terrainHeights!: Float32Array;
  
  private rover!: Rover;
  private crystals: Crystal[] = [];
  
  private dustStorm!: DustStorm;
  private meteorRain!: MeteorRain;
  
  private uiContainer!: Phaser.GameObjects.Container;
  private crystalCountText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  
  private crystalCollected: number = 0;
  private crystalsForUpgrade: number = 3;
  
  private stormCooldown: number = 0;
  private readonly STORM_MIN_INTERVAL: number = 20000;
  private readonly STORM_MAX_INTERVAL: number = 30000;
  
  private postStormDelay: number = 0;
  private meteorRainPending: boolean = false;
  private readonly POST_STORM_METEOR_DELAY: number = 5000;
  private readonly METEOR_CHANCE: number = 0.4;
  
  private goldParticles: GoldParticle[] = [];
  private readonly MAX_PARTICLES: number = 300;
  
  private frameCount: number = 0;
  
  private readonly CANVAS_WIDTH: number = 1200;
  private readonly CANVAS_HEIGHT: number = 800;
  private readonly CELL_SIZE: number = 4;
  private readonly COLS: number = 300;
  private readonly ROWS: number = 200;
  
  constructor() {
    super({ key: 'GameScene' });
  }
  
  preload(): void {
  }
  
  create(): void {
    this.createBackground();
    this.generateTerrain();
    this.createBorder();
    
    this.rover = new Rover(this, this.CANVAS_WIDTH / 2, this.CANVAS_HEIGHT / 2);
    this.rover.setTerrainHeights(this.terrainHeights);
    this.rover.setDepth(500);
    
    this.crystals = [];
    this.spawnInitialCrystals(6);
    
    this.dustStorm = new DustStorm(this);
    this.meteorRain = new MeteorRain(this);
    
    this.meteorRain.onExplosion = (event: ExplosionEvent) => {
      this.onRoverHitByExplosion(event);
    };
    
    this.createUI();
    
    this.stormCooldown = this.STORM_MIN_INTERVAL + 
      Math.random() * (this.STORM_MAX_INTERVAL - this.STORM_MIN_INTERVAL);
  }
  
  private createBackground(): void {
    const bg = this.add.graphics();
    
    const gradientSteps = 20;
    const color1 = Phaser.Display.Color.HexStringToColor('#2B0000');
    const color2 = Phaser.Display.Color.HexStringToColor('#1A0A0A');
    
    for (let i = 0; i < gradientSteps; i++) {
      const t = i / gradientSteps;
      const r = Math.round(color1.r + (color2.r - color1.r) * t);
      const g = Math.round(color1.g + (color2.g - color1.g) * t);
      const b = Math.round(color1.b + (color2.b - color1.b) * t);
      const color = (r << 16) | (g << 8) | b;
      
      const y = (this.CANVAS_HEIGHT / gradientSteps) * i;
      bg.fillStyle(color, 1);
      bg.fillRect(0, y, this.CANVAS_WIDTH, this.CANVAS_HEIGHT / gradientSteps + 1);
    }
    
    bg.setDepth(-100);
  }
  
  private generateTerrain(): void {
    this.terrainHeights = new Float32Array(this.COLS * this.ROWS);
    
    const perm = this.generatePermutation();
    
    for (let row = 0; row < this.ROWS; row++) {
      for (let col = 0; col < this.COLS; col++) {
        const x = col / this.COLS;
        const y = row / this.ROWS;
        
        let height = 0;
        let amplitude = 1;
        let frequency = 1;
        let maxHeight = 0;
        
        for (let octave = 0; octave < 5; octave++) {
          height += this.perlinNoise(x * frequency * 4, y * frequency * 4, perm) * amplitude;
          maxHeight += amplitude;
          amplitude *= 0.5;
          frequency *= 2;
        }
        
        height = (height / maxHeight + 1) / 2;
        this.terrainHeights[row * this.COLS + col] = height * 100;
      }
    }
    
    this.smoothTerrain();
    
    this.terrain = this.add.graphics();
    this.terrain.setDepth(0);
    this.renderTerrain();
  }
  
  private generatePermutation(): number[] {
    const p: number[] = [];
    for (let i = 0; i < 256; i++) {
      p[i] = i;
    }
    
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    
    const perm: number[] = [];
    for (let i = 0; i < 512; i++) {
      perm[i] = p[i & 255];
    }
    
    return perm;
  }
  
  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }
  
  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }
  
  private grad(hash: number, x: number, y: number): number {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }
  
  private perlinNoise(x: number, y: number, perm: number[]): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    
    x -= Math.floor(x);
    y -= Math.floor(y);
    
    const u = this.fade(x);
    const v = this.fade(y);
    
    const A = perm[X] + Y;
    const B = perm[X + 1] + Y;
    
    return this.lerp(
      this.lerp(this.grad(perm[A], x, y), this.grad(perm[B], x - 1, y), u),
      this.lerp(this.grad(perm[A + 1], x, y - 1), this.grad(perm[B + 1], x - 1, y - 1), u),
      v
    );
  }
  
  private smoothTerrain(): void {
    const smoothed = new Float32Array(this.terrainHeights.length);
    
    for (let i = 0; i < 3; i++) {
      for (let row = 0; row < this.ROWS; row++) {
        for (let col = 0; col < this.COLS; col++) {
          let sum = 0;
          let count = 0;
          
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const nr = row + dr;
              const nc = col + dc;
              if (nr >= 0 && nr < this.ROWS && nc >= 0 && nc < this.COLS) {
                const src = i === 0 ? this.terrainHeights : smoothed;
                const diff = Math.abs(src[row * this.COLS + col] - src[nr * this.COLS + nc]);
                if (diff <= 3 || i > 0) {
                  sum += src[nr * this.COLS + nc];
                  count++;
                }
              }
            }
          }
          
          smoothed[row * this.COLS + col] = sum / count;
        }
      }
      
      if (i === 0) {
        this.terrainHeights.set(smoothed);
      }
    }
  }
  
  private renderTerrain(): void {
    const g = this.terrain;
    g.clear();
    
    const colorDeep = Phaser.Display.Color.HexStringToColor('#8B0000');
    const colorLight = Phaser.Display.Color.HexStringToColor('#FF4500');
    
    let minH = Infinity;
    let maxH = -Infinity;
    for (let i = 0; i < this.terrainHeights.length; i++) {
      minH = Math.min(minH, this.terrainHeights[i]);
      maxH = Math.max(maxH, this.terrainHeights[i]);
    }
    
    for (let row = 0; row < this.ROWS; row++) {
      for (let col = 0; col < this.COLS; col++) {
        const h = this.terrainHeights[row * this.COLS + col];
        const t = (h - minH) / (maxH - minH);
        
        const r = Math.round(colorDeep.r + (colorLight.r - colorDeep.r) * t);
        const gVal = Math.round(colorDeep.g + (colorLight.g - colorDeep.g) * t);
        const b = Math.round(colorDeep.b + (colorLight.b - colorDeep.b) * t);
        
        let color = (r << 16) | (gVal << 8) | b;
        
        const hash = Math.sin(col * 12.9898 + row * 78.233) * 43758.5453;
        const noiseVal = hash - Math.floor(hash);
        
        if (noiseVal > 0.92) {
          color = Phaser.Display.Color.GetColor(
            Math.min(255, r + 30),
            Math.min(255, gVal + 20),
            Math.min(255, b + 10)
          );
        } else if (noiseVal < 0.08) {
          color = Phaser.Display.Color.GetColor(
            Math.max(0, r - 40),
            Math.max(0, gVal - 20),
            Math.max(0, b - 10)
          );
        }
        
        g.fillStyle(color, 1);
        g.fillRect(col * this.CELL_SIZE, row * this.CELL_SIZE, this.CELL_SIZE, this.CELL_SIZE);
      }
    }
    
    const rockSpots = 60;
    for (let i = 0; i < rockSpots; i++) {
      const rx = Math.floor(Math.random() * this.COLS) * this.CELL_SIZE;
      const ry = Math.floor(Math.random() * this.ROWS) * this.CELL_SIZE;
      const rockSize = 2 + Math.floor(Math.random() * 4);
      
      const rockColor = Math.random() > 0.5 ? 0x2a0000 : 0x4a1500;
      g.fillStyle(rockColor, 0.7);
      
      for (let j = 0; j < rockSize; j++) {
        const ox = (Math.random() - 0.5) * rockSize * this.CELL_SIZE;
        const oy = (Math.random() - 0.5) * rockSize * this.CELL_SIZE;
        g.fillCircle(rx + ox, ry + oy, 2 + Math.random() * 4);
      }
    }
  }
  
  private createBorder(): void {
    const border = this.add.graphics();
    border.setDepth(1000);
    
    border.lineStyle(2, 0xC0C0C0, 1);
    border.strokeRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT);
    
    border.lineStyle(1, 0x808080, 0.5);
    border.strokeRect(2, 2, this.CANVAS_WIDTH - 4, this.CANVAS_HEIGHT - 4);
    
    border.fillStyle(0xC0C0C0, 0.15);
    border.fillRect(0, 0, this.CANVAS_WIDTH, 2);
    border.fillRect(0, 0, 2, this.CANVAS_HEIGHT);
  }
  
  private findLowAreas(count: number): Array<{ x: number; y: number }> {
    const spots: Array<{ x: number; y: number; h: number }> = [];
    
    const sampleStep = 8;
    for (let row = 4; row < this.ROWS - 4; row += sampleStep) {
      for (let col = 4; col < this.COLS - 4; col += sampleStep) {
        const centerH = this.terrainHeights[row * this.COLS + col];
        let isLow = true;
        let sumNeighbor = 0;
        let neighborCount = 0;
        
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = row + dr;
            const nc = col + dc;
            const nh = this.terrainHeights[nr * this.COLS + nc];
            sumNeighbor += nh;
            neighborCount++;
            if (nh < centerH) {
              isLow = false;
              break;
            }
          }
          if (!isLow) break;
        }
        
        if (isLow) {
          const avgNeighbor = sumNeighbor / neighborCount;
          const depth = avgNeighbor - centerH;
          if (depth >= 2) {
            spots.push({
              x: col * this.CELL_SIZE + this.CELL_SIZE / 2,
              y: row * this.CELL_SIZE + this.CELL_SIZE / 2,
              h: depth
            });
          }
        }
      }
    }
    
    spots.sort((a, b) => b.h - a.h);
    
    const result: Array<{ x: number; y: number }> = [];
    for (const spot of spots) {
      let tooClose = false;
      for (const r of result) {
        const dist = Phaser.Math.Distance.Between(spot.x, spot.y, r.x, r.y);
        if (dist < 100) {
          tooClose = true;
          break;
        }
      }
      
      const distToCenter = Phaser.Math.Distance.Between(
        spot.x, spot.y, this.CANVAS_WIDTH / 2, this.CANVAS_HEIGHT / 2
      );
      if (distToCenter < 80) {
        tooClose = true;
      }
      
      if (!tooClose) {
        result.push({ x: spot.x, y: spot.y });
        if (result.length >= count * 2) break;
      }
    }
    
    while (result.length < count) {
      const rx = 80 + Math.random() * (this.CANVAS_WIDTH - 160);
      const ry = 80 + Math.random() * (this.CANVAS_HEIGHT - 160);
      result.push({ x: rx, y: ry });
    }
    
    return result.slice(0, count);
  }
  
  private spawnInitialCrystals(count: number): void {
    const positions = this.findLowAreas(count);
    for (const pos of positions) {
      this.spawnCrystal(pos.x, pos.y);
    }
  }
  
  private spawnCrystal(x: number, y: number): void {
    const crystal = new Crystal(this, x, y);
    crystal.setDepth(100);
    this.crystals.push(crystal);
  }
  
  private spawnRandomCrystal(): void {
    const positions = this.findLowAreas(1);
    if (positions.length > 0) {
      this.spawnCrystal(positions[0].x, positions[0].y);
    } else {
      const rx = 80 + Math.random() * (this.CANVAS_WIDTH - 160);
      const ry = 80 + Math.random() * (this.CANVAS_HEIGHT - 160);
      this.spawnCrystal(rx, ry);
    }
  }
  
  private createUI(): void {
    this.uiContainer = this.add.container();
    this.uiContainer.setDepth(999);
    
    this.createCrystalIcon(30, 30);
    
    this.crystalCountText = this.add.text(64, 18, '0', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '20px',
      color: '#FFFFFF',
      fontStyle: 'bold'
    });
    this.crystalCountText.setStroke('#000000', 2);
    this.crystalCountText.setDepth(999);
    this.uiContainer.add(this.crystalCountText);
    
    this.levelText = this.add.text(this.CANVAS_WIDTH - 40, 18, 'I', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '20px',
      color: '#FFD700',
      fontStyle: 'bold'
    });
    this.levelText.setOrigin(1, 0);
    this.levelText.setStroke('#000000', 2);
    this.levelText.setDepth(999);
    this.uiContainer.add(this.levelText);
    
    const levelLabel = this.add.text(this.CANVAS_WIDTH - 50, 42, 'LV', {
      fontFamily: 'Courier New, Courier, monospace',
      fontSize: '12px',
      color: '#FFD700',
      fontStyle: 'bold'
    });
    levelLabel.setOrigin(1, 0);
    levelLabel.setStroke('#000000', 1);
    levelLabel.setDepth(999);
    this.uiContainer.add(levelLabel);
    
    this.createControlHints();
  }
  
  private createCrystalIcon(x: number, y: number): void {
    const g = this.add.graphics();
    g.setPosition(x, y);
    g.setDepth(999);
    
    g.fillStyle(0x00ff7f, 0.6);
    g.fillCircle(12, 12, 14);
    g.fillStyle(0x00bfff, 0.4);
    g.fillCircle(12, 12, 10);
    
    const s = 10;
    g.fillStyle(0x00ff7f, 1);
    g.beginPath();
    g.moveTo(12, 12 - s * 1.2);
    g.lineTo(12 + s, 12);
    g.lineTo(12, 12 + s * 1.2);
    g.lineTo(12 - s, 12);
    g.closePath();
    g.fillPath();
    
    g.lineStyle(1.5, 0xffffff, 0.8);
    g.beginPath();
    g.moveTo(12, 12 - s * 1.2);
    g.lineTo(12 + s, 12);
    g.lineTo(12, 12 + s * 1.2);
    g.lineTo(12 - s, 12);
    g.closePath();
    g.strokePath();
    
    g.fillStyle(0xffffff, 0.5);
    g.fillEllipse(10, 7, 2, 5);
    
    this.uiContainer.add(g);
  }
  
  private createControlHints(): void {
    const baseX = 20;
    const baseY = this.CANVAS_HEIGHT - 100;
    const alpha = 0.6;
    
    const drawArrow = (x: number, y: number, angle: number) => {
      const g = this.add.graphics();
      g.setPosition(x, y);
      g.setDepth(999);
      g.setAlpha(alpha);
      g.save();
      g.rotate(angle);
      
      g.lineStyle(2, 0xffffff, 1);
      g.fillStyle(0xffffff, 0.3);
      
      g.fillRoundedRect(-12, -12, 24, 24, 4);
      g.strokeRoundedRect(-12, -12, 24, 24, 4);
      
      g.lineStyle(2, 0xffffff, 1);
      g.beginPath();
      g.moveTo(0, -6);
      g.lineTo(6, 2);
      g.lineTo(2, 2);
      g.lineTo(2, 8);
      g.lineTo(-2, 8);
      g.lineTo(-2, 2);
      g.lineTo(-6, 2);
      g.closePath();
      g.strokePath();
      
      g.fillStyle(0xffffff, 0.8);
      g.beginPath();
      g.moveTo(0, -6);
      g.lineTo(6, 2);
      g.lineTo(2, 2);
      g.lineTo(2, 8);
      g.lineTo(-2, 8);
      g.lineTo(-2, 2);
      g.lineTo(-6, 2);
      g.closePath();
      g.fillPath();
      
      g.restore();
      this.uiContainer.add(g);
    };
    
    drawArrow(baseX + 28, baseY, 0);
    drawArrow(baseX, baseY + 28, Math.PI / 2);
    drawArrow(baseX + 28, baseY + 28, Math.PI);
    drawArrow(baseX + 56, baseY + 28, -Math.PI / 2);
    
    const hintText = this.add.text(baseX + 90, baseY + 14, '方向键移动', {
      fontFamily: 'Courier New, Courier, monospace',
      fontSize: '14px',
      color: '#ffffff'
    });
    hintText.setAlpha(alpha);
    hintText.setDepth(999);
    this.uiContainer.add(hintText);
    
    const spaceHint = this.add.text(baseX + 90, baseY + 38, '空格键采集', {
      fontFamily: 'Courier New, Courier, monospace',
      fontSize: '14px',
      color: '#ffffff'
    });
    spaceHint.setAlpha(alpha);
    spaceHint.setDepth(999);
    this.uiContainer.add(spaceHint);
  }
  
  private updateCrystalCount(): void {
    this.crystalCountText.setText(this.crystalCollected.toString());
  }
  
  private updateLevel(): void {
    const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
    const level = this.rover.getLevel();
    this.levelText.setText(romanNumerals[Math.min(level - 1, romanNumerals.length - 1)]);
  }
  
  private checkCrystalCollection(): void {
    if (!this.rover.isClawActive()) return;
    
    const clawTip = this.rover.getClawTipPosition();
    
    for (const crystal of this.crystals) {
      if (crystal.isCollected()) continue;
      
      const dist = Phaser.Math.Distance.Between(
        clawTip.x, clawTip.y, crystal.x, crystal.y
      );
      
      if (dist <= crystal.getRadius() + 12) {
        crystal.startAbsorption(this.rover.x, this.rover.y);
        this.rover.retractClaw();
        this.spawnGoldParticles(crystal.x, crystal.y, 40);
        
        this.time.delayedCall(400, () => {
          if (crystal.isCollected()) {
            this.onCrystalCollected();
          }
        });
        
        break;
      }
    }
  }
  
  private onCrystalCollected(): void {
    this.crystalCollected++;
    this.updateCrystalCount();
    
    if (this.crystalCollected % this.crystalsForUpgrade === 0) {
      this.rover.upgrade();
      this.updateLevel();
      this.showUpgradeEffect();
    }
    
    this.crystals = this.crystals.filter(c => !c.isCollected());
    
    if (this.crystals.length < 4) {
      this.time.delayedCall(1500, () => {
        this.spawnRandomCrystal();
      });
    }
  }
  
  private spawnGoldParticles(x: number, y: number, count: number): void {
    const colors = [0xffd700, 0xffa500, 0xffff00, 0xffec8b, 0xfff8dc];
    
    for (let i = 0; i < count; i++) {
      if (this.goldParticles.length >= this.MAX_PARTICLES) break;
      
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const speed = 2 + Math.random() * 4;
      
      this.goldParticles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 4,
        alpha: 1,
        life: 500,
        maxLife: 500
      });
    }
  }
  
  private showUpgradeEffect(): void {
    const level = this.rover.getLevel();
    const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
    
    const effectText = this.add.text(
      this.CANVAS_WIDTH / 2,
      this.CANVAS_HEIGHT / 2 - 80,
      `升级! LV ${romanNumerals[Math.min(level - 1, 9)]}`,
      {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '36px',
        color: '#FFD700',
        fontStyle: 'bold'
      }
    );
    effectText.setOrigin(0.5);
    effectText.setStroke('#000000', 4);
    effectText.setDepth(1100);
    effectText.setAlpha(0);
    effectText.setScale(0.5);
    
    this.tweens.add({
      targets: effectText,
      alpha: { from: 0, to: 1 },
      scale: { from: 0.5, to: 1.2 },
      y: this.CANVAS_HEIGHT / 2 - 120,
      duration: 600,
      ease: 'Back.easeOut',
      yoyo: true,
      hold: 800,
      onComplete: () => {
        effectText.destroy();
      }
    });
    
    this.spawnGoldParticles(this.rover.x, this.rover.y, 60);
  }
  
  private onRoverHitByExplosion(event: ExplosionEvent): void {
    if (this.rover.isStunned()) return;
    
    const dist = Phaser.Math.Distance.Between(event.x, event.y, this.rover.x, this.rover.y);
    if (dist <= event.radius) {
      this.rover.applyStun(1000);
    }
  }
  
  update(time: number, delta: number): void {
    this.frameCount++;
    
    this.rover.update(time, delta);
    
    for (const crystal of this.crystals) {
      crystal.update(time, delta);
    }
    
    this.checkCrystalCollection();
    this.updateGoldParticles(delta);
    
    this.updateStormSystem(delta);
    this.dustStorm.update(delta);
    this.meteorRain.update(delta, this.rover.x, this.rover.y);
  }
  
  private updateGoldParticles(delta: number): void {
    if (this.goldParticles.length === 0) return;
    
    for (let i = this.goldParticles.length - 1; i >= 0; i--) {
      const p = this.goldParticles[i];
      p.x += p.vx * (delta / 16);
      p.y += p.vy * (delta / 16);
      p.vy += 0.15 * (delta / 16);
      p.vx *= 0.98;
      p.life -= delta;
      p.alpha = Math.max(0, p.life / p.maxLife);
      p.size *= 0.995;
      
      if (p.life <= 0 || p.alpha <= 0.01) {
        this.goldParticles.splice(i, 1);
      }
    }
    
    this.renderGoldParticles();
  }
  
  private goldParticleGraphics: Phaser.GameObjects.Graphics | null = null;
  
  private renderGoldParticles(): void {
    if (!this.goldParticleGraphics) {
      this.goldParticleGraphics = this.add.graphics();
      this.goldParticleGraphics.setDepth(600);
    }
    
    const g = this.goldParticleGraphics;
    g.clear();
    
    const colors = [0xffd700, 0xffa500, 0xffff00];
    
    for (const p of this.goldParticles) {
      const colorIdx = Math.min(2, Math.floor((1 - p.alpha) * 3));
      g.fillStyle(colors[colorIdx], p.alpha);
      g.fillCircle(p.x, p.y, p.size);
      
      if (p.size > 2) {
        g.fillStyle(0xffffff, p.alpha * 0.4);
        g.fillCircle(p.x - p.size * 0.3, p.y - p.size * 0.3, p.size * 0.4);
      }
    }
  }
  
  private updateStormSystem(delta: number): void {
    const wasStormActive = this.dustStorm.isActive();
    this.rover.setDustStormActive(this.dustStorm.isActive());
    
    if (!this.dustStorm.isActive() && !this.meteorRain.isActive()) {
      if (this.meteorRainPending) {
        this.postStormDelay -= delta;
        if (this.postStormDelay <= 0) {
          this.meteorRainPending = false;
          if (Math.random() < this.METEOR_CHANCE) {
            this.meteorRain.start(6 + Math.floor(Math.random() * 6));
          }
          this.scheduleNextStorm();
        }
      } else {
        this.stormCooldown -= delta;
        if (this.stormCooldown <= 0) {
          this.dustStorm.start();
        }
      }
    }
    
    if (wasStormActive && !this.dustStorm.isActive() && !this.meteorRainPending) {
      this.meteorRainPending = true;
      this.postStormDelay = this.POST_STORM_METEOR_DELAY;
    }
  }
  
  private scheduleNextStorm(): void {
    this.stormCooldown = this.STORM_MIN_INTERVAL +
      Math.random() * (this.STORM_MAX_INTERVAL - this.STORM_MIN_INTERVAL);
  }
}
