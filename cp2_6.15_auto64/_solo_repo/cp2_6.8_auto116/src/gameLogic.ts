import { gameConfig, keys } from './controls';
import {
  GameState,
  Asteroid,
  Enemy,
  createAsteroid,
  createCrystal,
  createBullet,
  createParticle,
  createEnemy
} from './entities';

function dist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function lineCircleIntersect(
  x1: number, y1: number, x2: number, y2: number,
  cx: number, cy: number, r: number
): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const fx = x1 - cx;
  const fy = y1 - cy;

  const a = dx * dx + dy * dy;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - r * r;

  let discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return false;

  discriminant = Math.sqrt(discriminant);
  const t1 = (-b - discriminant) / (2 * a);
  const t2 = (-b + discriminant) / (2 * a);

  return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1);
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function updatePlayer(state: GameState): void {
  const p = state.player;

  let targetVx = 0;
  let targetVy = 0;
  if (keys.w) targetVy -= 1;
  if (keys.s) targetVy += 1;
  if (keys.a) targetVx -= 1;
  if (keys.d) targetVx += 1;

  if (targetVx !== 0 || targetVy !== 0) {
    const len = Math.sqrt(targetVx * targetVx + targetVy * targetVy);
    targetVx = (targetVx / len) * gameConfig.playerSpeed;
    targetVy = (targetVy / len) * gameConfig.playerSpeed;
    p.angle = Math.atan2(targetVy, targetVx);
  }

  p.vx += (targetVx - p.vx) * 0.2;
  p.vy += (targetVy - p.vy) * 0.2;

  p.x = clamp(p.x + p.vx, 12, gameConfig.canvasWidth - 12);
  p.y = clamp(p.y + p.vy, 12, gameConfig.canvasHeight - 12);

  if (p.invincibleTimer > 0) p.invincibleTimer--;
  if (p.hitFlashTimer > 0) p.hitFlashTimer--;
}

export function updateLaser(state: GameState): void {
  state.laser.active = keys.space;
  if (state.laser.flashTimer > 0) state.laser.flashTimer--;

  if (!state.laser.active) return;

  const p = state.player;
  const dx = Math.cos(p.angle);
  const dy = Math.sin(p.angle);
  const endX = p.x + dx * gameConfig.laserRange;
  const endY = p.y + dy * gameConfig.laserRange;

  let hitSomething = false;
  let closestT = 1;

  for (let i = state.asteroids.length - 1; i >= 0; i--) {
    const a = state.asteroids[i];
    if (lineCircleIntersect(p.x, p.y, endX, endY, a.x, a.y, a.size * 0.9)) {
      a.hp--;
      state.laser.flashTimer = 6;

      for (let k = 0; k < 3; k++) {
        state.particles.push(createParticle(
          a.x + (Math.random() - 0.5) * a.size,
          a.y + (Math.random() - 0.5) * a.size,
          (Math.random() - 0.5) * 3,
          (Math.random() - 0.5) * 3,
          '#FFFFFF',
          2,
          20
        ));
      }

      if (a.hp <= 0) {
        destroyAsteroid(state, a, i);
      }
      hitSomething = true;
    }
  }

  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const e = state.enemies[i];
    if (!e.active) continue;
    if (lineCircleIntersect(p.x, p.y, endX, endY, e.x, e.y, 22)) {
      e.hp--;
      state.laser.flashTimer = 6;

      for (let k = 0; k < 4; k++) {
        state.particles.push(createParticle(
          e.x,
          e.y,
          (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 4,
          '#FC8181',
          3,
          25
        ));
      }

      if (e.hp <= 0) {
        destroyEnemy(state, e, i);
      }
      hitSomething = true;
    }
  }

  if (hitSomething) {
    closestT = 0.6;
  }
  state.laser.hitX = p.x + dx * gameConfig.laserRange * closestT;
  state.laser.hitY = p.y + dy * gameConfig.laserRange * closestT;
}

