import { create } from 'zustand';
import { generateCave, updateMonsters, spawnTorchParticles, spawnLavaParticles, isTileVisible, revealExplored, TILE, type CaveMap, type Particle } from './LavaCave';
import { createDragon, updateDragon, startBreath, canLightTorch, damageDragon, getLightRadius, isBreathOnCooldown, unlockTalent, type DragonState, TALENT_DEFS } from './DragonPlayer';

export interface GameStoreState {
  health: number;
  maxHealth: number;
  scales: number;
  level: number;
  gameOver: boolean;
  talents: Record<string, number>;
  talentPanelOpen: boolean;
  explored: boolean[][];
  torches: Array<{ tileX: number; tileY: number; lit: boolean }>;
  playerTileX: number;
  playerTileY: number;
  exitTileX: number;
  exitTileY: number;
  mapWidth: number;
  mapHeight: number;
  isMobile: boolean;
}

export const useGameStore = create<GameStoreState>(() => ({
  health: 5,
  maxHealth: 5,
  scales: 0,
  level: 1,
  gameOver: false,
  talents: {},
  talentPanelOpen: false,
  explored: [],
  torches: [],
  playerTileX: 0,
  playerTileY: 0,
  exitTileX: 0,
  exitTileY: 0,
  mapWidth: 0,
  mapHeight: 0,
  isMobile: false,
}));

export function toggleTalentPanel() {
  useGameStore.setState(s => ({ talentPanelOpen: !s.talentPanelOpen }));
}

export function requestUnlockTalent(talentId: string) {
  const engine = GameEngine.instance;
  if (engine && engine.dragon) {
    unlockTalent(engine.dragon, talentId);
    syncStore(engine);
  }
}

function syncStore(engine: GameEngine) {
  const d = engine.dragon;
  const c = engine.cave;
  if (!d || !c) return;
  useGameStore.setState({
    health: d.health,
    maxHealth: d.maxHealth,
    scales: d.scales,
    level: engine.level,
    gameOver: d.health <= 0,
    talents: { ...d.talents },
    explored: c.explored,
    torches: c.torches.map(t => ({ tileX: t.tileX, tileY: t.tileY, lit: t.lit })),
    playerTileX: Math.floor(d.x / TILE),
    playerTileY: Math.floor(d.y / TILE),
    exitTileX: c.exitTileX,
    exitTileY: c.exitTileY,
    mapWidth: c.width,
    mapHeight: c.height,
    isMobile: engine.isMobile,
  });
}

const MAP_W = 50;
const MAP_H = 38;
const LAVA_DAMAGE_INTERVAL = 0.5;

export class GameEngine {
  static instance: GameEngine | null = null;

  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  darkCanvas: HTMLCanvasElement;
  darkCtx: CanvasRenderingContext2D;
  cave: CaveMap | null = null;
  dragon: DragonState | null = null;
  keys: Set<string> = new Set();
  level = 1;
  running = false;
  lastTime = 0;
  cameraX = 0;
  cameraY = 0;
  lavaDmgTimer = 0;
  animTime = 0;
  isMobile = false;
  touchDx = 0;
  touchDy = 0;
  touchBreath = false;
  rafId = 0;

