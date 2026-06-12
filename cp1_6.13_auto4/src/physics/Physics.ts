import Matter from 'matter-js';
import type { BlockData, Particle } from '../types';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  CELL_SIZE,
  GRAVITY,
  MATERIAL_CONFIGS,
  STABLE_SPEED_THRESHOLD,
  STABLE_FRAME_THRESHOLD,
  PARTICLES_PER_COLLISION,
  PARTICLE_LIFETIME,
} from '../types';

const { Engine, World, Bodies, Body, Events, Composite } = Matter;

export interface PhysicsCallbacks {
  onPositionUpdate: (blocks: Map<string, { x: number; y: number; angle: number }>) => void;
  onCollision: (particles: Particle[]) => void;
  onStable: () => void;
}

export class PhysicsEngine {
  private engine: Matter.Engine;
  private world: Matter.World;
  private bodies: Map<string, Matter.Body> = new Map();
  private callbacks: PhysicsCallbacks;
  private animationFrameId: number | null = null;
  private stableFrameCount: number = 0;
  private isRunning: boolean = false;
  private hasActiveCollisions: boolean = false;
  private occupiedPositions: Set<string> = new Set();

  constructor(callbacks: PhysicsCallbacks) {
    this.engine = Engine.create();
    this.world = this.engine.world;
    this.engine.gravity.y = GRAVITY;
    this.callbacks = callbacks;
    this.createBoundaries();
    this.setupCollisionListeners();
  }

  private createBoundaries(): void {
    const wallThickness = 100;
    const boundaries = [
      Bodies.rectangle(CANVAS_WIDTH / 2, CANVAS_HEIGHT + wallThickness / 2, CANVAS_WIDTH + wallThickness * 2, wallThickness, {
        isStatic: true,
        render: { visible: false },
      }),
      Bodies.rectangle(-wallThickness / 2, CANVAS_HEIGHT / 2, wallThickness, CANVAS_HEIGHT + wallThickness * 2, {
        isStatic: true,
        render: { visible: false },
      }),
      Bodies.rectangle(CANVAS_WIDTH + wallThickness / 2, CANVAS_HEIGHT / 2, wallThickness, CANVAS_HEIGHT + wallThickness * 2, {
        isStatic: true,
        render: { visible: false },
      }),
    ];
    World.add(this.world, boundaries);
  }

  private setupCollisionListeners(): void {
    Events.on(this.engine, 'collisionStart', (event) => {
      const particles: Particle[] = [];
      const now = performance.now();

      this.hasActiveCollisions = true;

      for (const pair of event.pairs) {
        const { bodyA, bodyB } = pair;
        if (bodyA.isStatic || bodyB.isStatic) continue;

        const contactPoint = pair.collision.supports[0] || {
          x: (bodyA.position.x + bodyB.position.x) / 2,
          y: (bodyA.position.y + bodyB.position.y) / 2,
        };

        for (let i = 0; i < PARTICLES_PER_COLLISION; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 3 + 1;
          particles.push({
            id: `particle-${now}-${Math.random().toString(36).substring(2, 11)}`,
            x: contactPoint.x,
            y: contactPoint.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: Math.random() * 3 + 2,
            life: PARTICLE_LIFETIME,
            maxLife: PARTICLE_LIFETIME,
          });
        }
      }

      if (particles.length > 0) {
        this.callbacks.onCollision(particles);
      }
    });

    Events.on(this.engine, 'collisionEnd', () => {
      this.hasActiveCollisions = false;
    });
  }

  public addBlock(block: BlockData): boolean {
    const posKey = `${block.gridX},${block.gridY}`;
    if (this.occupiedPositions.has(posKey)) {
      return false;
    }

    if (this.bodies.has(block.id)) {
      return false;
    }

    const config = MATERIAL_CONFIGS[block.material];
    const body = Bodies.rectangle(block.x, block.y, CELL_SIZE, CELL_SIZE, {
      density: config.density,
      friction: config.friction,
      restitution: config.restitution,
      isStatic: true,
    });
    body.label = block.id;
    this.bodies.set(block.id, body);
    this.occupiedPositions.add(posKey);
    World.add(this.world, body);
    return true;
  }

  public removeBlock(blockId: string): string | null {
    const body = this.bodies.get(blockId);
    if (body) {
      World.remove(this.world, body);
      this.bodies.delete(blockId);
      const allBodies = Composite.allBodies(this.world);
      for (const b of allBodies) {
        if (!b.isStatic && b.label === blockId) {
          const gridX = Math.round((b.position.x - CELL_SIZE / 2) / CELL_SIZE);
          const gridY = Math.round((b.position.y - CELL_SIZE / 2) / CELL_SIZE);
          this.occupiedPositions.delete(`${gridX},${gridY}`);
          break;
        }
      }
      return blockId;
    }
    return null;
  }

  public removeBlockByPosition(gridX: number, gridY: number): string | null {
    const posKey = `${gridX},${gridY}`;
    if (!this.occupiedPositions.has(posKey)) {
      return null;
    }

    for (const [id, body] of this.bodies) {
      const bGridX = Math.round((body.position.x - CELL_SIZE / 2) / CELL_SIZE);
      const bGridY = Math.round((body.position.y - CELL_SIZE / 2) / CELL_SIZE);
      if (bGridX === gridX && bGridY === gridY) {
        World.remove(this.world, body);
        this.bodies.delete(id);
        this.occupiedPositions.delete(posKey);
        return id;
      }
    }
    return null;
  }

  public setBlocksDynamic(): void {
    for (const body of this.bodies.values()) {
      Body.setStatic(body, false);
    }
  }

  public reset(): void {
    this.stop();
    for (const body of this.bodies.values()) {
      World.remove(this.world, body);
    }
    this.bodies.clear();
    this.occupiedPositions.clear();
    this.stableFrameCount = 0;
    this.hasActiveCollisions = false;
    Engine.clear(this.engine);
    this.engine = Engine.create();
    this.world = this.engine.world;
    this.engine.gravity.y = GRAVITY;
    this.createBoundaries();
    this.setupCollisionListeners();
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.setBlocksDynamic();
    this.stableFrameCount = 0;
    this.hasActiveCollisions = false;
    this.simulate();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private checkStability(): boolean {
    if (this.hasActiveCollisions) return false;

    for (const body of this.bodies.values()) {
      const speed = Math.sqrt(
        body.velocity.x * body.velocity.x + body.velocity.y * body.velocity.y
      );
      if (speed >= STABLE_SPEED_THRESHOLD) return false;
    }

    return true;
  }

  private simulate = (): void => {
    if (!this.isRunning) return;

    Engine.update(this.engine, 1000 / 60);

    const positions = new Map<string, { x: number; y: number; angle: number }>();
    for (const [id, body] of this.bodies) {
      positions.set(id, {
        x: body.position.x,
        y: body.position.y,
        angle: body.angle,
      });
    }
    this.callbacks.onPositionUpdate(positions);

    if (this.checkStability()) {
      this.stableFrameCount++;
    } else {
      this.stableFrameCount = 0;
    }

    if (this.stableFrameCount >= STABLE_FRAME_THRESHOLD) {
      this.stop();
      this.callbacks.onStable();
      return;
    }

    this.animationFrameId = requestAnimationFrame(this.simulate);
  };

  public updateBlockPosition(block: BlockData): void {
    const body = this.bodies.get(block.id);
    if (body) {
      Body.setPosition(body, { x: block.x, y: block.y });
      Body.setAngle(body, block.angle);
    }
  }
}
