import type { PlayerState, Bullet } from './player';
import type { Enemy, PowerUp } from './enemy';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  twinkle: number;
  twinkleSpeed: number;
}

export interface VirtualJoystick {
  active: boolean;
  touchId: number;
  baseX: number;
  baseY: number;
  stickX: number;
  stickY: number;
  radius: number;
}

export interface ShootButton {
  x: number;
  y: number;
  radius: number;
  active: boolean;
  touchId: number;
}

export interface GameUIState {
  score: number;
  lives: number;
  fireLevel: number;
  isGameOver: boolean;
  isPowerUp: boolean;
  isMobile: boolean;
  canvasWidth: number;
  canvasHeight: number;
}

export class Renderer {
  ctx: CanvasRenderingContext2D;
  stars: Star[] = [];
  particles: Particle[] = [];
  joystick: VirtualJoystick;
  shootButton: ShootButton;
  readonly starCount: number = 150;
  readonly statusBarHeight: number = 60;
  readonly joystickRadius: number = 60;
  readonly shootButtonRadius: number = 45;

  constructor(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) {
    this.ctx = ctx;
    this.joystick = {
      active: false,
      touchId: -1,
      baseX: 100,
      baseY: canvasHeight - 130,
      stickX: 100,
      stickY: canvasHeight - 130,
      radius: this.joystickRadius
    };
    this.shootButton = {
      x: canvasWidth - 80,
      y: canvasHeight - 130,
      radius: this.shootButtonRadius,
      active: false,
      touchId: -1
    };
    this.initStars(canvasWidth, canvasHeight);
  }

  initStars(canvasWidth: number, canvasHeight: number): void {
    this.stars = [];
    for (let i = 0; i < this.starCount; i++) {
      this.stars.push({
        x: Math.random() * canvasWidth,
        y: Math.random() * canvasHeight,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 0.05 + 0.02,
        twinkle: Math.random() * Math.PI * 2,
        twinkleSpeed: Math.random() * 0.05 + 0.02
      });
    }
  }

  render(
    player: PlayerState,
    bullets: Bullet[],
    enemies: Enemy[],
    powerUps: PowerUp[],
    uiState: GameUIState,
    deltaTime: number
  ): void {
    const { canvasWidth, canvasHeight } = uiState;

    this.ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    this.renderBackground(canvasWidth, canvasHeight);
    this.renderStars(canvasWidth, canvasHeight, deltaTime);
    this.renderBullets(bullets);
    this.renderEnemies(enemies);
    this.renderPowerUps(powerUps);
    this.renderPlayer(player, deltaTime);
    this.renderParticles(deltaTime);
    this.renderUI(uiState);

    if (uiState.isMobile && !uiState.isGameOver) {
      this.renderJoystick();
      this.renderShootButton();
    }

    if (uiState.isGameOver) {
      this.renderGameOver(uiState);
    }
  }

