import {
  PlayerState,
  PlayerId,
  Projectile,
  GAME_CONFIG,
  COLORS,
  Particle,
  ParticleType,
} from './types';
import { InputManager } from './InputManager';

export function createPlayer(id: PlayerId, x: number, y: number): PlayerState {
  const isP1 = id === 0;
  return {
    id,
    x,
    y,
    vx: 0,
    vy: 0,
    hp: GAME_CONFIG.PLAYER_MAX_HP,
    maxHp: GAME_CONFIG.PLAYER_MAX_HP,
    shield: GAME_CONFIG.PLAYER_MAX_SHIELD,
    maxShield: GAME_CONFIG.PLAYER_MAX_SHIELD,
    charging: false,
    chargeProgress: 0,
    speed: GAME_CONFIG.PLAYER_BASE_SPEED,
    baseSpeed: GAME_CONFIG.PLAYER_BASE_SPEED,
    speedBoostTimer: 0,
    attackCooldown: 0,
    color: isP1 ? COLORS.p1Main : COLORS.p2Main,
    glowColor: isP1 ? COLORS.p1Glow : COLORS.p2Glow,
    facingRight: isP1,
    invincibleTimer: 0,
  };
}

export function updatePlayer(
  player: PlayerState,
  opponent: PlayerState,
  input: InputManager,
  dt: number,
  trackY: number,
  canvasW: number,
  canvasH: number,
  spawnProjectile: (p: Projectile) => void,
  spawnParticles: (ps: Particle[]) => void
): Projectile | null {
  if (player.invincibleTimer > 0) {
    player.invincibleTimer -= dt;
  }

  if (player.speedBoostTimer > 0) {
    player.speedBoostTimer -= dt;
    player.speed = player.baseSpeed * 1.5;
    if (player.speedBoostTimer <= 0) {
      player.speed = player.baseSpeed;
    }
  }

  if (player.attackCooldown > 0) {
    player.attackCooldown -= dt;
  }

  let moveX = 0;
  let moveY = 0;
  if (input.isActionDown(player.id, 'left')) moveX -= 1;
  if (input.isActionDown(player.id, 'right')) moveX += 1;
  if (input.isActionDown(player.id, 'up')) moveY -= 1;
  if (input.isActionDown(player.id, 'down')) moveY += 1;

  if (moveX !== 0 || moveY !== 0) {
    const len = Math.sqrt(moveX * moveX + moveY * moveY);
    moveX /= len;
    moveY /= len;
  }

  if (moveX > 0) player.facingRight = true;
  if (moveX < 0) player.facingRight = false;

  const targetVx = moveX * player.speed;
  const targetVy = moveY * player.speed;
  const lerp = 1 - Math.pow(0.001, dt);
  player.vx += (targetVx - player.vx) * lerp;
  player.vy += (targetVy - player.vy) * lerp;

  player.x += player.vx * dt;
  player.y += player.vy * dt;

  const margin = GAME_CONFIG.PLAYER_SIZE;
  const topBound = margin;
  const bottomBound = Math.min(trackY - GAME_CONFIG.PLAYER_SIZE, canvasH - margin);
  player.x = Math.max(margin, Math.min(canvasW - margin, player.x));
  player.y = Math.max(topBound, Math.min(bottomBound, player.y));

  const attackKey = input.isActionDown(player.id, 'attack');
  const attackJustPressed = input.isActionJustPressed(player.id, 'attack');

  let firedProjectile: Projectile | null = null;

  if (attackKey && player.attackCooldown <= 0) {
    player.charging = true;
    player.chargeProgress = Math.min(1, player.chargeProgress + dt / GAME_CONFIG.CHARGE_DURATION);

    if (player.chargeProgress >= 0.05) {
      const angle = Math.atan2(opponent.y - player.y, opponent.x - player.x);
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);
      const particles: Particle[] = [];
      for (let i = 0; i < 2; i++) {
        particles.push({
          x: player.x + dx * GAME_CONFIG.PLAYER_SIZE,
          y: player.y + dy * GAME_CONFIG.PLAYER_SIZE,
          vx: (Math.random() - 0.5) * 60 - dx * 30,
          vy: (Math.random() - 0.5) * 60 - dy * 30,
          life: 0.3,
          maxLife: 0.3,
          color: player.chargeProgress >= 1 ? COLORS.neonYellow : player.color,
          size: player.chargeProgress >= 1 ? 6 : 3,
          type: 'charge' as ParticleType,
          alpha: 0.8,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 10,
        });
      }
      spawnParticles(particles);
    }
  }

  if (!attackKey && player.charging) {
    player.charging = false;
    const isCharged = player.chargeProgress >= 0.8 && player.shield > 0;

    if (isCharged) {
      player.shield -= 1;
    }

    const angle = Math.atan2(opponent.y - player.y, opponent.x - player.x);
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const speed = GAME_CONFIG.PROJECTILE_SPEED;
    const proj: Projectile = {
      id: 0,
      x: player.x + dx * (GAME_CONFIG.PLAYER_SIZE + 10),
      y: player.y + dy * (GAME_CONFIG.PLAYER_SIZE + 10),
      vx: dx * speed,
      vy: dy * speed,
      ownerId: player.id,
      isCharged,
      radius: isCharged ? GAME_CONFIG.CHARGED_PROJECTILE_RADIUS : GAME_CONFIG.PROJECTILE_RADIUS,
      color: isCharged ? COLORS.neonYellow : player.color,
      life: GAME_CONFIG.PROJECTILE_LIFETIME,
      maxLife: GAME_CONFIG.PROJECTILE_LIFETIME,
    };
    firedProjectile = proj;
    spawnProjectile(proj);

    const spawnCount = isCharged ? 8 : 4;
    const particles: Particle[] = [];
    for (let i = 0; i < spawnCount; i++) {
      const spreadAngle = angle + (Math.random() - 0.5) * 0.8;
      particles.push({
        x: player.x + dx * GAME_CONFIG.PLAYER_SIZE,
        y: player.y + dy * GAME_CONFIG.PLAYER_SIZE,
        vx: Math.cos(spreadAngle) * (100 + Math.random() * 80),
        vy: Math.sin(spreadAngle) * (100 + Math.random() * 80),
        life: 0.3,
        maxLife: 0.3,
        color: proj.color,
        size: isCharged ? 5 : 3,
        type: 'trail',
        alpha: 1,
        rotation: 0,
        rotationSpeed: 0,
      });
    }
    spawnParticles(particles);

    player.attackCooldown = GAME_CONFIG.ATTACK_COOLDOWN;
    player.chargeProgress = 0;
  }

  if (!attackKey) {
    player.charging = false;
    player.chargeProgress = Math.max(0, player.chargeProgress - dt * 2);
  }

  return firedProjectile;
}

