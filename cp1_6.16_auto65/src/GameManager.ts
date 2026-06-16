import { StarField, Star } from './StarField';
import { ParticleSystem } from './ParticleSystem';

interface ShadowEntity {
  x: number;
  y: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  progress: number;
  speed: number;
  radius: number;
  hp: number;
  maxHp: number;
  alive: boolean;
}

interface Familiar {
  x: number;
  y: number;
  cooldown: number;
  fireRate: number;
  alive: boolean;
}

interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  color: string;
  alive: boolean;
}

export class GameManager {
  private ctx: CanvasRenderingContext2D;
  private canvasW: number;
  private canvasH: number;
  private starField: StarField;
  private particles: ParticleSystem;

  private lives: number = 3;
  private score: number = 0;
  private runeLit: number = 0;
  private maxRunes: number = 8;

  private familiars: Familiar[] = [];
  private shadows: ShadowEntity[] = [];
  private projectiles: Projectile[] = [];

  private wave: number = 1;
  private shadowSpawnTimer: number = 0;
  private shadowSpawnInterval: number = 4;

  private patternTimer: number = 5;
  private patternInterval: number = 5;
  private patternActive: boolean = false;
  private patternTimeLeft: number = 15;
  private patternHintFadeIn: number = 0;
  private patternHintFadeInDuration: number = 0.3;

  private altarPulseTimer: number = 0;
  private altarPulseDuration: number = 0.2;
  private altarPulseActive: boolean = false;

  private fullscreenRedFlash: number = 0;
  private fullscreenRedFlashDuration: number = 0.3;

  private heartShakeTimers: number[] = [0, 0, 0];
  private heartShakeDuration: number = 0.2;

  private gameOver: boolean = false;
  private gameOverTimer: number = 0;
  private gameOverDuration: number = 3;

  private lastFrameTime: number = 0;
  private running: boolean = false;
  private animationFrameId: number | null = null;

  constructor(ctx: CanvasRenderingContext2D, canvasW: number, canvasH: number) {
    this.ctx = ctx;
    this.canvasW = canvasW;
    this.canvasH = canvasH;
    this.starField = new StarField(canvasW, canvasH);
    this.particles = new ParticleSystem();

    this.starField.setOnSequenceComplete(() => this.onPatternComplete());
  }

  start(): void {
    this.running = true;
    this.lastFrameTime = performance.now();
    this.gameLoop();
  }

