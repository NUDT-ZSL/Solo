export interface Searchlight {
  x: number;
  y: number;
  angle: number;
  sweepSpeed: number;
  sweepRange: number;
  sweepCenter: number;
  coneLength: number;
  coneAngle: number;
  direction: number;
  haloPhase: number;
}

export interface Drone {
  x: number;
  y: number;
  patrolPoints: { x: number; y: number }[];
  currentTarget: number;
  speed: number;
  coneAngle: number;
  coneLength: number;
  angle: number;
  haloPhase: number;
}

export interface AlertState {
  active: boolean;
  timer: number;
  position: { x: number; y: number };
}

export class LightPatrol {
  searchlights: Searchlight[] = [];
  drones: Drone[] = [];
  alert: AlertState = { active: false, timer: 0, position: { x: 0, y: 0 } };
  alertDuration: number = 1500;

  zones: { x: number; y: number; w: number; h: number; cleared: boolean }[] = [];

  constructor(canvasW: number, canvasH: number) {
    this.initLevel(canvasW, canvasH);
  }

  initLevel(canvasW: number, canvasH: number) {
    this.searchlights = [
      this.createSearchlight(canvasW * 0.25, 0, Math.PI / 2, Math.PI * 0.6, 0.8, canvasH * 0.7),
      this.createSearchlight(canvasW * 0.55, 0, Math.PI / 2, Math.PI * 0.5, 0.6, canvasH * 0.65),
      this.createSearchlight(canvasW * 0.85, 0, Math.PI * 0.7, Math.PI * 0.4, 1.0, canvasH * 0.6),
      this.createSearchlight(canvasW * 0.1, canvasH * 0.5, Math.PI * 0.3, Math.PI * 0.5, 0.7, canvasH * 0.4),
    ];

    this.drones = [
      this.createDrone(
        [
          { x: canvasW * 0.3, y: canvasH * 0.35 },
          { x: canvasW * 0.5, y: canvasH * 0.35 },
          { x: canvasW * 0.5, y: canvasH * 0.55 },
          { x: canvasW * 0.3, y: canvasH * 0.55 },
        ],
        1.2,
        Math.PI / 5,
        120
      ),
      this.createDrone(
        [
          { x: canvasW * 0.6, y: canvasH * 0.6 },
          { x: canvasW * 0.8, y: canvasH * 0.6 },
          { x: canvasW * 0.8, y: canvasH * 0.8 },
          { x: canvasW * 0.6, y: canvasH * 0.8 },
        ],
        1.5,
        Math.PI / 6,
        100
      ),
    ];

    this.zones = [
      { x: canvasW * 0.2, y: canvasH * 0.3, w: canvasW * 0.15, h: canvasH * 0.2, cleared: false },
      { x: canvasW * 0.45, y: canvasH * 0.5, w: canvasW * 0.15, h: canvasH * 0.2, cleared: false },
      { x: canvasW * 0.7, y: canvasH * 0.7, w: canvasW * 0.15, h: canvasH * 0.15, cleared: false },
    ];
  }

  createSearchlight(
    x: number,
    y: number,
    centerAngle: number,
    sweepRange: number,
    sweepSpeed: number,
    coneLength: number
  ): Searchlight {
    return {
      x,
      y,
      angle: centerAngle,
      sweepSpeed,
      sweepRange,
      sweepCenter: centerAngle,
      coneLength,
      coneAngle: Math.PI / 6,
      direction: 1,
      haloPhase: 0,
    };
  }

  createDrone(
    patrolPoints: { x: number; y: number }[],
    speed: number,
    coneAngle: number,
    coneLength: number
  ): Drone {
    return {
      x: patrolPoints[0].x,
      y: patrolPoints[0].y,
      patrolPoints,
      currentTarget: 1,
      speed,
      coneAngle,
      coneLength,
      angle: 0,
      haloPhase: Math.random() * Math.PI * 2,
    };
  }

