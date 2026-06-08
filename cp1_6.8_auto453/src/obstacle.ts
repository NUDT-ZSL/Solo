export type ObstacleType = 'ink_blob' | 'calligraphy' | 'seal';

export interface Obstacle {
  type: ObstacleType;
  x: number;
  y: number;
  width: number;
  height: number;
  active: boolean;
  dodged: boolean;
  splashProgress: number;
  spreadProgress: number;
  particles: SplashParticle[];
}

export interface Fragment {
  x: number;
  y: number;
  width: number;
  height: number;
  collected: boolean;
  glowPhase: number;
  collectTimer: number;
  collectParticles: CollectParticle[];
}

export interface SplashParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
}

export interface CollectParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  life: number;
}

interface Hitbox {
  x: number;
  y: number;
  width: number;
  height: number;
}

const CALLIGRAPHY_CHARS = ['墨', '风', '云', '山', '水', '龙', '虎', '剑', '道', '禅'];
const MIN_SPAWN_INTERVAL = 1.2;
const MAX_SPAWN_INTERVAL = 2.5;
const FRAGMENT_SPAWN_INTERVAL = 3.0;
const MAX_PARTICLES = 30;

export class ObstacleSystem {
  private obstacles: Obstacle[] = [];
  private fragments: Fragment[] = [];
  private canvasWidth: number;
  private groundY: number;
  private spawnTimer: number = 0;
  private nextSpawnTime: number = 2.0;
  private fragmentTimer: number = 1.5;
  private scrollSpeed: number = 300;
  private difficulty: number = 0;
  private activeParticleCount: number = 0;

  constructor(canvasWidth: number, groundY: number) {
    this.canvasWidth = canvasWidth;
    this.groundY = groundY;
  }

  setScrollSpeed(speed: number) {
    this.scrollSpeed = speed;
  }

  setDifficulty(difficulty: number) {
    this.difficulty = difficulty;
  }

  update(dt: number): { hit: boolean; fragmentCollected: number } {
    let hit = false;
    let fragmentCollected = 0;

    this.spawnTimer += dt;
    if (this.spawnTimer >= this.nextSpawnTime) {
      this.spawnTimer = 0;
      this.nextSpawnTime = MIN_SPAWN_INTERVAL + Math.random() * (MAX_SPAWN_INTERVAL - MIN_SPAWN_INTERVAL) * (1 - this.difficulty * 0.3);
      this.spawnObstacle();
    }

    this.fragmentTimer += dt;
    if (this.fragmentTimer >= FRAGMENT_SPAWN_INTERVAL) {
      this.fragmentTimer = 0;
      this.spawnFragment();
    }

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.x -= this.scrollSpeed * dt;

      if (obs.spreadProgress < 1) {
        obs.spreadProgress = Math.min(1, obs.spreadProgress + dt * 2);
      }

      if (obs.dodged && obs.active) {
        obs.splashProgress += dt * 3;
        this.updateSplashParticles(obs, dt);
        if (obs.splashProgress >= 1) {
          obs.active = false;
        }
      }

      if (obs.x + obs.width < -50) {
        if (!obs.dodged) {
          obs.dodged = true;
        }
        if (!obs.active || obs.splashProgress >= 1) {
          this.activeParticleCount -= obs.particles.length;
          this.obstacles.splice(i, 1);
        }
      }
    }

    for (let i = this.fragments.length - 1; i >= 0; i--) {
      const frag = this.fragments[i];
      frag.x -= this.scrollSpeed * dt;
      frag.glowPhase += dt * 3;

      if (frag.collected) {
        frag.collectTimer += dt;
        this.updateCollectParticles(frag, dt);
        if (frag.collectTimer >= 0.8) {
          this.fragments.splice(i, 1);
        }
      } else if (frag.x + frag.width < -20) {
        this.fragments.splice(i, 1);
      }
    }

