import { MemoryCrystal, Vector2, Particle, CRYSTAL_COLORS, CrystalColor } from './types';
import { generateId, randomRange, randomPick, distance, normalize, subtractVectors } from './utils';

const COLLECT_DISTANCE = 30;
const ATTRACT_DISTANCE = 80;
const CRYSTAL_SPAWN_INTERVAL = 3000;
const MAX_CRYSTALS = 20;

export interface CollectEvent {
  crystalId: string;
  position: Vector2;
  color: string;
  particles: Particle[];
}

export class CollectibleManager {
  crystals: Map<string, MemoryCrystal> = new Map();
  private lastSpawnTime = 0;
  private getRandomNodePosition: (preferUnseen?: boolean) => Vector2 | null = () => null;

  setPositionProvider(provider: (preferUnseen?: boolean) => Vector2 | null): void {
    this.getRandomNodePosition = provider;
  }

  spawnCrystal(forcePosition?: Vector2, attachedNodeId?: string): void {
    if (this.crystals.size >= MAX_CRYSTALS) return;

    let pos: Vector2;
    if (forcePosition) {
      pos = { ...forcePosition };
    } else {
      const nodePos = this.getRandomNodePosition(true);
      if (!nodePos) return;
      pos = {
        x: nodePos.x + randomRange(-40, 40),
        y: nodePos.y + randomRange(-20, 20),
      };
    }

    const color = randomPick<CrystalColor>(CRYSTAL_COLORS);
    const crystal: MemoryCrystal = {
      id: generateId(),
      position: pos,
      radius: randomRange(8, 12),
      color,
      collected: false,
      collectProgress: 0,
      attachedNodeId: attachedNodeId || null,
      rotation: randomRange(0, Math.PI * 2),
    };

    this.crystals.set(crystal.id, crystal);
  }

  spawnCrystalsOnTreeNodes(nodePositions: Vector2[]): void {
    const count = Math.min(3, Math.floor(nodePositions.length / 3));
    const shuffled = [...nodePositions].sort(() => Math.random() - 0.5);
    for (let i = 0; i < count; i++) {
      if (this.crystals.size >= MAX_CRYSTALS) break;
      const pos = shuffled[i];
      this.spawnCrystal(
        {
          x: pos.x + randomRange(-30, 30),
          y: pos.y + randomRange(-15, 15),
        },
        undefined
      );
    }
  }

  update(
    playerPosition: Vector2,
    currentTime: number,
    dt: number
  ): CollectEvent[] {
    const events: CollectEvent[] = [];

    if (currentTime - this.lastSpawnTime > CRYSTAL_SPAWN_INTERVAL) {
      this.lastSpawnTime = currentTime;
      if (this.crystals.size < MAX_CRYSTALS) {
        this.spawnCrystal();
      }
    }

    for (const crystal of this.crystals.values()) {
      crystal.rotation += dt * 1.5;

      const dist = distance(crystal.position, playerPosition);

      if (crystal.collected) {
        crystal.collectProgress += dt * 2.5;
        if (crystal.collectProgress >= 1) {
          this.crystals.delete(crystal.id);
        }
        continue;
      }

      if (dist < ATTRACT_DISTANCE) {
        const dir = normalize(subtractVectors(playerPosition, crystal.position));
        const attractSpeed = (1 - dist / ATTRACT_DISTANCE) * 250 * dt;
        crystal.position.x += dir.x * attractSpeed;
        crystal.position.y += dir.y * attractSpeed;
      }

      if (dist < COLLECT_DISTANCE) {
        crystal.collected = true;
        crystal.collectProgress = 0;

        const burstParticles = this.createCollectParticles(crystal);
        events.push({
          crystalId: crystal.id,
          position: { ...crystal.position },
          color: crystal.color,
          particles: burstParticles,
        });
      }
    }

    return events;
  }

  private createCollectParticles(crystal: MemoryCrystal): Particle[] {
    const particles: Particle[] = [];
    const count = Math.floor(randomRange(10, 15));

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + randomRange(-0.2, 0.2);
      const speed = randomRange(50, 150);
      particles.push({
        id: generateId(),
        position: { ...crystal.position },
        velocity: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed,
        },
        life: 0.8,
        maxLife: 0.8,
        color: crystal.color,
        size: randomRange(2, 5),
        type: 'collect',
      });
    }

    return particles;
  }

  getCrystalsArray(): MemoryCrystal[] {
    return Array.from(this.crystals.values());
  }

  getCrystalCount(): number {
    return this.crystals.size;
  }

  clear(): void {
    this.crystals.clear();
  }
}
