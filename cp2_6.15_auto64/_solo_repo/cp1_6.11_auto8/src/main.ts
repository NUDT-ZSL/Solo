import { Dice } from './dice';
import { Stats, type RollResult, type Rating } from './stats';

type GameState = 'idle' | 'rolling' | 'settled';

interface StarParticle {
  x: number;
  y: number;
  size: number;
  alpha: number;
  speed: number;
  twinkle: number;
  twinkleSpeed: number;
  hue: number;
}

interface Button {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  hover: boolean;
  hoverProgress: number;
  scale: number;
  scaleAnim: number;
  scaleAnimSpeed: number;
  glowIntensity: number;
}

interface ColorPicker {
  x: number;
  y: number;
  size: number;
  colors: string[];
  glowColors: string[];
  selectedIndex: number;
  diceIndex: number;
  hoverScale: number;
}

interface PerformanceStats {
  fps: number;
  fpsHistory: number[];
  frameCount: number;
  fpsUpdateTime: number;
  rollStartTime: number;
  rollEndTime: number;
  lastRollDuration: number;
  minFps: number;
  maxFps: number;
}

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private dpr: number = 1;

  private state: GameState = 'idle';
  private dice: Dice[] = [];
  private stats: Stats = new Stats();

  private starParticles: StarParticle[] = [];
  private starCount: number = 150;

  private rollButton: Button;
  private colorPickers: ColorPicker[] = [];

  private diceColors: string[] = ['#6C3B9E', '#9C27B0', '#3F51B5'];
  private diceGlowColors: string[] = ['#FF7B24', '#FF6B9D', '#00D4FF'];

  private lastTime: number = 0;
  private animationFrameId: number = 0;

  private resultRating: string = '';
  private resultScore: number = 0;
  private resultAlpha: number = 0;
  private resultScale: number = 0.5;

  private resultShockwaveRadius: number = 0;
  private resultShockwaveAlpha: number = 0;

  private mouseX: number = 0;
  private mouseY: number = 0;

  private statsPanelX: number = 20;
  private statsPanelY: number = 20;
  private statsPanelWidth: number = 320;

  private perfStats: PerformanceStats;
  private showPerfStats: boolean = false;

  private offscreenCanvas: HTMLCanvasElement | null = null;
  private offscreenCtx: CanvasRenderingContext2D | null = null;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;

    this.rollButton = {
      x: 0,
      y: 0,
      width: 220,
      height: 64,
      label: '投 掷',
      hover: false,
      hoverProgress: 0,
      scale: 1,
      scaleAnim: 0,
      scaleAnimSpeed: 0,
      glowIntensity: 0,
    };

    this.perfStats = {
      fps: 60,
      fpsHistory: [],
      frameCount: 0,
      fpsUpdateTime: 0,
      rollStartTime: 0,
      rollEndTime: 0,
      lastRollDuration: 0,
      minFps: 60,
      maxFps: 60,
    };

    this.resize();
    this.initDice();
    this.initStarParticles();
    this.initColorPickers();
    this.initOffscreenCanvas();
    this.bindEvents();
    this.animate = this.animate.bind(this);
  }

  private initOffscreenCanvas(): void {
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCtx = this.offscreenCanvas.getContext('2d')!;
  }

  private resize(): void {
    this.dpr = window.devicePixelRatio || 1;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    if (this.offscreenCanvas) {
      this.offscreenCanvas.width = this.width * this.dpr;
      this.offscreenCanvas.height = this.height * this.dpr;
      this.offscreenCtx?.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    this.layout();
  }

  private layout(): void {
    const diceSize = Math.min(this.width * 0.09, 90);
    const diceSpacing = diceSize * 2.4;
    const totalWidth = diceSpacing * 2;
    const startX = this.width / 2 - totalWidth / 2;
    const diceY = this.height * 0.38;

    for (let i = 0; i < this.dice.length; i++) {
      this.dice[i].setPosition(startX + i * diceSpacing, diceY);
      this.dice[i].setSize(diceSize);
    }

    this.rollButton.x = this.width / 2 - this.rollButton.width / 2;
    this.rollButton.y = this.height * 0.65;

    const pickerSize = 30;
    const pickerY = diceY + diceSize * 1.7;

    for (let i = 0; i < this.colorPickers.length; i++) {
      this.colorPickers[i].x = startX + i * diceSpacing;
      this.colorPickers[i].y = pickerY;
      this.colorPickers[i].size = pickerSize;
    }
  }

  private initDice(): void {
    const diceSize = Math.min(this.width * 0.09, 90);
    const diceSpacing = diceSize * 2.4;
    const totalWidth = diceSpacing * 2;
    const startX = this.width / 2 - totalWidth / 2;
    const diceY = this.height * 0.38;

    for (let i = 0; i < 3; i++) {
      this.dice.push(
        new Dice({
          x: startX + i * diceSpacing,
          y: diceY,
          size: diceSize,
          color: this.diceColors[i],
          glowColor: this.diceGlowColors[i],
        })
      );
    }
  }

  private initStarParticles(): void {
    this.starParticles = [];
    const count = Math.min(this.starCount, 200);
    for (let i = 0; i < count; i++) {
      this.starParticles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.4 + 0.2,
        speed: Math.random() * 10 + 3,
        twinkle: Math.random() * Math.PI * 2,
        twinkleSpeed: Math.random() * 2.5 + 0.8,
        hue: 30 + Math.random() * 40,
      });
    }
  }

  private initColorPickers(): void {
    const colors = ['#6C3B9E', '#9C27B0', '#3F51B5', '#E91E63', '#009688', '#FF5722'];
    const glowColors = ['#FF7B24', '#FF6B9D', '#00D4FF', '#FFD700', '#4CAF50', '#FF9800'];

    for (let i = 0; i < 3; i++) {
      this.colorPickers.push({
        x: 0,
        y: 0,
        size: 30,
        colors: colors,
        glowColors: glowColors,
        selectedIndex: i % colors.length,
        diceIndex: i,
        hoverScale: 1,
      });
    }
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.resize());

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
      this.handleHover();
    });

    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.handleClick(x, y);
    });

    this.canvas.addEventListener('mousedown', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.handleMouseDown(x, y);
    });

    this.canvas.addEventListener('mouseup', () => {
      // 弹性反弹在 update 中处理
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        if (this.state === 'idle') {
          this.rollDice();
        }
      }
      if (e.key === 'p' || e.key === 'P') {
        this.showPerfStats = !this.showPerfStats;
      }
    });
  }

  private handleHover(): void {
    const x = this.mouseX;
    const y = this.mouseY;

    const btn = this.rollButton;
    const isHovering =
      x >= btn.x &&
      x <= btn.x + btn.width &&
      y >= btn.y &&
      y <= btn.y + btn.height;

    btn.hover = isHovering;

    let hovering = isHovering || this.isHoveringColorPicker() || this.isHoveringStatsHeader();
    this.canvas.style.cursor = hovering ? 'pointer' : 'default';
  }

  private isHoveringColorPicker(): boolean {
    for (const picker of this.colorPickers) {
      const dx = this.mouseX - picker.x;
      const dy = this.mouseY - picker.y;
      if (Math.sqrt(dx * dx + dy * dy) <= picker.size) {
        return true;
      }
    }
    return false;
  }

  private isHoveringStatsHeader(): boolean {
    return this.stats.isPointInHeader(
      this.mouseX,
      this.mouseY,
      this.statsPanelX,
      this.statsPanelY,
      this.statsPanelWidth
    );
  }

  private handleClick(x: number, y: number): void {
    const btn = this.rollButton;
    if (
      x >= btn.x &&
      x <= btn.x + btn.width &&
      y >= btn.y &&
      y <= btn.y + btn.height &&
      this.state === 'idle'
    ) {
      this.rollDice();
      return;
    }

    for (const picker of this.colorPickers) {
      const dx = x - picker.x;
      const dy = y - picker.y;
      if (Math.sqrt(dx * dx + dy * dy) <= picker.size) {
        this.cycleColor(picker);
        return;
      }
    }

    if (
      this.stats.isPointInHeader(x, y, this.statsPanelX, this.statsPanelY, this.statsPanelWidth)
    ) {
      this.stats.toggle();
    }
  }

  private handleMouseDown(x: number, y: number): void {
    const btn = this.rollButton;
    if (
      x >= btn.x &&
      x <= btn.x + btn.width &&
      y >= btn.y &&
      y <= btn.y + btn.height &&
      this.state === 'idle'
    ) {
      btn.scaleAnim = -1;
      btn.scaleAnimSpeed = 10;
    }
  }

  private cycleColor(picker: ColorPicker): void {
    if (this.state !== 'idle') return;
    picker.selectedIndex = (picker.selectedIndex + 1) % picker.colors.length;

    const color = picker.colors[picker.selectedIndex];
    const glowColor = picker.glowColors[picker.selectedIndex % picker.glowColors.length];

    this.dice[picker.diceIndex].setColor(color, glowColor);
    this.diceColors[picker.diceIndex] = color;
    this.diceGlowColors[picker.diceIndex] = glowColor;

    picker.hoverScale = 1.2;
  }

  private rollDice(): void {
    if (this.state !== 'idle') return;

    this.state = 'rolling';
    this.resultAlpha = 0;
    this.resultScale = 0.5;
    this.resultShockwaveRadius = 0;
    this.resultShockwaveAlpha = 0;

    this.perfStats.rollStartTime = performance.now();
    this.perfStats.minFps = 60;

    const values: [number, number, number] = [
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1,
    ];

    for (let i = 0; i < this.dice.length; i++) {
      setTimeout(() => {
        this.dice[i].roll(values[i]);
      }, i * 120);
    }
  }

  private checkRollComplete(): boolean {
    for (const d of this.dice) {
      if (!d.isFinished()) return false;
    }
    return true;
  }

  private handleSettle(): void {
    const values: [number, number, number] = [
      this.dice[0].value,
      this.dice[1].value,
      this.dice[2].value,
    ];

    const rating = this.stats.getRating(values);
    const score = this.stats.getScore(values);

    this.resultRating = this.getRatingLabel(rating);
    this.resultScore = score;
    this.resultAlpha = 0;
    this.resultScale = 0.5;
    this.resultShockwaveRadius = 0;
    this.resultShockwaveAlpha = 1;

    const result: RollResult = {
      values,
      rating,
      score,
      timestamp: Date.now(),
    };
    this.stats.addRoll(result);

    this.perfStats.rollEndTime = performance.now();
    this.perfStats.lastRollDuration = (this.perfStats.rollEndTime - this.perfStats.rollStartTime) / 1000;

    this.state = 'settled';
  }

  private getRatingLabel(rating: Rating): string {
    switch (rating) {
      case 'triple':
        return '🏆 豹子！';
      case 'straight':
        return '✨ 顺子！';
      case 'pair':
        return '🎯 对子';
      default:
        return '🎲 普通';
    }
  }

  private animate(currentTime: number): void {
    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.05);
    this.lastTime = currentTime;

    this.updateFps(dt);

    this.update(dt);
    this.draw();

    this.animationFrameId = requestAnimationFrame(this.animate);
  }

  private updateFps(dt: number): void {
    this.perfStats.frameCount++;
    this.perfStats.fpsUpdateTime += dt;

    if (this.perfStats.fpsUpdateTime >= 0.5) {
      const fps = this.perfStats.frameCount / this.perfStats.fpsUpdateTime;
      this.perfStats.fps = fps;
      this.perfStats.fpsHistory.push(fps);
      if (this.perfStats.fpsHistory.length > 60) {
        this.perfStats.fpsHistory.shift();
      }
      this.perfStats.minFps = Math.min(this.perfStats.minFps, fps);
      this.perfStats.maxFps = Math.max(this.perfStats.maxFps, fps);
      this.perfStats.frameCount = 0;
      this.perfStats.fpsUpdateTime = 0;
    }
  }

  private update(dt: number): void {
    this.updateStarParticles(dt);
    this.stats.update(dt);

    for (const dice of this.dice) {
      dice.update(dt);
    }

    this.updateRollButton(dt);
    this.updateColorPickers(dt);

    if (this.state === 'rolling' && this.checkRollComplete()) {
      this.handleSettle();
    }

    if (this.state === 'settled') {
      this.resultAlpha = Math.min(1, this.resultAlpha + dt * 2.5);
      this.resultScale = this.resultScale + (1 - this.resultScale) * 7 * dt;

      this.resultShockwaveRadius += dt * 350;
      this.resultShockwaveAlpha = Math.max(0, this.resultShockwaveAlpha - dt * 1.2);

      if (this.resultAlpha >= 1) {
        this.state = 'idle';
      }
    }
  }

  private updateRollButton(dt: number): void {
    const btn = this.rollButton;

    const targetHover = btn.hover && this.state === 'idle' ? 1 : 0;
    btn.hoverProgress += (targetHover - btn.hoverProgress) * 5 * dt;
    btn.glowIntensity = btn.hoverProgress;

    if (btn.scaleAnim !== 0) {
      btn.scale += btn.scaleAnim * btn.scaleAnimSpeed * dt;

      if (btn.scale < 0.9) {
        btn.scale = 0.9;
        btn.scaleAnim = 1;
        btn.scaleAnimSpeed = 8;
      } else if (btn.scale > 1.1) {
        btn.scale = 1.1;
        btn.scaleAnim = -1;
        btn.scaleAnimSpeed = 6;
      }

      if (Math.abs(btn.scale - 1.0) < 0.01 && btn.scaleAnim === 1) {
        btn.scale = 1.0;
        btn.scaleAnim = 0;
        btn.scaleAnimSpeed = 0;
      }
    } else {
      btn.scale += (1 - btn.scale) * 10 * dt;
    }
  }

  private updateColorPickers(dt: number): void {
    for (const picker of this.colorPickers) {
      const dx = this.mouseX - picker.x;
      const dy = this.mouseY - picker.y;
      const isHovering = Math.sqrt(dx * dx + dy * dy) <= picker.size;

      const targetScale = isHovering ? 1.15 : 1;
      picker.hoverScale += (targetScale - picker.hoverScale) * 8 * dt;
    }
  }

  private updateStarParticles(dt: number): void {
    for (const star of this.starParticles) {
      star.twinkle += star.twinkleSpeed * dt;
      star.y -= star.speed * dt * 0.08;

      if (star.y < -10) {
        star.y = this.height + 10;
        star.x = Math.random() * this.width;
      }

      const twinkleVal = Math.sin(star.twinkle);
      star.alpha = 0.2 + twinkleVal * 0.25 + 0.15;
    }
  }

  private draw(): void {
    const ctx = this.ctx;

    ctx.clearRect(0, 0, this.width, this.height);

    this.drawBackground();
    this.drawNebula();
    this.drawStarParticles();
    this.drawTitle();

    for (const dice of this.dice) {
      dice.draw(ctx);
    }

    this.drawResult();
    this.drawRollButton();
    this.drawColorPickers();
    this.drawColorLabels();

    this.stats.draw(ctx, this.statsPanelX, this.statsPanelY, this.statsPanelWidth);

    if (this.showPerfStats) {
      this.drawPerfStats();
    }
  }

  private drawBackground(): void {
    const gradient = this.ctx.createRadialGradient(
      this.width / 2,
      this.height * 0.35,
      0,
      this.width / 2,
      this.height * 0.5,
      this.height * 0.9
    );
    gradient.addColorStop(0, '#1A0A2E');
    gradient.addColorStop(0.4, '#120720');
    gradient.addColorStop(1, '#070310');

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawNebula(): void {
    const time = Date.now() * 0.00008;

    const nebulae = [
      { x: this.width * 0.25, y: this.height * 0.3, r: 280, color: 'rgba(108, 59, 158, 0.18)' },
      { x: this.width * 0.75, y: this.height * 0.7, r: 320, color: 'rgba(255, 123, 36, 0.08)' },
      { x: this.width * 0.5, y: this.height * 0.45, r: 220, color: 'rgba(156, 39, 176, 0.12)' },
      { x: this.width * 0.15, y: this.height * 0.8, r: 200, color: 'rgba(63, 81, 181, 0.1)' },
    ];

    for (let i = 0; i < nebulae.length; i++) {
      const n = nebulae[i];
      const offsetX = Math.sin(time * 1.2 + i * 0.7) * 40;
      const offsetY = Math.cos(time * 0.9 + i * 1.1) * 30;

      const gradient = this.ctx.createRadialGradient(
        n.x + offsetX,
        n.y + offsetY,
        0,
        n.x + offsetX,
        n.y + offsetY,
        n.r
      );
      gradient.addColorStop(0, n.color);
      gradient.addColorStop(1, 'transparent');

      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(n.x + offsetX, n.y + offsetY, n.r, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawStarParticles(): void {
    for (const star of this.starParticles) {
      const color = `hsla(${star.hue}, 100%, 85%, ${star.alpha})`;
      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawTitle(): void {
    this.ctx.save();
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';

    this.ctx.font = 'bold 48px Orbitron, sans-serif';
    this.ctx.shadowColor = '#FF7B24';
    this.ctx.shadowBlur = 25;

    const gradient = this.ctx.createLinearGradient(
      this.width / 2 - 180,
      0,
      this.width / 2 + 180,
      0
    );
    gradient.addColorStop(0, '#FF7B24');
    gradient.addColorStop(0.3, '#FFD700');
    gradient.addColorStop(0.7, '#FFA500');
    gradient.addColorStop(1, '#FF7B24');

    this.ctx.fillStyle = gradient;
    this.ctx.fillText('星焰骰子', this.width / 2, 25);

    this.ctx.font = '14px Orbitron, sans-serif';
    this.ctx.shadowBlur = 10;
    this.ctx.fillStyle = 'rgba(255, 123, 36, 0.6)';
    this.ctx.fillText('STAR FLAME DICE', this.width / 2, 80);

    this.ctx.restore();
  }

  private drawResult(): void {
    if (this.resultAlpha <= 0 && this.resultShockwaveAlpha <= 0) return;

    const centerX = this.width / 2;
    const centerY = this.height * 0.56;

    if (this.resultShockwaveAlpha > 0) {
      this.ctx.save();

      for (let i = 0; i < 3; i++) {
        const r = this.resultShockwaveRadius * (1 + i * 0.3);
        const a = Math.max(0, this.resultShockwaveAlpha - i * 0.25);
        if (a <= 0) continue;

        this.ctx.strokeStyle = `rgba(255, 215, 0, ${a})`;
        this.ctx.lineWidth = 4 - i;
        this.ctx.shadowColor = '#FFD700';
        this.ctx.shadowBlur = 30;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        this.ctx.stroke();
      }
      this.ctx.restore();
    }

    if (this.resultAlpha > 0) {
      this.ctx.save();
      this.ctx.translate(centerX, centerY);
      this.ctx.scale(this.resultScale, this.resultScale);
      this.ctx.globalAlpha = this.resultAlpha;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';

      this.ctx.font = 'bold 34px Orbitron, sans-serif';
      this.ctx.shadowColor = '#FF7B24';
      this.ctx.shadowBlur = 20;
      this.ctx.fillStyle = '#FFD700';
      this.ctx.fillText(this.resultRating, 0, -25);

      this.ctx.font = 'bold 56px Orbitron, sans-serif';
      this.ctx.shadowBlur = 30;
      this.ctx.shadowColor = '#FF7B24';
      const scoreGradient = this.ctx.createLinearGradient(-100, 0, 100, 0);
      scoreGradient.addColorStop(0, '#FF7B24');
      scoreGradient.addColorStop(0.5, '#FFD700');
      scoreGradient.addColorStop(1, '#FF7B24');
      this.ctx.fillStyle = scoreGradient;
      this.ctx.fillText(`${this.resultScore} 分`, 0, 40);

      this.ctx.restore();
    }
  }

  private drawRollButton(): void {
    const btn = this.rollButton;
    const cx = btn.x + btn.width / 2;
    const cy = btn.y + btn.height / 2;

    this.ctx.save();
    this.ctx.translate(cx, cy);
    this.ctx.scale(btn.scale, btn.scale);
    this.ctx.translate(-cx, -cy);

    if (btn.glowIntensity > 0) {
      const glowRadius = btn.width * (0.6 + btn.glowIntensity * 0.3);
      const glowGradient = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);
      glowGradient.addColorStop(0, `rgba(255, 123, 36, ${0.5 * btn.glowIntensity})`);
      glowGradient.addColorStop(0.5, `rgba(255, 215, 0, ${0.2 * btn.glowIntensity})`);
      glowGradient.addColorStop(1, 'transparent');
      this.ctx.fillStyle = glowGradient;
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2);
      this.ctx.fill();
    }

    const r = 32;
    const btnGradient = this.ctx.createLinearGradient(btn.x, btn.y, btn.x, btn.y + btn.height);
    if (this.state === 'idle') {
      btnGradient.addColorStop(0, '#FF9933');
      btnGradient.addColorStop(0.3, '#FF7B24');
      btnGradient.addColorStop(1, '#E65100');
    } else {
      btnGradient.addColorStop(0, '#555555');
      btnGradient.addColorStop(1, '#333333');
    }

    const shadowBlur = btn.hover && this.state === 'idle' ? 25 : 12;
    this.ctx.shadowColor = '#FF7B24';
    this.ctx.shadowBlur = shadowBlur;
    this.ctx.fillStyle = btnGradient;
    this.roundRect(btn.x, btn.y, btn.width, btn.height, r);
    this.ctx.fill();

    this.ctx.shadowBlur = 0;
    const borderColor = btn.hover && this.state === 'idle' ? '#FFD700' : 'rgba(255, 215, 0, 0.4)';
    this.ctx.strokeStyle = borderColor;
    this.ctx.lineWidth = 2.5;
    this.roundRect(btn.x, btn.y, btn.width, btn.height, r);
    this.ctx.stroke();

    const highlightGradient = this.ctx.createLinearGradient(
      btn.x + 10,
      btn.y + 5,
      btn.x + 10,
      btn.y + btn.height * 0.4
    );
    highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    this.ctx.fillStyle = highlightGradient;
    this.roundRect(btn.x + 8, btn.y + 5, btn.width - 16, btn.height * 0.4, r * 0.7);
    this.ctx.fill();

    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = 'bold 24px Orbitron, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    this.ctx.shadowBlur = 2;
    this.ctx.fillText(btn.label, cx, cy);

    this.ctx.restore();
  }

  private drawColorPickers(): void {
    for (const picker of this.colorPickers) {
      const color = picker.colors[picker.selectedIndex];
      const glowColor = picker.glowColors[picker.selectedIndex];
      const size = picker.size * picker.hoverScale;

      this.ctx.save();
      this.ctx.translate(picker.x, picker.y);
      this.ctx.scale(picker.hoverScale, picker.hoverScale);

      this.ctx.shadowColor = glowColor;
      this.ctx.shadowBlur = 18;

      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, picker.size, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.shadowBlur = 0;
      this.ctx.strokeStyle = glowColor;
      this.ctx.lineWidth = 2.5;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, picker.size, 0, Math.PI * 2);
      this.ctx.stroke();

      const innerGradient = this.ctx.createRadialGradient(-size * 0.3, -size * 0.3, 0, 0, 0, size);
      innerGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
      innerGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      this.ctx.fillStyle = innerGradient;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, picker.size * 0.9, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.restore();
    }
  }

  private drawColorLabels(): void {
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    this.ctx.font = '12px Orbitron, sans-serif';
    this.ctx.textAlign = 'center';

    for (const picker of this.colorPickers) {
      this.ctx.fillText('点击换色', picker.x, picker.y + picker.size + 20);
    }

    this.ctx.restore();
  }

  private drawPerfStats(): void {
    const x = this.width - 180;
    const y = 20;
    const w = 160;
    const h = 120;

    this.ctx.save();

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.strokeStyle = 'rgba(255, 123, 36, 0.5)';
    this.ctx.lineWidth = 1;
    this.roundRect(x, y, w, h, 8);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.fillStyle = '#FF7B24';
    this.ctx.font = 'bold 12px Orbitron, sans-serif';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText('性能统计', x + 12, y + 10);

    this.ctx.font = '11px monospace';
    this.ctx.fillStyle = '#FFFFFF';

    const fpsColor = this.perfStats.fps >= 55 ? '#4CAF50' : this.perfStats.fps >= 30 ? '#FF9800' : '#F44336';
    this.ctx.fillStyle = fpsColor;
    this.ctx.fillText(`FPS: ${this.perfStats.fps.toFixed(1)}`, x + 12, y + 32);

    this.ctx.fillStyle = '#AAAAAA';
    this.ctx.fillText(`最低: ${this.perfStats.minFps.toFixed(1)}`, x + 12, y + 50);
    this.ctx.fillText(`最高: ${this.perfStats.maxFps.toFixed(1)}`, x + 12, y + 68);

    if (this.perfStats.lastRollDuration > 0) {
      const durationColor = this.perfStats.lastRollDuration <= 2 ? '#4CAF50' : '#F44336';
      this.ctx.fillStyle = durationColor;
      this.ctx.fillText(`耗时: ${this.perfStats.lastRollDuration.toFixed(2)}s`, x + 12, y + 86);
    }

    this.ctx.fillStyle = '#666666';
    this.ctx.font = '10px sans-serif';
    this.ctx.fillText('按 P 键切换', x + 12, y + 102);

    this.ctx.restore();
  }

  private roundRect(x: number, y: number, width: number, height: number, radius: number): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  start(): void {
    this.lastTime = performance.now();
    this.animationFrameId = requestAnimationFrame(this.animate);
  }

  stop(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}

const game = new Game();
game.start();
