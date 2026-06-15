export interface WakeRegion {
  sourceId: number;
  tipX: number;
  tipY: number;
  leftX: number;
  leftY: number;
  rightX: number;
  rightY: number;
  windAngleDeg: number;
  length: number;
}

const WAKE_LENGTH = 60;
const HALF_ANGLE_DEG = 15;
const MIN_PENALTY = 0.10;
const MAX_PENALTY = 0.30;

function degToRad(d: number): number {
  return (d * Math.PI) / 180;
}

export class WindSimulation {
  private wakeRegions: WakeRegion[] = [];

  updateWakeEffect(turbines: { id: number; x: number; y: number; windAngle: number }[]): void {
    this.wakeRegions = [];

    for (const t of turbines) {
      const angleRad = degToRad(t.windAngle);
      const tipX = t.x + WAKE_LENGTH * Math.cos(angleRad);
      const tipY = t.y + WAKE_LENGTH * Math.sin(angleRad);

      const halfRad = degToRad(HALF_ANGLE_DEG);
      const leftAngle = angleRad - halfRad;
      const rightAngle = angleRad + halfRad;

      this.wakeRegions.push({
        sourceId: t.id,
        tipX,
        tipY,
        leftX: t.x + WAKE_LENGTH * Math.cos(leftAngle),
        leftY: t.y + WAKE_LENGTH * Math.sin(leftAngle),
        rightX: t.x + WAKE_LENGTH * Math.cos(rightAngle),
        rightY: t.y + WAKE_LENGTH * Math.sin(rightAngle),
        windAngleDeg: t.windAngle,
        length: WAKE_LENGTH,
      });
    }
  }

  getWakeRegions(): WakeRegion[] {
    return this.wakeRegions;
  }

  computeEfficiency(
    targetId: number,
    targetX: number,
    targetY: number,
    turbines: { id: number; x: number; y: number }[],
  ): number {
    let maxPenalty = 0;

    for (const wake of this.wakeRegions) {
      if (wake.sourceId === targetId) continue;

      if (this.isPointInWakeCone(targetX, targetY, wake)) {
        const source = turbines.find((t) => t.id === wake.sourceId);
        if (!source) continue;

        const dx = targetX - source.x;
        const dy = targetY - source.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const ratio = Math.min(dist / wake.length, 1);
        const penalty = MAX_PENALTY - ratio * (MAX_PENALTY - MIN_PENALTY);
        if (penalty > maxPenalty) {
          maxPenalty = penalty;
        }
      }
    }

    return Math.round((1 - maxPenalty) * 100);
  }

  getWakeInfoAtPoint(px: number, py: number): { affectedCount: number; avgPenalty: number } {
    let affectedCount = 0;
    let totalPenalty = 0;

    for (const wake of this.wakeRegions) {
      if (this.isPointInWakeCone(px, py, wake)) {
        affectedCount++;
        const dist = this.distanceToWakeSource(px, py, wake);
        const ratio = Math.min(dist / wake.length, 1);
        totalPenalty += MAX_PENALTY - ratio * (MAX_PENALTY - MIN_PENALTY);
      }
    }

    return {
      affectedCount,
      avgPenalty: affectedCount > 0 ? Math.round((totalPenalty / affectedCount) * 100) : 0,
    };
  }

  drawWakes(ctx: CanvasRenderingContext2D, turbines: { id: number; x: number; y: number }[]): void {
    for (const wake of this.wakeRegions) {
      const source = turbines.find((t) => t.id === wake.sourceId);
      if (!source) continue;

      const angleRad = degToRad(wake.windAngleDeg);
      const grad = ctx.createLinearGradient(
        source.x,
        source.y,
        source.x + wake.length * Math.cos(angleRad),
        source.y + wake.length * Math.sin(angleRad),
      );
      grad.addColorStop(0, 'rgba(66,165,245,0.4)');
      grad.addColorStop(1, 'rgba(66,165,245,0.0)');

      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(wake.leftX, wake.leftY);
      ctx.lineTo(wake.tipX, wake.tipY);
      ctx.lineTo(wake.rightX, wake.rightY);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
    }
  }

  private isPointInWakeCone(px: number, py: number, wake: WakeRegion): boolean {
    const source = this.getSourceForWake(wake);
    if (!source) return false;

    const dx = px - source.x;
    const dy = py - source.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > wake.length || dist < 1) return false;

    const angleToP = Math.atan2(dy, dx);
    const wakeAngle = degToRad(wake.windAngleDeg);
    let angleDiff = angleToP - wakeAngle;
    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

    return Math.abs(angleDiff) <= degToRad(HALF_ANGLE_DEG);
  }

  private distanceToWakeSource(px: number, py: number, wake: WakeRegion): number {
    const source = this.getSourceForWake(wake);
    if (!source) return 0;
    const dx = px - source.x;
    const dy = py - source.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private sourceCache: Map<number, { x: number; y: number }> = new Map();

  private getSourceForWake(wake: WakeRegion): { x: number; y: number } | null {
    return this.sourceCache.get(wake.sourceId) ?? null;
  }

  setSourceCache(turbines: { id: number; x: number; y: number }[]): void {
    this.sourceCache.clear();
    for (const t of turbines) {
      this.sourceCache.set(t.id, { x: t.x, y: t.y });
    }
  }
}
