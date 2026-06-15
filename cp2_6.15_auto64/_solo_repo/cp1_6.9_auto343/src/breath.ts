export interface MeltArea {
  id: number;
  x: number;
  y: number;
  radius: number;
  targetRadius: number;
  opacity: number;
  meltProgress: number;
  recoverTimer: number;
  isRecovering: boolean;
  createdAt: number;
  recoveredAt: number | null;
}

interface IceCrystal {
  x: number;
  y: number;
  size: number;
  startTime: number;
  duration: number;
}

export const RECOVER_DURATION_EDGE = 500;
export const RECOVER_DURATION_CENTER = 2500;
const MIN_RADIUS = 20;
const MAX_RADIUS = 80;
const MELT_DURATION = 500;
const GROW_DURATION = 1500;
const BREATH_INTERVAL = 50;
const MELTED_OPACITY = 0.2;
const FROST_OPACITY = 0.9;

function easeOutQuad(t: number): number {
  return t * (2 - t);
}

function easeInQuad(t: number): number {
  return t * t;
}

export class BreathInteraction {
  private meltAreas: MeltArea[] = [];
  private iceCrystals: IceCrystal[] = [];
  private isMouseDown = false;
  private currentX = 0;
  private currentY = 0;
  private meltIdCounter = 0;
  private lastBreathTime = 0;
  private canvasWidth: number;
  private canvasHeight: number;

  constructor(width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  public resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  public onMouseDown(x: number, y: number): void {
    this.isMouseDown = true;
    this.currentX = x;
    this.currentY = y;
    this.tryCreateMeltArea(performance.now());
  }

  public onMouseMove(x: number, y: number): void {
    this.currentX = x;
    this.currentY = y;
    if (this.isMouseDown) {
      this.tryCreateMeltArea(performance.now());
    }
  }

  public onMouseUp(): void {
    this.isMouseDown = false;
    const now = performance.now();
    for (const area of this.meltAreas) {
      if (!area.isRecovering) {
        area.isRecovering = true;
        area.recoverTimer = 0;
        area.recoveredAt = null;
        this.spawnEdgeIceCrystals(area, now);
      }
    }
  }

  private shouldProcessBreath(currentTime: number): boolean {
    if (currentTime - this.lastBreathTime >= BREATH_INTERVAL) {
      this.lastBreathTime = currentTime;
      return true;
    }
    return false;
  }

  private tryCreateMeltArea(currentTime: number): void {
    if (!this.shouldProcessBreath(currentTime)) return;

    const fw = 60;
    if (this.currentX < fw || this.currentX > this.canvasWidth - fw ||
        this.currentY < fw || this.currentY > this.canvasHeight - fw) {
      return;
    }

    for (const area of this.meltAreas) {
      if (!area.isRecovering) {
        const dx = this.currentX - area.x;
        const dy = this.currentY - area.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < (area.radius + MIN_RADIUS) * 0.8) {
          area.x = this.currentX;
          area.y = this.currentY;
          area.createdAt = currentTime;
          return;
        }
      }
    }

    this.meltAreas.push({
      id: this.meltIdCounter++,
      x: this.currentX,
      y: this.currentY,
      radius: MIN_RADIUS,
      targetRadius: MAX_RADIUS,
      opacity: FROST_OPACITY,
      meltProgress: 0,
      recoverTimer: 0,
      isRecovering: false,
      createdAt: currentTime,
      recoveredAt: null
    });
  }

  private spawnEdgeIceCrystals(area: MeltArea, now: number): void {
    const crystalCount = Math.floor(area.radius / 8);
    for (let i = 0; i < crystalCount; i++) {
      const angle = (Math.PI * 2 * i) / crystalCount + Math.random() * 0.3;
      const dist = area.radius * (0.85 + Math.random() * 0.15);
      this.iceCrystals.push({
        x: area.x + Math.cos(angle) * dist,
        y: area.y + Math.sin(angle) * dist,
        size: 5 + Math.random() * 10,
        startTime: now + Math.random() * 200,
        duration: 200
      });
    }
  }

  public update(deltaTime: number, currentTime: number): void {
    const dt = deltaTime;

    for (let i = this.meltAreas.length - 1; i >= 0; i--) {
      const area = this.meltAreas[i];

      if (!area.isRecovering) {
        const age = currentTime - area.createdAt;
        const growProgress = Math.min(age / GROW_DURATION, 1);
        area.radius = MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * easeOutQuad(growProgress);
        const meltProgress = Math.min(age / MELT_DURATION, 1);
        area.opacity = FROST_OPACITY - (FROST_OPACITY - MELTED_OPACITY) * meltProgress;
        area.meltProgress = meltProgress;
      } else {
        area.recoverTimer += dt;
        if (area.recoveredAt === null && area.recoverTimer >= RECOVER_DURATION_CENTER) {
          area.recoveredAt = currentTime;
        }
        if (area.recoverTimer > RECOVER_DURATION_CENTER + 500) {
          this.meltAreas.splice(i, 1);
        }
      }
    }

    for (let i = this.iceCrystals.length - 1; i >= 0; i--) {
      const crystal = this.iceCrystals[i];
      if (currentTime > crystal.startTime + crystal.duration + 500) {
        this.iceCrystals.splice(i, 1);
      }
    }
  }

  public getFrostOpacityAt(px: number, py: number): number {
    let minOpacity = FROST_OPACITY;

    for (const area of this.meltAreas) {
      const dx = px - area.x;
      const dy = py - area.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= area.radius) {
        if (!area.isRecovering) {
          const normalizedDist = dist / area.radius;
          const edgeFactor = easeOutQuad(normalizedDist);
          const centerOpacity = area.opacity;
          const edgeOpacity = area.opacity + (FROST_OPACITY - area.opacity) * 0.15;
          const pointOpacity = centerOpacity + (edgeOpacity - centerOpacity) * edgeFactor;
          minOpacity = Math.min(minOpacity, pointOpacity);
        } else {
          const recoverProgress = area.recoverTimer / RECOVER_DURATION_CENTER;
          const normalizedDist = dist / area.radius;
          const edgeRecoverTime = RECOVER_DURATION_EDGE / RECOVER_DURATION_CENTER;
          const localRecoverProgress = recoverProgress * (1 + normalizedDist * (1 / edgeRecoverTime - 1));
          const clampedProgress = Math.min(easeInQuad(localRecoverProgress), 1);
          const pointOpacity = MELTED_OPACITY + (FROST_OPACITY - MELTED_OPACITY) * clampedProgress;
          minOpacity = Math.min(minOpacity, pointOpacity);
        }
      }
    }

    return minOpacity;
  }

  public getMeltAreas(): MeltArea[] {
    return this.meltAreas;
  }

  public getIceCrystals(currentTime: number): Array<{ x: number; y: number; size: number; opacity: number }> {
    const result: Array<{ x: number; y: number; size: number; opacity: number }> = [];
    for (const crystal of this.iceCrystals) {
      if (currentTime >= crystal.startTime) {
        const elapsed = currentTime - crystal.startTime;
        const progress = Math.min(elapsed / crystal.duration, 1);
        const opacity = progress < 1 ? easeOutQuad(progress) : Math.max(0, 1 - (elapsed - crystal.duration) / 500);
        result.push({
          x: crystal.x,
          y: crystal.y,
          size: crystal.size * easeOutQuad(progress),
          opacity: opacity * 0.6
        });
      }
    }
    return result;
  }

  public hasActiveMeltAreas(): boolean {
    return this.meltAreas.length > 0;
  }
}
