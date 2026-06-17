import React, { useRef, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  BulletConfig,
  EnemyConfig,
  Bullet,
  Enemy,
  TrailParticle,
  ExplosionParticle,
  HitRecord,
  ShotRecord,
  BulletType,
  HitReactionType,
  BULLET_SPEEDS,
  ENEMY_PRESET_COLORS,
} from '../types';

interface SceneCanvasProps {
  bulletConfig: BulletConfig;
  enemyConfig: EnemyConfig;
  onStatsUpdate: (fps: number, hitRate: number, enemyCount: number) => void;
  onHitRecord: (record: HitRecord) => void;
}

const GRID_SIZE = 10;
const GRID_LINE_COLOR = '#444';
const ENEMY_SIZE = 60;
const MIN_ENEMY_SPACING = 80;
const SCATTER_COUNT = 5;
const SCATTER_ANGLE_STEP_DEG = 3;
const SCATTER_TOTAL_ANGLE_DEG = 15;
const TRACKING_MAX_TURN_DEG = 15;
const TRACKING_LOCK_DISTANCE = 10;
const TRAIL_PARTICLE_COUNT = 3;
const EXPLOSION_PARTICLE_COUNT = 8;
const EXPLOSION_PARTICLE_SIZE = 4;
const EXPLOSION_DURATION = 0.3;
const KNOCKBACK_DISTANCE = 20;
const KNOCKBACK_DURATION = 0.15;
const KNOCKUP_DISTANCE_X = 30;
const KNOCKUP_DISTANCE_Y = 30;
const KNOCKUP_DURATION = 0.3;
const FLICKER_DURATION = 0.5;
const RESPAWN_DELAY = 1.0;
const HEALTH_BAR_WIDTH = 40;
const HEALTH_BAR_HEIGHT = 6;
const DEG_TO_RAD = Math.PI / 180;

function generateEnemies(
  canvasWidth: number,
  canvasHeight: number,
  health: number,
  hitReaction: HitReactionType
): Enemy[] {
  const enemies: Enemy[] = [];
  const usedColors: number[] = [];
  const minX = canvasWidth * 0.66;
  const maxX = canvasWidth - 50 - ENEMY_SIZE;
  const minY = 50;
  const maxY = canvasHeight - 50 - ENEMY_SIZE;

  for (let i = 0; i < 5; i++) {
    let colorIdx: number;
    do {
      colorIdx = Math.floor(Math.random() * ENEMY_PRESET_COLORS.length);
    } while (usedColors.length < ENEMY_PRESET_COLORS.length && usedColors.includes(colorIdx));
    usedColors.push(colorIdx);

    let x: number, y: number;
    let attempts = 0;
    let valid = false;

    while (!valid && attempts < 200) {
      x = minX + Math.random() * (maxX - minX);
      y = minY + Math.random() * (maxY - minY);
      valid = true;

      for (const existing of enemies) {
        const dx = x - existing.x;
        const dy = y - existing.y;
        if (Math.sqrt(dx * dx + dy * dy) < MIN_ENEMY_SPACING) {
          valid = false;
          break;
        }
      }
      attempts++;

      if (valid) {
        enemies.push({
          id: uuidv4(),
          x,
          y,
          width: ENEMY_SIZE,
          height: ENEMY_SIZE,
          color: ENEMY_PRESET_COLORS[colorIdx],
          health,
          maxHealth: health,
          hitReaction,
          reactionTimer: 0,
          reactionDuration: 0,
          isInvincible: false,
          flickerTimer: 0,
          originalX: x,
          originalY: y,
          knockbackOffsetX: 0,
          knockupOffsetX: 0,
          knockupOffsetY: 0,
          knockupVelocityY: 0,
        });
      }
    }
  }

  return enemies;
}

function createBullet(
  type: BulletType,
  startX: number,
  startY: number,
  targetX: number,
  targetY: number,
  size: number,
  color: string,
  angleOffsetDeg: number = 0
): Bullet {
  const speed = BULLET_SPEEDS[type];
  const baseAngle = Math.atan2(targetY - startY, targetX - startX);
  const angle = baseAngle + angleOffsetDeg * DEG_TO_RAD;

  return {
    id: uuidv4(),
    x: startX,
    y: startY,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    size,
    color,
    type,
    angle,
    trail: [],
    hitEnemyIds: new Set(),
    scatterPenetration: type === 'scatter',
  };
}