    return { hit, fragmentCollected };
  }

  checkCollisions(playerHitbox: Hitbox): { hit: boolean; fragmentCollected: number } {
    let hit = false;
    let fragmentCollected = 0;

    for (const obs of this.obstacles) {
      if (!obs.active || obs.dodged) continue;
      if (this.aabbCollision(playerHitbox, this.getObstacleHitbox(obs))) {
        obs.dodged = true;
        hit = true;
      } else if (!obs.dodged && obs.x + obs.width < playerHitbox.x) {
        obs.dodged = true;
        this.createSplashParticles(obs);
      }
    }

    for (const frag of this.fragments) {
      if (frag.collected) continue;
      if (this.aabbCollision(playerHitbox, {
        x: frag.x,
        y: frag.y,
        width: frag.width,
        height: frag.height,
      })) {
        frag.collected = true;
        frag.collectTimer = 0;
        this.createCollectParticles(frag);
        fragmentCollected++;
      }
    }

    return { hit, fragmentCollected };
  }

  private aabbCollision(a: Hitbox, b: Hitbox): boolean {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  }

  private getObstacleHitbox(obs: Obstacle): Hitbox {
    const shrink = 6;
    return {
      x: obs.x + shrink,
      y: obs.y + shrink,
      width: obs.width - shrink * 2,
      height: obs.height - shrink * 2,
    };
  }

  private spawnObstacle() {
    const r = Math.random();
    let type: ObstacleType;
    if (r < 0.4) type = 'ink_blob';
    else if (r < 0.75) type = 'calligraphy';
    else type = 'seal';

    const isHigh = Math.random() < 0.35 + this.difficulty * 0.15;

    let width: number, height: number, y: number;

    switch (type) {
      case 'ink_blob':
        width = 40 + Math.random() * 25;
        height = 35 + Math.random() * 20;
        break;
      case 'calligraphy':
        width = 45;
        height = 50;
        break;
      case 'seal':
        width = 40;
        height = 40;
        break;
    }

    if (isHigh) {
      y = this.groundY - 80 - Math.random() * 60;
    } else {
      y = this.groundY - height - 5;
    }

    this.obstacles.push({
      type,
      x: this.canvasWidth + 50,
      y,
      width,
      height,
      active: true,
      dodged: false,
      splashProgress: 0,
      spreadProgress: 0,
      particles: [],
    });
  }

  private spawnFragment() {
    const y = this.groundY - 50 - Math.random() * 100;
    this.fragments.push({
      x: this.canvasWidth + 30,
      y,
      width: 18,
      height: 18,
      collected: false,
      glowPhase: 0,
      collectTimer: 0,
      collectParticles: [],
    });
  }

  private createSplashParticles(obs: Obstacle) {
    const count = 8;
    for (let i = 0; i < count; i++) {
      if (this.activeParticleCount >= MAX_PARTICLES) break;
      const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
      obs.particles.push({
        x: obs.x + obs.width / 2,
        y: obs.y + obs.height / 2,
        vx: Math.cos(angle) * (80 + Math.random() * 60),
        vy: Math.sin(angle) * (80 + Math.random() * 60),
        size: 2 + Math.random() * 4,
        opacity: 0.8,
      });
      this.activeParticleCount++;
    }
  }

  private updateSplashParticles(obs: Obstacle, dt: number) {
    for (let i = obs.particles.length - 1; i >= 0; i--) {
      const p = obs.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.opacity -= dt * 2;
      p.size -= dt * 4;
      if (p.opacity <= 0 || p.size <= 0) {
        obs.particles.splice(i, 1);
        this.activeParticleCount--;
      }
    }
  }

  private createCollectParticles(frag: Fragment) {
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 / 6) * i + Math.random() * 0.5;
      frag.collectParticles.push({
        x: frag.x + frag.width / 2,
        y: frag.y + frag.height / 2,
        vx: Math.cos(angle) * (50 + Math.random() * 40),
        vy: Math.sin(angle) * (50 + Math.random() * 40),
        size: 2 + Math.random() * 3,
        opacity: 1,
        life: 0.6,
      });
    }
  }

  private updateCollectParticles(frag: Fragment, dt: number) {
    for (let i = frag.collectParticles.length - 1; i >= 0; i--) {
      const p = frag.collectParticles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.opacity = Math.max(0, p.life / 0.6);
      p.size -= dt * 3;
      if (p.life <= 0 || p.size <= 0) {
        frag.collectParticles.splice(i, 1);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    for (const obs of this.obstacles) {
      if (!obs.active) continue;

      if (obs.dodged) {
        this.renderSplashParticles(ctx, obs);
        continue;
      }

      ctx.save();
      const scale = obs.spreadProgress;
      ctx.globalAlpha = scale;

      switch (obs.type) {
        case 'ink_blob':
          this.renderInkBlob(ctx, obs, scale);
          break;
        case 'calligraphy':
          this.renderCalligraphy(ctx, obs, scale);
          break;
        case 'seal':
          this.renderSeal(ctx, obs, scale);
          break;
      }

      ctx.restore();
    }

    for (const frag of this.fragments) {
      if (frag.collected) {
        this.renderCollectParticles(ctx, frag);
      } else {
        this.renderFragment(ctx, frag);
      }
    }
  }

  private renderInkBlob(ctx: CanvasRenderingContext2D, obs: Obstacle, scale: number) {
    const cx = obs.x + obs.width / 2;
    const cy = obs.y + obs.height / 2;

    ctx.fillStyle = '#1a1a1a';
    const r = (obs.width / 2) * scale;

    ctx.beginPath();
    for (let i = 0; i <= 12; i++) {
      const angle = (Math.PI * 2 / 12) * i;
      const wobble = 1 + Math.sin(i * 2.5) * 0.15;
      const px = cx + Math.cos(angle) * r * wobble;
      const py = cy + Math.sin(angle) * r * wobble;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(60, 60, 60, 0.3)';
    ctx.beginPath();
    ctx.arc(cx - r * 0.2, cy - r * 0.2, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderCalligraphy(ctx: CanvasRenderingContext2D, obs: Obstacle, scale: number) {
    const cx = obs.x + obs.width / 2;
    const cy = obs.y + obs.height / 2;

    ctx.font = `bold ${Math.floor(48 * scale)}px "KaiTi", "STKaiti", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#1a1a1a';
    const charIndex = Math.floor(obs.x * 0.01) % CALLIGRAPHY_CHARS.length;
    ctx.fillText(CALLIGRAPHY_CHARS[charIndex], cx, cy);

    ctx.fillStyle = 'rgba(26, 26, 26, 0.15)';
    ctx.beginPath();
    ctx.arc(cx, cy, obs.width * 0.6 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderSeal(ctx: CanvasRenderingContext2D, obs: Obstacle, scale: number) {
    const cx = obs.x + obs.width / 2;
    const cy = obs.y + obs.height / 2;
    const size = (obs.width / 2) * scale;

    ctx.fillStyle = '#B22222';
    ctx.globalAlpha *= 0.85;
    ctx.fillRect(cx - size, cy - size, size * 2, size * 2);

    ctx.strokeStyle = '#8B0000';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - size + 3, cy - size + 3, size * 2 - 6, size * 2 - 6);

    ctx.font = `${Math.floor(20 * scale)}px "SimSun", "STSong", serif`;
    ctx.fillStyle = '#F5F0E8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('印', cx, cy);
  }

  private renderSplashParticles(ctx: CanvasRenderingContext2D, obs: Obstacle) {
    for (const p of obs.particles) {
      ctx.fillStyle = `rgba(26, 26, 26, ${p.opacity})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private renderFragment(ctx: CanvasRenderingContext2D, frag: Fragment) {
    const cx = frag.x + frag.width / 2;
    const cy = frag.y + frag.height / 2;
    const glow = 0.3 + Math.sin(frag.glowPhase) * 0.15;

    ctx.fillStyle = `rgba(201, 168, 76, ${glow})`;
    ctx.beginPath();
    ctx.arc(cx, cy, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#C9A84C';
    ctx.fillRect(-7, -7, 14, 14);
    ctx.fillStyle = '#E8D48C';
    ctx.fillRect(-4, -4, 8, 8);
    ctx.restore();
  }

  private renderCollectParticles(ctx: CanvasRenderingContext2D, frag: Fragment) {
    for (const p of frag.collectParticles) {
      ctx.fillStyle = `rgba(201, 168, 76, ${p.opacity})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  resize(canvasWidth: number, groundY: number) {
    this.canvasWidth = canvasWidth;
    this.groundY = groundY;
  }

  reset() {
    this.obstacles = [];
    this.fragments = [];
    this.spawnTimer = 0;
    this.fragmentTimer = 1.5;
    this.nextSpawnTime = 2.0;
    this.activeParticleCount = 0;
  }
}
