import {
  GameState, Player, Bullet, Particle, Cover, Core, Vec2,
  ARENA_X, ARENA_Y, ARENA_SIZE, createPlayer
} from './entities';

export function dist(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function pointInCover(px: number, py: number, cover: Cover): boolean {
  const { x, y } = cover.pos;
  const s = cover.size;
  if (px < x || px > x + s || py < y || py > y + s) return false;
  const relX = px - x;
  const relY = py - y;
  switch (cover.corner) {
    case 'tl': return relX + relY >= s;
    case 'tr': return (s - relX) + relY >= s;
    case 'bl': return relX + (s - relY) >= s;
    case 'br': return (s - relX) + (s - relY) >= s;
  }
}

export function circleCoverCollision(cx: number, cy: number, r: number, cover: Cover): boolean {
  const { x, y } = cover.pos;
  const s = cover.size;
  let nearestX: number, nearestY: number;
  switch (cover.corner) {
    case 'tl': {
      if (cx < x + s && cy < y + s && (cx - x) + (cy - y) < s) {
        nearestX = x + s - (cy - y);
        nearestY = y + s - (cx - x);
        const d = dist({ x: cx, y: cy }, { x: nearestX, y: nearestY });
        return d < r;
      }
      return false;
    }
    case 'tr': {
      if (cx > x && cy < y + s && (x + s - cx) + (cy - y) < s) {
        nearestX = x + (cy - y);
        nearestY = y + s - (x + s - cx);
        const d = dist({ x: cx, y: cy }, { x: nearestX, y: nearestY });
        return d < r;
      }
      return false;
    }
    case 'bl': {
      if (cx < x + s && cy > y && (cx - x) + (y + s - cy) < s) {
        nearestX = x + s - (y + s - cy);
        nearestY = y + (cx - x);
        const d = dist({ x: cx, y: cy }, { x: nearestX, y: nearestY });
        return d < r;
      }
      return false;
    }
    case 'br': {
      if (cx > x && cy > y && (x + s - cx) + (y + s - cy) < s) {
        nearestX = x + (y + s - cy);
        nearestY = y + (x + s - cx);
        const d = dist({ x: cx, y: cy }, { x: nearestX, y: nearestY });
        return d < r;
      }
      return false;
    }
  }
}

export function playerCoverCollision(player: Player, covers: Cover[]): Vec2 {
  const offset: Vec2 = { x: 0, y: 0 };
  for (const cover of covers) {
    if (circleCoverCollision(player.pos.x, player.pos.y, player.size / 2, cover)) {
      const { x, y } = cover.pos;
      const s = cover.size;
      let nx = 0, ny = 0;
      switch (cover.corner) {
        case 'tl':
          nx = (player.pos.x - (x + s)) * -1;
          ny = (player.pos.y - (y + s)) * -1;
          break;
        case 'tr':
          nx = player.pos.x - x;
          ny = (player.pos.y - (y + s)) * -1;
          break;
        case 'bl':
          nx = (player.pos.x - (x + s)) * -1;
          ny = player.pos.y - y;
          break;
        case 'br':
          nx = player.pos.x - x;
          ny = player.pos.y - y;
          break;
      }
      const len = Math.sqrt(nx * nx + ny * ny) || 1;
      nx /= len; ny /= len;
      const d = player.size / 2;
      offset.x += nx * (d + 0.5);
      offset.y += ny * (d + 0.5);
    }
  }
  return offset;
}

export function clampPlayerToArena(player: Player, arenaX: number, arenaY: number, arenaW: number, arenaH: number): void {
  const r = player.size / 2;
  player.pos.x = clamp(player.pos.x, arenaX + r, arenaX + arenaW - r);
  player.pos.y = clamp(player.pos.y, arenaY + r, arenaY + arenaH - r);
}

export function spawnBullet(state: GameState, player: Player): void {
  if (player.ammo <= 0) return;
  const freeSlot = player.ammoCooldown.findIndex(c => c <= 0);
  if (freeSlot === -1) return;
  player.ammo--;
  player.ammoCooldown[freeSlot] = 1000;

  const angle = player.angle;
  const startX = player.pos.x + Math.cos(angle) * (player.size / 2 + 5);
  const startY = player.pos.y + Math.sin(angle) * (player.size / 2 + 5);

  const bullet: Bullet = {
    id: state.bulletIdCounter++,
    pos: { x: startX, y: startY },
    vel: { x: Math.cos(angle) * 10, y: Math.sin(angle) * 10 },
    radius: 5,
    color: player.color,
    owner: player.id,
    alive: true,
    trail: []
  };
  state.bullets.push(bullet);
}

export function spawnImpactParticle(state: GameState, x: number, y: number, color: string): void {
  state.particles.push({
    pos: { x, y },
    radius: 5,
    color,
    alpha: 0.5,
    life: 300,
    maxLife: 300,
    expanding: true
  });
}

export function updatePlayer(state: GameState, player: Player, dt: number): void {
  if (player.resetting) {
    player.flashTimer -= dt;
    if (player.flashTimer <= 0) {
      player.flashCount++;
      if (player.flashCount >= 6) {
        player.resetting = false;
        player.hp = player.maxHp;
        player.ammo = player.maxAmmo;
        player.ammoCooldown = [0, 0, 0];
        const arena = state.arena;
        player.pos.x = player.id === 1 ? arena.x + 80 : arena.x + arena.w - 80;
        player.pos.y = arena.y + arena.h / 2;
        player.invincible = 1500;
      } else {
        player.flashTimer = 200;
      }
    }
    return;
  }

  if (player.invincible > 0) player.invincible -= dt;

  for (let i = 0; i < player.ammoCooldown.length; i++) {
    if (player.ammoCooldown[i] > 0) {
      player.ammoCooldown[i] -= dt;
      if (player.ammoCooldown[i] <= 0 && player.ammo < player.maxAmmo) {
        player.ammo++;
      }
    }
  }

  const keys = state.keys;
  let dx = 0, dy = 0;
  if (player.id === 1) {
    if (keys.has('w') || keys.has('W')) dy -= 1;
    if (keys.has('s') || keys.has('S')) dy += 1;
    if (keys.has('a') || keys.has('A')) dx -= 1;
    if (keys.has('d') || keys.has('D')) dx += 1;
  } else {
    if (keys.has('ArrowUp')) dy -= 1;
    if (keys.has('ArrowDown')) dy += 1;
    if (keys.has('ArrowLeft')) dx -= 1;
    if (keys.has('ArrowRight')) dx += 1;
  }

  if (dx !== 0 || dy !== 0) {
    const len = Math.sqrt(dx * dx + dy * dy);
    dx /= len; dy /= len;
    player.pos.x += dx * player.speed;
    player.pos.y += dy * player.speed;
  }

  const arena = state.arena;
  clampPlayerToArena(player, arena.x, arena.y, arena.w, arena.h);

  const push = playerCoverCollision(player, state.covers);
  player.pos.x += push.x;
  player.pos.y += push.y;
  clampPlayerToArena(player, arena.x, arena.y, arena.w, arena.h);
}

export function updateBullets(state: GameState, dt: number): void {
  const arena = state.arena;
  for (let i = state.bullets.length - 1; i >= 0; i--) {
    const b = state.bullets[i];
    if (!b.alive) { state.bullets.splice(i, 1); continue; }

    b.trail.push({ x: b.pos.x, y: b.pos.y });
    if (b.trail.length > 20) b.trail.shift();

    b.pos.x += b.vel.x;
    b.pos.y += b.vel.y;

    if (b.pos.x < arena.x + b.radius || b.pos.x > arena.x + arena.w - b.radius ||
        b.pos.y < arena.y + b.radius || b.pos.y > arena.y + arena.h - b.radius) {
      b.alive = false;
      spawnImpactParticle(state, b.pos.x, b.pos.y, b.color);
      continue;
    }

    let hitCover = false;
    for (const cover of state.covers) {
      if (circleCoverCollision(b.pos.x, b.pos.y, b.radius, cover)) {
        hitCover = true;
        break;
      }
    }
    if (hitCover) {
      b.alive = false;
      spawnImpactParticle(state, b.pos.x, b.pos.y, b.color);
      continue;
    }

    for (const player of state.players) {
      if (player.id === b.owner || player.resetting || player.invincible > 0) continue;
      if (dist(b.pos, player.pos) < b.radius + player.size / 2) {
        b.alive = false;
        player.hp -= 10;
        spawnImpactParticle(state, b.pos.x, b.pos.y, b.color);
        if (player.hp <= 0) {
          player.hp = 0;
          player.resetting = true;
          player.flashTimer = 200;
          player.flashCount = 0;
        }
        break;
      }
    }
  }
}

export function updateCore(state: GameState, dt: number): void {
  const core = state.core;
  const players = state.players;

  let nearest: Player | null = null;
  let nearestDist = Infinity;

  for (const p of players) {
    if (p.resetting) continue;
    const d = dist(p.pos, core.pos);
    if (d < 30 && d < nearestDist) {
      nearestDist = d;
      nearest = p;
    }
  }

  if (nearest) {
    core.owner = nearest.id;
    core.progress = Math.min(100, core.progress + dt / 50);
    if (core.progress >= 100) {
      core.captureTimer += dt;
      if (core.captureTimer >= 5000) {
        state.gameOver = true;
        state.winner = nearest.id;
        nearest.score++;
      }
    }
    const dx = nearest.pos.x - core.pos.x;
    const dy = nearest.pos.y - core.pos.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    core.pos.x += (dx / len) * (dt / 1000);
    core.pos.y += (dy / len) * (dt / 1000);
  } else {
    core.owner = 0;
    core.progress = Math.max(0, core.progress - dt / 100);
    core.captureTimer = 0;
  }

  const arena = state.arena;
  core.pos.x = clamp(core.pos.x, arena.x + 30, arena.x + arena.w - 30);
  core.pos.y = clamp(core.pos.y, arena.y + 30, arena.y + arena.h - 30);
}

export function updateParticles(state: GameState, dt: number): void {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.life -= dt;
    if (p.life <= 0) { state.particles.splice(i, 1); continue; }
    p.alpha = 0.5 * (p.life / p.maxLife);
    if (p.expanding) {
      p.radius = 5 + 15 * (1 - p.life / p.maxLife);
    }
  }
}
