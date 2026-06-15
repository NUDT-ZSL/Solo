import {
  CarState,
  ControlMode,
  KeyState,
  TrackData,
  Vec2,
  TrailsPoint,
  MODE_MAX_SPEED,
  MODE_COLORS,
  PHYSICS,
  drawRoundRect
} from '../types';

export class RaceEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private car: CarState;
  private mode: ControlMode = 'advanced';
  private keys: KeyState = {
    up: false,
    down: false,
    left: false,
    right: false,
    space: false
  };
  private track: TrackData;
  private trailPoints: TrailsPoint[] = [];
  private maxTrailLength = 150;
  private carColor: string = MODE_COLORS.advanced;
  private tireWear: number = 1;
  private driftStartTime: number = 0;
  private recoveryStartTime: number = 0;
  private recoveryDelayActive: boolean = false;
  private scale: number = 1;
  private offset: Vec2 = { x: 0, y: 0 };
  private lapStartTime: number = 0;
  private lastCheckpointIndex: number = -1;
  private lapCompleted: boolean = false;
  private trackLength: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.track = this.generateTrack();
    this.car = this.createInitialCarState();
    this.setupInputHandlers();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  private generateTrack(): TrackData {
    const centerX = 0;
    const centerY = 0;
    const innerRadius = 18;
    const outerRadius = 24;
    const width = outerRadius - innerRadius;

    const generateBezier = (radius: number): Vec2[] => {
      const points: Vec2[] = [];
      const segments = 8;
      for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const nextAngle = ((i + 1) / segments) * Math.PI * 2;
        const r1 = radius + Math.sin(angle * 3) * 1.5;
        const r2 = radius + Math.sin(nextAngle * 3) * 1.5;
        
        points.push({
          x: centerX + Math.cos(angle) * r1,
          y: centerY + Math.sin(angle) * r1
        });
        
        const cp1Angle = angle + Math.PI / segments;
        const cp1R = radius * 1.3;
        points.push({
          x: centerX + Math.cos(cp1Angle) * cp1R,
          y: centerY + Math.sin(cp1Angle) * cp1R
        });
        
        const cp2Angle = nextAngle - Math.PI / segments;
        const cp2R = radius * 1.3;
        points.push({
          x: centerX + Math.cos(cp2Angle) * cp2R,
          y: centerY + Math.sin(cp2Angle) * cp2R
        });
      }
      return points;
    };

    const innerCurve = { controlPoints: generateBezier(innerRadius) };
    const outerCurve = { controlPoints: generateBezier(outerRadius) };

    const centerLine: Vec2[] = [];
    const centerRadius = (innerRadius + outerRadius) / 2;
    const centerSegments = 100;
    for (let i = 0; i <= centerSegments; i++) {
      const angle = (i / centerSegments) * Math.PI * 2;
      const r = centerRadius + Math.sin(angle * 3) * 1.5;
      centerLine.push({
        x: centerX + Math.cos(angle) * r,
        y: centerY + Math.sin(angle) * r
      });
    }

    this.trackLength = centerSegments;

    return { innerCurve, outerCurve, centerLine, width };
  }

  private createInitialCarState(): CarState {
    const startPoint = this.track.centerLine[0];
    const nextPoint = this.track.centerLine[1];
    const angle = Math.atan2(
      nextPoint.y - startPoint.y,
      nextPoint.x - startPoint.x
    );

    return {
      position: { ...startPoint },
      angle,
      speed: 0,
      driftAngle: 0,
      isDrifting: false,
      steeringAngle: 0,
      angularVelocity: 0
    };
  }

  private setupInputHandlers(): void {
    window.addEventListener('keydown', (e) => {
      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          this.keys.up = true;
          break;
        case 'ArrowDown':
        case 'KeyS':
          this.keys.down = true;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          this.keys.left = true;
          break;
        case 'ArrowRight':
        case 'KeyD':
          this.keys.right = true;
          break;
        case 'Space':
          e.preventDefault();
          this.keys.space = true;
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          this.keys.up = false;
          break;
        case 'ArrowDown':
        case 'KeyS':
          this.keys.down = false;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          this.keys.left = false;
          break;
        case 'ArrowRight':
        case 'KeyD':
          this.keys.right = false;
          break;
        case 'Space':
          this.keys.space = false;
          break;
      }
    });
  }

  private resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    
    this.ctx.scale(dpr, dpr);
    
    const minDim = Math.min(rect.width, rect.height);
    this.scale = minDim / 60;
    this.offset = {
      x: rect.width / 2,
      y: rect.height / 2
    };
  }

  private worldToScreen(point: Vec2): Vec2 {
    return {
      x: this.offset.x + point.x * this.scale,
      y: this.offset.y + point.y * this.scale
    };
  }

  setControlMode(mode: ControlMode): void {
    this.mode = mode;
    this.carColor = MODE_COLORS[mode];
    this.tireWear = 1;
    this.recoveryDelayActive = false;
  }

  update(deltaTime: number): CarState {
    const maxSpeed = MODE_MAX_SPEED[this.mode];
    let { speed, angle, steeringAngle, driftAngle, position, isDrifting } = this.car;
    let { angularVelocity } = this.car;

    if (this.keys.up) {
      speed += PHYSICS.ACCELERATION * deltaTime;
    }
    if (this.keys.down) {
      speed -= PHYSICS.BRAKE * deltaTime;
    }

    if (this.keys.left) {
      steeringAngle = Math.max(steeringAngle - PHYSICS.STEER_SPEED * deltaTime, -1);
    } else if (this.keys.right) {
      steeringAngle = Math.min(steeringAngle + PHYSICS.STEER_SPEED * deltaTime, 1);
    } else {
      steeringAngle *= Math.pow(0.1, deltaTime);
    }

    const speedRatio = Math.min(Math.abs(speed) / maxSpeed, 1);
    const targetDrift = this.keys.space ? steeringAngle * PHYSICS.DRIFT_ANGLE_MAX : 0;
    driftAngle += (targetDrift - driftAngle) * 10 * deltaTime;
    isDrifting = this.keys.space && Math.abs(driftAngle) > PHYSICS.DRIFT_THRESHOLD && speedRatio > 0.2;

    let effectiveFriction = PHYSICS.FRICTION;
    let steerMultiplier = 1;

    if (this.mode === 'novice') {
      const nearestPoint = this.getNearestTrackPoint(position);
      const targetAngle = Math.atan2(
        nearestPoint.next.y - nearestPoint.current.y,
        nearestPoint.next.x - nearestPoint.current.x
      );
      let angleDiff = targetAngle - angle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      const autoSteer = Math.max(-1, Math.min(1, angleDiff * 2));
      steeringAngle = steeringAngle * 0.3 + autoSteer * 0.7;
    }

    if (this.mode === 'expert') {
      if (isDrifting) {
        this.tireWear = Math.max(0, this.tireWear - PHYSICS.TIRE_WEAR_RATE * deltaTime);
        this.driftStartTime += deltaTime;
        if (this.driftStartTime > 3) {
          this.recoveryDelayActive = true;
          this.recoveryStartTime = 0;
        }
      } else {
        if (this.recoveryDelayActive) {
          this.recoveryStartTime += deltaTime;
          if (this.recoveryStartTime >= PHYSICS.TIRE_RECOVERY_DELAY) {
            this.recoveryDelayActive = false;
            this.driftStartTime = 0;
          }
        }
        if (!this.recoveryDelayActive) {
          this.tireWear = Math.min(1, this.tireWear + PHYSICS.TIRE_RECOVERY_RATE * deltaTime);
          this.driftStartTime = 0;
        }
      }
      effectiveFriction = PHYSICS.FRICTION - (1 - this.tireWear) * 0.15;
    }

    if (isDrifting) {
      effectiveFriction = PHYSICS.DRIFT_FRICTION;
      steerMultiplier = PHYSICS.DRIFT_STEER_MULTIPLIER;
    }

    speed *= Math.pow(effectiveFriction, deltaTime * 60);
    speed = Math.max(-maxSpeed * 0.3, Math.min(maxSpeed, speed));

    const turnRate = steeringAngle * speedRatio * steerMultiplier * 3;
    angularVelocity = turnRate;
    angle += turnRate * deltaTime;

    const effectiveAngle = angle + driftAngle * 0.5;
    position.x += Math.cos(effectiveAngle) * speed * deltaTime;
    position.y += Math.sin(effectiveAngle) * speed * deltaTime;

    this.keepCarOnTrack(position);

    if (isDrifting && Math.abs(speed) > 5) {
      this.addTrailPoint(position, angle);
    }

    this.updateTrail(deltaTime);
    this.checkLap(position);

    if (Math.abs(speed) < PHYSICS.MINIMUM_SPEED) {
      speed = 0;
    }

    this.car = {
      position,
      angle,
      speed,
      driftAngle,
      isDrifting,
      steeringAngle,
      angularVelocity
    };

    return this.car;
  }

  private getNearestTrackPoint(pos: Vec2): { current: Vec2; next: Vec2; index: number; t: number } {
    let minDist = Infinity;
    let nearestIndex = 0;
    let nearestT = 0;

    for (let i = 0; i < this.track.centerLine.length; i++) {
      const p1 = this.track.centerLine[i];
      const p2 = this.track.centerLine[(i + 1) % this.track.centerLine.length];
      
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const lenSq = dx * dx + dy * dy;
      
      if (lenSq === 0) continue;
      
      const t = Math.max(0, Math.min(1, ((pos.x - p1.x) * dx + (pos.y - p1.y) * dy) / lenSq));
      const projX = p1.x + t * dx;
      const projY = p1.y + t * dy;
      const dist = Math.hypot(pos.x - projX, pos.y - projY);
      
      if (dist < minDist) {
        minDist = dist;
        nearestIndex = i;
        nearestT = t;
      }
    }

    return {
      current: this.track.centerLine[nearestIndex],
      next: this.track.centerLine[(nearestIndex + 1) % this.track.centerLine.length],
      index: nearestIndex,
      t: nearestT
    };
  }

  private keepCarOnTrack(pos: Vec2): void {
    const nearest = this.getNearestTrackPoint(pos);
    const dist = Math.hypot(pos.x - nearest.current.x, pos.y - nearest.current.y);
    const maxDist = this.track.width / 2 + 1;

    if (dist > maxDist) {
      const angle = Math.atan2(nearest.current.y - pos.y, nearest.current.x - pos.x);
      pos.x += Math.cos(angle) * (dist - maxDist);
      pos.y += Math.sin(angle) * (dist - maxDist);
      this.car.speed *= 0.9;
    }
  }

  private addTrailPoint(pos: Vec2, angle: number): void {
    const rearOffset = 0.5;
    const rearX = pos.x - Math.cos(angle) * rearOffset;
    const rearY = pos.y - Math.sin(angle) * rearOffset;

    this.trailPoints.push({
      position: { x: rearX, y: rearY },
      timestamp: performance.now(),
      alpha: 1,
      width: 0.3
    });

    if (this.trailPoints.length > this.maxTrailLength) {
      this.trailPoints.shift();
    }
  }

  private updateTrail(deltaTime: number): void {
    const now = performance.now();
    const maxAge = 1500;

    this.trailPoints = this.trailPoints.filter(point => {
      const age = now - point.timestamp;
      point.alpha = Math.max(0, 1 - age / maxAge);
      point.width = 0.3 * point.alpha;
      return age < maxAge;
    });
  }

  private checkLap(pos: Vec2): void {
    const nearest = this.getNearestTrackPoint(pos);
    
    if (this.lastCheckpointIndex === -1) {
      this.lastCheckpointIndex = nearest.index;
      this.lapStartTime = performance.now();
      return;
    }

    const passedStart = nearest.index < this.lastCheckpointIndex && 
                        this.lastCheckpointIndex > this.trackLength * 0.8;
    
    if (passedStart && nearest.t > 0.5) {
      this.lapCompleted = true;
      this.lapStartTime = performance.now();
    }

    this.lastCheckpointIndex = nearest.index;
  }

  checkLapCompletion(): boolean {
    if (this.lapCompleted) {
      this.lapCompleted = false;
      return true;
    }
    return false;
  }

  getLapTime(): number {
    return performance.now() - this.lapStartTime;
  }

  resetCar(): void {
    this.car = this.createInitialCarState();
    this.trailPoints = [];
    this.tireWear = 1;
    this.lastCheckpointIndex = -1;
    this.lapStartTime = performance.now();
  }

  getCarState(): CarState {
    return { ...this.car };
  }

  getTrailPoints(): TrailsPoint[] {
    return [...this.trailPoints];
  }

  render(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.ctx.clearRect(0, 0, rect.width, rect.height);

    this.ctx.fillStyle = '#16213e';
    this.ctx.fillRect(0, 0, rect.width, rect.height);

    this.renderTrack();
    this.renderTrail();
    this.renderCar();
  }

  private renderTrack(): void {
    const ctx = this.ctx;

    ctx.save();

    ctx.beginPath();
    this.drawBezierCurve(this.track.outerCurve.controlPoints);
    this.drawBezierCurve(this.track.innerCurve.controlPoints, true);
    ctx.closePath();
    ctx.fillStyle = '#333333';
    ctx.fill();

    ctx.save();
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 0.4 * this.scale;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    this.drawBezierCurve(this.track.innerCurve.controlPoints);
    ctx.stroke();
    ctx.beginPath();
    this.drawBezierCurve(this.track.outerCurve.controlPoints);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.15 * this.scale;
    ctx.setLineDash([1 * this.scale, 1 * this.scale]);
    ctx.beginPath();
    for (let i = 0; i < this.track.centerLine.length; i++) {
      const p = this.worldToScreen(this.track.centerLine[i]);
      if (i === 0) {
        ctx.moveTo(p.x, p.y);
      } else {
        ctx.lineTo(p.x, p.y);
      }
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    ctx.save();
    const startScreen = this.worldToScreen(this.track.centerLine[0]);
    const nextScreen = this.worldToScreen(this.track.centerLine[1]);
    const angle = Math.atan2(nextScreen.y - startScreen.y, nextScreen.x - startScreen.x);
    ctx.translate(startScreen.x, startScreen.y);
    ctx.rotate(angle + Math.PI / 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-this.track.width * this.scale / 2, -0.1 * this.scale, this.track.width * this.scale, 0.2 * this.scale);
    ctx.restore();

    ctx.restore();
  }

  private drawBezierCurve(points: Vec2[], reverse: boolean = false): void {
    const ctx = this.ctx;
    const pts = reverse ? [...points].reverse() : points;
    
    for (let i = 0; i < pts.length; i += 3) {
      const p0 = this.worldToScreen(pts[i]);
      const p1 = this.worldToScreen(pts[(i + 1) % pts.length]);
      const p2 = this.worldToScreen(pts[(i + 2) % pts.length]);
      const p3 = this.worldToScreen(pts[(i + 3) % pts.length]);

      if (i === 0 && !reverse) {
        ctx.moveTo(p0.x, p0.y);
      }
      ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
    }
  }

  private renderTrail(): void {
    if (this.trailPoints.length < 2) return;

    const ctx = this.ctx;
    ctx.save();

    for (let i = 1; i < this.trailPoints.length; i++) {
      const p1 = this.trailPoints[i - 1];
      const p2 = this.trailPoints[i];
      const s1 = this.worldToScreen(p1.position);
      const s2 = this.worldToScreen(p2.position);

      const gradient = ctx.createLinearGradient(s1.x, s1.y, s2.x, s2.y);
      const alpha1 = p1.alpha;
      const alpha2 = p2.alpha;
      
      gradient.addColorStop(0, `rgba(255, 50, 50, ${alpha1})`);
      gradient.addColorStop(1, `rgba(255, 150, 50, ${alpha2 * 0.5})`);

      ctx.beginPath();
      ctx.strokeStyle = gradient;
      ctx.lineWidth = (p1.width + p2.width) / 2 * this.scale;
      ctx.lineCap = 'round';
      ctx.moveTo(s1.x, s1.y);
      ctx.lineTo(s2.x, s2.y);
      ctx.stroke();
    }

    ctx.restore();
  }

  private renderCar(): void {
    const ctx = this.ctx;
    const { position, angle, driftAngle } = this.car;
    const screenPos = this.worldToScreen(position);
    const effectiveAngle = angle + driftAngle * 0.3;

    ctx.save();
    ctx.translate(screenPos.x, screenPos.y);
    ctx.rotate(effectiveAngle);

    const bodyWidth = 0.8 * this.scale;
    const bodyLength = 1.2 * this.scale;

    ctx.fillStyle = this.carColor;
    drawRoundRect(ctx, -bodyLength / 2, -bodyWidth / 2, bodyLength, bodyWidth, 0.15 * this.scale);
    ctx.fill();

    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 0.05 * this.scale;
    ctx.stroke();

    const cockpitWidth = 0.4 * this.scale;
    const cockpitLength = 0.5 * this.scale;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.ellipse(0.1 * this.scale, 0, cockpitLength / 2, cockpitWidth / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    const wheelWidth = 0.1 * this.scale;
    const wheelLength = 0.2 * this.scale;
    ctx.fillStyle = '#1a1a1a';
    
    const wheelPositions = [
      { x: 0.35, y: -0.45 },
      { x: 0.35, y: 0.45 },
      { x: -0.35, y: -0.45 },
      { x: -0.35, y: 0.45 }
    ];

    wheelPositions.forEach(pos => {
      ctx.fillRect(
        pos.x * this.scale - wheelLength / 2,
        pos.y * this.scale - wheelWidth / 2,
        wheelLength,
        wheelWidth
      );
    });

    ctx.restore();
  }

  getTrackData(): TrackData {
    return this.track;
  }

  getScale(): number {
    return this.scale;
  }

  getOffset(): Vec2 {
    return { ...this.offset };
  }
}