function destroyAsteroid(state: GameState, a: Asteroid, index: number): void {
  state.asteroids.splice(index, 1);

  if (!a.isFragment) {
    const fragCount = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < fragCount; i++) {
      const offsetX = (Math.random() - 0.5) * a.size;
      const offsetY = (Math.random() - 0.5) * a.size;
      const frag = createAsteroid(true, a.x + offsetX, a.y + offsetY);
      frag.vx = (Math.random() - 0.5) * 3;
      frag.vy = (Math.random() - 0.5) * 3;
      state.asteroids.push(frag);
    }

    const crystalCount = Math.min(a.crystalCount, gameConfig.crystalDropRate + 2);
    for (let i = 0; i < crystalCount; i++) {
      const cx = a.x + (Math.random() - 0.5) * a.size;
      const cy = a.y + (Math.random() - 0.5) * a.size;
      state.crystals.push(createCrystal(cx, cy));
    }

    for (let i = 0; i < 8; i++) {
      state.particles.push(createParticle(
        a.x,
        a.y,
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 5,
        '#A0AEC0',
        3,
        40
      ));
    }
  } else {
    for (let i = 0; i < 4; i++) {
      state.particles.push(createParticle(
        a.x,
        a.y,
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 3,
        '#718096',
        2,
        30
      ));
    }
  }
}

function destroyEnemy(state: GameState, e: Enemy, _index: number): void {
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2;
    state.particles.push(createParticle(
      e.x,
      e.y,
      Math.cos(angle) * (2 + Math.random() * 3),
      Math.sin(angle) * (2 + Math.random() * 3),
      '#FC8181',
      4,
      50
    ));
  }

  e.active = false;
  e.respawnTimer = gameConfig.respawnDelay * 60;
  e.hp = gameConfig.enemyHp;
}

export function updateAsteroids(state: GameState): void {
  for (let i = state.asteroids.length - 1; i >= 0; i--) {
    const a = state.asteroids[i];
    a.x += a.vx;
    a.y += a.vy;
    a.rotation += a.rotationSpeed;

    if (a.x < a.size) { a.x = a.size; a.vx = Math.abs(a.vx); }
    if (a.x > gameConfig.canvasWidth - a.size) { a.x = gameConfig.canvasWidth - a.size; a.vx = -Math.abs(a.vx); }
    if (a.y < a.size) { a.y = a.size; a.vy = Math.abs(a.vy); }
    if (a.y > gameConfig.canvasHeight - a.size) { a.y = gameConfig.canvasHeight - a.size; a.vy = -Math.abs(a.vy); }

    if (a.isFragment) {
      a.life--;
      if (a.life <= 0) {
        state.asteroids.splice(i, 1);
      }
    }
  }

  const nonFragmentCount = state.asteroids.filter(a => !a.isFragment).length;
  if (nonFragmentCount < 8 && state.asteroids.length < 20) {
    state.asteroids.push(createAsteroid(false));
  }
}

export function updateCrystals(state: GameState): void {
  const p = state.player;

  for (let i = state.crystals.length - 1; i >= 0; i--) {
    const c = state.crystals[i];

    c.trail.unshift({ x: c.x, y: c.y, alpha: 1 });
    if (c.trail.length > 10) c.trail.pop();
    c.trail.forEach((t, idx) => {
      t.alpha = 1 - (idx / c.trail.length);
    });

    const dx = p.x - c.x;
    const dy = p.y - c.y;
    const d = Math.sqrt(dx * dx + dy * dy);

    if (d < 80) {
      c.vx += (dx / d) * 0.3;
      c.vy += (dy / d) * 0.3;
    }

    const speed = Math.sqrt(c.vx * c.vx + c.vy * c.vy);
    if (speed > gameConfig.crystalSpeed) {
      c.vx = (c.vx / speed) * gameConfig.crystalSpeed;
      c.vy = (c.vy / speed) * gameConfig.crystalSpeed;
    }

    c.x += c.vx;
    c.y += c.vy;

    c.vx *= 0.95;
    c.vy *= 0.95;

    if (d < 18) {
      state.crystalStock++;
      state.totalMined++;
      state.crystals.splice(i, 1);

      for (let k = 0; k < 3; k++) {
        state.particles.push(createParticle(
          c.x, c.y,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          '#F6E05E',
          2,
          15
        ));
      }
    }
  }
}

