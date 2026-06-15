import { GameState } from './GameEngine';
import { TILE_WALL, TILE_PORTAL, TILE_KEY } from './RoomGenerator';
import { SpellType } from './SpellSystem';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  alive: boolean;
}

const MAX_PARTICLES = 500;

export class Renderer {
  canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private time: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const ratio = 16 / 9;
    let cw: number, ch: number;
    if (w / h > ratio) {
      ch = h;
      cw = h * ratio;
    } else {
      cw = w;
      ch = w / ratio;
    }
    this.canvas.width = Math.floor(cw);
    this.canvas.height = Math.floor(ch);
    this.canvas.style.width = Math.floor(cw) + 'px';
    this.canvas.style.height = Math.floor(ch) + 'px';
    this.canvas.style.position = 'absolute';
    this.canvas.style.left = Math.floor((w - cw) / 2) + 'px';
    this.canvas.style.top = Math.floor((h - ch) / 2) + 'px';
  }

  spawnParticles(x: number, y: number, color: string, count: number): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) {
        const dead = this.particles.find(p => !p.alive);
        if (dead) {
          this.resetParticle(dead, x, y, color);
          continue;
        }
        break;
      }
      const p: Particle = {
        x, y, vx: 0, vy: 0,
        life: 0, maxLife: 0,
        color, size: 0, alive: true,
      };
      this.resetParticle(p, x, y, color);
      this.particles.push(p);
    }
  }

  private resetParticle(p: Particle, x: number, y: number, color: string): void {
    p.x = x;
    p.y = y;
    p.vx = (Math.random() - 0.5) * 200;
    p.vy = (Math.random() - 0.5) * 200;
    p.maxLife = 0.4 + Math.random() * 0.6;
    p.life = p.maxLife;
    p.color = color;
    p.size = 2 + Math.random() * 4;
    p.alive = true;
  }

  updateParticles(dt: number): void {
    for (const p of this.particles) {
      if (!p.alive) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.97;
      p.vy *= 0.97;
      p.life -= dt;
      if (p.life <= 0) p.alive = false;
    }
  }

  render(state: GameState, tileSize: number, mouseX: number, mouseY: number): void {
    this.time += 1 / 60;
    const ctx = this.ctx;
    const cw = this.canvas.width;
    const ch = this.canvas.height;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, cw, ch);

    const room = state.floor.rooms[state.currentRoom];
    if (!room) return;

    const camX = state.player.x - cw / 2;
    const camY = state.player.y - ch / 2;

    ctx.save();
    ctx.translate(-camX, -camY);

    this.drawTiles(ctx, room, tileSize, camX, camY, cw, ch);
    this.drawPortal(ctx, room, tileSize);
    this.drawKey(ctx, room, tileSize);
    this.drawMonsters(ctx, state);
    this.drawProjectiles(ctx, state);
    this.drawPlayer(ctx, state);
    this.drawParticles(ctx);

    ctx.restore();

    this.drawCrosshair(ctx, mouseX, mouseY, state.selectedSpell);
  }

  private drawTiles(
    ctx: CanvasRenderingContext2D,
    room: { tiles: number[][]; width: number; height: number },
    ts: number,
    camX: number,
    camY: number,
    cw: number,
    ch: number
  ): void {
    const sx = Math.max(0, Math.floor(camX / ts));
    const sy = Math.max(0, Math.floor(camY / ts));
    const ex = Math.min(room.width, Math.ceil((camX + cw) / ts) + 1);
    const ey = Math.min(room.height, Math.ceil((camY + ch) / ts) + 1);

    for (let y = sy; y < ey; y++) {
      for (let x = sx; x < ex; x++) {
        const tile = room.tiles[y]?.[x];
        if (tile === undefined) continue;
        const px = x * ts;
        const py = y * ts;

        if (tile === TILE_WALL) {
          ctx.fillStyle = '#2a2a2e';
          ctx.fillRect(px, py, ts, ts);
          ctx.fillStyle = '#222225';
          ctx.fillRect(px + 2, py + 2, ts - 4, ts - 4);
          ctx.strokeStyle = '#333338';
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 1, py + 1, ts - 2, ts - 2);
        } else {
          ctx.fillStyle = '#1a1a1e';
          ctx.fillRect(px, py, ts, ts);
          ctx.strokeStyle = '#222228';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(px, py, ts, ts);
        }
      }
    }
  }

  private drawPortal(ctx: CanvasRenderingContext2D, room: { portalPos: { x: number; y: number } }, ts: number): void {
    const { x, y } = room.portalPos;
    if (x < 0) return;

    const px = x * ts + ts / 2;
    const py = y * ts + ts / 2;
    const pulse = 0.7 + Math.sin(this.time * 3) * 0.3;

    ctx.save();
    ctx.globalAlpha = pulse;

    const grad = ctx.createRadialGradient(px, py, 0, px, py, ts * 0.6);
    grad.addColorStop(0, '#66ffcc');
    grad.addColorStop(0.5, '#33aa88');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(px, py, ts * 0.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.6 + Math.sin(this.time * 5) * 0.3;
    ctx.strokeStyle = '#88ffdd';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const r = ts * 0.2 + i * ts * 0.12;
      const angle = this.time * (2 + i) + i * 1.2;
      ctx.beginPath();
      ctx.arc(px, py, r, angle, angle + Math.PI * 1.2);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawKey(ctx: CanvasRenderingContext2D, room: { tiles: number[][] }, ts: number): void {
    for (let y = 0; y < room.tiles.length; y++) {
      for (let x = 0; x < room.tiles[y].length; x++) {
        if (room.tiles[y][x] === TILE_KEY) {
          const px = x * ts + ts / 2;
          const py = y * ts + ts / 2;
          const bob = Math.sin(this.time * 4) * 4;

          ctx.save();
          ctx.shadowColor = '#ffdd44';
          ctx.shadowBlur = 15;
          ctx.fillStyle = '#ffdd44';
          ctx.font = `${ts * 0.55}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('\u{1F511}', px, py + bob);
          ctx.restore();
        }
      }
    }
  }

  private drawMonsters(ctx: CanvasRenderingContext2D, state: GameState): void {
    for (const m of state.monsters) {
      if (!m.alive) continue;

      const bob = Math.sin(m.bobPhase) * 3;
      const px = m.x;
      const py = m.y + bob;

      ctx.save();

      if (m.slowTimer > 0) {
        ctx.shadowColor = '#88ccff';
        ctx.shadowBlur = 20;
      } else {
        ctx.shadowColor = '#66ffaa';
        ctx.shadowBlur = 15;
      }

      ctx.globalAlpha = 0.7 + Math.sin(this.time * 5 + m.bobPhase) * 0.2;
      const grad = ctx.createRadialGradient(px, py, 0, px, py, 18);
      if (m.slowTimer > 0) {
        grad.addColorStop(0, '#aaddff');
        grad.addColorStop(0.6, '#4488aa');
        grad.addColorStop(1, 'transparent');
      } else {
        grad.addColorStop(0, '#88ffbb');
        grad.addColorStop(0.6, '#338855');
        grad.addColorStop(1, 'transparent');
      }
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(px, py, 14, 16, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(px - 5, py - 3, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(px + 5, py - 3, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#111111';
      ctx.beginPath();
      ctx.arc(px - 5, py - 3, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(px + 5, py - 3, 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      if (m.hp < m.maxHp) {
        const barW = 30;
        const barH = 3;
        ctx.fillStyle = '#440000';
        ctx.fillRect(px - barW / 2, py - 24, barW, barH);
        ctx.fillStyle = '#ff3333';
        ctx.fillRect(px - barW / 2, py - 24, barW * (m.hp / m.maxHp), barH);
      }
    }
  }

  private drawProjectiles(ctx: CanvasRenderingContext2D, state: GameState): void {
    const projectiles = state.spellSystem.getActiveProjectiles();
    for (const proj of projectiles) {
      if (!proj.alive) continue;

      ctx.save();
      const isFire = proj.type === 'fireball';
      const mainColor = isFire ? '#ff6622' : '#aaddff';
      const glowColor = isFire ? '#ff440088' : '#66bbff88';

      ctx.shadowColor = mainColor;
      ctx.shadowBlur = 20;

      const grad = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, 12);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, mainColor);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, 10, 0, Math.PI * 2);
      ctx.fill();

      const trailAngle = Math.atan2(proj.vy, proj.vx);
      for (let i = 1; i <= 4; i++) {
        ctx.globalAlpha = 0.4 / i;
        ctx.fillStyle = mainColor;
        ctx.beginPath();
        ctx.arc(
          proj.x - Math.cos(trailAngle) * i * 8,
          proj.y - Math.sin(trailAngle) * i * 8,
          6 - i, 0, Math.PI * 2
        );
        ctx.fill();
      }

      ctx.restore();
    }
  }

  private drawPlayer(ctx: CanvasRenderingContext2D, state: GameState): void {
    const player = state.player;
    const px = player.x;
    const py = player.y;

    ctx.save();

    if (player.invulnTimer > 0 && Math.floor(player.invulnTimer * 10) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    ctx.shadowColor = '#9966ff';
    ctx.shadowBlur = 20;

    const bodyGrad = ctx.createRadialGradient(px, py, 0, px, py, 14);
    bodyGrad.addColorStop(0, '#bb88ff');
    bodyGrad.addColorStop(0.7, '#6633aa');
    bodyGrad.addColorStop(1, '#331166');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(px, py, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#eeddff';
    ctx.beginPath();
    ctx.arc(px - 4, py - 2, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(px + 4, py - 2, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#220044';
    ctx.beginPath();
    ctx.arc(px - 4, py - 2, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(px + 4, py - 2, 1.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffcc44';
    ctx.beginPath();
    ctx.moveTo(px, py - 20);
    ctx.lineTo(px - 6, py - 12);
    ctx.lineTo(px + 6, py - 12);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  private drawParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      if (!p.alive) continue;
      const alpha = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawCrosshair(ctx: CanvasRenderingContext2D, mx: number, my: number, spell: SpellType): void {
    const colors: Record<SpellType, string> = {
      fireball: '#ff6622',
      icespike: '#aaddff',
      teleport: '#cc66ff',
    };
    ctx.save();
    ctx.strokeStyle = colors[spell];
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.arc(mx, my, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(mx - 18, my);
    ctx.lineTo(mx - 8, my);
    ctx.moveTo(mx + 8, my);
    ctx.lineTo(mx + 18, my);
    ctx.moveTo(mx, my - 18);
    ctx.lineTo(mx, my - 8);
    ctx.moveTo(mx, my + 8);
    ctx.lineTo(mx, my + 18);
    ctx.stroke();
    ctx.restore();
  }
}
