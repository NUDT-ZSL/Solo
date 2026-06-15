import { Player, SonarWave, SonarFeedbackPoint, Vector2, Role } from '../types';

export class GameRenderer {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  setContext(ctx: CanvasRenderingContext2D): void {
    this.ctx = ctx;
  }

  renderHunter(
    hunter: Player,
    offsetX: number = 0,
    offsetY: number = 0,
    scale: number = 1
  ): void {
    this.ctx.save();
    this.ctx.translate(
      hunter.position.x * scale + offsetX,
      hunter.position.y * scale + offsetY
    );
    this.ctx.rotate(hunter.direction);
    this.ctx.scale(scale, scale);

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.beginPath();
    this.ctx.arc(2, 2, 10, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#e74c3c';
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 10, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.strokeStyle = '#c0392b';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    this.ctx.fillStyle = '#2c3e50';
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 6, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.arc(4, 0, 2, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();

    this.ctx.save();
    this.ctx.translate(
      hunter.position.x * scale + offsetX,
      hunter.position.y * scale + offsetY
    );
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 10px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.shadowColor = '#000000';
    this.ctx.shadowBlur = 3;
    this.ctx.fillText('猎人', 0, -18);
    this.ctx.restore();
  }

  renderStalker(
    stalker: Player,
    offsetX: number = 0,
    offsetY: number = 0,
    scale: number = 1,
    isVisible: boolean = true
  ): void {
    if (!isVisible) return;

    this.ctx.save();
    this.ctx.translate(
      stalker.position.x * scale + offsetX,
      stalker.position.y * scale + offsetY
    );
    this.ctx.rotate(stalker.direction);
    this.ctx.scale(scale, scale);

    const bodyRadius = stalker.isCrouching ? 6 : 8;

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.beginPath();
    this.ctx.arc(1.5, 1.5, bodyRadius, 0, Math.PI * 2);
    this.ctx.fill();

    let alpha = 1;
    if (stalker.isCrouching) alpha = 0.7;
    if (stalker.isOnWall) alpha = 0.6;
    
    this.ctx.fillStyle = `rgba(52, 152, 219, ${alpha})`;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, bodyRadius, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.strokeStyle = '#2980b9';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    this.ctx.fillStyle = `rgba(44, 62, 80, ${alpha})`;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, bodyRadius * 0.6, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    this.ctx.beginPath();
    this.ctx.arc(bodyRadius * 0.4, 0, 1.5, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();

    this.ctx.save();
    this.ctx.translate(
      stalker.position.x * scale + offsetX,
      stalker.position.y * scale + offsetY
    );
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 10px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.shadowColor = '#000000';
    this.ctx.shadowBlur = 3;
    this.ctx.fillText('潜行者', 0, -bodyRadius - 10);
    this.ctx.restore();
  }

  renderSonarWaves(
    waves: SonarWave[],
    offsetX: number = 0,
    offsetY: number = 0,
    scale: number = 1
  ): void {
    for (const wave of waves) {
      this.renderSonarWave(wave, offsetX, offsetY, scale);
    }
  }

  private renderSonarWave(
    wave: SonarWave,
    offsetX: number,
    offsetY: number,
    scale: number
  ): void {
    const now = performance.now();
    const age = now - wave.createdAt;
    const alpha = Math.max(0, 0.4 * (1 - wave.radius / wave.maxRadius));

    this.ctx.save();
    this.ctx.translate(
      wave.origin.x * scale + offsetX,
      wave.origin.y * scale + offsetY
    );

    const color = wave.isFake ? '#9370db' : '#64b5f6';
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;
    this.ctx.globalAlpha = alpha;

    this.ctx.beginPath();
    this.ctx.arc(0, 0, wave.radius * scale, 0, Math.PI * 2);
    this.ctx.stroke();

    if (wave.radius * scale > 30) {
      this.ctx.globalAlpha = alpha * 0.5;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, (wave.radius - 10) * scale, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    for (const reflection of wave.reflections) {
      if (reflection.isHit) {
        const hitAge = now - reflection.hitTime;
        if (hitAge < 500) {
          const hitAlpha = 1 - hitAge / 500;
          const pulseScale = 1 + hitAge / 250;
          
          this.ctx.globalAlpha = hitAlpha;
          this.ctx.strokeStyle = '#ff5252';
          this.ctx.lineWidth = 3;
          this.ctx.shadowColor = '#ff5252';
          this.ctx.shadowBlur = 15;

          for (const point of reflection.points) {
            this.ctx.beginPath();
            this.ctx.arc(
              (point.x - wave.origin.x) * scale,
              (point.y - wave.origin.y) * scale,
              15 * pulseScale * reflection.signalStrength,
              0,
              Math.PI * 2
            );
            this.ctx.stroke();
          }
        }
      }
    }

    this.ctx.restore();
  }

  renderSonarFeedback(
    feedback: SonarFeedbackPoint[],
    offsetX: number = 0,
    offsetY: number = 0,
    scale: number = 1
  ): void {
    const now = performance.now();

    for (const point of feedback) {
      const age = now - point.timestamp;
      if (age >= 1500) continue;

      const alpha = (1 - age / 1500) * point.strength;

      this.ctx.save();
      this.ctx.translate(
        point.position.x * scale + offsetX,
        point.position.y * scale + offsetY
      );

      if (point.isHit) {
        const pulse = Math.sin(age / 50) * 3 + 12;
        this.ctx.fillStyle = `rgba(255, 82, 82, ${alpha})`;
        this.ctx.shadowColor = '#ff5252';
        this.ctx.shadowBlur = 10;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, pulse * scale, 0, Math.PI * 2);
        this.ctx.fill();
      } else {
        this.ctx.fillStyle = `rgba(100, 181, 246, ${alpha * 0.7})`;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 4 * scale, 0, Math.PI * 2);
        this.ctx.fill();
      }

      this.ctx.restore();
    }
  }

  renderShadowEffect(
    active: boolean,
    startTime: number,
    duration: number,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    if (!active) return;

    const now = performance.now();
    const elapsed = now - startTime;
    const progress = Math.min(1, elapsed / duration);

    this.ctx.save();

    const fadeProgress = elapsed < 300
      ? elapsed / 300
      : elapsed > duration - 500
        ? (duration - elapsed) / 500
        : 1;

    if (elapsed < 300) {
      this.renderFogAnimation(elapsed / 300, canvasWidth, canvasHeight);
    } else if (elapsed > duration - 500 && elapsed <= duration) {
      const flashProgress = 1 - (duration - elapsed) / 500;
      this.ctx.fillStyle = `rgba(255, 255, 255, ${flashProgress * 0.6})`;
      this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }

    this.ctx.fillStyle = `rgba(0, 0, 0, ${0.6 * fadeProgress})`;
    this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    this.ctx.restore();
  }

  private renderFogAnimation(
    progress: number,
    width: number,
    height: number
  ): void {
    const corners = [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: width, y: height },
      { x: 0, y: height }
    ];

    for (const corner of corners) {
      const gradient = this.ctx.createRadialGradient(
        corner.x,
        corner.y,
        0,
        corner.x,
        corner.y,
        Math.max(width, height) * progress
      );
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0.8)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, 0, width, height);
    }
  }

  renderHitFlash(
    intensity: number,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    if (intensity <= 0) return;

    const alpha = (intensity / 100) * 0.3;
    this.ctx.save();
    this.ctx.fillStyle = `rgba(255, 100, 100, ${alpha})`;
    this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    this.ctx.restore();
  }

  renderCrosshair(
    x: number,
    y: number,
    hitFlash: boolean = false
  ): void {
    this.ctx.save();
    this.ctx.translate(x, y);

    const outerRadius = 15;
    const innerRadius = 5;
    const color = hitFlash ? '#ff4444' : '#ffffff';
    
    if (hitFlash) {
      this.ctx.shadowColor = '#ff4444';
      this.ctx.shadowBlur = 10;
    }

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 1.5;

    this.ctx.beginPath();
    this.ctx.arc(0, 0, outerRadius, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.arc(0, 0, innerRadius, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.globalAlpha = 0.5;
    this.ctx.lineWidth = 1;
    
    this.ctx.beginPath();
    this.ctx.moveTo(-outerRadius, 0);
    this.ctx.lineTo(-innerRadius - 2, 0);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(innerRadius + 2, 0);
    this.ctx.lineTo(outerRadius, 0);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(0, -outerRadius);
    this.ctx.lineTo(0, -innerRadius - 2);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(0, innerRadius + 2);
    this.ctx.lineTo(0, outerRadius);
    this.ctx.stroke();

    this.ctx.restore();
  }

  renderStalkerView(
    stalker: Player,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    this.ctx.save();

    const viewRadius = Math.min(canvasWidth, canvasHeight) * 0.6;
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    const gradient = this.ctx.createRadialGradient(
      centerX,
      centerY,
      viewRadius * 0.3,
      centerX,
      centerY,
      viewRadius
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.7)');

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    this.ctx.restore();
  }
}
