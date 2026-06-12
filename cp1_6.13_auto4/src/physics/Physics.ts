import Matter from 'matter-js';
import type { BlockData, BlockMaterial, Particle } from '../types';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  CELL_SIZE,
  GRAVITY,
  MATERIAL_CONFIGS,
  STABLE_FRAME_THRESHOLD,
  STABLE_TIMESTAMP_DELTA,
  PARTICLES_PER_COLLISION,
  PARTICLE_LIFETIME,
} from '../types';

const { Engine, World, Bodies, Body, Events } = Matter;

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
  private lastTimestamp: number = 0;
  private stableFrameCount: number = 0;
  private isRunning: boolean = false;

  constructor(callbacks: PhysicsCallbacks) {
    this.engine = Engine.create();
    this.world = this.engine.world;
    this.engine.gravity.y = GRAVITY;
    this.callbacks = callbacks;
    this.createBoundaries();
    this.setupCollisionListener();
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

  private setupCollisionListener(): void {
    Events.on(this.engine, 'collisionStart', (event) => {
      const particles: Particle[] = [];
      const now = performance.now();

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
            id: `particle-${now}-${Math.random().toString(36).substr(2, 9)}`,
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
  }

  public addBlock(block: BlockData): void {
    const config = MATERIAL_CONFIGS[block.material];
    const body = Bodies.rectangle(block.x, block.y, CELL_SIZE, CELL_SIZE, {
      density: config.density,
      friction: config.friction,
      restitution: config.restitution,
      isStatic: true,
    });
    body.label = block.id;
    this.bodies.set(block.id, body);
    World.add(this.world, body);
  }

  public removeBlock(blockId: string): void {
    const body = this.bodies.get(blockId);
    if (body) {
      World.remove(this.world, body);
      this.bodies.delete(blockId);
    }
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
    this.stableFrameCount = 0;
    this.lastTimestamp = 0;
    Engine.clear(this.engine);
    this.engine = Engine.create();
    this.world = this.engine.world;
    this.engine.gravity.y = GRAVITY;
    this.createBoundaries();
    this.setupCollisionListener();
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.setBlocksDynamic();
    this.stableFrameCount = 0;
    this.lastTimestamp = this.engine.timing.timestamp;
    this.simulate();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
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

    const timestampDelta = Math.abs(this.engine.timing.timestamp - this.lastTimestamp);
    if (timestampDelta < STABLE_TIMESTAMP_DELTA) {
      this.stableFrameCount++;
    } else {
      this.stableFrameCount = 0;
    }
    this.lastTimestamp = this.engine.timing.timestamp;

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