export function damagePlayer(
  player: PlayerState,
  damage: number,
  spawnParticles: (ps: Particle[]) => void,
  triggerScreenEffect: (intensity: number) => void
): boolean {
  if (player.invincibleTimer > 0) return false;

  if (player.shield > 0) {
    const shieldDamage = Math.min(player.shield, damage);
    player.shield -= shieldDamage;
    const remaining = damage - shieldDamage;

    if (player.shield === 0) {
      triggerScreenEffect(0.6);
      const particles: Particle[] = [];
      for (let i = 0; i < 15; i++) {
        const angle = (Math.PI * 2 * i) / 15;
        particles.push({
          x: player.x + Math.cos(angle) * 30,
          y: player.y + Math.sin(angle) * 30,
          vx: Math.cos(angle) * (80 + Math.random() * 60),
          vy: Math.sin(angle) * (80 + Math.random() * 60),
          life: 0.6,
          maxLife: 0.6,
          color: COLORS.shieldColor,
          size: 4,
          type: 'shield_break',
          alpha: 1,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 8,
        });
      }
      spawnParticles(particles);
    }

    if (remaining > 0) {
      player.hp -= remaining;
    }
  } else {
    player.hp -= damage;
  }

  player.hp = Math.max(0, player.hp);
  player.invincibleTimer = GAME_CONFIG.INVINCIBLE_DURATION;

  if (player.hp <= 0) {
    return true;
  }
  return false;
}