  private renderBackground(width: number, height: number): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#0a0a2e');
    gradient.addColorStop(0.5, '#1a1a4e');
    gradient.addColorStop(1, '#2d1b4e');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, width, height);
  }

  private renderStars(width: number, height: number, deltaTime: number): void {
    this.stars.forEach(star => {
      star.y += star.speed * deltaTime;
      star.twinkle += star.twinkleSpeed * deltaTime * 0.1;

      if (star.y > height) {
        star.y = -5;
        star.x = Math.random() * width;
      }

      const alpha = 0.3 + Math.sin(star.twinkle) * 0.3 + 0.4;
      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      this.ctx.fill();
    });
  }

  private renderPlayer(player: PlayerState, _deltaTime: number): void {
    const { x, y, width, height, isPowerUp, invincibleTimer } = player;

    if (isPowerUp) {
      const glowSize = 40 + Math.sin(Date.now() * 0.01) * 10;
      const gradient = this.ctx.createRadialGradient(
        x + width / 2, y + height / 2, 0,
        x + width / 2, y + height / 2, glowSize
      );
      gradient.addColorStop(0, 'rgba(100, 200, 255, 0.4)');
      gradient.addColorStop(0.5, 'rgba(50, 150, 255, 0.2)');
      gradient.addColorStop(1, 'rgba(50, 100, 255, 0)');
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(x + width / 2, y + height / 2, glowSize, 0, Math.PI * 2);
      this.ctx.fill();
    }

    const flickerAlpha = invincibleTimer > 0 ? (Math.sin(Date.now() * 0.02) > 0 ? 1 : 0.3) : 1;
    this.ctx.globalAlpha = flickerAlpha;

    const flameHeight = 15 + Math.random() * 8;
    const flameGradient = this.ctx.createLinearGradient(
      x + width / 2, y + height,
      x + width / 2, y + height + flameHeight
    );
    flameGradient.addColorStop(0, '#ffffff');
    flameGradient.addColorStop(0.3, '#00bfff');
    flameGradient.addColorStop(1, 'rgba(0, 100, 255, 0)');
    this.ctx.fillStyle = flameGradient;
    this.ctx.beginPath();
    this.ctx.moveTo(x + width * 0.3, y + height);
    this.ctx.lineTo(x + width / 2, y + height + flameHeight);
    this.ctx.lineTo(x + width * 0.7, y + height);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.fillStyle = '#c0c0c8';
    this.ctx.beginPath();
    this.ctx.moveTo(x + width / 2, y);
    this.ctx.lineTo(x + width, y + height * 0.7);
    this.ctx.lineTo(x + width * 0.85, y + height);
    this.ctx.lineTo(x + width * 0.15, y + height);
    this.ctx.lineTo(x, y + height * 0.7);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.fillStyle = '#606070';
    this.ctx.beginPath();
    this.ctx.moveTo(x, y + height * 0.5);
    this.ctx.lineTo(x - width * 0.2, y + height * 0.85);
    this.ctx.lineTo(x + width * 0.2, y + height * 0.8);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.moveTo(x + width, y + height * 0.5);
    this.ctx.lineTo(x + width * 1.2, y + height * 0.85);
    this.ctx.lineTo(x + width * 0.8, y + height * 0.8);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.fillStyle = '#4a90d9';
    this.ctx.beginPath();
    this.ctx.ellipse(x + width / 2, y + height * 0.4, width * 0.15, height * 0.2, 0, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#87ceeb';
    this.ctx.beginPath();
    this.ctx.ellipse(x + width / 2, y + height * 0.38, width * 0.1, height * 0.12, 0, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.globalAlpha = 1;
  }

  private renderBullets(bullets: Bullet[]): void {
    bullets.forEach(bullet => {
      const gradient = this.ctx.createLinearGradient(
        bullet.x, bullet.y + bullet.height,
        bullet.x, bullet.y
      );
      gradient.addColorStop(0, 'rgba(0, 191, 255, 0.3)');
      gradient.addColorStop(0.5, '#00bfff');
      gradient.addColorStop(1, '#ffffff');
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);

      this.ctx.shadowColor = '#00bfff';
      this.ctx.shadowBlur = 10;
      this.ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
      this.ctx.shadowBlur = 0;
    });
  }

  private renderEnemies(enemies: Enemy[]): void {
    enemies.forEach(enemy => {
      const { x, y, width, height } = enemy;

      this.ctx.fillStyle = '#8b0000';
      this.ctx.beginPath();
      this.ctx.moveTo(x + width / 2, y + height);
      this.ctx.lineTo(x, y + height * 0.3);
      this.ctx.lineTo(x + width * 0.15, y);
      this.ctx.lineTo(x + width * 0.85, y);
      this.ctx.lineTo(x + width, y + height * 0.3);
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.fillStyle = '#b22222';
      this.ctx.beginPath();
      this.ctx.moveTo(x + width * 0.1, y + height * 0.4);
      this.ctx.lineTo(x - width * 0.15, y + height * 0.1);
      this.ctx.lineTo(x + width * 0.3, y + height * 0.3);
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.beginPath();
      this.ctx.moveTo(x + width * 0.9, y + height * 0.4);
      this.ctx.lineTo(x + width * 1.15, y + height * 0.1);
      this.ctx.lineTo(x + width * 0.7, y + height * 0.3);
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.fillStyle = '#ffff00';
      this.ctx.beginPath();
      this.ctx.arc(x + width / 2, y + height * 0.4, width * 0.12, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = '#ff6600';
      this.ctx.beginPath();
      this.ctx.arc(x + width * 0.35, y + height * 0.15, width * 0.08, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.beginPath();
      this.ctx.arc(x + width * 0.65, y + height * 0.15, width * 0.08, 0, Math.PI * 2);
      this.ctx.fill();
    });
  }

  private renderPowerUps(powerUps: PowerUp[]): void {
    powerUps.forEach(powerUp => {
      const { x, y, width, height, rotation } = powerUp;
      const centerX = x + width / 2;
      const centerY = y + height / 2;

      const glowSize = width * 0.8 + Math.sin(Date.now() * 0.008) * 5;
      const gradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, glowSize);
      gradient.addColorStop(0, 'rgba(50, 255, 100, 0.6)');
      gradient.addColorStop(0.5, 'rgba(0, 200, 50, 0.3)');
      gradient.addColorStop(1, 'rgba(0, 150, 0, 0)');
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, glowSize, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.save();
      this.ctx.translate(centerX, centerY);
      this.ctx.rotate(rotation);

      this.ctx.fillStyle = '#00ff66';
      this.ctx.fillRect(-width / 2, -height / 2, width, height);

      this.ctx.fillStyle = '#66ff99';
      this.ctx.fillRect(-width / 2, -height / 2, width, height * 0.3);

      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = `bold ${width * 0.6}px Arial`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('⚡', 0, 0);

      this.ctx.restore();
    });
  }

  createExplosion(x: number, y: number): void {
    const particleCount = 25 + Math.floor(Math.random() * 10);
    const colors = ['#ff4444', '#ff8800', '#ffcc00', '#ffffff', '#ff6600'];

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 0.4 + 0.1;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 4 + 2
      });
    }
  }

  private renderParticles(deltaTime: number): void {
    this.particles.forEach(particle => {
      particle.x += particle.vx * deltaTime;
      particle.y += particle.vy * deltaTime;
      particle.life -= deltaTime * 0.001;

      if (particle.life > 0) {
        const alpha = particle.life / particle.maxLife;
        this.ctx.globalAlpha = alpha;
        this.ctx.fillStyle = particle.color;
        this.ctx.beginPath();
        this.ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
        this.ctx.fill();
      }
    });

    this.ctx.globalAlpha = 1;
    this.particles = this.particles.filter(p => p.life > 0);
  }

  private renderUI(uiState: GameUIState): void {
    const { score, lives, fireLevel, canvasWidth, canvasHeight } = uiState;
    const barY = canvasHeight - this.statusBarHeight;

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    this.ctx.beginPath();
    this.ctx.roundRect(0, barY, canvasWidth, this.statusBarHeight, [15, 15, 0, 0]);
    this.ctx.fill();

    this.ctx.fillStyle = '#ffd700';
    this.ctx.font = 'bold 22px "Segoe UI", sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(`分数: ${score}`, 20, barY + this.statusBarHeight / 2);

    const heartSpacing = 35;
    const heartStartX = canvasWidth / 2 - ((lives - 1) * heartSpacing) / 2;
    for (let i = 0; i < lives; i++) {
      this.drawHeart(heartStartX + i * heartSpacing, barY + this.statusBarHeight / 2, 12);
    }

    const starStartX = canvasWidth - 80;
    for (let i = 0; i < fireLevel; i++) {
      this.drawStar(starStartX + i * 30, barY + this.statusBarHeight / 2, 10, '#00bfff');
    }
    for (let i = fireLevel; i < 2; i++) {
      this.drawStar(starStartX + i * 30, barY + this.statusBarHeight / 2, 10, 'rgba(100, 100, 100, 0.5)');
    }
  }

  private drawHeart(x: number, y: number, size: number): void {
    this.ctx.fillStyle = '#ff4444';
    this.ctx.beginPath();
    this.ctx.moveTo(x, y + size * 0.3);
    this.ctx.bezierCurveTo(x, y - size * 0.3, x - size, y - size * 0.3, x - size, y + size * 0.1);
    this.ctx.bezierCurveTo(x - size, y + size * 0.5, x, y + size, x, y + size);
    this.ctx.bezierCurveTo(x, y + size, x + size, y + size * 0.5, x + size, y + size * 0.1);
    this.ctx.bezierCurveTo(x + size, y - size * 0.3, x, y - size * 0.3, x, y + size * 0.3);
    this.ctx.fill();
  }

  private drawStar(x: number, y: number, size: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
      const px = x + Math.cos(angle) * size;
      const py = y + Math.sin(angle) * size;
      if (i === 0) {
        this.ctx.moveTo(px, py);
      } else {
        this.ctx.lineTo(px, py);
      }
    }
    this.ctx.closePath();
    this.ctx.fill();
  }

  private renderJoystick(): void {
    const { baseX, baseY, stickX, stickY, radius, active } = this.joystick;

    this.ctx.globalAlpha = 0.5;
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    this.ctx.beginPath();
    this.ctx.arc(baseX, baseY, radius, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    this.ctx.globalAlpha = active ? 0.8 : 0.6;
    this.ctx.fillStyle = 'rgba(100, 200, 255, 0.6)';
    this.ctx.beginPath();
    this.ctx.arc(stickX, stickY, radius * 0.5, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.globalAlpha = 1;
  }

  private renderShootButton(): void {
    const { x, y, radius, active } = this.shootButton;

    this.ctx.globalAlpha = active ? 0.9 : 0.6;
    const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, '#ff6666');
    gradient.addColorStop(1, '#cc0000');
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 3;
    this.ctx.stroke();

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 20px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('发射', x, y);

    this.ctx.globalAlpha = 1;
  }

  private renderGameOver(uiState: GameUIState): void {
    const { canvasWidth, canvasHeight, score } = uiState;

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    this.ctx.fillStyle = '#ff4444';
    this.ctx.font = 'bold 48px "Segoe UI", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('游戏结束', canvasWidth / 2, canvasHeight / 2 - 80);

    this.ctx.fillStyle = '#ffd700';
    this.ctx.font = 'bold 32px "Segoe UI", sans-serif';
    this.ctx.fillText(`最终得分: ${score}`, canvasWidth / 2, canvasHeight / 2 - 20);

    const btnWidth = 180;
    const btnHeight = 50;
    const btnX = canvasWidth / 2 - btnWidth / 2;
    const btnY = canvasHeight / 2 + 40;

    const btnGradient = this.ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnHeight);
    btnGradient.addColorStop(0, '#4a9eff');
    btnGradient.addColorStop(1, '#2563eb');
    this.ctx.fillStyle = btnGradient;
    this.ctx.beginPath();
    this.ctx.roundRect(btnX, btnY, btnWidth, btnHeight, 10);
    this.ctx.fill();

    this.ctx.shadowColor = '#4a9eff';
    this.ctx.shadowBlur = 15;
    this.ctx.strokeStyle = '#6ab0ff';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    this.ctx.shadowBlur = 0;

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 20px "Segoe UI", sans-serif';
    this.ctx.fillText('重新开始', canvasWidth / 2, btnY + btnHeight / 2);
  }

  handleJoystickTouchStart(touch: Touch, canvasRect: DOMRect): void {
    const x = touch.clientX - canvasRect.left;
    const y = touch.clientY - canvasRect.top;

    if (x < this.joystick.baseX + this.joystick.radius * 2 &&
        y > this.joystick.baseY - this.joystick.radius * 2) {
      this.joystick.active = true;
      this.joystick.touchId = touch.identifier;
      this.updateJoystickPosition(x, y);
    }
  }

  handleJoystickTouchMove(touch: Touch, canvasRect: DOMRect): void {
    if (touch.identifier !== this.joystick.touchId) return;
    const x = touch.clientX - canvasRect.left;
    const y = touch.clientY - canvasRect.top;
    this.updateJoystickPosition(x, y);
  }

  handleJoystickTouchEnd(touch: Touch): void {
    if (touch.identifier === this.joystick.touchId) {
      this.joystick.active = false;
      this.joystick.touchId = -1;
      this.joystick.stickX = this.joystick.baseX;
      this.joystick.stickY = this.joystick.baseY;
    }
  }

  private updateJoystickPosition(x: number, y: number): void {
    const dx = x - this.joystick.baseX;
    const dy = y - this.joystick.baseY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = this.joystick.radius * 0.7;

    if (dist > maxDist) {
      const ratio = maxDist / dist;
      this.joystick.stickX = this.joystick.baseX + dx * ratio;
      this.joystick.stickY = this.joystick.baseY + dy * ratio;
    } else {
      this.joystick.stickX = x;
      this.joystick.stickY = y;
    }
  }

  getJoystickDirection(): { x: number; y: number } {
    if (!this.joystick.active) return { x: 0, y: 0 };
    const dx = this.joystick.stickX - this.joystick.baseX;
    const dy = this.joystick.stickY - this.joystick.baseY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 5) return { x: 0, y: 0 };
    return {
      x: dx / this.joystick.radius,
      y: dy / this.joystick.radius
    };
  }

  handleShootButtonTouchStart(touch: Touch, canvasRect: DOMRect): boolean {
    const x = touch.clientX - canvasRect.left;
    const y = touch.clientY - canvasRect.top;
    const dx = x - this.shootButton.x;
    const dy = y - this.shootButton.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < this.shootButton.radius * 1.5) {
      this.shootButton.active = true;
      this.shootButton.touchId = touch.identifier;
      return true;
    }
    return false;
  }

  handleShootButtonTouchEnd(touch: Touch): void {
    if (touch.identifier === this.shootButton.touchId) {
      this.shootButton.active = false;
      this.shootButton.touchId = -1;
    }
  }

  isShootButtonTouch(touch: Touch, canvasRect: DOMRect): boolean {
    const x = touch.clientX - canvasRect.left;
    const y = touch.clientY - canvasRect.top;
    const dx = x - this.shootButton.x;
    const dy = y - this.shootButton.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < this.shootButton.radius * 2;
  }

  isRestartButtonClick(x: number, y: number, uiState: GameUIState): boolean {
    if (!uiState.isGameOver) return false;
    const { canvasWidth, canvasHeight } = uiState;
    const btnWidth = 180;
    const btnHeight = 50;
    const btnX = canvasWidth / 2 - btnWidth / 2;
    const btnY = canvasHeight / 2 + 40;
    return x >= btnX && x <= btnX + btnWidth && y >= btnY && y <= btnY + btnHeight;
  }

  resize(canvasWidth: number, canvasHeight: number): void {
    this.joystick.baseX = 100;
    this.joystick.baseY = canvasHeight - 130;
    this.joystick.stickX = this.joystick.baseX;
    this.joystick.stickY = this.joystick.baseY;
    this.shootButton.x = canvasWidth - 80;
    this.shootButton.y = canvasHeight - 130;
    this.initStars(canvasWidth, canvasHeight);
  }

  reset(): void {
    this.particles = [];
    this.joystick.active = false;
    this.joystick.touchId = -1;
    this.shootButton.active = false;
    this.shootButton.touchId = -1;
  }
}
