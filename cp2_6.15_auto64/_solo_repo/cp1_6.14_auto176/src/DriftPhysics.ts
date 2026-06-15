import { Point, TrackData, Obstacle, TrackGenerator } from './TrackGenerator';

export interface ShipState {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  angle: number;
  driftAngle: number;
  speed: number;
  isColliding: boolean;
  collisionTimer: number;
  boostActive: boolean;
  boostTimer: number;
  lastDriftTime: number;
  isDrifting: boolean;
}

export interface PhysicsState {
  ship: ShipState;
  collectedOrbs: number;
  totalOrbs: number;
  lap: number;
  raceTime: number;
  isFinished: boolean;
  crossedFinishLine: boolean;
  lastFinishCrossTime: number;
}

export interface InputState {
  isMouseDown: boolean;
  mouseDeltaX: number;
  screenCenterX: number;
}

type EventCallback = (data: unknown) => void;

class EventBus {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: EventCallback): void {
    this.listeners.get(event)?.delete(callback);
  }

  emit(event: string, data?: unknown): void {
    this.listeners.get(event)?.forEach(callback => callback(data));
  }
}

export const eventBus = new EventBus();

export class DriftPhysics {
  private trackData: TrackData;
  private state: PhysicsState;
  private input: InputState;
  private readonly ACCELERATION = 200;
  private readonly MAX_SPEED = 350;
  private readonly FRICTION = 0.98;
  private readonly DRIFT_FRICTION = 0.92;
  private readonly STEER_SPEED = 2.5;
  private readonly DRIFT_COOLDOWN = 500;
  private readonly OBSTACLE_RADIUS = 15;
  private readonly ORB_RADIUS = 8;
  private readonly SHIP_RADIUS = 10;
  private readonly BOOST_DURATION = 1000;
  private readonly COLLISION_DURATION = 300;
  private readonly TOTAL_LAPS = 3;

  constructor(trackData: TrackData) {
    this.trackData = trackData;
    this.input = {
      isMouseDown: false,
      mouseDeltaX: 0,
      screenCenterX: 0
    };
    this.state = this.createInitialState();
  }

  private createInitialState(): PhysicsState {
    const startPoint = this.trackData.trackPoints[0];
    const nextPoint = this.trackData.trackPoints[1];
    const angle = Math.atan2(nextPoint.y - startPoint.y, nextPoint.x - startPoint.x);

    return {
      ship: {
        x: startPoint.x,
        y: startPoint.y,
        velocityX: Math.cos(angle) * 50,
        velocityY: Math.sin(angle) * 50,
        angle: angle,
        driftAngle: 0,
        speed: 50,
        isColliding: false,
        collisionTimer: 0,
        boostActive: false,
        boostTimer: 0,
        lastDriftTime: -1000,
        isDrifting: false
      },
      collectedOrbs: 0,
      totalOrbs: this.trackData.energyOrbs.length,
      lap: 1,
      raceTime: 0,
      isFinished: false,
      crossedFinishLine: true,
      lastFinishCrossTime: 0
    };
  }

  reset(): void {
    this.state = this.createInitialState();
  }

  updateTrackData(trackData: TrackData): void {
    this.trackData = trackData;
    this.state.totalOrbs = trackData.energyOrbs.length;
    this.reset();
  }

  setInput(input: Partial<InputState>): void {
    this.input = { ...this.input, ...input };
  }

  getState(): PhysicsState {
    return { ...this.state };
  }

  getTrackData(): TrackData {
    return this.trackData;
  }

  update(deltaTime: number, currentTime: number): void {
    if (this.state.isFinished) return;

    this.state.raceTime += deltaTime;

    if (this.state.ship.collisionTimer > 0) {
      this.state.ship.collisionTimer -= deltaTime * 1000;
      if (this.state.ship.collisionTimer <= 0) {
        this.state.ship.isColliding = false;
      }
    }

    if (this.state.ship.boostTimer > 0) {
      this.state.ship.boostTimer -= deltaTime * 1000;
      if (this.state.ship.boostTimer <= 0) {
        this.state.ship.boostActive = false;
      }
    }

    this.updateShipPhysics(deltaTime, currentTime);
    this.checkCollisions(currentTime);
    this.checkFinishLine(currentTime);
  }

  private updateShipPhysics(deltaTime: number, currentTime: number): void {
    const ship = this.state.ship;
    const dt = deltaTime;

    const canDrift = currentTime - ship.lastDriftTime >= this.DRIFT_COOLDOWN;
    
    if (this.input.isMouseDown && canDrift) {
      ship.isDrifting = true;
      ship.lastDriftTime = currentTime;
      
      const steerAmount = this.input.mouseDeltaX * this.STEER_SPEED * dt;
      ship.angle += steerAmount;
      
      const targetDriftAngle = steerAmount * 3;
      ship.driftAngle += (targetDriftAngle - ship.driftAngle) * 0.3;
    } else if (ship.isDrifting) {
      ship.isDrifting = false;
    } else {
      ship.driftAngle *= 0.92;
    }

    const moveAngle = ship.angle + ship.driftAngle;
    const currentMaxSpeed = ship.boostActive ? this.MAX_SPEED * 1.2 : this.MAX_SPEED;

    const accel = this.ACCELERATION * dt;
    ship.velocityX += Math.cos(moveAngle) * accel;
    ship.velocityY += Math.sin(moveAngle) * accel;

    const friction = ship.isDrifting ? this.DRIFT_FRICTION : this.FRICTION;
    ship.velocityX *= friction;
    ship.velocityY *= friction;

    const currentSpeed = Math.sqrt(ship.velocityX ** 2 + ship.velocityY ** 2);
    if (currentSpeed > currentMaxSpeed) {
      const scale = currentMaxSpeed / currentSpeed;
      ship.velocityX *= scale;
      ship.velocityY *= scale;
    }

    ship.speed = currentSpeed;
    ship.x += ship.velocityX * dt;
    ship.y += ship.velocityY * dt;

    this.constrainToTrack(ship);
  }