  update(dt: number, playerX: number, playerY: number) {
    for (const sl of this.searchlights) {
      sl.angle += sl.sweepSpeed * sl.direction * (dt / 1000);
      if (sl.angle > sl.sweepCenter + sl.sweepRange / 2) {
        sl.direction = -1;
      } else if (sl.angle < sl.sweepCenter - sl.sweepRange / 2) {
        sl.direction = 1;
      }
      sl.haloPhase += dt * 0.003;
    }

    for (const drone of this.drones) {
      const target = drone.patrolPoints[drone.currentTarget];
      const dx = target.x - drone.x;
      const dy = target.y - drone.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 5) {
        drone.currentTarget = (drone.currentTarget + 1) % drone.patrolPoints.length;
      } else {
        const moveAmount = drone.speed * (dt / 16.67);
        drone.x += (dx / dist) * moveAmount;
        drone.y += (dy / dist) * moveAmount;
      }

      drone.angle = Math.atan2(dy, dx);
      drone.haloPhase += dt * 0.004;
    }

    const isInLight = this.checkPlayerInLight(playerX, playerY);

    if (isInLight) {
      if (!this.alert.active) {
        this.alert = {
          active: true,
          timer: this.alertDuration,
          position: { x: playerX, y: playerY },
        };
      }
    } else {
      if (this.alert.active) {
        this.alert.timer -= dt;
        if (this.alert.timer <= 0) {
          this.alert.active = false;
        }
      }
    }