export function updateEnemies(state: GameState): void {
  const p = state.player;

  for (const e of state.enemies) {
    if (!e.active) {
      e.respawnTimer--;
      if (e.respawnTimer <= 0) {
        const newEnemy = createEnemy(e.id);
        e.x = newEnemy.x;
        e.y = newEnemy.y;
        e.active = true;
        e.hp = gameConfig.enemyHp;
        e.shootCooldown = 0;
      }
      continue;
    }

    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d = Math.sqrt(dx * dx + dy * dy);

    let speed = gameConfig.aiSpeed;
    if (d < gameConfig.enemyShootDistance) {
      speed = gameConfig.enemyAcceleratedSpeed;

      e.shootCooldown--;
      if (e.shootCooldown <= 0) {
        state.bullets.push(createBullet(e.x, e.y, p.x, p.y, true));
        e.shootCooldown = 90;
      }
    }

    if (d > 1) {
      e.x += (dx / d) * speed;
      e.y += (dy / d) * speed;
    }

    e.x = clamp(e.x, 20, gameConfig.canvasWidth - 20);
    e.y = clamp(e.y, 20, gameConfig.canvasHeight - 20);
  }
}

export function updateBullets(state: GameState): void {
  const p = state.player;

  for (let i = state.bullets.length - 1; i >= 0; i--) {
    const b = state.bullets[i];
    b.x += b.vx;
    b.y += b.vy;

    if (b.x < -10 || b.x > gameConfig.canvasWidth + 10 ||
        b.y < -10 || b.y > gameConfig.canvasHeight + 10) {
      state.bullets.splice(i, 1);
      continue;
    }

    if (b.isEnemy && p.invincibleTimer <= 0) {
      if (dist(b.x, b.y, p.x, p.y) < 14) {
        state.bullets.splice(i, 1);
        state.crystalStock = Math.max(0, state.crystalStock - 10);
        p.invincibleTimer = gameConfig.invincibleDuration;
        p.hitFlashTimer = gameConfig.hitFlashDuration;
        state.screenFlashTimer = 9;

        for (let k = 0; k < 6; k++) {
          state.particles.push(createParticle(
            p.x, p.y,
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 4,
            '#FC8181',
            3,
            30
          ));
        }
      }
    }
  }
}

export function updateParticles(state: GameState): void {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.98;
    p.vy *= 0.98;
    p.life--;

    if (p.life <= 0) {
      state.particles.splice(i, 1);
    }
  }

  const totalDynamic = state.asteroids.filter(a => a.isFragment).length + state.particles.length;
  if (totalDynamic > gameConfig.maxParticles) {
    const removeCount = totalDynamic - gameConfig.maxParticles;
    state.particles.splice(0, Math.min(removeCount, state.particles.length));

    let remaining = removeCount - Math.min(removeCount, state.asteroids.filter(a => a.isFragment).length);
    if (remaining > 0) {
      for (let i = state.asteroids.length - 1; i >= 0 && remaining > 0; i--) {
        if (state.asteroids[i].isFragment) {
          state.asteroids.splice(i, 1);
          remaining--;
        }
      }
    }
  }
}

export function updateStars(state: GameState): void {
  for (const s of state.stars) {
    s.phase += s.phaseSpeed;
  }
}

export function updateScreen(state: GameState): void {
  if (state.screenFlashTimer > 0) state.screenFlashTimer--;
}

export function updateGame(state: GameState): void {
  updatePlayer(state);
  updateLaser(state);
  updateAsteroids(state);
  updateCrystals(state);
  updateEnemies(state);
  updateBullets(state);
  updateParticles(state);
  updateStars(state);
  updateScreen(state);
}
