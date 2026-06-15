import { RenderData, GAME_CONFIG, Fragment, GravityBall, StarZone } from './types';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private time = 0;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  render(data: RenderData, dt: number): void {
    this.time += dt;
    const { canvasWidth, canvasHeight } = data;

    this.ctx.fillStyle = '#0A0E27';
    this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    this.drawBackgroundStars(data);
    this.drawStarZones(data);
    this.drawGridOverlay(data);
    this.drawGravityWaves(data);
    this.drawFragments(data);
    this.drawGravityBalls(data);
    this.drawParticles(data);
    this.drawDragIndicator(data);
    this.drawUI(data);
    this.drawMiniMap(data);
  }

  private drawBackgroundStars(data: RenderData): void {
    const ctx = this.ctx;
    for (const star of data.stars) {
      const phase = (this.time / star.period) * Math.PI * 2 + star.phase;
      const alpha = 0.3 + Math.sin(phase) * 0.4 + 0.3;
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, Math.min(1, alpha))})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawGridOverlay(data: RenderData): void {
    const ctx = this.ctx;
    const { canvasWidth, canvasHeight } = data;
    ctx.strokeStyle = 'rgba(74, 144, 217, 0.05)';
    ctx.lineWidth = 1;

    for (let gx = 0; gx <= GAME_CONFIG.GRID_COLS; gx++) {
      const x = (gx / GAME_CONFIG.GRID_COLS) * canvasWidth;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasHeight);
      ctx.stroke();
    }
    for (let gy = 0; gy <= GAME_CONFIG.GRID_ROWS; gy++) {
      const y = (gy / GAME_CONFIG.GRID_ROWS) * canvasHeight;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasWidth, y);
      ctx.stroke();
    }
  }

  private drawStarZones(data: RenderData): void {
    const ctx = this.ctx;
    const { canvasWidth, canvasHeight } = data;
    const zoneW = canvasWidth / GAME_CONFIG.GRID_COLS;
    const zoneH = canvasHeight / GAME_CONFIG.GRID_ROWS;

    for (const zone of data.starZones) {
      const cx = (zone.gridX + 0.5) * zoneW;
      const cy = (zone.gridY + 0.5) * zoneH;

      if (zone.lit) {
        const pulse = 0.8 + Math.sin(this.time / 500 + zone.id) * 0.2;
        ctx.fillStyle = `hsla(${zone.hue}, 80%, 50%, ${0.15 * pulse})`;
        ctx.fillRect(zone.gridX * zoneW, zone.gridY * zoneH, zoneW, zoneH);

        if (zone.shape === 'hexagon') {
          this.drawHexagon(cx, cy, Math.min(zoneW, zoneH) * 0.35, zone.hue, pulse);
        } else if (zone.shape === 'star') {
          this.drawStarShape(cx, cy, Math.min(zoneW, zoneH) * 0.35, zone.hue, pulse);
        }
      } else {
        ctx.strokeStyle = 'rgba(74, 144, 217, 0.08)';
        ctx.lineWidth = 1;
        ctx.strokeRect(zone.gridX * zoneW + 2, zone.gridY * zoneH + 2, zoneW - 4, zoneH - 4);
      }
    }
  }

  private drawHexagon(cx: number, cy: number, r: number, hue: number, alpha: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.time / 3000);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = `hsla(${hue}, 90%, 65%, ${0.8 * alpha})`;
    ctx.lineWidth = 3;
    ctx.shadowColor = `hsl(${hue}, 90%, 60%)`;
    ctx.shadowBlur = 15;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  private drawStarShape(cx: number, cy: number, r: number, hue: number, alpha: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-this.time / 4000);
    ctx.beginPath();
    const points = 5;
    const innerR = r * 0.45;
    for (let i = 0; i < points * 2; i++) {
      const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      const rad = i % 2 === 0 ? r : innerR;
      const x = Math.cos(angle) * rad;
      const y = Math.sin(angle) * rad;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = `hsla(${hue}, 90%, 65%, ${0.8 * alpha})`;
    ctx.lineWidth = 3;
    ctx.shadowColor = `hsl(${hue}, 90%, 60%)`;
    ctx.shadowBlur = 15;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  private drawFragments(data: RenderData): void {
    const ctx = this.ctx;
    for (const f of data.fragments) {
      this.drawFragment(f);
    }
  }

  private drawFragment(f: Fragment): void {
    const ctx = this.ctx;
    let radius = f.radius;
    let color: string;
    let glowColor: string;

    if (f.type === 'dark') {
      color = '#1a1a2e';
      glowColor = 'rgba(100, 100, 150, 0.3)';
    } else if (f.type === 'pulse') {
      const pulseScale = 1 + Math.sin(f.pulsePhase) * 0.15;
      radius = f.radius * pulseScale;
      color = `hsl(${f.hue}, 85%, 60%)`;
      glowColor = `hsla(${f.hue}, 90%, 60%, 0.5)`;
    } else {
      color = `hsl(${f.hue}, 80%, 58%)`;
      glowColor = `hsla(${f.hue}, 90%, 60%, 0.3)`;
    }

    const gradient = ctx.createRadialGradient(
      f.pos.x, f.pos.y, 0,
      f.pos.x, f.pos.y, radius * 2
    );
    gradient.addColorStop(0, glowColor);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(f.pos.x, f.pos.y, radius * 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(f.pos.x, f.pos.y, radius, 0, Math.PI * 2);

    if (f.type === 'dark') {
      const darkGrad = ctx.createRadialGradient(
        f.pos.x - radius * 0.3, f.pos.y - radius * 0.3, 0,
        f.pos.x, f.pos.y, radius
      );
      darkGrad.addColorStop(0, '#2a2a4e');
      darkGrad.addColorStop(1, '#0a0a1a');
      ctx.fillStyle = darkGrad;
      ctx.fill();
      ctx.strokeStyle = 'rgba(150, 100, 255, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else {
      ctx.fillStyle = color;
      ctx.fill();
      const innerGrad = ctx.createRadialGradient(
        f.pos.x - radius * 0.3, f.pos.y - radius * 0.3, 0,
        f.pos.x, f.pos.y, radius
      );
      innerGrad.addColorStop(0, `hsla(${f.hue}, 100%, 85%, 0.6)`);
      innerGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = innerGrad;
      ctx.fill();
    }

    if (f.hovered) {
      const complementaryHue = (f.hue + 180) % 360;
      ctx.strokeStyle = `hsla(${complementaryHue}, 90%, 60%, 0.4)`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(f.pos.x, f.pos.y, radius + 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (f.inGravityZone && f.gravityZoneTimer > 0) {
      const progress = Math.min(1, f.gravityZoneTimer / GAME_CONFIG.AGGREGATION_TIME);
      ctx.strokeStyle = `hsla(${f.hue}, 100%, 70%, ${progress})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(f.pos.x, f.pos.y, radius + 10, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
      ctx.stroke();
    }
  }

  private drawGravityBalls(data: RenderData): void {
    const ctx = this.ctx;
    for (const ball of data.gravityBalls) {
      this.drawGravityBall(ball);
    }
  }

  private drawGravityBall(ball: GravityBall): void {
    const ctx = this.ctx;

    if (ball.arrived) {
      const lifeRatio = ball.lifeTime / ball.maxLifeTime;
      const effectRadius = GAME_CONFIG.GRAVITY_BALL_MIN_RADIUS_EFFECT +
        (ball.mass - GAME_CONFIG.GRAVITY_BALL_MIN_MASS) *
        (GAME_CONFIG.GRAVITY_BALL_MAX_RADIUS_EFFECT - GAME_CONFIG.GRAVITY_BALL_MIN_RADIUS_EFFECT) /
        (GAME_CONFIG.GRAVITY_BALL_MAX_MASS - GAME_CONFIG.GRAVITY_BALL_MIN_MASS);

      const fieldGrad = ctx.createRadialGradient(
        ball.pos.x, ball.pos.y, ball.radius,
        ball.pos.x, ball.pos.y, effectRadius
      );
      fieldGrad.addColorStop(0, 'rgba(200, 220, 255, 0.15)');
      fieldGrad.addColorStop(1, 'rgba(100, 150, 255, 0)');
      ctx.fillStyle = fieldGrad;
      ctx.beginPath();
      ctx.arc(ball.pos.x, ball.pos.y, effectRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 + lifeRatio * 0.2})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(ball.pos.x, ball.pos.y, GAME_CONFIG.AGGREGATION_RADIUS, 0, Math.PI * 2);
      ctx.stroke();
    }

    const ringPhase = (this.time / 1500) * Math.PI * 2;
    for (let i = 0; i < 3; i++) {
      const p = (ringPhase + (i * Math.PI * 2) / 3) % (Math.PI * 2);
      const ringScale = 1 + Math.sin(p) * 0.3;
      const alpha = 0.2 + Math.sin(p) * 0.3;
      ctx.strokeStyle = `rgba(200, 220, 255, ${alpha})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(ball.pos.x, ball.pos.y, ball.radius * ringScale + i * 5, 0, Math.PI * 2);
      ctx.stroke();
    }

    const ballGrad = ctx.createRadialGradient(
      ball.pos.x, ball.pos.y, 0,
      ball.pos.x, ball.pos.y, ball.radius
    );
    ballGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    ballGrad.addColorStop(0.5, 'rgba(220, 235, 255, 0.7)');
    ballGrad.addColorStop(1, 'rgba(180, 200, 255, 0.4)');
    ctx.fillStyle = ballGrad;
    ctx.beginPath();
    ctx.arc(ball.pos.x, ball.pos.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = 'rgba(200, 220, 255, 0.8)';
    ctx.shadowBlur = 20;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ball.pos.x, ball.pos.y, ball.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    if (ball.arrived) {
      const lifeRatio = ball.lifeTime / ball.maxLifeTime;
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.6 + lifeRatio * 0.4})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(ball.pos.x, ball.pos.y, ball.radius + 5, -Math.PI / 2, -Math.PI / 2 + lifeRatio * Math.PI * 2);
      ctx.stroke();
    }
  }

  private drawGravityWaves(data: RenderData): void {
    const ctx = this.ctx;
    for (const w of data.gravityWaves) {
      const lineWidth = 2 + (1 - w.life / w.maxLife) * 2;
      ctx.strokeStyle = `hsla(${w.hue}, 90%, 65%, ${w.alpha})`;
      ctx.lineWidth = lineWidth;
      ctx.shadowColor = `hsl(${w.hue}, 90%, 60%)`;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(w.pos.x, w.pos.y, w.radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `hsla(${(w.hue + 30) % 360}, 90%, 70%, ${w.alpha * 0.5})`;
      ctx.lineWidth = lineWidth * 0.6;
      ctx.beginPath();
      ctx.arc(w.pos.x, w.pos.y, w.radius * 0.85, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }

  private drawParticles(data: RenderData): void {
    const ctx = this.ctx;
    for (const p of data.particles) {
      const alpha = p.life / p.maxLife;
      ctx.fillStyle = `hsla(${p.hue}, 90%, 65%, ${alpha})`;
      ctx.shadowColor = `hsl(${p.hue}, 90%, 60%)`;
      ctx.shadowBlur = 5;
      ctx.beginPath();
      ctx.arc(p.pos.x, p.pos.y, p.radius * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  private drawDragIndicator(data: RenderData): void {
    const ctx = this.ctx;
    const { dragState } = data;
    if (!dragState.dragging || !dragState.startPos || !dragState.currentPos) return;

    const { startPos, currentPos } = dragState;
    const dx = currentPos.x - startPos.x;
    const dy = currentPos.y - startPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    let mass = Math.floor(dist / 100) + GAME_CONFIG.GRAVITY_BALL_MIN_MASS;
    mass = Math.max(GAME_CONFIG.GRAVITY_BALL_MIN_MASS, Math.min(GAME_CONFIG.GRAVITY_BALL_MAX_MASS, mass));

    const radius = GAME_CONFIG.GRAVITY_BALL_MIN_RADIUS +
      (mass - GAME_CONFIG.GRAVITY_BALL_MIN_MASS) *
      (GAME_CONFIG.GRAVITY_BALL_MAX_RADIUS - GAME_CONFIG.GRAVITY_BALL_MIN_RADIUS) /
      (GAME_CONFIG.GRAVITY_BALL_MAX_MASS - GAME_CONFIG.GRAVITY_BALL_MIN_MASS);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(startPos.x, startPos.y);
    ctx.lineTo(currentPos.x, currentPos.y);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.shadowColor = 'rgba(200, 220, 255, 0.8)';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(startPos.x, startPos.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    const effectRadius = GAME_CONFIG.GRAVITY_BALL_MIN_RADIUS_EFFECT +
      (mass - GAME_CONFIG.GRAVITY_BALL_MIN_MASS) *
      (GAME_CONFIG.GRAVITY_BALL_MAX_RADIUS_EFFECT - GAME_CONFIG.GRAVITY_BALL_MIN_RADIUS_EFFECT) /
      (GAME_CONFIG.GRAVITY_BALL_MAX_MASS - GAME_CONFIG.GRAVITY_BALL_MIN_MASS);

    ctx.strokeStyle = `rgba(74, 144, 217, 0.3)`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(currentPos.x, currentPos.y, effectRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(currentPos.x, currentPos.y, radius * 0.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`质量 ${mass}`, currentPos.x, currentPos.y - radius - 15);
  }

  private drawUI(data: RenderData): void {
    const ctx = this.ctx;
    const { canvasWidth, level, litCount, totalZones } = data;

    ctx.fillStyle = 'rgba(10, 14, 39, 0.6)';
    ctx.fillRect(15, 15, 140, 50);
    ctx.strokeStyle = 'rgba(74, 144, 217, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(15, 15, 140, 50);

    ctx.fillStyle = 'white';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`第 ${level} 关`, 30, 48);

    ctx.fillStyle = 'rgba(10, 14, 39, 0.6)';
    const progressText = `${litCount}/${totalZones}`;
    ctx.font = 'bold 20px sans-serif';
    const textWidth = ctx.measureText(progressText).width + 40;
    ctx.fillRect(canvasWidth - textWidth - 15, 15, textWidth, 45);
    ctx.strokeStyle = 'rgba(74, 144, 217, 0.3)';
    ctx.strokeRect(canvasWidth - textWidth - 15, 15, textWidth, 45);

    ctx.fillStyle = 'white';
    ctx.textAlign = 'right';
    ctx.fillText(progressText, canvasWidth - 35, 46);

    ctx.font = '12px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.textAlign = 'left';
    ctx.fillText('点亮进度', canvasWidth - textWidth - 5, 72);
  }

  private drawMiniMap(data: RenderData): void {
    const ctx = this.ctx;
    const { canvasWidth, canvasHeight, fragments, gravityBalls, starZones } = data;

    const mapSize = 100;
    const mapX = canvasWidth - mapSize - 20;
    const mapY = canvasHeight - mapSize - 20;
    const scaleX = mapSize / canvasWidth;
    const scaleY = mapSize / canvasHeight;

    ctx.fillStyle = 'rgba(10, 14, 39, 0.7)';
    ctx.beginPath();
    ctx.arc(mapX + mapSize / 2, mapY + mapSize / 2, mapSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(74, 144, 217, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.arc(mapX + mapSize / 2, mapY + mapSize / 2, mapSize / 2 - 1, 0, Math.PI * 2);
    ctx.clip();

    const zoneW = mapSize / GAME_CONFIG.GRID_COLS;
    const zoneH = mapSize / GAME_CONFIG.GRID_ROWS;
    for (const zone of starZones) {
      if (zone.lit) {
        ctx.fillStyle = `hsla(${zone.hue}, 80%, 50%, 0.4)`;
        ctx.fillRect(mapX + zone.gridX * zoneW, mapY + zone.gridY * zoneH, zoneW, zoneH);
      }
    }

    for (const f of fragments) {
      const x = mapX + f.pos.x * scaleX;
      const y = mapY + f.pos.y * scaleY;
      if (f.type === 'dark') {
        ctx.fillStyle = 'rgba(150, 100, 255, 0.8)';
      } else if (f.type === 'pulse') {
        ctx.fillStyle = `hsla(${f.hue}, 90%, 60%, 0.9)`;
      } else {
        ctx.fillStyle = `hsla(${f.hue}, 80%, 60%, 0.7)`;
      }
      ctx.beginPath();
      ctx.arc(x, y, Math.max(1, f.radius * scaleX * 0.8), 0, Math.PI * 2);
      ctx.fill();
    }

    for (const ball of gravityBalls) {
      const x = mapX + ball.pos.x * scaleX;
      const y = mapY + ball.pos.y * scaleY;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.beginPath();
      ctx.arc(x, y, Math.max(2, ball.radius * scaleX), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
