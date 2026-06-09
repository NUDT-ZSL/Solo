import './style.css';
import { Particle, getRandomColorFromPalette } from './particles';
import { TimeManager, TimeData, DisplayMode } from './timeManager';
import { generateParticlePositions, MATRIX_ROWS, MATRIX_COLS } from './digitPattern';

type TransitionPhase = 'idle' | 'scattering' | 'blank' | 'gathering';
type ModeChangePhase = 'idle' | 'scatteringAll' | 'blank' | 'gatheringNew';

interface DigitParticleGroup {
  char: string;
  particles: Particle[];
}

class ParticleClockApp {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr: number = 1;
  private width: number = 0;
  private height: number = 0;

  private timeManager: TimeManager;
  private particles: Particle[] = [];
  private digitGroups: DigitParticleGroup[] = [];
  private currentDigits: string[] = [];

  private lastTime: number = 0;
  private rafId: number = 0;
  private running: boolean = false;

  private mouseX: number | null = null;
  private mouseY: number | null = null;

  private sizeScale: number = 5;
  private paletteIndex: number = 0;
  private cellSize: number = 0;
  private digitSpacing: number = 0;

  private transitionPhase: TransitionPhase = 'idle';
  private transitionTimer: number = 0;
  private changedIndices: Set<number> = new Set();

  private modeChangePhase: ModeChangePhase = 'idle';
  private modeChangeTimer: number = 0;
  private pendingMode: DisplayMode | null = null;

  private readonly SCATTER_DURATION = 500;
  private readonly GATHER_DURATION = 800;
  private readonly BLANK_DURATION = 500;
  private readonly MODE_SCATTER_DURATION = 1500;
  private readonly MAX_PARTICLES = 2000;

  constructor() {
    this.canvas = document.getElementById('clockCanvas') as HTMLCanvasElement;
    const context = this.canvas.getContext('2d');
    if (!context) throw new Error('无法获取Canvas 2D上下文');
    this.ctx = context;

    this.timeManager = new TimeManager();

    this.initCanvas();
    this.initControls();
    this.initParticles();
  }