  stop(): void {
    this.running = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  handleClick(mx: number, my: number): void {
    if (this.gameOver) return;
    this.starField.handleClick(mx, my);
  }

  private onPatternComplete(): void {
    this.score += 100;
    this.patternActive = false;
    this.patternTimer = this.patternInterval;
    this.patternTimeLeft = 15;

    const center = this.starField.getCenter();
    this.particles.spawnSummonParticles(center.x, center.y);
    this.particles.spawnRingEffect(center.x, center.y);

    this.familiars.push({
      x: center.x,
      y: center.y,
      cooldown: 0,
      fireRate: 1.0,
      alive: true
    });

    this.runeLit = Math.min(this.runeLit + 1, this.maxRunes);
    if (this.runeLit === this.maxRunes) {
      this.score += 500;
      this.particles.spawnFireworkParticles(center.x, center.y);
      this.runeLit = 0;
    }

    this.starField.resetConnection();
    this.starField.generateTargetSequence(3 + Math.floor(Math.random() * 3));
  }

  private triggerShadowAttack(): void {
    this.lives = Math.max(0, this.lives - 1);
    this.altarPulseActive = true;
    this.altarPulseTimer = this.altarPulseDuration;
    this.fullscreenRedFlash = this.fullscreenRedFlashDuration;
    if (this.lives < 3) {
      this.heartShakeTimers[this.lives] = this.heartShakeDuration;
    }
    if (this.lives <= 0) {
      this.gameOver = true;
      this.gameOverTimer = this.gameOverDuration;
    }
  }

  private spawnShadow(): void {
    const startX = this.canvasW + 30;
    const startY = 100 + Math.random() * (this.canvasH - 200);
    const bounds = this.starField.getAltarBounds();
    const targetX = bounds.x + bounds.w / 2;
    const targetY = bounds.y + bounds.h / 2;
    this.shadows.push({
      x: startX,
      y: startY,
      startX,
      startY,
      targetX,
      targetY,
      progress: 0,
      speed: 0.08 + this.wave * 0.01,
      radius: 18,
      hp: 2 + Math.floor(this.wave / 2),
      maxHp: 2 + Math.floor(this.wave / 2),
      alive: true
    });
  }

  private updatePattern(deltaTime: number): void {
    if (!this.patternActive) {
      this.patternTimer -= deltaTime;
      if (this.patternTimer <= 0) {
        this.patternActive = true;
        this.patternTimeLeft = 15;
        this.patternHintFadeIn = 0;
        this.starField.resetConnection();
        this.starField.generateTargetSequence(3 + Math.floor(Math.random() * 3));
      }
    } else {
      if (this.patternHintFadeIn < this.patternHintFadeInDuration) {
        this.patternHintFadeIn = Math.min(this.patternHintFadeIn + deltaTime, this.patternHintFadeInDuration);
      }
      this.patternTimeLeft -= deltaTime;
      if (this.patternTimeLeft <= 0) {
        this.triggerShadowAttack();
        this.patternActive = false;
        this.patternTimer = this.patternInterval;
        this.patternTimeLeft = 15;
        this.starField.resetConnection();
      }
    }
  }

  private updateShadows(deltaTime: number): void {
    this.shadowSpawnTimer -= deltaTime;
    if (this.shadowSpawnTimer <= 0) {
      this.spawnShadow();
      this.shadowSpawnTimer = this.shadowSpawnInterval;
    }

    for (const shadow of this.shadows) {
      if (!shadow.alive) continue;
      shadow.progress += shadow.speed * deltaTime;
      const t = shadow.progress;
      shadow.x = shadow.startX + (shadow.targetX - shadow.startX) * t;
      shadow.y = shadow.startY + (shadow.targetY - shadow.startY) * t + Math.sin(t * Math.PI) * -80;
      if (shadow.progress >= 1) {
        shadow.alive = false;
        this.triggerShadowAttack();
      }
    }
    this.shadows = this.shadows.filter(s => s.alive);
  }

  private updateFamiliars(deltaTime: number): void {
    for (const familiar of this.familiars) {
      if (!familiar.alive) continue;
      familiar.cooldown -= deltaTime;
      if (familiar.cooldown <= 0 && this.shadows.length > 0) {
        let nearest: ShadowEntity | null = null;
        let nearestDist = Infinity;
        for (const s of this.shadows) {
          if (!s.alive) continue;
          const dx = s.x - familiar.x;
          const dy = s.y - familiar.y;
          const d = dx * dx + dy * dy;
          if (d < nearestDist) {
            nearestDist = d;
            nearest = s;
          }
        }
        if (nearest) {
          const dx = nearest.x - familiar.x;
          const dy = nearest.y - familiar.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 0) {
            const speed = 400;
            this.projectiles.push({
              x: familiar.x,
              y: familiar.y,
              vx: (dx / dist) * speed,
              vy: (dy / dist) * speed,
              damage: 1,
              color: '#FFD700',
              alive: true
            });
            familiar.cooldown = familiar.fireRate;
          }
        }
      }
    }
  }

