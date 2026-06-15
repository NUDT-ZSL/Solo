import { GameMap, TILE_SIZE } from './map';
import { Player, Bullet, PLAYER_BODY_LENGTH } from './player';

export const MAX_ACTIVE_PARTICLES = 50;
export const MAX_SHADOW_CREATURES = 5;

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
  saturation: number;
  lightness: number;
}

export interface Mushroom {
  x: number;
  y: number;
  collected: boolean;
  pulsePhase: number;
}

export interface ShadowCreature {
  x: number;
  y: number;
  radius: number;
  speed: number;
  perceiveRadius: number;
  chargeSpeed: number;
  wobblePhase: number;
  alive: boolean;
  jitterX: number;
  jitterY: number;
}

export interface Rune {
  x: number;
  y: number;
  activated: boolean;
  glowIntensity: number;
  nearbyTeleport: Teleport | null;
}

export interface Teleport {
  x: number;
  y: number;
  radius: number;
  rotation: number;
  active: boolean;
  targetRoomIndex: number;
}

export interface ExtraLight {
  x: number;
  y: number;
  radius: number;
  life: number;
  maxLife: number;
}

export type ScreenFlashType = 'green' | 'yellow' | 'white' | null;

export interface ScreenFlash {
  type: ScreenFlashType;
  life: number;
  maxLife: number;
}

export class EntityManager {
  mushrooms: Mushroom[];
  creatures: ShadowCreature[];
  runes: Rune[];
  teleports: Teleport[];
  particles: Particle[];
  extraLights: ExtraLight[];
  screenFlash: ScreenFlash;

  constructor() {
    this.mushrooms = [];
    this.creatures = [];
    this.runes = [];
    this.teleports = [];
    this.particles = [];
    this.extraLights = [];
    this.screenFlash = { type: null, life: 0, maxLife: 1 };
  }

  reset(): void {
    this.mushrooms = [];
    this.creatures = [];
    this.runes = [];
    this.teleports = [];
    this.particles = [];
    this.extraLights = [];
    this.screenFlash = { type: null, life: 0, maxLife: 1 };
  }

  populateFromMap(map: GameMap): void {
    this.reset();

    for (const room of map.rooms) {
      const mushroomCount = 3 + Math.floor(Math.random() * 4);
      for (let i = 0; i < mushroomCount; i++) {
        const pos = map.getRandomFloorInRoom(room);
        this.mushrooms.push({
          x: pos.x,
          y: pos.y,
          collected: false,
          pulsePhase: Math.random() * Math.PI * 2,
        });
      }

      const creatureCount = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < creatureCount && this.creatures.length < MAX_SHADOW_CREATURES; i++) {
        const pos = map.getRandomFloorInRoom(room);
        const r = 10 + Math.random() * 10;
        this.creatures.push({
          x: pos.x,
          y: pos.y,
          radius: r,
          speed: 40,
          perceiveRadius: 120,
          chargeSpeed: 80,
          wobblePhase: Math.random() * Math.PI * 2,
          alive: true,
          jitterX: 0,
          jitterY: 0,
        });
      }
    }

