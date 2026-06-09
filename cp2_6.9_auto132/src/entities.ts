export interface EntityState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  extra?: Record<string, number>;
}

export interface GhostFrame {
  state: EntityState;
  timestamp: number;
}

export type EntityType = 'platform' | 'missile' | 'gate';

export abstract class Entity {
  id: string;
  type: EntityType;
  state: EntityState;
  ghostFrames: GhostFrame[] = [];
  maxGhostFrames: number = 180;
  abnormalTimeFlow: boolean = false;

  constructor(id: string, type: EntityType, state: EntityState) {
    this.id = id;
    this.type = type;
    this.state = state;
  }

  abstract update(timeDelta: number, timeScale: number): void;

  captureState(): EntityState {
    return {
      x: this.state.x,
      y: this.state.y,
      vx: this.state.vx,
      vy: this.state.vy,
      extra: this.state.extra ? { ...this.state.extra } : undefined,
    };
  }

  restoreState(state: EntityState): void {
    this.state = {
      ...state,
      extra: state.extra ? { ...state.extra } : undefined,
    };
  }

  pushGhostFrame(): void {
    this.ghostFrames.push({
      state: this.captureState(),
      timestamp: performance.now(),
    });
    if (this.ghostFrames.length > this.maxGhostFrames) {
      this.ghostFrames.shift();
    }
  }

  clearGhostFrames(): void {
    this.ghostFrames = [];
  }
}

export class MovingPlatform extends Entity {
  width: number = 80;
  height: number = 15;
  axis: 'horizontal' | 'vertical';
  minPos: number;
  maxPos: number;
  baseSpeed: number = 2;
  direction: number = 1;

  constructor(
    id: string,
    startX: number,
    startY: number,
    axis: 'horizontal' | 'vertical',
    minPos: number,
    maxPos: number
  ) {
    super(id, 'platform', {
      x: startX,
      y: startY,
      vx: axis === 'horizontal' ? 2 : 0,
      vy: axis === 'vertical' ? 2 : 0,
    });
    this.axis = axis;
    this.minPos = minPos;
    this.maxPos = maxPos;
  }

  update(timeDelta: number, timeScale: number): void {
    const speed = this.baseSpeed * Math.abs(timeScale);
    const effectiveDir = timeScale >= 0 ? this.direction : -this.direction;

    if (this.axis === 'horizontal') {
      this.state.x += effectiveDir * speed;
      if (this.state.x <= this.minPos) {
        this.state.x = this.minPos;
        this.direction = 1;
      } else if (this.state.x >= this.maxPos) {
        this.state.x = this.maxPos;
        this.direction = -1;
      }
      this.state.vx = effectiveDir * speed;
    } else {
      this.state.y += effectiveDir * speed;
      if (this.state.y <= this.minPos) {
        this.state.y = this.minPos;
        this.direction = 1;
      } else if (this.state.y >= this.maxPos) {
        this.state.y = this.maxPos;
        this.direction = -1;
      }
      this.state.vy = effectiveDir * speed;
    }
  }
}

export class Missile extends Entity {
  radius: number = 10;
  gravity: number = 0.15;
  initialX: number;
  initialY: number;
  initialVx: number;
  initialVy: number;
  cycleTime: number = 0;
  maxCycleTime: number = 240;

  constructor(
    id: string,
    startX: number,
    startY: number,
    vx: number,
    vy: number
  ) {
    super(id, 'missile', {
      x: startX,
      y: startY,
      vx: vx,
      vy: vy,
    });
    this.initialX = startX;
    this.initialY = startY;
    this.initialVx = vx;
    this.initialVy = vy;
  }

  update(timeDelta: number, timeScale: number): void {
    const timeStep = timeScale;
    this.cycleTime += timeStep;

    if (this.cycleTime >= this.maxCycleTime || this.cycleTime <= 0) {
      if (timeScale >= 0) {
        this.cycleTime = 0;
        this.state.x = this.initialX;
        this.state.y = this.initialY;
        this.state.vx = this.initialVx;
        this.state.vy = this.initialVy;
      } else {
        this.cycleTime = this.maxCycleTime;
      }
    }

    const speedMultiplier = Math.abs(timeScale) > 1 ? 2 : 1;
    this.state.x += this.state.vx * timeStep * speedMultiplier;
    this.state.vy += this.gravity * timeStep;
    this.state.y += this.state.vy * timeStep;

    if (this.state.y > 650 || this.state.x > 950 || this.state.x < -50) {
      if (timeScale >= 0) {
        this.state.x = this.initialX;
        this.state.y = this.initialY;
        this.state.vx = this.initialVx;
        this.state.vy = this.initialVy;
        this.cycleTime = 0;
      }
    }
  }
}

export class TimeGate extends Entity {
  width: number = 10;
  height: number = 60;
  isOpen: boolean = false;
  openProgress: number = 0;
  coverageHistory: number[] = [];
  coverageWindow: number = 120;
  passThroughTimer: number = 0;
  passThroughRequired: number = 30;
  hasPassed: boolean = false;

  constructor(id: string, x: number, y: number) {
    super(id, 'gate', {
      x,
      y,
      vx: 0,
      vy: 0,
    });
  }

  update(timeDelta: number, timeScale: number): void {
    const transitionSpeed = 0.05 * Math.abs(timeScale);
    if (this.isOpen) {
      this.openProgress = Math.min(1, this.openProgress + transitionSpeed);
    } else {
      this.openProgress = Math.max(0, this.openProgress - transitionSpeed);
    }

    if (this.state.extra) {
      this.state.extra.openProgress = this.openProgress;
      this.state.extra.isOpen = this.isOpen ? 1 : 0;
    } else {
      this.state.extra = {
        openProgress: this.openProgress,
        isOpen: this.isOpen ? 1 : 0,
      };
    }
  }

  checkCoverage(missileY: number): boolean {
    const gateTop = this.state.y;
    const gateBottom = this.state.y + this.height;
    return missileY >= gateTop && missileY <= gateBottom;
  }

  recordCoverage(covered: boolean): void {
    this.coverageHistory.push(covered ? 1 : 0);
    if (this.coverageHistory.length > this.coverageWindow) {
      this.coverageHistory.shift();
    }
    const total = this.coverageHistory.reduce((a, b) => a + b, 0);
    this.isOpen = total >= 120;
  }

  checkPassThrough(missile: Missile): boolean {
    if (this.hasPassed) return true;
    const missileLeft = missile.state.x - missile.radius;
    const missileRight = missile.state.x + missile.radius;
    const missileTop = missile.state.y - missile.radius;
    const missileBottom = missile.state.y + missile.radius;

    const gateLeft = this.state.x;
    const gateRight = this.state.x + this.width;
    const gateTop = this.state.y;
    const gateBottom = this.state.y + this.height;

    const inVerticalRange = missileTop >= gateTop && missileBottom <= gateBottom;
    const horizontalOverlap = missileRight >= gateLeft && missileLeft <= gateRight;

    if (this.isOpen && inVerticalRange && horizontalOverlap) {
      this.passThroughTimer++;
      if (this.passThroughTimer >= this.passThroughRequired) {
        this.hasPassed = true;
        return true;
      }
    } else {
      this.passThroughTimer = Math.max(0, this.passThroughTimer - 1);
    }
    return false;
  }

  restoreState(state: EntityState): void {
    super.restoreState(state);
    if (state.extra) {
      this.openProgress = state.extra.openProgress ?? 0;
      this.isOpen = (state.extra.isOpen ?? 0) === 1;
    }
  }
}
