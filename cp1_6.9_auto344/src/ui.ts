import { HitEvent } from './note';

export type GameState = 'ready' | 'playing' | 'ended';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  rotation: number;
  rotationSpeed: number;
}

export interface StarParticle {
  x: number;
  y: number;
  size: number;
  alpha: number;
  angle: number;
}

interface PulseWave {
  x: number;
  y: number;
  startTime: number;
  color: string;
  duration: number;
}

interface TextEffect {
  text: string;
  x: number;
  y: number;
  startTime: number;
  color: string;
  fontSize: number;
  duration: number;
}

interface CrackEffect {
  x: number;
  y: number;
  startTime: number;
  duration: number;
}

export class UIRenderer {
  private canvasWidth: number;
  private canvasHeight: number;
  private stars: StarParticle[];
  private globalRotation: number = 0;
  private pulseWaves: PulseWave[] = [];
  private textEffects: TextEffect[] = [];
  private crackEffects: CrackEffect[] = [];
  private comboScaleAnim: number = 1;
  private comboScaleTarget: number = 1;
  private difficultyFlashAlpha: number = 0;
  private missEdgePulse: number = 0;
  private readyBlinkTimer: number = 0;
  private titleBreathTimer: number = 0;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.stars = [];
    this.initStars();
  }

  private initStars(): void {
    for (let i = 0; i < 100; i++) {
      this.stars.push({
        x: Math.random() * 1.5 - 0.25,
        y: Math.random() * 1.5 - 0.25,
        size: 1 + Math.random() * 1,
        alpha: 0.3 + Math.random() * 0.3,
        angle: Math.random() * Math.PI * 2
      });
    }
  }

  public resize(canvasWidth: number, canvasHeight: number): void {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  public triggerDifficultyFlash(): void {
    this.difficultyFlashAlpha = 0.3;
  }

  public onHit(event: HitEvent): void {
    const now = performance.now();

    if (event.type === 'perfect' || event.type === 'good' || event.type === 'reverse_hit') {
      this.pulseWaves.push({
        x: event.x,
        y: event.y,
        startTime: now,
        color: event.color,
        duration: 400
      });

      if (event.type === 'perfect') {
        this.textEffects.push({
          text: 'Perfect！',
          x: event.x,
          y: event.y,
          startTime: now,
          color: '#FCD34D',
          fontSize: 24,
          duration: 1000
        });
      } else if (event.type === 'reverse_hit') {
        this.textEffects.push({
          text: 'Reverse！',
          x: event.x,
          y: event.y,
          startTime: now,
          color: '#F472B6',
          fontSize: 22,
          duration: 1000
        });
      } else {
        this.textEffects.push({
          text: 'Good',
          x: event.x,
          y: event.y,
          startTime: now,
          color: '#FFFFFF',
          fontSize: 18,
          duration: 1000
        });
      }

      this.triggerComboBounce();
    } else if (event.type === 'miss' || event.type === 'reverse_miss') {
      this.crackEffects.push({
        x: event.x,
        y: event.y,
        startTime: now,
        duration: 300
      });
      this.missEdgePulse = 0.2;
    }
  }

  public triggerComboBounce(): void {
    this.comboScaleTarget = 1.2;
  }

  public update(deltaTime: number, now: number): void {
    this.globalRotation += 0.01 * Math.PI / 180;

    this.stars.forEach(star => {
      star.angle += 0.01 * Math.PI / 180;
    });

    if (this.comboScaleTarget !== this.comboScaleAnim) {
      const diff = this.comboScaleTarget - this.comboScaleAnim;
      this.comboScaleAnim += diff * 0.15;
      if (Math.abs(diff) < 0.01) {
        this.comboScaleAnim = this.comboScaleTarget;
      }
      if (this.comboScaleTarget > 1 && Math.abs(diff) < 0.05) {
        this.comboScaleTarget = 1;
      }
    }

    if (this.difficultyFlashAlpha > 0) {
      this.difficultyFlashAlpha = Math.max(0, this.difficultyFlashAlpha - deltaTime / 0.3);
    }

    if (this.missEdgePulse > 0) {
      this.missEdgePulse = Math.max(0, this.missEdgePulse - deltaTime / 0.5);
    }

    const PULSE_DURATION = 400;
    this.pulseWaves = this.pulseWaves.filter(w => now - w.startTime < PULSE_DURATION);

    const TEXT_DURATION = 1000;
    this.textEffects = this.textEffects.filter(t => now - t.startTime < TEXT_DURATION);

    const CRACK_DURATION = 300;
    this.crackEffects = this.crackEffects.filter(c => now - c.startTime < CRACK_DURATION);

    this.readyBlinkTimer += deltaTime;
    this.titleBreathTimer += deltaTime;
  }

  public renderBackground(ctx: CanvasRenderingContext2D): void {
    const gradient = ctx.createLinearGradient(0, 0, 0, this.canvasHeight);
    gradient.addColorStop(0, '#0a0a2e');
    gradient.addColorStop(1, '#1a1a3e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    ctx.save();
    const centerX = this.canvasWidth / 2;
    const centerY = this.canvasHeight / 2;
    ctx.translate(centerX, centerY);
    ctx.rotate(this.globalRotation);
    ctx.translate(-centerX, -centerY);

    this.stars.forEach(star => {
      const px = star.x * this.canvasWidth;
      const py = star.y * this.canvasHeight;
      ctx.save();
      ctx.globalAlpha = star.alpha;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(px, py, star.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    ctx.restore();
  }

  public renderGameUI(
    ctx: CanvasRenderingContext2D,
    score: number,
    combo: number,
    comboMultiplier: number,
    difficultyLevel: number,
    now: number
  ): void {
    ctx.save();
    ctx.font = 'bold 28px \'Segoe UI\', sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`得分: ${score}`, 30, 30);

    ctx.font = '16px \'Segoe UI\', sans-serif';
    ctx.fillStyle = '#a0a0c0';
    ctx.fillText(`难度: Lv.${difficultyLevel}`, 30, 68);
    ctx.restore();

    if (combo > 1) {
      ctx.save();
      const comboX = 30;
      const comboY = 100;
      ctx.translate(comboX, comboY);
      ctx.scale(this.comboScaleAnim, this.comboScaleAnim);

      ctx.font = 'bold 36px \'Segoe UI\', sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      const gradient = ctx.createLinearGradient(0, 0, 120, 0);
      gradient.addColorStop(0, '#8B5CF6');
      gradient.addColorStop(1, '#3B82F6');
      ctx.fillStyle = gradient;
      ctx.fillText(`×${comboMultiplier}`, 0, 0);

      ctx.font = '18px \'Segoe UI\', sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`${combo} 连击`, 0, 44);
      ctx.restore();
    }

    this.renderPulseWaves(ctx, now);
    this.renderTextEffects(ctx, now);
    this.renderCrackEffects(ctx, now);
    this.renderEdgePulse(ctx);
    this.renderDifficultyFlash(ctx);
  }

  private easeOutQuad(t: number): number {
    return t * (2 - t);
  }

  private renderPulseWaves(ctx: CanvasRenderingContext2D, now: number): void {
    for (const wave of this.pulseWaves) {
      const elapsed = now - wave.startTime;
      const progress = Math.min(elapsed / wave.duration, 1);
      const eased = this.easeOutQuad(progress);
      const radius = 5 + (40 - 5) * eased;
      const alpha = 1 - progress;

      ctx.save();
      ctx.globalAlpha = alpha * 0.8;
      ctx.strokeStyle = wave.color;
      ctx.lineWidth = 4;
      ctx.shadowColor = wave.color;
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(wave.x, wave.y, radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalAlpha = alpha * 0.3;
      ctx.fillStyle = wave.color;
      ctx.beginPath();
      ctx.arc(wave.x, wave.y, radius * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private renderTextEffects(ctx: CanvasRenderingContext2D, now: number): void {
    for (const effect of this.textEffects) {
      const elapsed = now - effect.startTime;
      const progress = Math.min(elapsed / effect.duration, 1);
      const alpha = 1 - progress;
      const easedProgress = this.easeOutQuad(progress);

      const startY = effect.y;
      const peakHeight = 80;
      const x = effect.x + Math.sin(progress * Math.PI) * 20;
      const y = startY - easedProgress * peakHeight + progress * progress * 30;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `bold ${effect.fontSize}px 'Segoe UI', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = effect.color;
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      ctx.shadowBlur = 8;
      ctx.fillText(effect.text, x, y);
      ctx.restore();
    }
  }

  private renderCrackEffects(ctx: CanvasRenderingContext2D, now: number): void {
    for (const crack of this.crackEffects) {
      const elapsed = now - crack.startTime;
      const progress = Math.min(elapsed / crack.duration, 1);
      const alpha = 1 - progress;
      const size = 10 + progress * 30;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#EF4444';
      ctx.shadowBlur = 15;

      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 * i) / 6 + crack.startTime * 0.001;
        const startR = 5;
        const endR = size;
        ctx.beginPath();
        ctx.moveTo(
          crack.x + Math.cos(angle) * startR,
          crack.y + Math.sin(angle) * startR
        );
        ctx.lineTo(
          crack.x + Math.cos(angle) * endR,
          crack.y + Math.sin(angle) * endR
        );
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  private renderEdgePulse(ctx: CanvasRenderingContext2D): void {
    if (this.missEdgePulse <= 0) return;

    ctx.save();
    const pulseAlpha = this.missEdgePulse;
    const gradient = ctx.createRadialGradient(
      this.canvasWidth / 2,
      this.canvasHeight / 2,
      Math.min(this.canvasWidth, this.canvasHeight) * 0.3,
      this.canvasWidth / 2,
      this.canvasHeight / 2,
      Math.max(this.canvasWidth, this.canvasHeight) * 0.7
    );
    gradient.addColorStop(0, 'rgba(239, 68, 68, 0)');
    gradient.addColorStop(1, `rgba(239, 68, 68, ${pulseAlpha})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    ctx.restore();
  }

  private renderDifficultyFlash(ctx: CanvasRenderingContext2D): void {
    if (this.difficultyFlashAlpha <= 0) return;

    ctx.save();
    ctx.globalAlpha = this.difficultyFlashAlpha;
    ctx.fillStyle = '#8B5CF6';
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    ctx.restore();
  }

  public renderReadyScreen(ctx: CanvasRenderingContext2D): void {
    const breathScale = 1 + Math.sin(this.titleBreathTimer * Math.PI) * 0.015;

    ctx.save();
    const centerX = this.canvasWidth / 2;
    const centerY = this.canvasHeight / 2;

    ctx.translate(centerX, centerY);
    ctx.scale(breathScale, breathScale);

    const gradient = ctx.createLinearGradient(-200, 0, 200, 0);
    gradient.addColorStop(0, '#8B5CF6');
    gradient.addColorStop(1, '#3B82F6');

    ctx.font = 'bold 64px \'Segoe UI\', sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = gradient;
    ctx.shadowColor = 'rgba(139, 92, 246, 0.8)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 4;
    ctx.fillText('幻律之音', 0, -60);
    ctx.restore();

    ctx.save();
    const blinkAlpha = 0.5 + Math.sin(this.readyBlinkTimer * Math.PI * 2) * 0.5;
    ctx.globalAlpha = blinkAlpha;
    ctx.font = '24px \'Segoe UI\', sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillText('按任意键开始', centerX, centerY + 40);
    ctx.restore();

    ctx.save();
    ctx.font = '16px \'Segoe UI\', sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#8888aa';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillText('D = 紫罗兰轨道 | F = 翡翠轨道 | J = 天蓝轨道', centerX, centerY + 100);
    ctx.fillText('BPM 120 · 跟随节奏精准打击', centerX, centerY + 130);
    ctx.restore();
  }

  public renderEndScreen(
    ctx: CanvasRenderingContext2D,
    finalScore: number,
    maxCombo: number,
    maxMultiplier: number,
    now: number
  ): { restartX: number; restartY: number; restartW: number; restartH: number } {
    const centerX = this.canvasWidth / 2;
    const centerY = this.canvasHeight / 2;

    ctx.save();
    ctx.fillStyle = 'rgba(10, 10, 46, 0.85)';
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    ctx.restore();

    ctx.save();
    ctx.font = 'bold 48px \'Segoe UI\', sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const titleGradient = ctx.createLinearGradient(-150, 0, 150, 0);
    titleGradient.addColorStop(0, '#8B5CF6');
    titleGradient.addColorStop(1, '#3B82F6');
    ctx.fillStyle = titleGradient;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.shadowBlur = 15;
    ctx.fillText('游戏结束', centerX, centerY - 180);
    ctx.restore();

    ctx.save();
    ctx.font = 'bold 36px \'Segoe UI\', sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillText(`最终得分: ${finalScore}`, centerX, centerY - 110);

    ctx.font = '24px \'Segoe UI\', sans-serif';
    ctx.fillStyle = '#c0c0e0';
    ctx.fillText(`最高连击: ${maxCombo}`, centerX, centerY - 60);
    ctx.fillText(`最高倍数: ×${maxMultiplier}`, centerX, centerY - 25);

    let rankText = '';
    let rankColor = '';
    let rankEffect = '';
    if (finalScore > 5000) {
      rankText = '大师';
      rankColor = '#FFD700';
      rankEffect = 'gold';
    } else if (finalScore >= 3000) {
      rankText = '精通';
      rankColor = '#C0C0C0';
      rankEffect = 'silver';
    } else {
      rankText = '学徒';
      rankColor = '#FFFFFF';
      rankEffect = 'normal';
    }

    if (rankEffect === 'gold') {
      const shimmer = 0.7 + Math.sin(now * 0.005) * 0.3;
      ctx.globalAlpha = shimmer;
    } else if (rankEffect === 'silver') {
      const shimmer = 0.85 + Math.sin(now * 0.003) * 0.15;
      ctx.globalAlpha = shimmer;
    }

    ctx.font = 'bold 42px \'Segoe UI\', sans-serif';
    ctx.fillStyle = rankColor;
    if (rankEffect !== 'normal') {
      ctx.shadowColor = rankColor;
      ctx.shadowBlur = 20;
    } else {
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 0;
    }
    ctx.fillText(`评价: ${rankText}`, centerX, centerY + 30);
    ctx.globalAlpha = 1;
    ctx.restore();

    const btnW = 160;
    const btnH = 50;
    const btnX = centerX - btnW / 2;
    const btnY = centerY + 110;

    const btnGradient = ctx.createLinearGradient(btnX, btnY, btnX + btnW, btnY);
    btnGradient.addColorStop(0, '#8B5CF6');
    btnGradient.addColorStop(1, '#3B82F6');

    ctx.save();
    const radius = 10;
    ctx.beginPath();
    ctx.moveTo(btnX + radius, btnY);
    ctx.lineTo(btnX + btnW - radius, btnY);
    ctx.quadraticCurveTo(btnX + btnW, btnY, btnX + btnW, btnY + radius);
    ctx.lineTo(btnX + btnW, btnY + btnH - radius);
    ctx.quadraticCurveTo(btnX + btnW, btnY + btnH, btnX + btnW - radius, btnY + btnH);
    ctx.lineTo(btnX + radius, btnY + btnH);
    ctx.quadraticCurveTo(btnX, btnY + btnH, btnX, btnY + btnH - radius);
    ctx.lineTo(btnX, btnY + radius);
    ctx.quadraticCurveTo(btnX, btnY, btnX + radius, btnY);
    ctx.closePath();

    ctx.fillStyle = btnGradient;
    ctx.shadowColor = 'rgba(139, 92, 246, 0.5)';
    ctx.shadowBlur = 15;
    ctx.fill();

    ctx.font = 'bold 20px \'Segoe UI\', sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.fillText('重新开始', centerX, btnY + btnH / 2);
    ctx.restore();

    return { restartX: btnX, restartY: btnY, restartW: btnW, restartH: btnH };
  }
}
