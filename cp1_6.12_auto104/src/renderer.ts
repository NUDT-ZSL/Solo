import type { CombatState, Projectile, Particle, ScreenFlash } from './combatSystem';

export interface MageState {
  x: number;
  y: number;
  isHitRecovering: boolean;
  hasSpeedBoost: boolean;
  hasUltimateReady: boolean;
  isChained: boolean;
  runeRotation: number;
  chainProgress: number;
}

export interface UIState {
  countdown: number | null;
  countdownScale: number;
  shuffledLetters: string[];
  currentWord: string;
  blueProgress: number;
  redProgress: number;
  blueHealth: number;
  redHealth: number;
  cardBobOffset: number;
  progressGlowIntensity: number;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
    this.width = canvas.width;
    this.height = canvas.height;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
  }

  render(
    combatState: CombatState,
    blueMage: MageState,
    redMage: MageState,
    uiState: UIState,
    globalTime: number
  ): void {
    this.drawBackground();
    this.drawWordCard(uiState, globalTime);
    this.drawProgressBar(uiState);
    this.drawMage(blueMage, 'blue', globalTime);
    this.drawMage(redMage, 'red', globalTime);
    this.drawProjectiles(combatState.projectiles);
    this.drawParticles(combatState.particles);
    this.drawHealthBars(blueMage, redMage, uiState);
    if (uiState.countdown !== null) {
      this.drawCountdown(uiState.countdown, uiState.countdownScale);
    }
    this.drawScreenFlashes(combatState.screenFlashes);
    this.drawControlsHint();
  }

  private drawControlsHint(): void {
    this.ctx.save();
    this.ctx.font = '13px sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'bottom';
    this.ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
    this.ctx.fillText('Blue Mage: type letters directly', 20, this.height - 40);
    this.ctx.textAlign = 'right';
    this.ctx.fillText('Red Mage: hold Shift + type letters', this.width - 20, this.height - 40);
    this.ctx.textAlign = 'center';
    this.ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
    this.ctx.fillText('Spell the hidden word to fire magic | 3 correct streaks = Ultimate', this.width / 2, this.height - 15);
    this.ctx.restore();
  }

  private drawBackground(): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#1e1b4b');
    gradient.addColorStop(1, '#0f172a');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    for (let i = 0; i < 50; i++) {
      const x = (i * 137.5) % this.width;
      const y = (i * 73.7) % this.height;
      const size = (i % 3) * 0.5 + 0.5;
      this.ctx.beginPath();
      this.ctx.arc(x, y, size, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawWordCard(uiState: UIState, time: number): void {
    const cardW = 400;
    const cardH = 160;
    const cardX = (this.width - cardW) / 2;
    const cardY = this.height / 2 - cardH / 2 + uiState.cardBobOffset;

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.roundRect(cardX, cardY, cardW, cardH, 20);
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    this.ctx.fill();
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();

    this.ctx.filter = 'blur(8px)';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.fill();
    this.ctx.filter = 'none';

    const letters = uiState.shuffledLetters;
    const letterSize = 48;
    const totalW = letters.length * (letterSize + 8);
    const startX = cardX + (cardW - totalW) / 2 + letterSize / 2;
    const startY = cardY + cardH / 2;

    letters.forEach((letter, i) => {
      const x = startX + i * (letterSize + 8);
      this.ctx.fillStyle = '#e2e8f0';
      this.ctx.font = `bold ${letterSize}px 'Courier New', monospace`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(letter.toUpperCase(), x, startY);
    });

    this.ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
    this.ctx.font = '14px sans-serif';
    this.ctx.fillText('Type the original word', cardX + cardW / 2, cardY + cardH - 24);

    this.ctx.restore();
  }

  private drawProgressBar(uiState: UIState): void {
    const barW = 400;
    const barH = 12;
    const barX = (this.width - barW) / 2;
    const barY = this.height / 2 + 100;

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.beginPath();
    this.ctx.roundRect(barX, barY, barW, barH, 6);
    this.ctx.fill();

    const bluePct = uiState.currentWord.length > 0
      ? uiState.blueProgress / uiState.currentWord.length
      : 0;
    const redPct = uiState.currentWord.length > 0
      ? uiState.redProgress / uiState.currentWord.length
      : 0;

    if (bluePct > 0) {
      const blueW = barW * bluePct * 0.5;
      const blueGrad = this.ctx.createLinearGradient(barX, barY, barX + blueW, barY);
      blueGrad.addColorStop(0, '#3b82f6');
      blueGrad.addColorStop(1, '#60a5fa');
      this.ctx.fillStyle = blueGrad;
      this.ctx.beginPath();
      this.ctx.roundRect(barX, barY, blueW, barH, 6);
      this.ctx.fill();

      if (bluePct >= 1) {
        this.ctx.shadowColor = '#fbbf24';
        this.ctx.shadowBlur = uiState.progressGlowIntensity;
        this.ctx.fillStyle = 'rgba(251, 191, 36, 0.8)';
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
      }
    }

    if (redPct > 0) {
      const redW = barW * redPct * 0.5;
      const redGrad = this.ctx.createLinearGradient(barX + barW - redW, barY, barX + barW, barY);
      redGrad.addColorStop(0, '#ef4444');
      redGrad.addColorStop(1, '#f87171');
      this.ctx.fillStyle = redGrad;
      this.ctx.beginPath();
      this.ctx.roundRect(barX + barW - redW, barY, redW, barH, 6);
      this.ctx.fill();

      if (redPct >= 1) {
        this.ctx.shadowColor = '#fbbf24';
        this.ctx.shadowBlur = uiState.progressGlowIntensity;
        this.ctx.fillStyle = 'rgba(251, 191, 36, 0.8)';
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
      }
    }
  }

  private drawMage(mage: MageState, color: 'blue' | 'red', time: number): void {
    const { x, y, isHitRecovering, hasSpeedBoost, hasUltimateReady, isChained, runeRotation, chainProgress } = mage;

    this.ctx.save();
    this.ctx.translate(x, y);

    if (isHitRecovering) {
      const shake = Math.sin(time * 60) * 3;
      this.ctx.translate(shake, 0);
      this.ctx.globalAlpha = 0.7;
    }

    if (hasSpeedBoost) {
      this.ctx.beginPath();
      const boostGrad = this.ctx.createRadialGradient(0, 0, 20, 0, 0, 60);
      boostGrad.addColorStop(0, 'rgba(251, 191, 36, 0)');
      boostGrad.addColorStop(0.7, 'rgba(251, 191, 36, 0.2)');
      boostGrad.addColorStop(1, 'rgba(251, 191, 36, 0)');
      this.ctx.fillStyle = boostGrad;
      this.ctx.arc(0, 0, 60 + Math.sin(time * 8) * 5, 0, Math.PI * 2);
      this.ctx.fill();
    }

    if (hasUltimateReady) {
      this.ctx.save();
      this.ctx.rotate(runeRotation);
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8;
        const rx = Math.cos(angle) * 50;
        const ry = Math.sin(angle) * 50;
        this.ctx.save();
        this.ctx.translate(rx, ry);
        this.ctx.rotate(angle + Math.PI / 2);
        this.ctx.font = 'bold 18px serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillStyle = '#fbbf24';
        this.ctx.shadowColor = '#fbbf24';
        this.ctx.shadowBlur = 10;
        this.ctx.fillText('ᚱ', 0, 0);
        this.ctx.restore();
      }
      this.ctx.beginPath();
      this.ctx.strokeStyle = '#fbbf24';
      this.ctx.lineWidth = 2;
      this.ctx.shadowColor = '#fbbf24';
      this.ctx.shadowBlur = 15;
      this.ctx.arc(0, 0, 50, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.shadowBlur = 0;
      this.ctx.restore();
    }

    const robeColor = color === 'blue' ? '#3b82f6' : '#ef4444';
    const robeDark = color === 'blue' ? '#1d4ed8' : '#b91c1c';
    const robeLight = color === 'blue' ? '#60a5fa' : '#f87171';

    const capeWave = Math.sin(time * 2 + x * 0.01) * 8;
    this.ctx.beginPath();
    this.ctx.moveTo(-5, -30);
    this.ctx.quadraticCurveTo(-45 + capeWave, -10, -40 + capeWave * 0.5, 40);
    this.ctx.quadraticCurveTo(-30, 35, -5, 30);
    this.ctx.closePath();
    const capeGrad = this.ctx.createLinearGradient(-40, -30, 0, 30);
    capeGrad.addColorStop(0, robeDark);
    capeGrad.addColorStop(1, robeColor);
    this.ctx.fillStyle = capeGrad;
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.moveTo(5, -30);
    this.ctx.quadraticCurveTo(45 - capeWave, -10, 40 - capeWave * 0.5, 40);
    this.ctx.quadraticCurveTo(30, 35, 5, 30);
    this.ctx.closePath();
    this.ctx.fillStyle = capeGrad;
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.ellipse(0, 10, 20, 35, 0, 0, Math.PI * 2);
    const bodyGrad = this.ctx.createLinearGradient(-20, -25, 20, 45);
    bodyGrad.addColorStop(0, robeLight);
    bodyGrad.addColorStop(0.5, robeColor);
    bodyGrad.addColorStop(1, robeDark);
    this.ctx.fillStyle = bodyGrad;
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.arc(0, -35, 18, 0, Math.PI * 2);
    this.ctx.fillStyle = '#fcd9b6';
    this.ctx.fill();

    this.ctx.fillStyle = '#1e293b';
    this.ctx.beginPath();
    this.ctx.arc(-6, -37, 2.5, 0, Math.PI * 2);
    this.ctx.arc(6, -37, 2.5, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.moveTo(-20, -45);
    this.ctx.lineTo(0, -70);
    this.ctx.lineTo(20, -45);
    this.ctx.closePath();
    this.ctx.fillStyle = robeDark;
    this.ctx.fill();

    const staffX = color === 'blue' ? 25 : -25;
    this.ctx.beginPath();
    this.ctx.moveTo(staffX, -20);
    this.ctx.lineTo(staffX + (color === 'blue' ? 3 : -3), 45);
    this.ctx.lineWidth = 4;
    this.ctx.strokeStyle = '#78350f';
    this.ctx.stroke();
    this.ctx.lineWidth = 1;

    this.ctx.beginPath();
    this.ctx.arc(staffX, -25, 8, 0, Math.PI * 2);
    const orbGrad = this.ctx.createRadialGradient(staffX - 2, -27, 1, staffX, -25, 8);
    orbGrad.addColorStop(0, '#ffffff');
    orbGrad.addColorStop(0.5, robeLight);
    orbGrad.addColorStop(1, robeColor);
    this.ctx.fillStyle = orbGrad;
    this.ctx.shadowColor = robeLight;
    this.ctx.shadowBlur = 15;
    this.ctx.fill();
    this.ctx.shadowBlur = 0;

    if (isChained && chainProgress > 0) {
      this.drawChains(mage, color, time);
    }

    this.ctx.restore();
  }

  private drawChains(mage: MageState, color: 'blue' | 'red', time: number): void {
    const { x, y, chainProgress } = mage;
    const numLinks = 8;
    const chainColor = '#d4af37';

    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.strokeStyle = chainColor;
    this.ctx.lineWidth = 4;
    this.ctx.shadowColor = chainColor;
    this.ctx.shadowBlur = 8;

    const startPoints = [
      { sx: 0, sy: -this.height / 2 },
      { sx: this.width / 2, sy: 0 },
      { sx: 0, sy: this.height / 2 },
      { sx: -this.width / 2, sy: 0 }
    ];

    startPoints.forEach((sp, idx) => {
      const targetX = Math.cos((Math.PI * 2 * idx) / 4) * 30;
      const targetY = Math.sin((Math.PI * 2 * idx) / 4) * 15;
      const cx = sp.sx + (targetX - sp.sx) * Math.min(1, chainProgress);
      const cy = sp.sy + (targetY - sp.sy) * Math.min(1, chainProgress);

      for (let i = 0; i < numLinks; i++) {
        const t = i / numLinks;
        const lx = sp.sx + (cx - sp.sx) * t + Math.sin(time * 3 + i) * 3;
        const ly = sp.sy + (cy - sp.sy) * t + Math.cos(time * 3 + i) * 3;

        this.ctx.beginPath();
        const rot = Math.sin(time * 2 + i) * 0.5;
        this.ctx.save();
        this.ctx.translate(lx, ly);
        this.ctx.rotate(rot);
        this.ctx.ellipse(0, 0, 6, 4, 0, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.restore();
      }
    });

    this.ctx.shadowBlur = 0;
    this.ctx.restore();
  }

  private drawProjectiles(projectiles: Projectile[]): void {
    projectiles.forEach(p => {
      const color = p.owner === 'blue' ? '#60a5fa' : '#f87171';
      const coreColor = p.owner === 'blue' ? '#bfdbfe' : '#fecaca';

      this.ctx.save();
      this.ctx.shadowColor = color;
      this.ctx.shadowBlur = 20;

      this.ctx.beginPath();
      const grad = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      grad.addColorStop(0, coreColor);
      grad.addColorStop(0.5, color);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      this.ctx.fillStyle = grad;
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.beginPath();
      this.ctx.fillStyle = '#ffffff';
      this.ctx.arc(p.x, p.y, p.size * 0.3, 0, Math.PI * 2);
      this.ctx.fill();

      if (p.isUltimate) {
        this.ctx.strokeStyle = '#fbbf24';
        this.ctx.lineWidth = 2;
        this.ctx.shadowColor = '#fbbf24';
        this.ctx.shadowBlur = 25;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size + 5, 0, Math.PI * 2);
        this.ctx.stroke();
      }

      this.ctx.restore();
    });
  }

  private drawParticles(particles: Particle[]): void {
    particles.forEach(p => {
      const alpha = 1 - p.life / p.maxLife;
      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.shadowColor = p.color;
      this.ctx.shadowBlur = 5;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });
  }

  private drawHealthBars(blue: MageState, red: MageState, ui: UIState): void {
    const barW = 180;
    const barH = 14;
    const blueX = blue.x - barW / 2;
    const redX = red.x - barW / 2;
    const barY = blue.y - 80;

    this.drawHealthBar(blueX, barY, barW, barH, ui.blueHealth, 'blue');
    this.drawHealthBar(redX, barY, barW, barH, ui.redHealth, 'red');
  }

  private drawHealthBar(x: number, y: number, w: number, h: number, hp: number, color: 'blue' | 'red'): void {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.beginPath();
    this.ctx.roundRect(x - 2, y - 2, w + 4, h + 4, 6);
    this.ctx.fill();

    this.ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
    this.ctx.beginPath();
    this.ctx.roundRect(x, y, w, h, 4);
    this.ctx.fill();

    const pct = hp / 100;
    if (pct > 0) {
      const fillW = w * pct;
      const grad = this.ctx.createLinearGradient(x, y, x + fillW, y);
      if (color === 'blue') {
        grad.addColorStop(0, '#3b82f6');
        grad.addColorStop(1, '#60a5fa');
      } else {
        grad.addColorStop(0, '#ef4444');
        grad.addColorStop(1, '#f87171');
      }
      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.roundRect(x, y, fillW, h, 4);
      this.ctx.fill();
    }

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 11px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(`${hp}/100`, x + w / 2, y + h / 2);
  }

  private drawCountdown(count: number, scale: number): void {
    this.ctx.save();
    this.ctx.translate(this.width / 2, this.height / 2 - 80);
    this.ctx.scale(scale, scale);

    this.ctx.font = 'bold 120px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    this.ctx.shadowColor = '#fbbf24';
    this.ctx.shadowBlur = 30;
    this.ctx.fillStyle = '#fbbf24';
    this.ctx.fillText(count.toString(), 0, 0);

    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 4;
    this.ctx.shadowBlur = 0;
    this.ctx.strokeText(count.toString(), 0, 0);

    this.ctx.restore();
  }

  private drawScreenFlashes(flashes: ScreenFlash[]): void {
    flashes.forEach(f => {
      const alpha = 1 - f.time / f.duration;
      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = f.color;
      this.ctx.fillRect(0, 0, this.width, this.height);
      this.ctx.restore();
    });
  }
}
