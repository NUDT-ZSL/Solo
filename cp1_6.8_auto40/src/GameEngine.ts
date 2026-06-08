import { DungeonGenerator, type DungeonLevel, type Platform, type Enemy, type Trap, type FragmentDrop, type BackgroundElement } from './DungeonGenerator';
import { PlayerController } from './PlayerController';
import { SkillTreeManager } from './SkillTreeManager';
import { UIManager, type UIScreen } from './UIManager';

const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dungeonGenerator: DungeonGenerator;
  private skillManager: SkillTreeManager;
  private player: PlayerController;
  private uiManager: UIManager;
  private currentLevel!: DungeonLevel;
  private levelNumber: number = 1;

  private cameraX: number = 0;
  private cameraY: number = 0;
  private lastTime: number = 0;
  private running: boolean = false;
  private rafId: number = 0;

  private globalAshParticles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number; life: number; maxLife: number }[] = [];

  constructor() {
    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    if (!canvas) throw new Error('Canvas not found');
    this.canvas = canvas;
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;
    this.ctx = canvas.getContext('2d')!;

    this.dungeonGenerator = new DungeonGenerator();
    this.skillManager = new SkillTreeManager();
    this.player = new PlayerController(this.skillManager);
    this.uiManager = new UIManager(this.ctx, CANVAS_WIDTH, CANVAS_HEIGHT, this.skillManager, this.player);

    this.initGlobalAsh();
    this.setupInput();
    this.start();
  }

  private initGlobalAsh(): void {
    for (let i = 0; i < 40; i++) {
      this.globalAshParticles.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        vx: (Math.random() - 0.5) * 12,
        vy: -8 - Math.random() * 15,
        size: 1 + Math.random() * 2.5,
        alpha: 0.1 + Math.random() * 0.3,
        life: Math.random() * 5,
        maxLife: 3 + Math.random() * 4,
      });
    }
  }

  private setupInput(): void {
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;

      const action = this.uiManager.handleClick(mx, my);
      if (action) this.handleUIAction(action);
    });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape') {
        const screen = this.uiManager.getScreen();
        if (screen === 'playing') {
          this.uiManager.setScreen('paused');
        } else if (screen === 'paused') {
          this.uiManager.setScreen('playing');
        } else if (screen === 'skill_tree') {
          this.uiManager.setScreen('menu');
        }
      }
      if (e.code === 'Tab') {
        e.preventDefault();
        const screen = this.uiManager.getScreen();
        if (screen === 'playing') {
          this.uiManager.setScreen('skill_tree');
        } else if (screen === 'skill_tree') {
          this.uiManager.setScreen('playing');
        }
      }
    });
  }

  private handleUIAction(action: string): void {
    switch (action) {
      case 'start':
        this.startNewRun();
        break;
      case 'skill_tree':
        this.uiManager.setScreen('skill_tree');
        break;
      case 'close_skill_tree':
        this.uiManager.setScreen(this.levelNumber > 0 ? 'playing' : 'menu');
        break;
      case 'restart':
        this.startNewRun();
        break;
      case 'to_menu':
        this.skillManager.resetRun();
        this.uiManager.setScreen('menu');
        break;
      case 'next_level':
        this.levelNumber++;
        this.player.currentLevel = this.levelNumber;
        this.dungeonGenerator.setLevel(this.levelNumber);
        this.currentLevel = this.dungeonGenerator.generate();
        this.player.reset(100, 400);
        this.uiManager.setScreen('playing');
        break;
      case 'resume':
        this.uiManager.setScreen('playing');
        break;
      case 'skill_unlocked':
        break;
    }
  }

  private startNewRun(): void {
    this.levelNumber = 1;
    this.player.currentLevel = 1;
    this.skillManager.resetRun();
    this.player.refreshBoosts();
    this.dungeonGenerator.setLevel(1);
    this.currentLevel = this.dungeonGenerator.generate();
    this.player.reset(100, 400);
    this.uiManager.setScreen('playing');
  }

  private start(): void {
    this.running = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  private loop = (timestamp: number): void => {
    if (!this.running) return;

    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;

    this.update(dt);
    this.render();

    this.rafId = requestAnimationFrame(this.loop);
  };

  private update(dt: number): void {
    this.uiManager.update(dt);
    this.updateGlobalAsh(dt);

    if (this.uiManager.getScreen() !== 'playing') return;

    this.player.update(dt, this.currentLevel.platforms, this.currentLevel.enemies, this.currentLevel.traps);

    this.updateCamera();
    this.updateEnemies(dt);
    this.checkPlayerAttackHits();
    this.checkProjectileHits();
    this.updateFragmentDrops(dt);
    this.checkExitPortal();

    if (!this.player.alive) {
      this.uiManager.setScreen('game_over');
    }
  }

  private updateCamera(): void {
    const targetX = this.player.x - CANVAS_WIDTH / 2 + this.player.width / 2;
    const targetY = this.player.y - CANVAS_HEIGHT / 2 + this.player.height / 2;
    this.cameraX += (targetX - this.cameraX) * 0.08;
    this.cameraY += (targetY - this.cameraY) * 0.08;
    this.cameraX = Math.max(0, Math.min(this.cameraX, this.currentLevel.levelWidth - CANVAS_WIDTH));
    this.cameraY = Math.max(0, Math.min(this.cameraY, this.currentLevel.levelHeight - CANVAS_HEIGHT));
  }

  private updateEnemies(dt: number): void {
    const boosts = this.skillManager.getActiveBoosts();

    for (const enemy of this.currentLevel.enemies) {
      if (!enemy.alive) continue;

      enemy.animTimer += dt;
      if (enemy.animTimer > 0.15) {
        enemy.animTimer = 0;
        enemy.animFrame = (enemy.animFrame + 1) % 4;
      }

      if (enemy.hitFlash > 0) enemy.hitFlash -= dt;

      switch (enemy.type) {
        case 'crawler':
          if (enemy.x <= enemy.patrolLeft || enemy.x + enemy.width >= enemy.patrolRight) {
            enemy.vx = -enemy.vx;
            enemy.facingRight = enemy.vx > 0;
          }
          enemy.x += enemy.vx * dt;
          break;

        case 'flyer':
          enemy.x += Math.sin(enemy.animTimer * 2 + enemy.patrolLeft) * 30 * dt;
          enemy.y += Math.cos(enemy.animTimer * 1.5 + enemy.patrolRight) * 20 * dt;
          break;

        case 'brute':
          const dx = this.player.x - enemy.x;
          if (Math.abs(dx) < 300 && this.player.alive) {
            const speed = 50;
            enemy.x += (dx > 0 ? speed : -speed) * dt;
            enemy.facingRight = dx > 0;
          }
          break;
      }

      enemy.attackCooldown -= dt;
      if (enemy.attackCooldown <= 0 && this.player.alive) {
        const dist = this.getDistance(
          enemy.x + enemy.width / 2, enemy.y + enemy.height / 2,
          this.player.x + this.player.width / 2, this.player.y + this.player.height / 2
        );
        const attackRange = enemy.type === 'brute' ? 80 : enemy.type === 'flyer' ? 120 : 60;
        if (dist < attackRange) {
          const damage = enemy.type === 'brute' ? 20 : enemy.type === 'flyer' ? 8 : 12;
          this.player.takeDamage(damage);
          enemy.attackCooldown = enemy.type === 'brute' ? 1.5 : 1;
          this.uiManager.triggerShake(4, 0.15);
        } else {
          enemy.attackCooldown = 0.3;
        }
      }

      for (const platform of this.currentLevel.platforms) {
        if (platform.type === 'ground' && enemy.type !== 'flyer') {
          if (enemy.y + enemy.height > platform.y && enemy.y + enemy.height < platform.y + platform.height + 10) {
            enemy.y = platform.y - enemy.height;
          }
        }
      }
    }
  }

  private checkPlayerAttackHits(): void {
    const hitbox = this.player.getAttackHitbox();
    if (!hitbox) return;

    const boosts = this.skillManager.getActiveBoosts();

    for (const enemy of this.currentLevel.enemies) {
      if (!enemy.alive) continue;
      if (this.rectOverlap(hitbox.x, hitbox.y, hitbox.w, hitbox.h, enemy.x, enemy.y, enemy.width, enemy.height)) {
        enemy.hp -= hitbox.damage;
        enemy.hitFlash = 0.15;
        enemy.vx = this.player.facingRight ? 80 : -80;
        this.uiManager.triggerShake(3, 0.1);

        if (boosts.hasBurn) {
          // burn is passive damage over time effect
        }

        if (enemy.hp <= 0) {
          enemy.alive = false;
          this.spawnFragmentDrop(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.fragmentValue);
          if (boosts.healOnKill > 0) {
            this.player.heal(this.player.maxHp * boosts.healOnKill);
          }
        }
      }
    }
  }

  private checkProjectileHits(): void {
    const boosts = this.skillManager.getActiveBoosts();

    for (const proj of this.player.projectiles) {
      if (!proj.fromPlayer) continue;
      for (const enemy of this.currentLevel.enemies) {
        if (!enemy.alive || proj.hitEnemies.has(enemy.hp)) continue;
        if (this.rectOverlap(proj.x, proj.y, proj.width, proj.height, enemy.x, enemy.y, enemy.width, enemy.height)) {
          enemy.hp -= proj.damage;
          enemy.hitFlash = 0.15;
          proj.hitEnemies.add(enemy.hp);
          proj.lifetime = 0;

          this.uiManager.triggerShake(2, 0.08);

          if (enemy.hp <= 0) {
            enemy.alive = false;
            this.spawnFragmentDrop(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.fragmentValue);
            if (boosts.healOnKill > 0) {
              this.player.heal(this.player.maxHp * boosts.healOnKill);
            }
          }
        }
      }
    }
  }

  private spawnFragmentDrop(x: number, y: number, value: number): void {
    this.currentLevel.fragments.push({
      x,
      y,
      vy: -150 - Math.random() * 100,
      value,
      lifetime: 8,
      collected: false,
      glowPhase: 0,
    });
  }

  private updateFragmentDrops(dt: number): void {
    for (const frag of this.currentLevel.fragments) {
      if (frag.collected) continue;

      frag.vy += 400 * dt;
      frag.y += frag.vy * dt;
      frag.lifetime -= dt;
      frag.glowPhase += dt * 3;

      if (frag.y > this.currentLevel.levelHeight - 60) {
        frag.y = this.currentLevel.levelHeight - 60;
        frag.vy = 0;
      }

      if (!this.player.tryCollectFragment(frag)) {
        const cx = this.player.x + this.player.width / 2;
        const cy = this.player.y + this.player.height / 2;
        const dx = cx - frag.x;
        const dy = cy - frag.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          frag.x += dx * dt * 3;
          frag.y += dy * dt * 3;
        }
      }

      if (frag.lifetime <= 0) frag.collected = true;
    }

    this.currentLevel.fragments = this.currentLevel.fragments.filter(f => !f.collected);
  }

  private checkExitPortal(): void {
    if (this.player.checkExitPortal(this.currentLevel.exitPortal)) {
      this.uiManager.setScreen('level_complete');
    }
  }

  private updateGlobalAsh(dt: number): void {
    for (const ash of this.globalAshParticles) {
      ash.x += ash.vx * dt;
      ash.y += ash.vy * dt;
      ash.life += dt;
      ash.alpha = 0.2 * (1 - ash.life / ash.maxLife);
      if (ash.life >= ash.maxLife || ash.y < -20) {
        ash.x = Math.random() * CANVAS_WIDTH;
        ash.y = CANVAS_HEIGHT + 10;
        ash.life = 0;
        ash.vx = (Math.random() - 0.5) * 12;
        ash.vy = -8 - Math.random() * 15;
      }
    }
  }

  private render(): void {
    const ctx = this.ctx;
    const shake = this.uiManager.getShakeOffset();

    ctx.save();
    ctx.translate(shake.x, shake.y);

    this.renderBackground();

    if (this.uiManager.getScreen() !== 'menu' && this.currentLevel) {
      this.renderLevel();
    }

    ctx.restore();

    this.renderGlobalAsh();
    this.uiManager.render();
  }

  private renderBackground(): void {
    const ctx = this.ctx;
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    grad.addColorStop(0, '#0a0612');
    grad.addColorStop(0.4, '#1a0a2e');
    grad.addColorStop(0.7, '#150825');
    grad.addColorStop(1, '#0d0820');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (!this.currentLevel) return;

    for (const layer of this.currentLevel.backgroundLayers) {
      for (const el of layer.elements) {
        const ex = el.x - this.cameraX * layer.speed;
        if (ex + el.width < -50 || ex > CANVAS_WIDTH + 50) continue;
        const ey = el.y - this.cameraY * layer.speed;
        ctx.save();
        ctx.globalAlpha = el.opacity;
        ctx.fillStyle = '#1a0a2e';
        ctx.fillRect(ex, ey, el.width, el.height);
        ctx.strokeStyle = el.glowColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(ex, ey, el.width, el.height);
        ctx.restore();
      }
    }
  }

  private renderLevel(): void {
    const ctx = this.ctx;

    for (const platform of this.currentLevel.platforms) {
      this.renderPlatform(platform);
    }

    for (const trap of this.currentLevel.traps) {
      this.renderTrap(trap);
    }

    this.renderExitPortal();

    for (const enemy of this.currentLevel.enemies) {
      if (enemy.alive) this.renderEnemy(enemy);
    }

    for (const frag of this.currentLevel.fragments) {
      if (!frag.collected) this.renderFragment(frag);
    }

    this.player.render(ctx, this.cameraX, this.cameraY);
  }

  private renderPlatform(platform: Platform): void {
    const ctx = this.ctx;
    const px = platform.x - this.cameraX;
    const py = platform.y - this.cameraY;

    if (px + platform.width < -10 || px > CANVAS_WIDTH + 10) return;

    ctx.save();

    if (platform.type === 'ground') {
      const grad = ctx.createLinearGradient(px, py, px, py + platform.height);
      grad.addColorStop(0, '#2d1b4e');
      grad.addColorStop(1, '#1a0a2e');
      ctx.fillStyle = grad;
      ctx.fillRect(px, py, platform.width, platform.height);

      ctx.fillStyle = '#3d2060';
      ctx.fillRect(px, py, platform.width, 3);

      ctx.strokeStyle = 'rgba(139, 92, 246, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + platform.width, py);
      ctx.stroke();
    } else if (platform.type === 'floating') {
      ctx.fillStyle = '#2d1b4e';
      ctx.fillRect(px, py, platform.width, platform.height);

      ctx.fillStyle = '#4a1a6b';
      ctx.fillRect(px, py, platform.width, 4);

      ctx.strokeStyle = 'rgba(139, 92, 246, 0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(px, py, platform.width, platform.height);

      if (platform.hasSpikes) {
        ctx.fillStyle = '#8b5cf6';
        const spikeCount = Math.floor(platform.width / 20);
        for (let i = 0; i < spikeCount; i++) {
          const sx = px + i * 20 + 5;
          ctx.beginPath();
          ctx.moveTo(sx, py);
          ctx.lineTo(sx + 5, py - 12);
          ctx.lineTo(sx + 10, py);
          ctx.fill();
        }
      }
    } else if (platform.type === 'wall') {
      const grad = ctx.createLinearGradient(px, py, px + platform.width, py);
      grad.addColorStop(0, '#2d1b4e');
      grad.addColorStop(1, '#1a0a2e');
      ctx.fillStyle = grad;
      ctx.fillRect(px, py, platform.width, platform.height);

      ctx.strokeStyle = 'rgba(139, 92, 246, 0.15)';
      ctx.lineWidth = 1;
      ctx.strokeRect(px, py, platform.width, platform.height);
    }

    ctx.restore();
  }

  private renderTrap(trap: Trap): void {
    const ctx = this.ctx;
    const tx = trap.x - this.cameraX;
    const ty = trap.y - this.cameraY;

    if (tx + trap.width < -10 || tx > CANVAS_WIDTH + 10) return;

    ctx.save();

    if (!trap.active) {
      ctx.globalAlpha = 0.3;
    }

    switch (trap.type) {
      case 'spike':
        ctx.fillStyle = '#dc2626';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = trap.active ? 6 : 0;
        const spikeW = 12;
        const spikes = Math.floor(trap.width / spikeW);
        for (let i = 0; i < spikes; i++) {
          const sx = tx + i * spikeW;
          ctx.beginPath();
          ctx.moveTo(sx, ty + trap.height);
          ctx.lineTo(sx + spikeW / 2, ty);
          ctx.lineTo(sx + spikeW, ty + trap.height);
          ctx.fill();
        }
        break;

      case 'fire':
        ctx.fillStyle = '#f59e0b';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = trap.active ? 10 : 0;
        const fireH = trap.active ? trap.height + 10 + Math.sin(Date.now() / 100) * 5 : trap.height;
        ctx.beginPath();
        ctx.ellipse(tx + trap.width / 2, ty + trap.height, trap.width / 2, fireH, 0, Math.PI, 0);
        ctx.fill();
        break;

      case 'void':
        ctx.fillStyle = '#1e1b4b';
        ctx.shadowColor = '#6d28d9';
        ctx.shadowBlur = trap.active ? 12 : 0;
        ctx.beginPath();
        ctx.ellipse(tx + trap.width / 2, ty + trap.height / 2, trap.width / 2, trap.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
    }

    ctx.restore();
  }

  private renderEnemy(enemy: Enemy): void {
    const ctx = this.ctx;
    const ex = enemy.x - this.cameraX;
    const ey = enemy.y - this.cameraY;

    if (ex + enemy.width < -20 || ex > CANVAS_WIDTH + 20) return;

    ctx.save();

    if (enemy.hitFlash > 0) {
      ctx.fillStyle = '#fff';
    } else {
      switch (enemy.type) {
        case 'crawler':
          ctx.fillStyle = '#4a1a6b';
          break;
        case 'flyer':
          ctx.fillStyle = '#1e3a5f';
          break;
        case 'brute':
          ctx.fillStyle = '#5c1a1a';
          break;
      }
    }

    const glowColors = {
      crawler: '#8b5cf6',
      flyer: '#38bdf8',
      brute: '#ef4444',
    };
    ctx.shadowColor = glowColors[enemy.type];
    ctx.shadowBlur = 6;

    if (enemy.type === 'crawler') {
      ctx.fillRect(ex + 2, ey + 10, enemy.width - 4, enemy.height - 10);
      ctx.fillRect(ex, ey + 20, 8, 12);
      ctx.fillRect(ex + enemy.width - 8, ey + 20, 8, 12);

      ctx.fillStyle = enemy.hitFlash > 0 ? '#fff' : '#c084fc';
      ctx.fillRect(ex + 8, ey + 14, 4, 4);
      ctx.fillRect(ex + enemy.width - 12, ey + 14, 4, 4);
    } else if (enemy.type === 'flyer') {
      ctx.beginPath();
      ctx.ellipse(ex + enemy.width / 2, ey + enemy.height / 2, enemy.width / 2, enemy.height / 2, 0, 0, Math.PI * 2);
      ctx.fill();

      const wingOffset = Math.sin(enemy.animTimer * 8) * 5;
      ctx.fillRect(ex - 8, ey + 8 + wingOffset, 10, 6);
      ctx.fillRect(ex + enemy.width - 2, ey + 8 + wingOffset, 10, 6);

      ctx.fillStyle = enemy.hitFlash > 0 ? '#fff' : '#38bdf8';
      ctx.fillRect(ex + 10, ey + 12, 4, 4);
      ctx.fillRect(ex + enemy.width - 14, ey + 12, 4, 4);
    } else if (enemy.type === 'brute') {
      ctx.fillRect(ex, ey, enemy.width, enemy.height);

      ctx.fillStyle = enemy.hitFlash > 0 ? '#fff' : '#3d1010';
      ctx.fillRect(ex + 5, ey + 5, enemy.width - 10, 20);

      ctx.fillStyle = enemy.hitFlash > 0 ? '#fff' : '#ef4444';
      ctx.fillRect(ex + 10, ey + 10, 8, 6);
      ctx.fillRect(ex + enemy.width - 18, ey + 10, 8, 6);

      ctx.fillStyle = enemy.hitFlash > 0 ? '#fff' : '#7c2d2d';
      ctx.fillRect(ex - 5, ey + 25, 12, 25);
      ctx.fillRect(ex + enemy.width - 7, ey + 25, 12, 25);
    }

    ctx.shadowBlur = 0;

    if (enemy.hp < enemy.maxHp) {
      const hpBarW = enemy.width;
      const hpBarH = 4;
      const hpBarY = ey - 8;
      ctx.fillStyle = '#1f1024';
      ctx.fillRect(ex, hpBarY, hpBarW, hpBarH);
      ctx.fillStyle = enemy.hp / enemy.maxHp > 0.5 ? '#8b5cf6' : '#ef4444';
      ctx.fillRect(ex, hpBarY, hpBarW * (enemy.hp / enemy.maxHp), hpBarH);
    }

    ctx.restore();
  }

  private renderFragment(frag: FragmentDrop): void {
    const ctx = this.ctx;
    const fx = frag.x - this.cameraX;
    const fy = frag.y - this.cameraY;

    ctx.save();
    const glow = 0.5 + Math.sin(frag.glowPhase) * 0.3;
    ctx.globalAlpha = Math.min(1, frag.lifetime / 2);
    ctx.fillStyle = '#a78bfa';
    ctx.shadowColor = '#8b5cf6';
    ctx.shadowBlur = 10 * glow;

    ctx.beginPath();
    const size = 5 + frag.value;
    ctx.moveTo(fx, fy - size);
    ctx.lineTo(fx + size * 0.7, fy);
    ctx.lineTo(fx, fy + size * 0.5);
    ctx.lineTo(fx - size * 0.7, fy);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  private renderExitPortal(): void {
    const portal = this.currentLevel.exitPortal;
    const ctx = this.ctx;
    const px = portal.x - this.cameraX;
    const py = portal.y - this.cameraY;

    portal.phase += 0.03;

    ctx.save();

    ctx.fillStyle = 'rgba(139, 92, 246, 0.15)';
    ctx.shadowColor = '#8b5cf6';
    ctx.shadowBlur = 20;

    ctx.beginPath();
    ctx.ellipse(px + portal.width / 2, py + portal.height / 2, portal.width / 2 + 5, portal.height / 2 + 5, 0, 0, Math.PI * 2);
    ctx.fill();

    const innerAlpha = 0.3 + Math.sin(portal.phase) * 0.15;
    ctx.fillStyle = `rgba(167, 139, 250, ${innerAlpha})`;
    ctx.beginPath();
    ctx.ellipse(px + portal.width / 2, py + portal.height / 2, portal.width / 2, portal.height / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.ellipse(px + portal.width / 2, py + portal.height / 2, portal.width / 2, portal.height / 2, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.font = '12px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#a78bfa';
    ctx.textAlign = 'center';
    ctx.shadowBlur = 0;
    ctx.fillText('出口', px + portal.width / 2, py - 12);

    ctx.restore();
  }

  private renderGlobalAsh(): void {
    const ctx = this.ctx;
    for (const ash of this.globalAshParticles) {
      ctx.save();
      ctx.globalAlpha = ash.alpha;
      ctx.fillStyle = '#9ca3af';
      ctx.beginPath();
      ctx.arc(ash.x, ash.y, ash.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private rectOverlap(x1: number, y1: number, w1: number, h1: number, x2: number, y2: number, w2: number, h2: number): boolean {
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
  }

  private getDistance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
  }
}

new GameEngine();