const SceneCanvas: React.FC<SceneCanvasProps> = ({
  bulletConfig,
  enemyConfig,
  onStatsUpdate,
  onHitRecord,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const bulletsRef = useRef<Bullet[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const explosionParticlesRef = useRef<ExplosionParticle[]>([]);
  const shotRecordsRef = useRef<ShotRecord[]>([]);
  const lastHitRecordRef = useRef<HitRecord | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const fpsHistoryRef = useRef<number[]>([]);
  const animFrameRef = useRef<number>(0);
  const respawnTimerRef = useRef<number>(0);
  const bulletConfigRef = useRef<BulletConfig>(bulletConfig);
  const enemyConfigRef = useRef<EnemyConfig>(enemyConfig);
  const currentShotHitRef = useRef<boolean>(false);
  const enemyIndexMapRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    bulletConfigRef.current = bulletConfig;
  }, [bulletConfig]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const prevEnemies = enemiesRef.current;
    enemyConfigRef.current = enemyConfig;

    if (prevEnemies.length > 0) {
      for (const enemy of prevEnemies) {
        enemy.hitReaction = enemyConfig.hitReaction;
        enemy.maxHealth = enemyConfig.health;
        enemy.health = Math.min(enemy.health, enemyConfig.health);
      }
    }
  }, [enemyConfig]);

  const initEnemies = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cfg = enemyConfigRef.current;
    enemiesRef.current = generateEnemies(canvas.width, canvas.height, cfg.health, cfg.hitReaction);
    enemyIndexMapRef.current.clear();
    enemiesRef.current.forEach((e, i) => enemyIndexMapRef.current.set(e.id, i + 1));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeObserver = new ResizeObserver(() => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = Math.max(600, rect.height);
      if (enemiesRef.current.length === 0) {
        initEnemies();
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [initEnemies]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    initEnemies();

    const ctx = canvas.getContext('2d')!;

    const handleResize = () => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = Math.max(600, rect.height);
    };

    handleResize();

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const targetX = e.clientX - rect.left;
      const targetY = e.clientY - rect.top;
      const startX = 50;
      const startY = canvas.height / 2;
      const cfg = bulletConfigRef.current;

      if (cfg.type === 'scatter') {
        const halfSpread = (SCATTER_TOTAL_ANGLE_DEG / 2) * DEG_TO_RAD;
        for (let i = 0; i < SCATTER_COUNT; i++) {
          const offsetDeg =
            -SCATTER_TOTAL_ANGLE_DEG / 2 + SCATTER_ANGLE_STEP_DEG * i;
          const bullet = createBullet(
            cfg.type,
            startX,
            startY,
            targetX,
            targetY,
            cfg.bulletSize,
            cfg.bulletColor,
            offsetDeg
          );
          bulletsRef.current.push(bullet);
        }
      } else {
        const bullet = createBullet(
          cfg.type,
          startX,
          startY,
          targetX,
          targetY,
          cfg.bulletSize,
          cfg.bulletColor
        );
        bulletsRef.current.push(bullet);
      }

      currentShotHitRef.current = false;
    };

    canvas.addEventListener('click', handleClick);

    const gameLoop = (timestamp: number) => {
      if (!lastFrameTimeRef.current) {
        lastFrameTimeRef.current = timestamp;
      }

      const dt = Math.min((timestamp - lastFrameTimeRef.current) / 1000, 0.05);
      lastFrameTimeRef.current = timestamp;

      const fps = dt > 0 ? Math.round(1 / dt) : 60;
      fpsHistoryRef.current.push(fps);
      if (fpsHistoryRef.current.length > 60) fpsHistoryRef.current.shift();

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#2B2B2B';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      drawGrid(ctx, canvas.width, canvas.height);

      updateBullets(dt, canvas.width, canvas.height);
      updateEnemies(dt);
      updateExplosionParticles(dt);

      checkCollisions();

      drawBullets(ctx);
      drawEnemies(ctx);
      drawExplosionParticles(ctx);
      drawPerformancePanel(ctx, fps);
      drawLastHitInfo(ctx);
      drawFirePoint(ctx, canvas.height);

      if (enemiesRef.current.length === 0) {
        respawnTimerRef.current += dt;
        if (respawnTimerRef.current >= RESPAWN_DELAY) {
          respawnTimerRef.current = 0;
          initEnemies();
        }
      }

      const avgFps =
        fpsHistoryRef.current.length > 0
          ? Math.round(
              fpsHistoryRef.current.reduce((a, b) => a + b, 0) /
                fpsHistoryRef.current.length
            )
          : 60;

      const recentShots = shotRecordsRef.current.slice(-10);
      const hitCount = recentShots.filter((s) => s.hit).length;
      const hitRate =
        recentShots.length > 0 ? (hitCount / recentShots.length) * 100 : 0;

      onStatsUpdate(avgFps, hitRate, enemiesRef.current.length);

      animFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      canvas.removeEventListener('click', handleClick);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [initEnemies, onStatsUpdate, onHitRecord]);

  function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number) {
    ctx.strokeStyle = GRID_LINE_COLOR;
    ctx.lineWidth = 1;
    const cellW = width / GRID_SIZE;
    const cellH = height / GRID_SIZE;

    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellW, 0);
      ctx.lineTo(i * cellW, height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * cellH);
      ctx.lineTo(width, i * cellH);
      ctx.stroke();
    }
  }

  function drawFirePoint(ctx: CanvasRenderingContext2D, canvasHeight: number) {
    const x = 50;
    const y = canvasHeight / 2;

    ctx.save();
    ctx.strokeStyle = '#FF6B35';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x - 12, y);
    ctx.lineTo(x + 12, y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x, y - 12);
    ctx.lineTo(x, y + 12);
    ctx.stroke();
    ctx.restore();
  }

  function updateBullets(dt: number, canvasWidth: number, canvasHeight: number) {
    const bullets = bulletsRef.current;
    const enemies = enemiesRef.current;

    for (let i = bullets.length - 1; i >= 0; i--) {
      const bullet = bullets[i];

      if (bullet.type === 'tracking' && enemies.length > 0) {
        let nearestEnemy: Enemy | null = null;
        let nearestDist = Infinity;

        for (const enemy of enemies) {
          if (bullet.hitEnemyIds.has(enemy.id)) continue;
          const dx = enemy.x + enemy.width / 2 + enemy.knockbackOffsetX + enemy.knockupOffsetX - bullet.x;
          const dy = enemy.y + enemy.height / 2 + enemy.knockupOffsetY - bullet.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < nearestDist) {
            nearestDist = dist;
            nearestEnemy = enemy;
          }
        }

        if (nearestEnemy && nearestDist > TRACKING_LOCK_DISTANCE) {
          const targetAngle = Math.atan2(
            nearestEnemy.y + nearestEnemy.height / 2 + nearestEnemy.knockupOffsetY - bullet.y,
            nearestEnemy.x + nearestEnemy.width / 2 + nearestEnemy.knockbackOffsetX + nearestEnemy.knockupOffsetX - bullet.x
          );
          const currentAngle = Math.atan2(bullet.vy, bullet.vx);
          let angleDiff = targetAngle - currentAngle;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

          const maxTurn = TRACKING_MAX_TURN_DEG * DEG_TO_RAD;
          const turn = Math.abs(angleDiff) > maxTurn
            ? Math.sign(angleDiff) * maxTurn
            : angleDiff;

          const newAngle = currentAngle + turn;
          const speed = BULLET_SPEEDS.tracking;
          bullet.vx = Math.cos(newAngle) * speed;
          bullet.vy = Math.sin(newAngle) * speed;
          bullet.angle = newAngle;
        }
      }

      bullet.trail.push({
        x: bullet.x,
        y: bullet.y,
        alpha: 0.8,
        size: bullet.size * 0.5,
        color: bullet.color,
      });

      if (bullet.trail.length > TRAIL_PARTICLE_COUNT) {
        bullet.trail.shift();
      }

      for (let t = 0; t < bullet.trail.length; t++) {
        const ratio = t / bullet.trail.length;
        bullet.trail[t].alpha = 0.2 + ratio * 0.6;
      }

      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;

      if (
        bullet.x < 0 ||
        bullet.x > canvasWidth ||
        bullet.y < 0 ||
        bullet.y > canvasHeight
      ) {
        bullets.splice(i, 1);
      }
    }
  }

  function updateEnemies(dt: number) {
    const enemies = enemiesRef.current;

    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i];

      if (enemy.reactionTimer > 0) {
        enemy.reactionTimer -= dt;
        const progress = 1 - enemy.reactionTimer / enemy.reactionDuration;

        switch (enemy.hitReaction) {
          case 'knockback': {
            if (progress < 0.5) {
              enemy.knockbackOffsetX = KNOCKBACK_DISTANCE * (progress / 0.5);
            } else {
              enemy.knockbackOffsetX = KNOCKBACK_DISTANCE * (1 - (progress - 0.5) / 0.5);
            }
            break;
          }
          case 'knockup': {
            enemy.knockupOffsetX = KNOCKUP_DISTANCE_X * Math.min(progress * 1.5, 1.0);
            enemy.knockupOffsetY = -KNOCKUP_DISTANCE_Y * Math.sin(progress * Math.PI);
            break;
          }
          case 'flicker': {
            enemy.flickerTimer += dt;
            break;
          }
        }

        if (enemy.reactionTimer <= 0) {
          enemy.reactionTimer = 0;
          enemy.knockbackOffsetX = 0;
          enemy.knockupOffsetX = 0;
          enemy.knockupOffsetY = 0;
          enemy.knockupVelocityY = 0;
          enemy.flickerTimer = 0;

          if (enemy.hitReaction === 'flicker') {
            enemy.isInvincible = false;
          }
        }
      }

      if (enemy.health <= 0) {
        for (let p = 0; p < EXPLOSION_PARTICLE_COUNT; p++) {
          const angle = (Math.PI * 2 * p) / EXPLOSION_PARTICLE_COUNT + Math.random() * 0.5;
          const speed = 80 + Math.random() * 60;
          explosionParticlesRef.current.push({
            x: enemy.x + enemy.width / 2 + enemy.knockbackOffsetX + enemy.knockupOffsetX,
            y: enemy.y + enemy.height / 2 + enemy.knockupOffsetY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: EXPLOSION_PARTICLE_SIZE,
            color: enemy.color,
            life: EXPLOSION_DURATION,
            maxLife: EXPLOSION_DURATION,
          });
        }
        enemies.splice(i, 1);
      }
    }
  }

  function updateExplosionParticles(dt: number) {
    const particles = explosionParticlesRef.current;
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }
  }

  function checkCollisions() {
    const bullets = bulletsRef.current;
    const enemies = enemiesRef.current;

    for (let bi = bullets.length - 1; bi >= 0; bi--) {
      const bullet = bullets[bi];
      let bulletHitAny = false;

      for (const enemy of enemies) {
        if (bullet.hitEnemyIds.has(enemy.id)) continue;
        if (enemy.isInvincible && enemy.hitReaction === 'flicker' && enemy.reactionTimer > 0)
          continue;

        const enemyDrawX = enemy.x + enemy.knockbackOffsetX + enemy.knockupOffsetX;
        const enemyDrawY = enemy.y + enemy.knockupOffsetY;

        if (
          bullet.x >= enemyDrawX &&
          bullet.x <= enemyDrawX + enemy.width &&
          bullet.y >= enemyDrawY &&
          bullet.y <= enemyDrawY + enemy.height
        ) {
          bullet.hitEnemyIds.add(enemy.id);
          bulletHitAny = true;

          if (enemy.reactionTimer <= 0) {
            switch (enemy.hitReaction) {
              case 'knockback':
                enemy.reactionTimer = KNOCKBACK_DURATION;
                enemy.reactionDuration = KNOCKBACK_DURATION;
                break;
              case 'knockup':
                enemy.reactionTimer = KNOCKUP_DURATION;
                enemy.reactionDuration = KNOCKUP_DURATION;
                break;
              case 'flicker':
                enemy.reactionTimer = FLICKER_DURATION;
                enemy.reactionDuration = FLICKER_DURATION;
                enemy.isInvincible = true;
                break;
            }
          }

          enemy.health -= 1;

          const idx = enemyIndexMapRef.current.get(enemy.id) ?? 0;
          lastHitRecordRef.current = {
            enemyId: enemy.id,
            enemyIndex: idx,
            bulletType: bullet.type,
            hitReaction: enemy.hitReaction,
            frameDuration: Math.round(1000 / 60),
            timestamp: Date.now(),
          };
          onHitRecord(lastHitRecordRef.current);

          if (!bullet.scatterPenetration) {
            bullets.splice(bi, 1);
            break;
          }
        }
      }

      if (bulletHitAny && !currentShotHitRef.current) {
        currentShotHitRef.current = true;
        shotRecordsRef.current.push({ hit: true, timestamp: Date.now() });
      }
    }

    const currentBullets = bulletsRef.current;
    if (currentBullets.length > 0) {
      for (let i = 0; i < currentBullets.length; i++) {
        if (i >= currentBullets.length) break;
      }
    }
  }

  function drawBullets(ctx: CanvasRenderingContext2D) {
    for (const bullet of bulletsRef.current) {
      for (const trail of bullet.trail) {
        ctx.save();
        ctx.globalAlpha = trail.alpha;
        ctx.fillStyle = trail.color;
        ctx.beginPath();
        ctx.arc(trail.x, trail.y, trail.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.save();
      ctx.fillStyle = bullet.color;
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.size, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowColor = bullet.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.size * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawEnemies(ctx: CanvasRenderingContext2D) {
    for (const enemy of enemiesRef.current) {
      const drawX = enemy.x + enemy.knockbackOffsetX + enemy.knockupOffsetX;
      const drawY = enemy.y + enemy.knockupOffsetY;

      if (enemy.hitReaction === 'flicker' && enemy.isInvincible && enemy.reactionTimer > 0) {
        const flickerOn = Math.floor(enemy.flickerTimer * 10) % 2 === 0;
        if (!flickerOn) {
          drawEnemyHealthBar(ctx, enemy, drawX, drawY);
          continue;
        }
      }

      ctx.save();
      ctx.fillStyle = enemy.color;
      ctx.fillRect(drawX, drawY, enemy.width, enemy.height);

      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.strokeRect(drawX, drawY, enemy.width, enemy.height);

      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(drawX + 4, drawY + 4, enemy.width - 8, enemy.height / 3);
      ctx.restore();

      drawEnemyHealthBar(ctx, enemy, drawX, drawY);
    }
  }

  function drawEnemyHealthBar(
    ctx: CanvasRenderingContext2D,
    enemy: Enemy,
    drawX: number,
    drawY: number
  ) {
    const barX = drawX + (enemy.width - HEALTH_BAR_WIDTH) / 2;
    const barY = drawY - 10;

    ctx.fillStyle = '#333';
    ctx.fillRect(barX, barY, HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT);

    const healthRatio = enemy.health / enemy.maxHealth;
    let barColor: string;
    if (healthRatio > 0.6) {
      barColor = '#4CAF50';
    } else if (healthRatio > 0.3) {
      barColor = '#FF9800';
    } else {
      barColor = '#F44336';
    }

    ctx.fillStyle = barColor;
    ctx.fillRect(barX, barY, HEALTH_BAR_WIDTH * healthRatio, HEALTH_BAR_HEIGHT);
  }

  function drawExplosionParticles(ctx: CanvasRenderingContext2D) {
    for (const p of explosionParticlesRef.current) {
      const alpha = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawPerformancePanel(ctx: CanvasRenderingContext2D, fps: number) {
    const panelW = 180;
    const panelH = 72;
    const panelX = ctx.canvas.width - panelW - 12;
    const panelY = ctx.canvas.height - panelH - 12;

    ctx.save();
    ctx.fillStyle = '#00000080';
    roundRect(ctx, panelX, panelY, panelW, panelH, 8);
    ctx.fill();

    ctx.font = '12px monospace';
    const recentShots = shotRecordsRef.current.slice(-10);
    const hitCount = recentShots.filter((s) => s.hit).length;
    const hitRate =
      recentShots.length > 0 ? ((hitCount / recentShots.length) * 100).toFixed(1) : '0.0';

    ctx.fillStyle = fps < 55 ? '#FF0000' : '#00FF00';
    ctx.fillText(`FPS: ${fps}`, panelX + 10, panelY + 20);

    ctx.fillStyle = '#FFFF00';
    ctx.fillText(`命中率: ${hitRate}%`, panelX + 10, panelY + 40);

    ctx.fillStyle = '#CCCCCC';
    ctx.fillText(`敌人: ${enemiesRef.current.length}`, panelX + 10, panelY + 60);
    ctx.restore();
  }

  function drawLastHitInfo(ctx: CanvasRenderingContext2D) {
    const record = lastHitRecordRef.current;
    if (!record) return;

    const age = (Date.now() - record.timestamp) / 1000;
    if (age > 3) return;

    const alpha = Math.max(0, 1 - age / 3);

    ctx.save();
    ctx.globalAlpha = alpha;

    const boxW = 220;
    const boxH = 70;
    const boxX = 12;
    const boxY = 12;

    ctx.fillStyle = '#00000080';
    roundRect(ctx, boxX, boxY, boxW, boxH, 8);
    ctx.fill();

    ctx.font = '11px monospace';
    ctx.fillStyle = '#FF6B35';
    ctx.fillText(`命中目标: 敌人 #${record.enemyIndex}`, boxX + 10, boxY + 18);

    const bulletLabel = { normal: '普通弹', scatter: '散射弹', tracking: '追踪弹' };
    ctx.fillStyle = '#DDD';
    ctx.fillText(`子弹类型: ${bulletLabel[record.bulletType]}`, boxX + 10, boxY + 34);

    const reactionLabel = { knockback: '后仰', knockup: '击飞', flicker: '闪烁无敌' };
    ctx.fillText(`受击类型: ${reactionLabel[record.hitReaction]}`, boxX + 10, boxY + 50);

    ctx.fillStyle = '#AAAAAA';
    ctx.fillText(`帧耗时: ${record.frameDuration}ms`, boxX + 10, boxY + 64);

    ctx.restore();
  }

  function roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        minHeight: '600px',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '12px',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          cursor: 'crosshair',
        }}
      />
    </div>
  );
};

export default SceneCanvas;