  private initCanvas(): void {
    this.resize();
    window.addEventListener('resize', () => this.resize());

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.mouseX = null;
      this.mouseY = null;
    });

    this.canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouseX = e.touches[0].clientX - rect.left;
        this.mouseY = e.touches[0].clientY - rect.top;
      }
    });

    this.canvas.addEventListener('touchend', () => {
      this.mouseX = null;
      this.mouseY = null;
    });
  }

  private resize(): void {
    this.dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;

    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);

    this.recalculateLayout();

    if (this.particles.length > 0) {
      this.rebuildParticles();
    }
  }

  private recalculateLayout(): void {
    const maxWidth = this.width * 0.85;
    const maxHeight = this.height * 0.6;
    const numDigits = 8;
    const gapRatio = 0.3;

    const cellWidth = maxWidth / (numDigits * MATRIX_COLS + (numDigits - 1) * gapRatio * MATRIX_COLS);
    const cellHeight = maxHeight / MATRIX_ROWS;

    this.cellSize = Math.min(cellWidth, cellHeight);
    this.digitSpacing = this.cellSize * MATRIX_COLS * (1 + gapRatio);
  }

  private initControls(): void {
    const sizeSlider = document.getElementById('sizeSlider') as HTMLInputElement;
    const sizeValue = document.getElementById('sizeValue') as HTMLSpanElement;
    const colorSelect = document.getElementById('colorSelect') as HTMLSelectElement;
    const modeToggle = document.getElementById('modeToggle') as HTMLButtonElement;

    sizeSlider.addEventListener('input', () => {
      this.sizeScale = parseFloat(sizeSlider.value);
      sizeValue.textContent = this.sizeScale.toFixed(1);
      this.applySizeScale();
    });

    colorSelect.addEventListener('change', () => {
      this.paletteIndex = parseInt(colorSelect.value, 10);
      this.applyPaletteChange();
    });

    modeToggle.addEventListener('click', () => {
      this.toggleMode();
    });
  }

  private initParticles(): void {
    const timeData = this.timeManager.getCurrentTime();
    this.currentDigits = [...timeData.digits];
    this.buildDigitParticles(this.currentDigits);
    this.applySizeScale();
  }

  private buildDigitParticles(digits: string[]): void {
    this.particles = [];
    this.digitGroups = [];

    const totalWidth = digits.length * this.digitSpacing - (this.digitSpacing - this.cellSize * MATRIX_COLS);
    const startX = (this.width - totalWidth) / 2;
    const startY = (this.height - MATRIX_ROWS * this.cellSize) / 2;

    let totalCount = 0;

    for (let i = 0; i < digits.length; i++) {
      const char = digits[i];
      const baseX = startX + i * this.digitSpacing;
      const positions = generateParticlePositions(char, baseX, startY, this.cellSize, 2);
      const group: DigitParticleGroup = { char, particles: [] };

      for (const pos of positions) {
        if (totalCount >= this.MAX_PARTICLES) break;
        const particle = new Particle(
          pos.x,
          pos.y,
          getRandomColorFromPalette(this.paletteIndex)
        );
        group.particles.push(particle);
        this.particles.push(particle);
        totalCount++;
      }

      this.digitGroups.push(group);
    }
  }

  private rebuildParticles(): void {
    const timeData = this.timeManager.getCurrentTime();
    this.currentDigits = [...timeData.digits];
    this.buildDigitParticles(this.currentDigits);
    this.applySizeScale();
  }

  private applySizeScale(): void {
    const normalizedScale = this.sizeScale / 5;
    for (const p of this.particles) {
      p.setSizeScale(normalizedScale);
    }
  }

  private applyPaletteChange(): void {
    for (const p of this.particles) {
      p.setTargetColor(getRandomColorFromPalette(this.paletteIndex));
    }
  }

  public toggleMode(): void {
    if (this.modeChangePhase !== 'idle') return;
    if (this.transitionPhase !== 'idle') return;

    const newMode = this.timeManager.getMode() === 'clock' ? 'hourglass' : 'clock';
    this.pendingMode = newMode;

    for (const p of this.particles) {
      p.startScatter(this.width, this.height, this.MODE_SCATTER_DURATION);
    }

    this.modeChangePhase = 'scatteringAll';
    this.modeChangeTimer = 0;

    const btn = document.getElementById('modeToggle') as HTMLButtonElement;
    btn.textContent = newMode === 'clock' ? '切换沙漏模式' : '切换时钟模式';
  }

  private updateModeTransition(deltaTime: number): void {
    switch (this.modeChangePhase) {
      case 'scatteringAll':
        this.modeChangeTimer += deltaTime;
        if (this.modeChangeTimer >= this.MODE_SCATTER_DURATION) {
          this.modeChangePhase = 'blank';
          this.modeChangeTimer = 0;
          this.particles = [];
          this.digitGroups = [];
        }
        break;

      case 'blank':
        this.modeChangeTimer += deltaTime;
        if (this.modeChangeTimer >= this.BLANK_DURATION) {
          if (this.pendingMode !== null) {
            this.timeManager.setMode(this.pendingMode);
            this.pendingMode = null;
          }
          const timeData = this.timeManager.getCurrentTime();
          this.currentDigits = [...timeData.digits];
          this.buildDigitParticles(this.currentDigits);
          this.applySizeScale();

          for (const p of this.particles) {
            p.scatterStartX = Math.random() * this.width;
            p.scatterStartY = Math.random() * this.height;
            p.x = p.scatterStartX;
            p.y = p.scatterStartY;
            p.scatterTargetX = p.scatterStartX;
            p.scatterTargetY = p.scatterStartY;
            p.prepareGatherFromCurrent();
            p.transitionDuration = this.GATHER_DURATION;
          }

          this.modeChangePhase = 'gatheringNew';
          this.modeChangeTimer = 0;
        }
        break;

      case 'gatheringNew':
        this.modeChangeTimer += deltaTime;
        if (this.modeChangeTimer >= this.GATHER_DURATION) {
          this.modeChangePhase = 'idle';
          this.modeChangeTimer = 0;
        }
        break;
    }
  }

  private checkTimeChange(timeData: TimeData): void {
    if (this.transitionPhase !== 'idle') return;
    if (this.modeChangePhase !== 'idle') return;

    const newDigits = timeData.digits;
    if (newDigits.length !== this.currentDigits.length) {
      this.currentDigits = [...newDigits];
      this.rebuildParticles();
      return;
    }

    const changed = new Set<number>();
    for (let i = 0; i < newDigits.length; i++) {
      if (newDigits[i] !== this.currentDigits[i]) {
        changed.add(i);
      }
    }

    if (changed.size === 0) return;

    this.currentDigits = [...newDigits];
    this.changedIndices = changed;

    for (const idx of changed) {
      const group = this.digitGroups[idx];
      if (group) {
        for (const p of group.particles) {
          p.startScatter(this.width, this.height, this.SCATTER_DURATION);
        }
      }
    }

    this.transitionPhase = 'scattering';
    this.transitionTimer = 0;
  }

  private updateDigitTransition(deltaTime: number): void {
    switch (this.transitionPhase) {
      case 'scattering':
        this.transitionTimer += deltaTime;
        if (this.transitionTimer >= this.SCATTER_DURATION) {
          const totalWidth = this.currentDigits.length * this.digitSpacing - (this.digitSpacing - this.cellSize * MATRIX_COLS);
          const startX = (this.width - totalWidth) / 2;
          const startY = (this.height - MATRIX_ROWS * this.cellSize) / 2;

          for (const idx of this.changedIndices) {
            const oldGroup = this.digitGroups[idx];
            const char = this.currentDigits[idx];
            const baseX = startX + idx * this.digitSpacing;
            const positions = generateParticlePositions(char, baseX, startY, this.cellSize, 2);

            if (oldGroup) {
              const reuseCount = Math.min(oldGroup.particles.length, positions.length);
              for (let i = 0; i < reuseCount; i++) {
                const p = oldGroup.particles[i];
                const pos = positions[i];
                p.setTarget(pos.x, pos.y, this.GATHER_DURATION);
                p.setTargetColor(getRandomColorFromPalette(this.paletteIndex));
              }

              if (positions.length > oldGroup.particles.length) {
                for (let i = reuseCount; i < positions.length; i++) {
                  if (this.particles.length >= this.MAX_PARTICLES) break;
                  const pos = positions[i];
                  const np = new Particle(
                    Math.random() * this.width,
                    Math.random() * this.height,
                    getRandomColorFromPalette(this.paletteIndex)
                  );
                  np.setTarget(pos.x, pos.y, this.GATHER_DURATION);
                  np.scatterStartX = np.x;
                  np.scatterStartY = np.y;
                  oldGroup.particles.push(np);
                  this.particles.push(np);
                }
              } else if (oldGroup.particles.length > positions.length) {
                const toRemove = oldGroup.particles.splice(positions.length);
                for (const p of toRemove) {
                  const idx = this.particles.indexOf(p);
                  if (idx >= 0) this.particles.splice(idx, 1);
                }
              }

              oldGroup.char = char;
            }
          }

          this.applySizeScale();
          this.transitionPhase = 'gathering';
          this.transitionTimer = 0;
        }
        break;

      case 'gathering':
        this.transitionTimer += deltaTime;
        if (this.transitionTimer >= this.GATHER_DURATION) {
          this.transitionPhase = 'idle';
          this.transitionTimer = 0;
          this.changedIndices.clear();
        }
        break;
    }
  }

  private enforceSpacing(): void {
    const minDist = 2 + (this.sizeScale / 5) * 2;
    const minDistSq = minDist * minDist;

    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const a = this.particles[i];
        const b = this.particles[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distSq = dx * dx + dy * dy;

        if (distSq < minDistSq && distSq > 0) {
          const dist = Math.sqrt(distSq);
          const overlap = (minDist - dist) / 2;
          const nx = dx / dist;
          const ny = dy / dist;

          a.x -= nx * overlap;
          a.y -= ny * overlap;
          b.x += nx * overlap;
          b.y += ny * overlap;
        }
      }
    }
  }

  private update(deltaTime: number): void {
    const timeData = this.timeManager.update(deltaTime);

    if (this.modeChangePhase !== 'idle') {
      this.updateModeTransition(deltaTime);
    } else {
      this.checkTimeChange(timeData);
      if (this.transitionPhase !== 'idle') {
        this.updateDigitTransition(deltaTime);
      }
    }

    for (const p of this.particles) {
      p.update(deltaTime, this.mouseX, this.mouseY, this.width, this.height);
    }

    if (this.modeChangePhase === 'idle' && this.transitionPhase === 'idle') {
      this.enforceSpacing();
    }
  }

  private render(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);

    this.ctx.globalCompositeOperation = 'lighter';
    for (const p of this.particles) {
      p.draw(this.ctx);
    }
    this.ctx.globalCompositeOperation = 'source-over';
  }

  private loop = (timestamp: number): void => {
    if (!this.running) return;

    if (this.lastTime === 0) this.lastTime = timestamp;
    const deltaTime = Math.min(50, timestamp - this.lastTime);
    this.lastTime = timestamp;

    this.update(deltaTime);
    this.render();

    this.rafId = requestAnimationFrame(this.loop);
  };

  public start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = 0;
    this.rafId = requestAnimationFrame(this.loop);
  }

  public stop(): void {
    this.running = false;
    if (this.rafId !== 0) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const app = new ParticleClockApp();
  app.start();
});