  private constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.darkCanvas = document.createElement('canvas');
    this.darkCtx = this.darkCanvas.getContext('2d')!;
    this.isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    this.resize();
    this.setupInput();
  }

  static init(canvas: HTMLCanvasElement): GameEngine {
    if (GameEngine.instance) {
      GameEngine.instance.destroy();
    }
    const engine = new GameEngine(canvas);
    GameEngine.instance = engine;
    engine.startLevel(1);
    engine.start();
    return engine;
  }

  destroy() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('resize', this.onResize);
    GameEngine.instance = null;
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.darkCanvas.width = w * dpr;
    this.darkCanvas.height = h * dpr;
  }

  startLevel(level: number) {
    this.level = level;
    this.cave = generateCave(MAP_W, MAP_H, level);
    const prevTalents = this.dragon ? { ...this.dragon.talents } : {};
    const prevScales = this.dragon ? this.dragon.scales : 0;
    const prevMaxHp = this.dragon ? this.dragon.maxHealth : 5;
    this.dragon = createDragon(this.cave.startTileX, this.cave.startTileY, prevTalents, prevScales, prevMaxHp);
    this.lavaDmgTimer = 0;
    this.animTime = 0;
    syncStore(this);
  }

  setupInput() {
    this.onKeyDown = (e: KeyboardEvent) => {
      this.keys.add(e.key.toLowerCase());
      if (e.key === ' ' || e.key === 'Space') {
        e.preventDefault();
        if (this.dragon && !isBreathOnCooldown(this.dragon)) {
          startBreath(this.dragon);
        }
      }
    };
    this.onKeyUp = (e: KeyboardEvent) => {
      this.keys.delete(e.key.toLowerCase());
    };
    this.onResize = () => {
      this.resize();
    };
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('resize', this.onResize);
  }

  private onKeyDown: (e: KeyboardEvent) => void = () => {};
  private onKeyUp: (e: KeyboardEvent) => void = () => {};
  private onResize: () => void = () => {};

  setTouchInput(dx: number, dy: number, breath: boolean) {
    this.touchDx = dx;
    this.touchDy = dy;
    this.touchBreath = breath;
  }

  start() {
    this.running = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  loop = (now: number) => {
    if (!this.running) return;
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;
    this.animTime += dt;

    if (this.dragon && this.cave) {
      if (useGameStore.getState().talentPanelOpen || this.dragon.health <= 0) {
        // pause
      } else {
        this.update(dt);
      }
    }

    this.render();
    syncStore(this);
    this.rafId = requestAnimationFrame(this.loop);
  };

  update(dt: number) {
    const d = this.dragon!;
    const c = this.cave!;

    if (this.isMobile && (this.touchDx !== 0 || this.touchDy !== 0)) {
      this.keys.clear();
      if (this.touchDx < -0.3) this.keys.add('a');
      if (this.touchDx > 0.3) this.keys.add('d');
      if (this.touchDy < -0.3) this.keys.add('w');
      if (this.touchDy > 0.3) this.keys.add('s');
    }

    if (this.touchBreath && !isBreathOnCooldown(d)) {
      startBreath(d);
    }

    updateDragon(d, this.keys, dt);

    const tileX = Math.floor(d.x / TILE);
    const tileY = Math.floor(d.y / TILE);

    if (tileX < 1 || tileX >= c.width - 1 || tileY < 1 || tileY >= c.height - 1 || c.tiles[tileY]?.[tileX] === 0) {
      d.x -= d.vx * dt * 60;
      d.y -= d.vy * dt * 60;
      d.vx *= -0.3;
      d.vy *= -0.3;
    }

    if (tileX >= 0 && tileX < c.width && tileY >= 0 && tileY < c.height) {
      if (c.tiles[tileY][tileX] === 2) {
        this.lavaDmgTimer += dt;
        if (this.lavaDmgTimer >= LAVA_DAMAGE_INTERVAL) {
          this.lavaDmgTimer = 0;
          damageDragon(d, 1);
        }
      } else {
        this.lavaDmgTimer = 0;
      }
    }

    for (const torch of c.torches) {
      if (canLightTorch(d, torch)) {
        torch.lit = true;
      }
      spawnTorchParticles(torch, dt);
    }

    for (const scale of c.scales) {
      if (scale.collected) continue;
      const sx = scale.tileX * TILE + TILE / 2;
      const sy = scale.tileY * TILE + TILE / 2;
      const sdx = d.x - sx;
      const sdy = d.y - sy;
      if (Math.sqrt(sdx * sdx + sdy * sdy) < TILE * 0.7) {
        scale.collected = true;
        d.scales += 1;
      }
    }

    updateMonsters(c, d.x, d.y, dt);

    for (const m of c.monsters) {
      if (!m.active || m.hitCooldown > 0) continue;
      const mdx = d.x - m.x;
      const mdy = d.y - m.y;
      if (Math.sqrt(mdx * mdx + mdy * mdy) < 18) {
        if (damageDragon(d, 1)) {
          m.hitCooldown = 1.0;
        }
      }
    }

    spawnLavaParticles(c, dt);

    const lightR = getLightRadius(d.talents);
    revealExplored(c, d.x, d.y, lightR);

    if (tileX === c.exitTileX && tileY === c.exitTileY) {
      this.startLevel(this.level + 1);
    }
  }

  render() {
    const ctx = this.ctx;
    const d = this.dragon;
    const c = this.cave;
    if (!d || !c) return;

    const w = window.innerWidth;
    const h = window.innerHeight;

    const targetCx = d.x - w / 2;
    const targetCy = d.y - h / 2;
    this.cameraX += (targetCx - this.cameraX) * 0.1;
    this.cameraY += (targetCy - this.cameraY) * 0.1;

    const camX = this.cameraX;
    const camY = this.cameraY;

    ctx.clearRect(0, 0, w, h);

    const startCol = Math.max(0, Math.floor(camX / TILE) - 1);
    const endCol = Math.min(c.width, Math.ceil((camX + w) / TILE) + 1);
    const startRow = Math.max(0, Math.floor(camY / TILE) - 1);
    const endRow = Math.min(c.height, Math.ceil((camY + h) / TILE) + 1);

    const lightR = getLightRadius(d.talents);

    for (let row = startRow; row < endRow; row++) {
      for (let col = startCol; col < endCol; col++) {
        const tile = c.tiles[row]?.[col];
        if (tile === undefined) continue;
        const sx = col * TILE - camX;
        const sy = row * TILE - camY;

        if (tile === 0) {
          ctx.fillStyle = '#2a0a0a';
          ctx.fillRect(sx, sy, TILE, TILE);
          ctx.fillStyle = '#1a0505';
          ctx.fillRect(sx + 1, sy + 1, TILE - 2, TILE - 2);
        } else if (tile === 1) {
          ctx.fillStyle = '#3d1515';
          ctx.fillRect(sx, sy, TILE, TILE);
          ctx.strokeStyle = '#4a1a1a';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(sx, sy, TILE, TILE);
        } else if (tile === 2) {
          const phase = Math.sin(this.animTime * 2 + col * 0.5 + row * 0.3);
          const r = Math.floor(200 + phase * 55);
          const g = Math.floor(60 + phase * 30);
          ctx.fillStyle = `rgb(${r},${g},0)`;
          ctx.fillRect(sx, sy, TILE, TILE);
          const bubbleX = sx + (Math.sin(this.animTime * 3 + col) * 0.5 + 0.5) * TILE * 0.6 + TILE * 0.2;
          const bubbleY = sy + (Math.cos(this.animTime * 2.5 + row) * 0.5 + 0.5) * TILE * 0.6 + TILE * 0.2;
          ctx.beginPath();
          ctx.arc(bubbleX, bubbleY, 2, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,200,50,0.6)';
          ctx.fill();
        }
      }
    }

    for (const scale of c.scales) {
      if (scale.collected) continue;
      const sx = scale.tileX * TILE + TILE / 2 - camX;
      const sy = scale.tileY * TILE + TILE / 2 - camY + Math.sin(this.animTime * 3 + scale.bobPhase) * 3;
      ctx.save();
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(sx, sy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    const exSx = c.exitTileX * TILE - camX;
    const exSy = c.exitTileY * TILE - camY;
    ctx.save();
    ctx.shadowColor = '#00ffcc';
    ctx.shadowBlur = 15 + Math.sin(this.animTime * 4) * 5;
    ctx.strokeStyle = '#00ffcc';
    ctx.lineWidth = 2;
    ctx.strokeRect(exSx + 4, exSy + 4, TILE - 8, TILE - 8);
    ctx.fillStyle = 'rgba(0,255,200,0.15)';
    ctx.fillRect(exSx + 4, exSy + 4, TILE - 8, TILE - 8);
    ctx.restore();

    for (const torch of c.torches) {
      const tx = torch.tileX * TILE + TILE / 2 - camX;
      const ty = torch.tileY * TILE + TILE / 2 - camY;

      ctx.fillStyle = '#5a3a1a';
      ctx.fillRect(tx - 2, ty - 4, 4, 12);

      if (torch.lit) {
        ctx.save();
        ctx.shadowColor = '#FF6B00';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#FF6B00';
        ctx.beginPath();
        ctx.arc(tx, ty - 6, 5 + Math.sin(this.animTime * 10) * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        ctx.fillStyle = '#666';
        ctx.beginPath();
        ctx.arc(tx, ty - 4, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const p of torch.particles) {
        const alpha = p.life / p.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = `rgb(${p.r},${p.g},${p.b})`;
        ctx.beginPath();
        ctx.arc(p.x - camX, p.y - camY, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    for (const p of c.lavaParticles) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = `rgb(${p.r},${p.g},${p.b})`;
      ctx.beginPath();
      ctx.arc(p.x - camX, p.y - camY, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (const m of c.monsters) {
      if (!m.active) continue;
      for (const t of m.trail) {
        if (t.alpha < 0.05) continue;
        ctx.globalAlpha = t.alpha * 0.4;
        ctx.fillStyle = '#2a0030';
        ctx.beginPath();
        ctx.arc(t.x - camX, t.y - camY, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      const mx = m.x - camX;
      const my = m.y - camY;
      const wingPhase = Math.sin(this.animTime * 12) * 0.4;

      ctx.save();
      ctx.fillStyle = '#1a0025';
      ctx.beginPath();
      ctx.ellipse(mx, my, 8, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#2a0040';
      ctx.beginPath();
      ctx.ellipse(mx - 7, my - 3, 6, 3, -0.5 + wingPhase, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(mx + 7, my - 3, 6, 3, 0.5 - wingPhase, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ff0040';
      ctx.beginPath();
      ctx.arc(mx - 2, my - 1, 1.2, 0, Math.PI * 2);
      ctx.arc(mx + 2, my - 1, 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    const dx = d.x - camX;
    const dy = d.y - camY;
    const glowIntensity = 0.5 + Math.sin(d.bodyGlowPhase) * 0.15;

    ctx.save();
    ctx.shadowColor = `rgba(255,180,50,${glowIntensity})`;
    ctx.shadowBlur = 20;
    ctx.fillStyle = `rgba(255,200,80,${0.3 + glowIntensity * 0.2})`;
    ctx.beginPath();
    ctx.arc(dx, dy, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ffe4a0';
    ctx.beginPath();
    ctx.ellipse(dx, dy, 10, 7, d.angle, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,220,130,0.6)';
    ctx.beginPath();
    ctx.ellipse(dx - Math.cos(d.angle) * 8, dy - Math.sin(d.angle) * 8, 6, 4, d.angle, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff8e0';
    ctx.beginPath();
    ctx.arc(dx + Math.cos(d.angle) * 5, dy + Math.sin(d.angle) * 5, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (d.invincibleTimer > 0 && Math.sin(d.invincibleTimer * 30) > 0) {
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#ff4040';
      ctx.beginPath();
      ctx.arc(dx, dy, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const p of d.breathParticles) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = `rgb(${p.r},${p.g},${p.b})`;
      ctx.beginPath();
      ctx.arc(p.x - camX, p.y - camY, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    this.renderDarkness(ctx, c, d, camX, camY, w, h, lightR);
  }

  renderDarkness(ctx: CanvasRenderingContext2D, cave: CaveMap, dragon: DragonState, camX: number, camY: number, w: number, h: number, lightR: number) {
    const dpr = window.devicePixelRatio || 1;
    const dc = this.darkCtx;
    this.darkCanvas.width = w * dpr;
    this.darkCanvas.height = h * dpr;
    dc.setTransform(dpr, 0, 0, dpr, 0, 0);

    dc.fillStyle = 'rgba(0,0,0,0.92)';
    dc.fillRect(0, 0, w, h);

    dc.globalCompositeOperation = 'destination-out';

    const dx = dragon.x - camX;
    const dy = dragon.y - camY;
    const glowPulse = 1 + Math.sin(dragon.bodyGlowPhase) * 0.08;
    const r = lightR * TILE * glowPulse;
    const dragonGrad = dc.createRadialGradient(dx, dy, 0, dx, dy, r);
    dragonGrad.addColorStop(0, 'rgba(0,0,0,1)');
    dragonGrad.addColorStop(0.5, 'rgba(0,0,0,0.8)');
    dragonGrad.addColorStop(1, 'rgba(0,0,0,0)');
    dc.fillStyle = dragonGrad;
    dc.fillRect(dx - r, dy - r, r * 2, r * 2);

    if (dragon.breathActive) {
      const breathR = getBreathRadius(dragon) * TILE;
      const bAngle = dragon.angle;
      const bx = dx + Math.cos(bAngle) * breathR * 0.4;
      const by = dy + Math.sin(bAngle) * breathR * 0.4;
      const breathGrad = dc.createRadialGradient(bx, by, 0, bx, by, breathR * 0.6);
      breathGrad.addColorStop(0, 'rgba(0,0,0,0.7)');
      breathGrad.addColorStop(1, 'rgba(0,0,0,0)');
      dc.fillStyle = breathGrad;
      dc.fillRect(bx - breathR, by - breathR, breathR * 2, breathR * 2);
    }

    for (const torch of cave.torches) {
      if (!torch.lit) continue;
      const tx = torch.tileX * TILE + TILE / 2 - camX;
      const ty = torch.tileY * TILE + TILE / 2 - camY;
      const tr = torch.lightRadius * TILE;
      const tGrad = dc.createRadialGradient(tx, ty, 0, tx, ty, tr);
      tGrad.addColorStop(0, 'rgba(0,0,0,1)');
      tGrad.addColorStop(0.4, 'rgba(0,0,0,0.9)');
      tGrad.addColorStop(1, 'rgba(0,0,0,0)');
      dc.fillStyle = tGrad;
      dc.fillRect(tx - tr, ty - tr, tr * 2, tr * 2);
    }

    const exX = cave.exitTileX * TILE + TILE / 2 - camX;
    const exY = cave.exitTileY * TILE + TILE / 2 - camY;
    const exGrad = dc.createRadialGradient(exX, exY, 0, exX, exY, TILE * 2);
    exGrad.addColorStop(0, 'rgba(0,0,0,0.6)');
    exGrad.addColorStop(1, 'rgba(0,0,0,0)');
    dc.fillStyle = exGrad;
    dc.fillRect(exX - TILE * 2, exY - TILE * 2, TILE * 4, TILE * 4);

    dc.globalCompositeOperation = 'source-over';

    ctx.drawImage(this.darkCanvas, 0, 0, w * dpr, h * dpr, 0, 0, w, h);
  }

  restart() {
    this.startLevel(1);
  }
}

function getBreathRadius(dragon: DragonState): number {
  const range = 4.5 * (1 + 0.25 * (dragon.talents.dragonBreath || 0));
  return range;
}
