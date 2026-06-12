import type { GameEngine, GameState } from '../game/core';
import type { Fragment, FragmentType } from '../game/modules/Grid';
import type { Monster } from '../game/modules/Monster';
import type { Particle, LandingBounce, RuneActivationFx, HitSpark } from '../game/modules/Animator';

const COLORS = {
  background: '#0d0b15',
  backgroundGradientStart: '#1a0f2e',
  backgroundGradientEnd: '#0d0b15',
  gridLine: 'rgba(139, 115, 85, 0.25)',
  gridBorder: '#8b7355',
  panelBg: '#2a1a3e',
  panelBorder: '#6b4e8a',
  panelGlow: 'rgba(139, 115, 85, 0.3)',
  ice: '#44aaff',
  iceGlow: 'rgba(68, 170, 255, 0.6)',
  fire: '#ff4444',
  fireGlow: 'rgba(255, 68, 68, 0.6)',
  life: '#44ff88',
  lifeGlow: 'rgba(68, 255, 136, 0.6)',
  monsterNormal: '#4a3a5a',
  monsterHeavy: '#6b5a4a',
  monsterFast: '#6b3a8a',
  textPrimary: '#e8d8b8',
  textSecondary: '#8b7355',
  warningRed: '#ff2222',
  healthGreen: '#44ff88',
  healthRed: '#ff4444',
  healthYellow: '#ffaa44'
};