    for (let i = 0; i < 4; i++) {
      const pos = map.getRandomCorridorPosition();
      if (pos) {
        this.runes.push({
          x: pos.x,
          y: pos.y,
          activated: false,
          glowIntensity: 0.2,
          nearbyTeleport: null,
        });
      }
    }
  }

  addParticles(x: number, y: number, count: number, hue: number, life: number, speedMin: number, speedMax: number, sizeMin: number, sizeMax: number): void {
    for (let i = 0; i < count && this.particles.length < MAX_ACTIVE_PARTICLES; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = speedMin + Math.random() * (speedMax - speedMin);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: life,
        size: sizeMin + Math.random() * (sizeMax - sizeMin),
        hue,
        saturation: 80,
        lightness: 60,
      });
    }
  }

  spawnCollectParticles(x: number, y: number): void {
    this.addParticles(x, y, 10, 120, 0.5, 40, 120, 3, 5);
    this.screenFlash = { type: 'green', life: 0.3, maxLife: 0.3 };
  }

  spawnHitParticles(x: number, y: number): void {
    this.addParticles(x, y, 5, 50, 0.3, 60, 180, 3, 5);
    this.screenFlash = { type: 'yellow', life: 0.3, maxLife: 0.3 };
  }

  triggerTeleportFlash(): void {
    this.screenFlash = { type: 'white', life: 0.3, maxLife: 0.3 };
  }

  update(dt: number, player: Player, map: GameMap): { collected: boolean; defeated: boolean; teleportTriggered: Teleport | null } {
    let collected = false;
    let defeated = false;
    let teleportTriggered: Teleport | null = null;

    this.updateParticles(dt);

    if (this.screenFlash.life > 0) {
      this.screenFlash.life -= dt;
      if (this.screenFlash.life <= 0) {
        this.screenFlash.type = null;
      }
    }

    for (let i = this.extraLights.length - 1; i >= 0; i--) {
      const l = this.extraLights[i];
      l.life -= dt;
      if (l.life <= 0) {
        this.extraLights.splice(i, 1);
      }
    }

    for (const m of this.mushrooms) {
      if (m.collected) continue;
      m.pulsePhase += dt * 3;

      const headX = player.x;
      const headY = player.y - PLAYER_BODY_LENGTH;
      const dx = m.x - headX;
      const dy = m.y - headY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 25) {
        m.collected = true;
        collected = true;
        player.collectedMushrooms++;
        player.addLanternTime(10);
        this.spawnCollectParticles(m.x, m.y);
      }
    }

    const playerHeadX = player.x;
    const playerHeadY = player.y - PLAYER_BODY_LENGTH;

    for (const c of this.creatures) {
      if (!c.alive) continue;
      c.wobblePhase += dt * 2;

      const dx = playerHeadX - c.x;
      const dy = playerHeadY - c.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      c.jitterX = Math.sin(c.wobblePhase * 1.3) * 8;
      c.jitterY = Math.cos(c.wobblePhase * 1.7) * 8;

      if (dist > 0) {
        const useSpeed = dist < c.perceiveRadius ? c.chargeSpeed : c.speed;
        const moveX = (dx / dist) * useSpeed * dt;
        const moveY = (dy / dist) * useSpeed * dt;

        const newX = c.x + moveX;
        const newY = c.y + moveY;

        if (!map.isWallAt(newX, c.y)) c.x = newX;
        if (!map.isWallAt(c.x, newY)) c.y = newY;
      }
    }

    for (const bullet of player.bullets) {
      if (!bullet.alive) continue;
      for (const c of this.creatures) {
        if (!c.alive) continue;
        const dx = bullet.x - c.x;
        const dy = bullet.y - c.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < c.radius + bullet.radius) {
          c.alive = false;
          bullet.alive = false;
          defeated = true;
          player.defeatedCreatures++;
          player.addLanternTime(5);
          this.spawnHitParticles(c.x, c.y);
          break;
        }
      }
    }

    for (const rune of this.runes) {
      if (rune.activated) continue;
      const dx = rune.x - playerHeadX;
      const dy = rune.y - playerHeadY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 30) {
        rune.activated = true;
        rune.glowIntensity = 1.0;

        this.extraLights.push({
          x: rune.x,
          y: rune.y,
          radius: 50,
          life: 2,
          maxLife: 2,
        });

        const gx = Math.floor(rune.x / TILE_SIZE);
        const gy = Math.floor(rune.y / TILE_SIZE);
        let tpX = rune.x;
        let tpY = rune.y;
        const offsets = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [ox, oy] of offsets) {
          const cx = gx + ox;
          const cy = gy + oy;
          if (cx >= 0 && cx < 20 && cy >= 0 && cy < 15 && map.tiles[cy][cx] === 0) {
            tpX = cx * TILE_SIZE + TILE_SIZE / 2;
            tpY = cy * TILE_SIZE + TILE_SIZE / 2;
            break;
          }
        }

        const unexploredRoom = map.getRandomUnexploredRoom();
        const targetIdx = unexploredRoom ? map.rooms.indexOf(unexploredRoom) : (map.rooms.length > 1 ? 1 : 0);

        const teleport: Teleport = {
          x: tpX,
          y: tpY,
          radius: 20,
          rotation: 0,
          active: true,
          targetRoomIndex: targetIdx,
        };
        this.teleports.push(teleport);
        rune.nearbyTeleport = teleport;
      } else if (dist < 80) {
        rune.glowIntensity = 0.2 + (1 - dist / 80) * 0.4;
      } else {
        rune.glowIntensity = 0.2;
      }
    }

    for (const tp of this.teleports) {
      if (!tp.active) continue;
      tp.rotation += dt * 3;

      const dx = tp.x - playerHeadX;
      const dy = tp.y - playerHeadY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < tp.radius + 5) {
        teleportTriggered = tp;
        this.triggerTeleportFlash();
        player.addLanternTime(15);
      }
    }

    this.mushrooms = this.mushrooms.filter(m => !m.collected);
    this.creatures = this.creatures.filter(c => c.alive);

    return { collected, defeated, teleportTriggered };
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.95;
      p.vy *= 0.95;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }
}