  private updateProjectiles(deltaTime: number): void {
    for (const proj of this.projectiles) {
      if (!proj.alive) continue;
      proj.x += proj.vx * deltaTime;
      proj.y += proj.vy * deltaTime;
      if (proj.x < -50 || proj.x > this.canvasW + 50 || proj.y < -50 || proj.y > this.canvasH + 50) {
        proj.alive = false;
        continue;
      }
      for (const shadow of this.shadows) {
        if (!shadow.alive) continue;
        const dx = proj.x - shadow.x;
        const dy = proj.y - shadow.y;
        const d = dx * dx + dy * dy;
        const r = shadow.radius + 4;
        if (d <= r * r) {
          proj.alive = false;
          shadow.hp -= proj.damage;
          if (shadow.hp <= 0) {
            shadow.alive = false;
            this.score += 50;
            this.particles.spawnSummonParticles(shadow.x, shadow.y);
          }
          break;
        }
      }
    }
    this.projectiles = this.projectiles.filter(p => p.alive);
  }

  private updateEffects(deltaTime: number): void {
    this.particles.update(deltaTime);
    this.starField.update(deltaTime);

    if (this.altarPulseActive) {
      this.altarPulseTimer -= deltaTime;
      if (this.altarPulseTimer <= 0) {
        this.altarPulseActive = false;
      }
    }

    if (this.fullscreenRedFlash > 0) {
      this.fullscreenRedFlash -= deltaTime;
    }

    for (let i = 0; i < this.heartShakeTimers.length; i++) {
      if (this.heartShakeTimers[i] > 0) {
        this.heartShakeTimers[i] -= deltaTime;
      }
    }

    if (this.gameOver) {
      this.gameOverTimer -= deltaTime;
    }
  }

  private gameLoop = (): void => {
    if (!this.running) return;
    const now = performance.now();
    let deltaTime = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;
    if (deltaTime > 0.1) deltaTime = 0.1;

    if (!this.gameOver) {
      this.updatePattern(deltaTime);
      this.updateShadows(deltaTime);
      this.updateFamiliars(deltaTime);
      this.updateProjectiles(deltaTime);
    }
    this.updateEffects(deltaTime);

    this.render();
    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  }

  private renderAltarBorder(): void {
    const bounds = this.starField.getAltarBounds();
    const padding = 10;
    const x = bounds.x - padding;
    const y = bounds.y - padding;
    const w = bounds.w + padding * 2;
    const h = bounds.h + padding * 2;
    const gradient = this.ctx.createLinearGradient(x, y, x + w, y + h);
    gradient.addColorStop(0, '#1A1A2E');
    gradient.addColorStop(1, '#16213E');
    this.ctx.save();
    this.ctx.strokeStyle = gradient;
    this.ctx.lineWidth = 6;
    this.ctx.strokeRect(x, y, w, h);

    if (this.altarPulseActive) {
      const pulseProgress = 1 - this.altarPulseTimer / this.altarPulseDuration;
      this.ctx.strokeStyle = `rgba(233, 69, 96, ${1 - pulseProgress})`;
      this.ctx.lineWidth = 6 + pulseProgress * 10;
      this.ctx.strokeRect(x, y, w, h);
    }
    this.ctx.restore();
  }