const SIZES = {
  cellSize: 32,
  gridCols: 10,
  gridRows: 20,
  panelWidth: 280,
  previewSize: 48,
  slotSize: 56,
  lavaHeight: 40
};

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private engine: GameEngine;
  private gridWidth: number;
  private gridHeight: number;
  private totalWidth: number;
  private totalHeight: number;
  private gridOffsetX: number;
  private gridOffsetY: number;
  private panelOffsetX: number;

  constructor(container: HTMLElement, engine: GameEngine) {
    this.engine = engine;
    this.gridWidth = SIZES.cellSize * SIZES.gridCols;
    this.gridHeight = SIZES.cellSize * SIZES.gridRows;
    this.totalWidth = this.gridWidth + SIZES.panelWidth + 20;
    this.totalHeight = this.gridHeight + SIZES.lavaHeight + 40;

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.totalWidth;
    this.canvas.height = this.totalHeight;
    this.canvas.style.display = 'block';
    this.canvas.style.borderRadius = '8px';
    this.canvas.style.boxShadow = '0 0 40px rgba(139, 115, 85, 0.3)';

    this.ctx = this.canvas.getContext('2d')!;
    container.innerHTML = '';
    container.appendChild(this.canvas);

    this.gridOffsetX = 20;
    this.gridOffsetY = 20;
    this.panelOffsetX = this.gridOffsetX + this.gridWidth + 20;
  }

  setEngine(engine: GameEngine): void {
    this.engine = engine;
  }

  render(): void {
    const state = this.engine.getState();
    const shake = this.engine.animator.getShakeOffset();

    this.ctx.save();
    this.ctx.translate(shake.x, shake.y);

    this.clearBackground();
    this.drawBackgroundGradient();
    this.drawLavaTexture();
    this.drawGrid();
    this.drawGridCells();
    this.drawCurrentFragment();
    this.drawLandingBounces();
    this.drawMonsters();
    this.drawParticles();
    this.drawRuneActivations();
    this.drawHitSparks();
    this.drawPanel();
    this.drawWarningBorder();
    this.drawGameOver(state);
    this.drawPause(state);

    this.ctx.restore();
  }

  private clearBackground(): void {
    this.ctx.fillStyle = COLORS.background;
    this.ctx.fillRect(0, 0, this.totalWidth, this.totalHeight);
  }

  private drawBackgroundGradient(): void {
    const gradient = this.ctx.createRadialGradient(
      this.totalWidth / 2,
      this.totalHeight / 2,
      0,
      this.totalWidth / 2,
      this.totalHeight / 2,
      this.totalWidth
    );
    gradient.addColorStop(0, COLORS.backgroundGradientStart);
    gradient.addColorStop(1, COLORS.backgroundGradientEnd);
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.totalWidth, this.totalHeight);
  }

  private drawLavaTexture(): void {
    const lavaY = this.gridOffsetY + this.gridHeight;
    const lavaOffset = this.engine.animator.getLavaOffset(this.totalWidth);

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(this.gridOffsetX, lavaY, this.gridWidth, SIZES.lavaHeight);
    this.ctx.clip();

    for (let x = -this.gridWidth + lavaOffset; x < this.gridWidth * 2; x += 60) {
      const gradient = this.ctx.createLinearGradient(x, lavaY, x + 60, lavaY + SIZES.lavaHeight);
      gradient.addColorStop(0, '#ff2200');
      gradient.addColorStop(0.3, '#ff6600');
      gradient.addColorStop(0.6, '#ffaa00');
      gradient.addColorStop(1, '#ff2200');

      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      const wobble = Math.sin((x + Date.now() / 200) / 30) * 5;
      this.ctx.moveTo(x, lavaY + wobble);
      this.ctx.quadraticCurveTo(x + 30, lavaY + 20 + wobble, x + 60, lavaY + wobble);
      this.ctx.lineTo(x + 60, lavaY + SIZES.lavaHeight);
      this.ctx.lineTo(x, lavaY + SIZES.lavaHeight);
      this.ctx.closePath();
      this.ctx.fill();
    }

    this.ctx.restore();

    this.ctx.strokeStyle = COLORS.gridBorder;
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(this.gridOffsetX, lavaY, this.gridWidth, SIZES.lavaHeight);
  }

  private drawGrid(): void {
    this.ctx.strokeStyle = COLORS.gridLine;
    this.ctx.lineWidth = 1;

    for (let x = 0; x <= SIZES.gridCols; x++) {
      const px = this.gridOffsetX + x * SIZES.cellSize;
      this.ctx.beginPath();
      this.ctx.moveTo(px, this.gridOffsetY);
      this.ctx.lineTo(px, this.gridOffsetY + this.gridHeight);
      this.ctx.stroke();
    }

    for (let y = 0; y <= SIZES.gridRows; y++) {
      const py = this.gridOffsetY + y * SIZES.cellSize;
      this.ctx.beginPath();
      this.ctx.moveTo(this.gridOffsetX, py);
      this.ctx.lineTo(this.gridOffsetX + this.gridWidth, py);
      this.ctx.stroke();
    }

    this.ctx.strokeStyle = COLORS.gridBorder;
    this.ctx.lineWidth = 3;
    this.ctx.shadowColor = COLORS.panelGlow;
    this.ctx.shadowBlur = 15;
    this.ctx.strokeRect(this.gridOffsetX, this.gridOffsetY, this.gridWidth, this.gridHeight);
    this.ctx.shadowBlur = 0;
  }

  private drawGridCells(): void {
    for (let y = 0; y < SIZES.gridRows; y++) {
      for (let x = 0; x < SIZES.gridCols; x++) {
        const cell = this.engine.grid.getCell(x, y);
        if (cell?.fragment) {
          this.drawFragment(
            cell.fragment,
            this.gridOffsetX + x * SIZES.cellSize,
            this.gridOffsetY + y * SIZES.cellSize,
            SIZES.cellSize
          );
        }
      }
    }
  }

  private drawCurrentFragment(): void {
    const fragment = this.engine.grid.currentFragment;
    if (!fragment) return;

    const px = this.gridOffsetX + fragment.x * SIZES.cellSize;
    const py = this.gridOffsetY + fragment.y * SIZES.cellSize;

    this.ctx.globalAlpha = 0.3;
    let ghostY = fragment.y;
    while (this.engine.grid.canMove(fragment, 0, ghostY - fragment.y + 1)) {
      ghostY++;
    }
    const ghostPy = this.gridOffsetY + ghostY * SIZES.cellSize;
    this.drawFragment(fragment, px, ghostPy, SIZES.cellSize);
    this.ctx.globalAlpha = 1;

    this.drawFragment(fragment, px, py, SIZES.cellSize);
  }

  private drawFragment(fragment: Fragment, px: number, py: number, size: number): void {
    const colors: Record<FragmentType, { main: string; glow: string }> = {
      ice: { main: COLORS.ice, glow: COLORS.iceGlow },
      fire: { main: COLORS.fire, glow: COLORS.fireGlow },
      life: { main: COLORS.life, glow: COLORS.lifeGlow }
    };
    const color = colors[fragment.type];
    const padding = 2;
    const innerSize = size - padding * 2;

    this.ctx.save();
    this.ctx.translate(px + size / 2, py + size / 2);
    this.ctx.rotate((fragment.rotation * Math.PI) / 2);
    this.ctx.translate(-px - size / 2, -py - size / 2);

    this.ctx.shadowColor = color.glow;
    this.ctx.shadowBlur = 15;

    this.ctx.fillStyle = color.main;
    this.ctx.beginPath();
    this.ctx.roundRect(px + padding, py + padding, innerSize, innerSize, 4);
    this.ctx.fill();

    this.ctx.shadowBlur = 0;

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.beginPath();
    this.ctx.roundRect(px + padding + 2, py + padding + 2, innerSize / 2, innerSize / 2, 2);
    this.ctx.fill();

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.roundRect(px + padding, py + padding, innerSize, innerSize, 4);
    this.ctx.stroke();

    this.ctx.restore();
  }

  private drawLandingBounces(): void {
    for (const bounce of this.engine.animator.landingBounces) {
      const offset = this.engine.animator.getLandingOffset(bounce);
      const px = this.gridOffsetX + bounce.x * SIZES.cellSize;
      const py = this.gridOffsetY + (bounce.y - offset) * SIZES.cellSize;

      this.ctx.save();
      this.ctx.globalAlpha = 1 - bounce.timer / bounce.duration;

      const colors: Record<FragmentType, { main: string; glow: string }> = {
        ice: { main: COLORS.ice, glow: COLORS.iceGlow },
        fire: { main: COLORS.fire, glow: COLORS.fireGlow },
        life: { main: COLORS.life, glow: COLORS.lifeGlow }
      };
      const color = colors[bounce.type];

      this.ctx.shadowColor = color.glow;
      this.ctx.shadowBlur = 20;
      this.ctx.strokeStyle = color.main;
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.roundRect(px + 2, py + 2, SIZES.cellSize - 4, SIZES.cellSize - 4, 4);
      this.ctx.stroke();

      this.ctx.restore();
    }
  }

  private drawMonsters(): void {
    for (const monster of this.engine.monsterManager.monsters) {
      if (monster.y >= SIZES.gridRows || monster.y < 0) continue;
      this.drawMonster(monster);
    }
  }

  private drawMonster(monster: Monster): void {
    const px = this.gridOffsetX + monster.x * SIZES.cellSize;
    const py = this.gridOffsetY + monster.y * SIZES.cellSize;
    const size = SIZES.cellSize - 4;

    this.ctx.save();

    if (monster.frozen) {
      this.ctx.filter = 'hue-rotate(180deg) brightness(1.3)';
    }

    const colors: Record<string, { main: string; shell?: string }> = {
      normal: { main: COLORS.monsterNormal },
      heavy: { main: COLORS.monsterHeavy, shell: '#8b7355' },
      fast: { main: COLORS.monsterFast }
    };
    const color = colors[monster.type];

    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    this.ctx.shadowBlur = 10;

    this.ctx.fillStyle = color.main;
    this.ctx.beginPath();
    this.ctx.roundRect(px + 2, py + 4, size, size - 4, 4);
    this.ctx.fill();

    if (monster.type === 'heavy' && color.shell) {
      this.ctx.fillStyle = color.shell;
      this.ctx.beginPath();
      this.ctx.roundRect(px + 4, py + 2, size - 4, size / 2, 2);
      this.ctx.fill();

      this.ctx.strokeStyle = '#5a4a3a';
      this.ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        this.ctx.beginPath();
        this.ctx.moveTo(px + 6, py + 6 + i * 6);
        this.ctx.lineTo(px + size - 2, py + 6 + i * 6);
        this.ctx.stroke();
      }
    }

    this.ctx.shadowBlur = 0;

    this.ctx.fillStyle = '#ff0000';
    this.ctx.beginPath();
    this.ctx.arc(px + size / 3, py + size / 2, 3, 0, Math.PI * 2);
    this.ctx.arc(px + (size * 2) / 3, py + size / 2, 3, 0, Math.PI * 2);
    this.ctx.fill();

    const hpPercent = monster.hp / monster.maxHp;
    const hpBarWidth = size - 4;
    const hpBarHeight = 4;
    const hpBarY = py + size + 2;

    this.ctx.fillStyle = '#333';
    this.ctx.fillRect(px + 2, hpBarY, hpBarWidth, hpBarHeight);

    let hpColor = COLORS.healthGreen;
    if (hpPercent < 0.3) hpColor = COLORS.healthRed;
    else if (hpPercent < 0.6) hpColor = COLORS.healthYellow;

    this.ctx.fillStyle = hpColor;
    this.ctx.fillRect(px + 2, hpBarY, hpBarWidth * hpPercent, hpBarHeight);

    if (monster.burning) {
      this.ctx.strokeStyle = COLORS.fire;
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([3, 3]);
      this.ctx.strokeRect(px, py, size + 4, size + 4);
      this.ctx.setLineDash([]);
    }

    if (monster.frozen) {
      this.ctx.strokeStyle = COLORS.ice;
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(px, py, size + 4, size + 4);
    }

    if (monster.hitSparkTimer > 0) {
      this.ctx.fillStyle = `rgba(255, 255, 255, ${monster.hitSparkTimer * 3})`;
      this.ctx.fillRect(px + 2, py + 4, size, size - 4);
    }

    this.ctx.restore();
  }

  private drawParticles(): void {
    for (const particle of this.engine.animator.particles) {
      this.drawParticle(particle);
    }
  }

  private drawParticle(particle: Particle): void {
    const alpha = particle.life / particle.maxLife;
    const px = this.gridOffsetX + particle.x * SIZES.cellSize;
    const py = this.gridOffsetY + particle.y * SIZES.cellSize;

    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = particle.color;

    if (particle.type === 'trail') {
      this.ctx.globalAlpha = alpha * 0.5;
    }

    this.ctx.shadowColor = particle.color;
    this.ctx.shadowBlur = 5;

    this.ctx.beginPath();
    this.ctx.arc(px, py, particle.size, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  private drawRuneActivations(): void {
    for (const fx of this.engine.animator.runeActivations) {
      this.drawRuneActivation(fx);
    }
  }

  private drawRuneActivation(fx: RuneActivationFx): void {
    const progress = fx.timer / fx.duration;
    const alpha = 1 - progress;

    const colors: Record<FragmentType, string> = {
      ice: COLORS.ice,
      fire: COLORS.fire,
      life: COLORS.life
    };
    const color = colors[fx.type];

    this.ctx.save();
    this.ctx.globalAlpha = alpha;

    for (const cell of fx.cells) {
      const px = this.gridOffsetX + (cell.x + 0.5) * SIZES.cellSize;
      const py = this.gridOffsetY + (cell.y + 0.5) * SIZES.cellSize;
      const radius = SIZES.cellSize * (0.5 + progress * 1.5);

      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 3;
      this.ctx.shadowColor = color;
      this.ctx.shadowBlur = 20;
      this.ctx.beginPath();
      this.ctx.arc(px, py, radius, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  private drawHitSparks(): void {
    for (const spark of this.engine.animator.hitSparks) {
      const progress = spark.timer / spark.duration;
      const alpha = 1 - progress;
      const px = this.gridOffsetX + spark.x * SIZES.cellSize;
      const py = this.gridOffsetY + spark.y * SIZES.cellSize;

      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = spark.color;
      this.ctx.shadowColor = spark.color;
      this.ctx.shadowBlur = 15;

      for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI) / 2 + progress * Math.PI;
        const length = 10 + progress * 15;
        this.ctx.beginPath();
        this.ctx.moveTo(px, py);
        this.ctx.lineTo(px + Math.cos(angle) * length, py + Math.sin(angle) * length);
        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = spark.color;
        this.ctx.stroke();
      }

      this.ctx.restore();
    }
  }

  private drawPanel(): void {
    const px = this.panelOffsetX;
    const py = this.gridOffsetY;
    const pw = SIZES.panelWidth;
    const ph = this.gridHeight + SIZES.lavaHeight;

    this.ctx.fillStyle = COLORS.panelBg;
    this.ctx.shadowColor = 'rgba(139, 115, 85, 0.4)';
    this.ctx.shadowBlur = 20;
    this.ctx.beginPath();
    this.ctx.roundRect(px, py, pw, ph, 12);
    this.ctx.fill();
    this.ctx.shadowBlur = 0;

    this.ctx.strokeStyle = COLORS.panelBorder;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.roundRect(px, py, pw, ph, 12);
    this.ctx.stroke();

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.beginPath();
    this.ctx.roundRect(px + 4, py + 4, pw - 8, ph - 8, 8);
    this.ctx.fill();

    let currentY = py + 24;

    this.ctx.fillStyle = COLORS.textPrimary;
    this.ctx.font = 'bold 20px "Segoe UI", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('SoulTetris', px + pw / 2, currentY);
    currentY += 36;

    const state = this.engine.getState();
    this.ctx.font = '14px "Segoe UI", sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillStyle = COLORS.textSecondary;
    this.ctx.fillText('分数', px + 20, currentY);
    this.ctx.fillStyle = COLORS.textPrimary;
    this.ctx.font = 'bold 18px "Segoe UI", sans-serif';
    this.ctx.textAlign = 'right';
    this.ctx.fillText(state.score.toString(), px + pw - 20, currentY);
    currentY += 28;

    this.ctx.font = '14px "Segoe UI", sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillStyle = COLORS.textSecondary;
    this.ctx.fillText('波次', px + 20, currentY);
    this.ctx.fillStyle = COLORS.textPrimary;
    this.ctx.font = 'bold 18px "Segoe UI", sans-serif';
    this.ctx.textAlign = 'right';
    this.ctx.fillText(state.wave.toString(), px + pw - 20, currentY);
    currentY += 28;

    this.ctx.font = '14px "Segoe UI", sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillStyle = COLORS.textSecondary;
    this.ctx.fillText('防御', px + 20, currentY);
    currentY += 20;

    const defBarWidth = pw - 40;
    const defBarHeight = 12;
    this.ctx.fillStyle = '#1a1025';
    this.ctx.beginPath();
    this.ctx.roundRect(px + 20, currentY, defBarWidth, defBarHeight, 4);
    this.ctx.fill();

    const defPercent = state.defense / state.maxDefense;
    let defColor = COLORS.healthGreen;
    if (defPercent < 0.3) defColor = COLORS.healthRed;
    else if (defPercent < 0.6) defColor = COLORS.healthYellow;
    this.ctx.fillStyle = defColor;
    this.ctx.beginPath();
    this.ctx.roundRect(px + 20, currentY, defBarWidth * defPercent, defBarHeight, 4);
    this.ctx.fill();

    this.ctx.fillStyle = COLORS.textPrimary;
    this.ctx.font = 'bold 12px "Segoe UI", sans-serif';
    this.ctx.textAlign = 'right';
    this.ctx.fillText(`${Math.ceil(state.defense)}/${state.maxDefense}`, px + pw - 20, currentY + 10);
    currentY += 32;

    this.ctx.font = 'bold 16px "Segoe UI", sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillStyle = COLORS.textPrimary;
    this.ctx.fillText('符文槽位', px + 20, currentY);
    currentY += 28;

    const slotSpacing = (pw - SIZES.slotSize * 3 - 40) / 2;
    const slotStartX = px + 20;
    const slotY = currentY;
    const slotCenters: { x: number; y: number; type: FragmentType }[] = [];

    for (let i = 0; i < 3; i++) {
      const slotX = slotStartX + i * (SIZES.slotSize + slotSpacing);
      const type = this.engine.grid.runeSlots[i];
      slotCenters.push({
        x: slotX + SIZES.slotSize / 2,
        y: slotY + SIZES.slotSize / 2,
        type
      });
      this.drawRuneSlot(slotX, slotY, type);
    }
    currentY += SIZES.slotSize + 32;

    this.ctx.font = 'bold 16px "Segoe UI", sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillStyle = COLORS.textPrimary;
    this.ctx.fillText('即将到来', px + 20, currentY);
    currentY += 28;

    const previewSpacing = (pw - SIZES.previewSize * 3 - 40) / 2;
    const previewStartX = px + 20;
    const previewY = currentY;
    const previewCenters: { x: number; y: number; type: FragmentType }[] = [];

    for (let i = 0; i < 3; i++) {
      const previewX = previewStartX + i * (SIZES.previewSize + previewSpacing);
      const type = state.nextFragments[i];
      if (type) {
        previewCenters.push({
          x: previewX + SIZES.previewSize / 2,
          y: previewY + SIZES.previewSize / 2,
          type
        });
        this.drawPreviewFragment(previewX, previewY, type);
      }
    }

    this.drawConnectionLines(slotCenters, previewCenters);
    currentY += SIZES.previewSize + 40;

    this.ctx.font = '11px "Segoe UI", sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillStyle = COLORS.textSecondary;
    this.ctx.fillText('← → 移动 | ↑ 硬降', px + 20, currentY);
    currentY += 18;
    this.ctx.fillText('↓ 加速 | 空格 旋转', px + 20, currentY);
    currentY += 18;
    this.ctx.fillText('P 暂停', px + 20, currentY);
  }

  private drawRuneSlot(px: number, py: number, type: FragmentType): void {
    const colors: Record<FragmentType, { main: string; glow: string; name: string }> = {
      ice: { main: COLORS.ice, glow: COLORS.iceGlow, name: '冰霜' },
      fire: { main: COLORS.fire, glow: COLORS.fireGlow, name: '火焰' },
      life: { main: COLORS.life, glow: COLORS.lifeGlow, name: '生命' }
    };
    const color = colors[type];
    const size = SIZES.slotSize;

    this.ctx.strokeStyle = color.main;
    this.ctx.lineWidth = 2;
    this.ctx.shadowColor = color.glow;
    this.ctx.shadowBlur = 10;
    this.ctx.beginPath();
    this.ctx.roundRect(px, py, size, size, 8);
    this.ctx.stroke();
    this.ctx.shadowBlur = 0;

    this.ctx.fillStyle = color.main;
    this.ctx.globalAlpha = 0.2;
    this.ctx.beginPath();
    this.ctx.roundRect(px + 4, py + 4, size - 8, size - 8, 6);
    this.ctx.fill();
    this.ctx.globalAlpha = 1;

    const innerSize = size - 16;
    this.ctx.fillStyle = color.main;
    this.ctx.shadowColor = color.glow;
    this.ctx.shadowBlur = 15;
    this.ctx.beginPath();
    this.ctx.roundRect(px + 8, py + 8, innerSize, innerSize, 4);
    this.ctx.fill();
    this.ctx.shadowBlur = 0;

    this.ctx.fillStyle = COLORS.textPrimary;
    this.ctx.font = '11px "Segoe UI", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(color.name, px + size / 2, py + size + 16);
  }

  private drawPreviewFragment(px: number, py: number, type: FragmentType): void {
    const colors: Record<FragmentType, { main: string; glow: string }> = {
      ice: { main: COLORS.ice, glow: COLORS.iceGlow },
      fire: { main: COLORS.fire, glow: COLORS.fireGlow },
      life: { main: COLORS.life, glow: COLORS.lifeGlow }
    };
    const color = colors[type];
    const size = SIZES.previewSize;
    const padding = 4;

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.beginPath();
    this.ctx.roundRect(px, py, size, size, 6);
    this.ctx.fill();

    this.ctx.shadowColor = color.glow;
    this.ctx.shadowBlur = 15;
    this.ctx.fillStyle = color.main;
    this.ctx.beginPath();
    this.ctx.roundRect(px + padding, py + padding, size - padding * 2, size - padding * 2, 4);
    this.ctx.fill();
    this.ctx.shadowBlur = 0;

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.beginPath();
    this.ctx.roundRect(px + padding + 2, py + padding + 2, (size - padding * 2) / 2, (size - padding * 2) / 2, 2);
    this.ctx.fill();

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.roundRect(px + padding, py + padding, size - padding * 2, size - padding * 2, 4);
    this.ctx.stroke();
  }

  private drawConnectionLines(
    slots: { x: number; y: number; type: FragmentType }[],
    previews: { x: number; y: number; type: FragmentType }[]
  ): void {
    const progress = this.engine.animator.getConnectionProgress();

    for (const slot of slots) {
      for (const preview of previews) {
        if (slot.type === preview.type) {
          this.ctx.save();

          const gradient = this.ctx.createLinearGradient(slot.x, slot.y, preview.x, preview.y);
          const colors: Record<FragmentType, string> = {
            ice: COLORS.ice,
            fire: COLORS.fire,
            life: COLORS.life
          };
          const color = colors[slot.type];

          gradient.addColorStop(0, `${color}00`);
          gradient.addColorStop(progress, `${color}ff`);
          gradient.addColorStop(Math.min(1, progress + 0.3), `${color}00`);

          this.ctx.strokeStyle = gradient;
          this.ctx.lineWidth = 2;
          this.ctx.shadowColor = color;
          this.ctx.shadowBlur = 8;

          this.ctx.beginPath();
          this.ctx.moveTo(slot.x, slot.y);

          const midX = (slot.x + preview.x) / 2;
          const midY = (slot.y + preview.y) / 2 - 30;
          this.ctx.quadraticCurveTo(midX, midY, preview.x, preview.y);
          this.ctx.stroke();

          const dotT = progress;
          const dotX = slot.x + (preview.x - slot.x) * dotT;
          const dotY = slot.y + (preview.y - slot.y) * dotT - 30 * Math.sin(dotT * Math.PI);

          this.ctx.fillStyle = color;
          this.ctx.beginPath();
          this.ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
          this.ctx.fill();

          this.ctx.restore();
        }
      }
    }
  }

  private drawWarningBorder(): void {
    const alpha = this.engine.animator.getWarningFlashAlpha();
    if (alpha <= 0) return;

    this.ctx.save();
    this.ctx.strokeStyle = COLORS.warningRed;
    this.ctx.lineWidth = 4;
    this.ctx.globalAlpha = alpha;
    this.ctx.shadowColor = COLORS.warningRed;
    this.ctx.shadowBlur = 20;
    this.ctx.strokeRect(4, 4, this.totalWidth - 8, this.totalHeight - 8);
    this.ctx.restore();

    if (alpha > 0.3) {
      this.ctx.save();
      this.ctx.fillStyle = COLORS.warningRed;
      this.ctx.globalAlpha = alpha * 0.8;
      this.ctx.font = 'bold 24px "Segoe UI", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.shadowColor = COLORS.warningRed;
      this.ctx.shadowBlur = 10;
      this.ctx.fillText('⚠ 新波次来袭 ⚠', this.totalWidth / 2, this.gridOffsetY + 40);
      this.ctx.restore();
    }
  }

  private drawGameOver(state: GameState): void {
    if (!state.isGameOver) return;

    this.ctx.save();
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    this.ctx.fillRect(0, 0, this.totalWidth, this.totalHeight);

    this.ctx.fillStyle = COLORS.fire;
    this.ctx.font = 'bold 48px "Segoe UI", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.shadowColor = COLORS.fire;
    this.ctx.shadowBlur = 20;
    this.ctx.fillText('游戏结束', this.totalWidth / 2, this.totalHeight / 2 - 40);

    this.ctx.fillStyle = COLORS.textPrimary;
    this.ctx.font = '24px "Segoe UI", sans-serif';
    this.ctx.shadowBlur = 0;
    this.ctx.fillText(`最终分数: ${state.score}`, this.totalWidth / 2, this.totalHeight / 2 + 10);
    this.ctx.fillText(`坚持波次: ${state.wave}`, this.totalWidth / 2, this.totalHeight / 2 + 45);

    this.ctx.fillStyle = COLORS.textSecondary;
    this.ctx.font = '16px "Segoe UI", sans-serif';
    this.ctx.fillText('按 空格 或 回车 重新开始', this.totalWidth / 2, this.totalHeight / 2 + 100);

    this.ctx.restore();
  }

  private drawPause(state: GameState): void {
    if (!state.isPaused || state.isGameOver) return;

    this.ctx.save();
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, this.totalWidth, this.totalHeight);

    this.ctx.fillStyle = COLORS.textPrimary;
    this.ctx.font = 'bold 36px "Segoe UI", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.shadowColor = COLORS.panelGlow;
    this.ctx.shadowBlur = 15;
    this.ctx.fillText('游戏暂停', this.totalWidth / 2, this.totalHeight / 2);

    this.ctx.fillStyle = COLORS.textSecondary;
    this.ctx.font = '16px "Segoe UI", sans-serif';
    this.ctx.shadowBlur = 0;
    this.ctx.fillText('按 P 继续游戏', this.totalWidth / 2, this.totalHeight / 2 + 40);

    this.ctx.restore();
  }
}