  private constrainToTrack(ship: ShipState): void {
    let minDist = Infinity;
    let nearestPoint: Point = { x: ship.x, y: ship.y };

    for (let i = 0; i < this.trackData.trackPoints.length; i++) {
      const p1 = this.trackData.trackPoints[i];
      const p2 = this.trackData.trackPoints[(i + 1) % this.trackData.trackPoints.length];
      
      const dist = this.pointToSegmentDistance(ship, p1, p2);
      if (dist.distance < minDist) {
        minDist = dist.distance;
        nearestPoint = dist.closestPoint;
      }
    }

    const trackHalfWidth = TrackGenerator.getTrackWidth() / 2;
    if (minDist > trackHalfWidth) {
      const dx = nearestPoint.x - ship.x;
      const dy = nearestPoint.y - ship.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      ship.x = nearestPoint.x - (dx / len) * trackHalfWidth;
      ship.y = nearestPoint.y - (dy / len) * trackHalfWidth;
      
      const dot = (ship.velocityX * dx + ship.velocityY * dy) / (len * len);
      ship.velocityX -= 1.5 * dot * dx;
      ship.velocityY -= 1.5 * dot * dy;
      ship.velocityX *= 0.9;
      ship.velocityY *= 0.9;
    }
  }

  private pointToSegmentDistance(point: Point, segStart: Point, segEnd: Point): { distance: number; closestPoint: Point } {
    const dx = segEnd.x - segStart.x;
    const dy = segEnd.y - segStart.y;
    const lenSq = dx * dx + dy * dy;

    if (lenSq === 0) {
      const dist = Math.sqrt((point.x - segStart.x) ** 2 + (point.y - segStart.y) ** 2);
      return { distance: dist, closestPoint: segStart };
    }

    let t = ((point.x - segStart.x) * dx + (point.y - segStart.y) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const closestPoint = {
      x: segStart.x + t * dx,
      y: segStart.y + t * dy
    };

    const distance = Math.sqrt((point.x - closestPoint.x) ** 2 + (point.y - closestPoint.y) ** 2);
    return { distance, closestPoint };
  }

  private checkCollisions(currentTime: number): void {
    const ship = this.state.ship;

    for (const obstacle of this.trackData.obstacles) {
      const dist = Math.sqrt((ship.x - obstacle.x) ** 2 + (ship.y - obstacle.y) ** 2);
      if (dist < this.OBSTACLE_RADIUS + this.SHIP_RADIUS) {
        this.handleCollision(obstacle, currentTime);
        break;
      }
    }

    for (let i = 0; i < this.trackData.energyOrbs.length; i++) {
      const orb = this.trackData.energyOrbs[i];
      if (orb.collected) continue;

      const dist = Math.sqrt((ship.x - orb.x) ** 2 + (ship.y - orb.y) ** 2);
      if (dist < this.ORB_RADIUS + this.SHIP_RADIUS) {
        this.collectOrb(i, currentTime);
      }
    }
  }

  private handleCollision(obstacle: Obstacle, currentTime: number): void {
    const ship = this.state.ship;
    
    ship.velocityX = 0;
    ship.velocityY = 0;
    ship.speed = 0;
    ship.isColliding = true;
    ship.collisionTimer = this.COLLISION_DURATION;

    const dx = ship.x - obstacle.x;
    const dy = ship.y - obstacle.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    ship.x = obstacle.x + (dx / len) * (this.OBSTACLE_RADIUS + this.SHIP_RADIUS + 5);
    ship.y = obstacle.y + (dy / len) * (this.OBSTACLE_RADIUS + this.SHIP_RADIUS + 5);

    eventBus.emit('collision', { time: currentTime });
  }

  private collectOrb(index: number, _currentTime: number): void {
    this.trackData.energyOrbs[index].collected = true;
    this.state.collectedOrbs++;
    
    const ship = this.state.ship;
    ship.boostActive = true;
    ship.boostTimer = this.BOOST_DURATION;
    ship.velocityX *= 1.2;
    ship.velocityY *= 1.2;

    eventBus.emit('orbCollected', { 
      index, 
      collected: this.state.collectedOrbs, 
      total: this.state.totalOrbs 
    });
  }

  private checkFinishLine(currentTime: number): void {
    const ship = this.state.ship;
    const finish = this.trackData.finishLine;
    
    const onLine = this.isPointNearSegment(
      { x: ship.x, y: ship.y },
      finish.start,
      finish.end,
      15
    );

    if (onLine && !this.state.crossedFinishLine) {
      if (currentTime - this.state.lastFinishCrossTime > 3000) {
        this.state.lap++;
        this.state.lastFinishCrossTime = currentTime;
        eventBus.emit('lapComplete', { lap: this.state.lap });

        if (this.state.lap > this.TOTAL_LAPS) {
          this.state.isFinished = true;
          eventBus.emit('raceComplete', { 
            time: this.state.raceTime,
            collectedOrbs: this.state.collectedOrbs,
            totalOrbs: this.state.totalOrbs
          });
        }
      }
      this.state.crossedFinishLine = true;
    } else if (!onLine) {
      this.state.crossedFinishLine = false;
    }
  }

  private isPointNearSegment(point: Point, segStart: Point, segEnd: Point, threshold: number): boolean {
    const result = this.pointToSegmentDistance(point, segStart, segEnd);
    return result.distance < threshold;
  }

  getTrackSegments(): TrackData['segments'] {
    return this.trackData.segments;
  }
}