    return isInLight;
  }

  checkPlayerInLight(px: number, py: number): boolean {
    for (const sl of this.searchlights) {
      if (this.isInCone(px, py, sl.x, sl.y, sl.angle, sl.coneAngle, sl.coneLength)) {
        return true;
      }
    }
    for (const drone of this.drones) {
      if (this.isInCone(px, py, drone.x, drone.y, drone.angle, drone.coneAngle, drone.coneLength)) {
        return true;
      }
    }
    return false;
  }

  isInCone(
    px: number,
    py: number,
    ox: number,
    oy: number,
    angle: number,
    coneAngle: number,
    length: number
  ): boolean {
    const dx = px - ox;
    const dy = py - oy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > length) return false;

    const pointAngle = Math.atan2(dy, dx);
    let diff = pointAngle - angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    return Math.abs(diff) < coneAngle / 2;
  }

  checkZoneEntry(px: number, py: number): number {
    for (let i = 0; i < this.zones.length; i++) {
      const z = this.zones[i];
      if (!z.cleared && px >= z.x && px <= z.x + z.w && py >= z.y && py <= z.y + z.h) {
        return i;
      }
    }
    return -1;
  }

  clearZone(index: number) {
    if (index >= 0 && index < this.zones.length) {
      this.zones[index].cleared = true;
    }
  }

  clearedZoneCount(): number {
    return this.zones.filter((z) => z.cleared).length;
  }

  totalZoneCount(): number {
    return this.zones.length;
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (const sl of this.searchlights) {
      this.drawSearchlight(ctx, sl);
    }
    for (const drone of this.drones) {
      this.drawDrone(ctx, drone);
    }
    this.drawZones(ctx);
    this.drawAlert(ctx);
  }

  drawSearchlight(ctx: CanvasRenderingContext2D, sl: Searchlight) {
    ctx.save();

    const haloIntensity = Math.sin(sl.haloPhase) * 0.1 + 0.9;

    const grad = ctx.createRadialGradient(sl.x, sl.y, 0, sl.x, sl.y, sl.coneLength);
    grad.addColorStop(0, `rgba(255, 240, 180, ${0.15 * haloIntensity})`);
    grad.addColorStop(0.5, `rgba(255, 220, 120, ${0.08 * haloIntensity})`);
    grad.addColorStop(1, 'rgba(255, 200, 80, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(sl.x, sl.y);
    ctx.arc(sl.x, sl.y, sl.coneLength, sl.angle - sl.coneAngle / 2, sl.angle + sl.coneAngle / 2);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = `rgba(255, 230, 150, ${0.3 * haloIntensity})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(sl.x, sl.y);
    ctx.lineTo(
      sl.x + Math.cos(sl.angle - sl.coneAngle / 2) * sl.coneLength,
      sl.y + Math.sin(sl.angle - sl.coneAngle / 2) * sl.coneLength
    );
    ctx.moveTo(sl.x, sl.y);
    ctx.lineTo(
      sl.x + Math.cos(sl.angle + sl.coneAngle / 2) * sl.coneLength,
      sl.y + Math.sin(sl.angle + sl.coneAngle / 2) * sl.coneLength
    );
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 240, 200, 0.9)';
    ctx.shadowColor = '#ffee88';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(sl.x, sl.y, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawDrone(ctx: CanvasRenderingContext2D, drone: Drone) {
    ctx.save();

    const haloIntensity = Math.sin(drone.haloPhase) * 0.1 + 0.9;

    const grad = ctx.createRadialGradient(drone.x, drone.y, 0, drone.x, drone.y, drone.coneLength);
    grad.addColorStop(0, `rgba(255, 100, 100, ${0.12 * haloIntensity})`);
    grad.addColorStop(0.5, `rgba(255, 60, 60, ${0.06 * haloIntensity})`);
    grad.addColorStop(1, 'rgba(255, 40, 40, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(drone.x, drone.y);
    ctx.arc(
      drone.x,
      drone.y,
      drone.coneLength,
      drone.angle - drone.coneAngle / 2,
      drone.angle + drone.coneAngle / 2
    );
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = `rgba(255, 80, 80, ${0.25 * haloIntensity})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(drone.x, drone.y);
    ctx.lineTo(
      drone.x + Math.cos(drone.angle - drone.coneAngle / 2) * drone.coneLength,
      drone.y + Math.sin(drone.angle - drone.coneAngle / 2) * drone.coneLength
    );
    ctx.moveTo(drone.x, drone.y);
    ctx.lineTo(
      drone.x + Math.cos(drone.angle + drone.coneAngle / 2) * drone.coneLength,
      drone.y + Math.sin(drone.angle + drone.coneAngle / 2) * drone.coneLength
    );
    ctx.stroke();

    ctx.fillStyle = '#ff4444';
    ctx.shadowColor = '#ff2222';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(drone.x, drone.y, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#aa3333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(drone.x - 8, drone.y);
    ctx.lineTo(drone.x + 8, drone.y);
    ctx.stroke();

    ctx.restore();
  }

  drawZones(ctx: CanvasRenderingContext2D) {
    for (const z of this.zones) {
      ctx.save();
      if (z.cleared) {
        ctx.strokeStyle = 'rgba(60, 220, 120, 0.4)';
        ctx.fillStyle = 'rgba(60, 220, 120, 0.05)';
      } else {
        ctx.strokeStyle = 'rgba(100, 80, 200, 0.3)';
        ctx.fillStyle = 'rgba(100, 80, 200, 0.03)';
        ctx.setLineDash([6, 4]);
      }
      ctx.lineWidth = 1.5;
      ctx.fillRect(z.x, z.y, z.w, z.h);
      ctx.strokeRect(z.x, z.y, z.w, z.h);
      ctx.restore();
    }
  }

  drawAlert(ctx: CanvasRenderingContext2D) {
    if (!this.alert.active) return;

    ctx.save();
    const alpha = Math.min(1, this.alert.timer / this.alertDuration) * 0.6;
    ctx.strokeStyle = `rgba(255, 50, 50, ${alpha})`;
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.arc(this.alert.position.x, this.alert.position.y, 40, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = `rgba(255, 50, 50, ${alpha * 0.8})`;
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('!', this.alert.position.x, this.alert.position.y - 48);
    ctx.restore();
  }
}
