import { Block, MaterialType, MATERIAL_CONFIGS } from './material';
import {
  Particle,
  createFireParticle,
  createSteamParticle,
  createDebrisParticle,
  createShockwave,
  checkParticleBlockCollision
} from './particle';

const BLOCK_SIZE = 20;
const MAX_PARTICLES = 3000;
const MIN_WIDTH = 800;
const MIN_HEIGHT = 600;

class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  blocks: Map<string, Block> = new Map();
  particles: Particle[] = [];
  selectedMaterial: MaterialType = 'wood';
  isPaused: boolean = false;
  isMouseDown: boolean = false;
  mouseButton: number = 0;
  mouseX: number = 0;
  mouseY: number = 0;
  lastFrameTime: number = 0;
  fps: number = 0;
  fpsFrames: number = 0;
  fpsLastUpdate: number = 0;
  running: boolean = true;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.resizeCanvas();
    this.setupEventListeners();
    this.lastFrameTime = performance.now();
    this.fpsLastUpdate = performance.now();
    this.gameLoop();
  }

  resizeCanvas(): void {
    const w = Math.max(MIN_WIDTH, window.innerWidth);
    const h = Math.max(MIN_HEIGHT, window.innerHeight);
    this.canvas.width = w;
    this.canvas.height = h;
  }

  setupEventListeners(): void {
    window.addEventListener('resize', () => this.resizeCanvas());

    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    this.canvas.addEventListener('mousedown', (e) => {
      this.isMouseDown = true;
      this.mouseButton = e.button;
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      this.handleMouseAction();
    });

    this.canvas.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      if (this.isMouseDown) {
        this.handleMouseAction();
      }
    });

    this.canvas.addEventListener('mouseup', () => {
      this.isMouseDown = false;
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.isMouseDown = false;
    });

    document.querySelectorAll('.material-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        const material = target.dataset.material as MaterialType;
        if (material) {
          this.selectedMaterial = material;
          document.querySelectorAll('.material-btn').forEach((b) => {
            b.classList.remove('active');
          });
          target.classList.add('active');
        }
      });
    });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        this.isPaused = !this.isPaused;
      } else if (e.code === 'KeyR') {
        this.reset();
      }
    });
  }

  handleMouseAction(): void {
    if (this.mouseButton === 0) {
      this.placeBlock(this.mouseX, this.mouseY);
    } else if (this.mouseButton === 2) {
      this.spawnFire(this.mouseX, this.mouseY);
    }
  }

  getGridKey(x: number, y: number): string {
    const gx = Math.floor(x / BLOCK_SIZE);
    const gy = Math.floor(y / BLOCK_SIZE);
    return `${gx},${gy}`;
  }

  placeBlock(mx: number, my: number): void {
    const gx = Math.floor(mx / BLOCK_SIZE);
    const gy = Math.floor(my / BLOCK_SIZE);
    const key = `${gx},${gy}`;

    if (this.blocks.has(key)) return;

    const block = new Block(gx * BLOCK_SIZE, gy * BLOCK_SIZE, BLOCK_SIZE, this.selectedMaterial);
    this.blocks.set(key, block);
  }

  spawnFire(mx: number, my: number): void {
    for (let i = 0; i < 5; i++) {
      const offsetX = (Math.random() - 0.5) * 10;
      const offsetY = (Math.random() - 0.5) * 10;
      this.addParticle(createFireParticle(mx + offsetX, my + offsetY));
    }
  }

  addParticle(particle: Particle): void {
    this.particles.push(particle);
    if (this.particles.length > MAX_PARTICLES) {
      this.particles.sort((a, b) => a.life - b.life);
      this.particles.splice(0, this.particles.length - MAX_PARTICLES);
    }
  }

  reset(): void {
    this.blocks.clear();
    this.particles = [];
  }

  explode(block: Block): void {
    if (block.hasExploded) return;
    block.hasExploded = true;

    const cx = block.x + block.size / 2;
    const cy = block.y + block.size / 2;

    const debrisCount = 10 + Math.floor(Math.random() * 11);
    for (let i = 0; i < debrisCount; i++) {
      this.addParticle(createDebrisParticle(cx, cy));
    }

    this.addParticle(createShockwave(cx, cy));
  }

  spreadFireToNeighbors(block: Block): void {
    const gx = Math.floor(block.x / BLOCK_SIZE);
    const gy = Math.floor(block.y / BLOCK_SIZE);

    const directions = [
      [-1, -1], [0, -1], [1, -1],
      [-1, 0],           [1, 0],
      [-1, 1],  [0, 1],  [1, 1]
    ];

    for (const [dx, dy] of directions) {
      const key = `${gx + dx},${gy + dy}`;
      const neighbor = this.blocks.get(key);
      if (!neighbor || neighbor.isBurnt()) continue;
      if (neighbor.config.flammability <= 0) continue;

      const chance = 0.02 * neighbor.config.flammability * block.config.burnSpeed;
      if (Math.random() < chance) {
        neighbor.ignite();
      }
    }
  }

  updateBlocks(): void {
    const toRemove: string[] = [];

    for (const [key, block] of this.blocks) {
      if (block.isBurnt()) continue;

      if (block.isBurning) {
        const finished = block.update();
        this.spreadFireToNeighbors(block);

        if (block.type === 'wood' || block.type === 'oil') {
          if (Math.random() < 0.3) {
            const px = block.x + Math.random() * block.size;
            const py = block.y + Math.random() * block.size;
            this.addParticle(createFireParticle(px, py));
          }
        }

        if (finished) {
          if (block.type === 'oil' && !block.hasExploded) {
            this.explode(block);
          }
        }
      }
    }
  }

  updateParticles(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.update();

      if (!p.alive) {
        this.particles.splice(i, 1);
        continue;
      }

      if (p.x < -50 || p.x > this.canvas.width + 50 || p.y < -50 || p.y > this.canvas.height + 50) {
        this.particles.splice(i, 1);
        continue;
      }

      if (p.type === 'fire') {
        const hitBlock = checkParticleBlockCollision(p, this.blocks, BLOCK_SIZE);
        if (hitBlock) {
          if (hitBlock.type === 'water') {
            p.alive = false;
            for (let j = 0; j < 3; j++) {
              this.addParticle(createSteamParticle(p.x, p.y));
            }
          } else if (hitBlock.type === 'stone') {
            const bx = hitBlock.x + hitBlock.size / 2;
            const by = hitBlock.y + hitBlock.size / 2;
            const dx = p.x - bx;
            const dy = p.y - by;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            p.vx = (dx / len) * 1.5 + (Math.random() - 0.5);
            p.vy = (dy / len) * 1.5 + (Math.random() - 0.5);
            p.x += p.vx * 2;
            p.y += p.vy * 2;
          } else if (hitBlock.config.flammability > 0 && !hitBlock.isBurnt()) {
            const chance = 0.05 * hitBlock.config.flammability;
            if (Math.random() < chance) {
              hitBlock.ignite();
            }
            p.alive = false;
          }
        }
      } else if (p.type === 'debris') {
        const hitBlock = checkParticleBlockCollision(p, this.blocks, BLOCK_SIZE);
        if (hitBlock && hitBlock.config.flammability > 0 && !hitBlock.isBurnt()) {
          hitBlock.ignite();
          p.alive = false;
        }
      }
    }
  }

  draw(): void {
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    this.ctx.lineWidth = 1;
    for (let x = 0; x < this.canvas.width; x += BLOCK_SIZE) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }
    for (let y = 0; y < this.canvas.height; y += BLOCK_SIZE) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }

    for (const block of this.blocks.values()) {
      block.draw(this.ctx);
    }

    for (const p of this.particles) {
      p.draw(this.ctx);
    }

    if (this.isPaused) {
      this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.fillStyle = 'white';
      this.ctx.font = 'bold 36px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('已暂停', this.canvas.width / 2, this.canvas.height / 2);
      this.ctx.font = '14px monospace';
      this.ctx.fillText('按空格键继续', this.canvas.width / 2, this.canvas.height / 2 + 30);
    }
  }

  updateFPS(now: number): void {
    this.fpsFrames++;
    if (now - this.fpsLastUpdate >= 500) {
      const elapsed = (now - this.fpsLastUpdate) / 1000;
      this.fps = Math.round(this.fpsFrames / elapsed);
      this.fpsFrames = 0;
      this.fpsLastUpdate = now;

      const fpsEl = document.getElementById('fpsDisplay');
      const particleEl = document.getElementById('particleDisplay');
      if (fpsEl) fpsEl.textContent = `FPS: ${this.fps}`;
      if (particleEl) particleEl.textContent = `粒子数：${this.particles.length}`;
    }
  }

  gameLoop(): void {
    if (!this.running) return;

    const now = performance.now();
    this.updateFPS(now);

    if (!this.isPaused) {
      this.updateBlocks();
      this.updateParticles();
    }

    this.draw();

    requestAnimationFrame(() => this.gameLoop());
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