  private renderRuneCircle(): void {
    const center = this.starField.getCenter();
    const radius = Math.min(this.starField.getAltarBounds().w, this.starField.getAltarBounds().h) / 2 - 10;
    for (let i = 0; i < this.maxRunes; i++) {
      const angle = (i / this.maxRunes) * Math.PI * 2 - Math.PI / 2;
      const rx = center.x + Math.cos(angle) * radius;
      const ry = center.y + Math.sin(angle) * radius;
      if (i < this.runeLit) {
        const t = i / (this.maxRunes - 1);
        const r = Math.round(52 + (155 - 52) * t);
        const g = Math.round(152 + (89 - 152) * t);
        const b = Math.round(219 + (182 - 219) * t);
        this.ctx.save();
        this.ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        this.ctx.shadowColor = `rgb(${r}, ${g}, ${b})`;
        this.ctx.shadowBlur = 10;
        this.ctx.beginPath();
        this.ctx.arc(rx, ry, 8, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
      } else {
        this.ctx.save();
        this.ctx.strokeStyle = '#3A3A5A';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(rx, ry, 8, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.restore();
      }
    }
  }

  private renderLives(): void {
    for (let i = 0; i < 3; i++) {
      let hx = 30 + i * 40;
      let hy = 30;
      const shakeTimer = this.heartShakeTimers[i];
      if (shakeTimer > 0) {
        const shakeProgress = shakeTimer / this.heartShakeDuration;
        const shakeAmount = shakeProgress * 5;
        hx += (Math.random() - 0.5) * shakeAmount * 2;
        hy += (Math.random() - 0.5) * shakeAmount * 2;
      }
      this.ctx.save();
      this.ctx.translate(hx, hy);
      this.ctx.beginPath();
      const size = 14;
      this.ctx.moveTo(0, size * 0.3);
      this.ctx.bezierCurveTo(size * 0.5, -size * 0.5, size, size * 0.1, 0, size);
      this.ctx.bezierCurveTo(-size, size * 0.1, -size * 0.5, -size * 0.5, 0, size * 0.3);
      this.ctx.closePath();
      this.ctx.fillStyle = i < this.lives ? '#E74C3C' : '#7F8C8D';
      this.ctx.fill();
      if (i < this.lives) {
        this.ctx.shadowColor = '#E74C3C';
        this.ctx.shadowBlur = 8;
        this.ctx.fill();
      }
      this.ctx.restore();
    }
  }

  private renderScore(): void {
    this.ctx.save();
    this.ctx.font = 'bold 24px monospace';
    this.ctx.textAlign = 'right';
    this.ctx.fillStyle = '#FFD700';
    this.ctx.shadowColor = '#FFD700';
    this.ctx.shadowBlur = 6;
    this.ctx.fillText(`分数 ${this.score}`, this.canvasW - 20, 35);
    this.ctx.restore();
  }

  private renderPatternHint(): void {
    if (!this.patternActive) return;
    const fadeAlpha = Math.min(this.patternHintFadeIn / this.patternHintFadeInDuration, 1);
    const bounds = this.starField.getAltarBounds();
    const hintW = 160;
    const hintH = 130;
    const hintX = bounds.x;
    const hintY = bounds.y + bounds.h - hintH - 10;
    this.ctx.save();
    this.ctx.globalAlpha = fadeAlpha;
    const r = 8;
    this.ctx.beginPath();
    this.ctx.moveTo(hintX + r, hintY);
    this.ctx.lineTo(hintX + hintW - r, hintY);
    this.ctx.quadraticCurveTo(hintX + hintW, hintY, hintX + hintW, hintY + r);
    this.ctx.lineTo(hintX + hintW, hintY + hintH - r);
    this.ctx.quadraticCurveTo(hintX + hintW, hintY + hintH, hintX + hintW - r, hintY + hintH);
    this.ctx.lineTo(hintX + r, hintY + hintH);
    this.ctx.quadraticCurveTo(hintX, hintY + hintH, hintX, hintY + hintH - r);
    this.ctx.lineTo(hintX, hintY + r);
    this.ctx.quadraticCurveTo(hintX, hintY, hintX + r, hintY);
    this.ctx.closePath();
    this.ctx.fillStyle = '#1A1A2E';
    this.ctx.fill();
    this.ctx.strokeStyle = '#FFD700';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    this.ctx.fillStyle = '#FFD700';
    this.ctx.font = '12px monospace';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('法阵:', hintX + 10, hintY + 20);

    const patternScale = 0.22;
    const patternOffsetX = hintX + 10;
    const patternOffsetY = hintY + 30;
    this.starField.renderPatternHint(this.ctx, patternOffsetX, patternOffsetY, patternScale);
    this.ctx.restore();
  }

  private renderCountdown(): void {
    if (!this.patternActive) return;
    const cx = this.canvasW - 45;
    const cy = this.canvasH - 45;
    const radius = 30;
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = '#0F3460';
    this.ctx.fill();

    const progress = Math.max(0, Math.min(1, this.patternTimeLeft / 15));
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + progress * Math.PI * 2;
    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy);
    this.ctx.arc(cx, cy, radius, startAngle, endAngle);
    this.ctx.closePath();
    this.ctx.fillStyle = '#FFD700';
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.arc(cx, cy, radius - 6, 0, Math.PI * 2);
    this.ctx.fillStyle = '#0F3460';
    this.ctx.fill();

    this.ctx.fillStyle = '#FFD700';
    this.ctx.font = 'bold 16px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(Math.ceil(this.patternTimeLeft).toString(), cx, cy);
    this.ctx.restore();
  }

  private renderShadows(): void {
    for (const shadow of this.shadows) {
      if (!shadow.alive) continue;
      this.ctx.save();
      this.ctx.fillStyle = '#000000';
      this.ctx.beginPath();
      this.ctx.arc(shadow.x, shadow.y, shadow.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.strokeStyle = '#330000';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      this.ctx.fillStyle = '#E94560';
      this.ctx.shadowColor = '#E94560';
      this.ctx.shadowBlur = 6;
      const eyeOffset = 5;
      this.ctx.beginPath();
      this.ctx.arc(shadow.x - eyeOffset, shadow.y - 3, 3, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.beginPath();
      this.ctx.arc(shadow.x + eyeOffset, shadow.y - 3, 3, 0, Math.PI * 2);
      this.ctx.fill();

      const hpRatio = shadow.hp / shadow.maxHp;
      this.ctx.shadowBlur = 0;
      this.ctx.fillStyle = '#333';
      this.ctx.fillRect(shadow.x - shadow.radius, shadow.y - shadow.radius - 8, shadow.radius * 2, 4);
      this.ctx.fillStyle = '#E94560';
      this.ctx.fillRect(shadow.x - shadow.radius, shadow.y - shadow.radius - 8, shadow.radius * 2 * hpRatio, 4);
      this.ctx.restore();
    }
  }

  private renderFamiliars(): void {
    for (const f of this.familiars) {
      if (!f.alive) continue;
      this.ctx.save();
      this.ctx.fillStyle = '#FFD700';
      this.ctx.shadowColor = '#FFD700';
      this.ctx.shadowBlur = 12;
      this.ctx.beginPath();
      this.ctx.arc(f.x, f.y, 8, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  private renderProjectiles(): void {
    for (const p of this.projectiles) {
      if (!p.alive) continue;
      this.ctx.save();
      this.ctx.fillStyle = p.color;
      this.ctx.shadowColor = p.color;
      this.ctx.shadowBlur = 8;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  private renderFullscreenFlash(): void {
    if (this.fullscreenRedFlash <= 0) return;
    const alpha = this.fullscreenRedFlash / this.fullscreenRedFlashDuration;
    this.ctx.save();
    this.ctx.fillStyle = `rgba(233, 69, 96, ${alpha * 0.6})`;
    this.ctx.fillRect(0, 0, this.canvasW, this.canvasH);
    this.ctx.restore();
  }

  private renderGameOver(): void {
    if (!this.gameOver) return;
    const t = 1 - this.gameOverTimer / this.gameOverDuration;
    const alpha = Math.max(0, 1 - t);
    const yOffset = -t * 120;
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.font = 'bold 48px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillStyle = '#E74C3C';
    this.ctx.shadowColor = '#E74C3C';
    this.ctx.shadowBlur = 20;
    this.ctx.fillText('祭坛陨落', this.canvasW / 2, this.canvasH / 2 + yOffset);
    this.ctx.restore();
  }

  private render(): void {
    this.ctx.fillStyle = '#0B0C10';
    this.ctx.fillRect(0, 0, this.canvasW, this.canvasH);

    this.renderAltarBorder();
    this.renderRuneCircle();
    this.starField.render(this.ctx);
    this.particles.render(this.ctx);
    this.renderFamiliars();
    this.renderProjectiles();
    this.renderShadows();
    this.renderLives();
    this.renderScore();
    this.renderPatternHint();
    this.renderCountdown();
    this.renderFullscreenFlash();
    this.renderGameOver();
  }
}
