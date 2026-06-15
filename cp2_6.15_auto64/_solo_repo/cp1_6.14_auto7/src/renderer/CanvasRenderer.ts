import {
  GameState,
  CellType,
  MineralType,
  MINERAL_COLORS,
  Particle
} from '../types/gameTypes';

export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private lastFrameTime: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context');
    this.ctx = ctx;
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  render(state: GameState): { frameTime: number } {
    const startTime = performance.now();

    const { grid, explored, submarine, sonar, creatures, particles, screenShake, width, height, cellSize, offsetX, offsetY } = state;

    this.ctx.save();

    let shakeX = 0, shakeY = 0;
    if (screenShake.active) {
      const elapsed = (performance.now() / 1000) - screenShake.startTime;
      if (elapsed < screenShake.duration) {
        const progress = elapsed / screenShake.duration;
        const attenuation = 1 - progress;
        const phase = elapsed * screenShake.frequency * Math.PI * 2;
        shakeX = Math.sin(phase) * screenShake.amplitude * attenuation;
        shakeY = Math.cos(phase) * screenShake.amplitude * attenuation;
      }
    }

    this.ctx.translate(shakeX, shakeY);

    this.drawBackground(width, height);
    this.drawGrid(grid, explored, cellSize, offsetX, offsetY, sonar);
    this.drawMinerals(grid, explored, cellSize, offsetX, offsetY);
    this.drawExit(grid, explored, cellSize, offsetX, offsetY);
    this.drawParticles(particles, cellSize, offsetX, offsetY);
    this.drawSonarRing(sonar, cellSize, offsetX, offsetY);
    this.drawCreatures(creatures, cellSize, offsetX, offsetY, sonar, explored);
    this.drawSubmarine(submarine, cellSize, offsetX, offsetY);
    this.drawDarknessOverlay(explored, submarine, sonar, cellSize, offsetX, offsetY, width, height);

    this.ctx.restore();

    const frameTime = performance.now() - startTime;
    this.lastFrameTime = frameTime;
    return { frameTime };
  }

  private drawBackground(width: number, height: number): void {
    const grad = this.ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#0a0b1a');
    grad.addColorStop(1, '#0f1a0f');
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, width, height);
  }

  private drawGrid(
    grid: { type: CellType; noiseVal: number }[][],
    explored: boolean[][],
    cellSize: number,
    offsetX: number,
    offsetY: number,
    sonar: { active: boolean; currentRadius: number; x: number; y: number; highlightedCells: Set<string>; maxRadius: number }
  ): void {
    const rows = grid.length;
    const cols = grid[0].length;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const cell = grid[y][x];
        const isExplored = explored[y][x];
        const key = `${x},${y}`;
        const isHighlighted = sonar.highlightedCells.has(key);

        if (cell.type === CellType.WALL) {
          if (isExplored || isHighlighted) {
            const px = offsetX + x * cellSize;
            const py = offsetY + y * cellSize;
            this.ctx.fillStyle = '#2a2a3a';
            this.ctx.fillRect(px, py, cellSize, cellSize);
            const alpha = 0.15 + cell.noiseVal * 0.1;
            this.ctx.fillStyle = `rgba(60, 60, 80, ${alpha})`;
            this.ctx.fillRect(px, py, cellSize / 2, cellSize / 2);
            this.ctx.fillStyle = `rgba(30, 30, 40, ${alpha})`;
            this.ctx.fillRect(px + cellSize / 2, py + cellSize / 2, cellSize / 2, cellSize / 2);
            if (isHighlighted && sonar.active) {
              this.ctx.strokeStyle = 'rgba(0, 250, 255, 0.6)';
              this.ctx.lineWidth = 2;
              this.ctx.strokeRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
            }
          }
        } else if (cell.type === CellType.REEF) {
          if (isExplored || isHighlighted) {
            const px = offsetX + x * cellSize;
            const py = offsetY + y * cellSize;
            this.ctx.fillStyle = '#3a2a2a';
            this.ctx.fillRect(px + cellSize * 0.15, py + cellSize * 0.15, cellSize * 0.7, cellSize * 0.7);
            this.ctx.fillStyle = '#4a3535';
            for (let i = 0; i < 4; i++) {
              const rx = px + cellSize * (0.2 + (i % 2) * 0.4);
              const ry = py + cellSize * (0.2 + Math.floor(i / 2) * 0.4);
              this.ctx.beginPath();
              this.ctx.arc(rx, ry, cellSize * 0.12, 0, Math.PI * 2);
              this.ctx.fill();
            }
          }
        }
      }
    }
  }

  private drawMinerals(
    grid: { type: CellType; mineralType?: MineralType }[][],
    explored: boolean[][],
    cellSize: number,
    offsetX: number,
    offsetY: number
  ): void {
    const time = performance.now() / 1000;
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[0].length; x++) {
        if (grid[y][x].type === CellType.MINERAL && (explored[y][x] || this.isNearSubmarine(x, y, grid, explored))) {
          const mineralType = grid[y][x].mineralType!;
          const color = MINERAL_COLORS[mineralType];
          const px = offsetX + x * cellSize + cellSize / 2;
          const py = offsetY + y * cellSize + cellSize / 2;
          const pulse = 0.5 + Math.sin(time * 2 * Math.PI * 0.8) * 0.15;

          const glowRadius = Math.max(cellSize, 15);
          const glow = this.ctx.createRadialGradient(px, py, 0, px, py, glowRadius);
          glow.addColorStop(0, this.hexToRgba(color, pulse));
          glow.addColorStop(0.5, this.hexToRgba(color, pulse * 0.5));
          glow.addColorStop(1, this.hexToRgba(color, 0));
          this.ctx.fillStyle = glow;
          this.ctx.beginPath();
          this.ctx.arc(px, py, glowRadius, 0, Math.PI * 2);
          this.ctx.fill();

          this.ctx.fillStyle = color;
          this.ctx.beginPath();
          const sides = mineralType === MineralType.SPHALERITE ? 4 : (mineralType === MineralType.KYANITE ? 6 : 8);
          const r = cellSize * 0.35;
          for (let i = 0; i < sides; i++) {
            const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
            const vx = px + Math.cos(angle) * r;
            const vy = py + Math.sin(angle) * r;
            if (i === 0) this.ctx.moveTo(vx, vy);
            else this.ctx.lineTo(vx, vy);
          }
          this.ctx.closePath();
          this.ctx.fill();
          this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
          this.ctx.lineWidth = 1;
          this.ctx.stroke();
        }
      }
    }
  }

  private isNearSubmarine(x: number, y: number, _grid: any, _explored: boolean[][]): boolean {
    return false;
  }

  private drawExit(
    grid: { type: CellType }[][],
    explored: boolean[][],
    cellSize: number,
    offsetX: number,
    offsetY: number
  ): void {
    const time = performance.now() / 1000;
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[0].length; x++) {
        if (grid[y][x].type === CellType.EXIT && explored[y][x]) {
          const px = offsetX + x * cellSize;
          const py = offsetY + y * cellSize;
          const pulse = 0.6 + Math.sin(time * Math.PI * 2) * 0.3;

          const glow = this.ctx.createRadialGradient(
            px + cellSize / 2, py + cellSize / 2, 0,
            px + cellSize / 2, py + cellSize / 2, cellSize * 1.2
          );
          glow.addColorStop(0, `rgba(250, 204, 21, ${pulse})`);
          glow.addColorStop(1, 'rgba(250, 204, 21, 0)');
          this.ctx.fillStyle = glow;
          this.ctx.fillRect(px - cellSize, py - cellSize, cellSize * 3, cellSize * 3);

          this.ctx.fillStyle = `rgba(250, 204, 21, ${pulse})`;
          this.ctx.fillRect(px + cellSize * 0.1, py + cellSize * 0.1, cellSize * 0.8, cellSize * 0.8);

          this.ctx.fillStyle = '#0a0b1a';
          this.ctx.font = `bold ${cellSize * 0.6}px sans-serif`;
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          this.ctx.fillText('↑', px + cellSize / 2, py + cellSize / 2);
        }
      }
    }
  }

  private drawSonarRing(
    sonar: { active: boolean; currentRadius: number; x: number; y: number; startTime: number; duration: number; maxRadius: number },
    cellSize: number,
    offsetX: number,
    offsetY: number
  ): void {
    if (!sonar.active) return;

    const progress = sonar.currentRadius / sonar.maxRadius;
    const opacity = 0.8 * (1 - progress);

    const px = offsetX + sonar.x * cellSize;
    const py = offsetY + sonar.y * cellSize;
    const ringRadius = sonar.currentRadius * cellSize;
    const ringWidth = cellSize * 0.5;

    this.ctx.save();
    const ringGrad = this.ctx.createRadialGradient(px, py, ringRadius - ringWidth, px, py, ringRadius);
    ringGrad.addColorStop(0, `rgba(0, 250, 255, 0)`);
    ringGrad.addColorStop(0.5, `rgba(0, 250, 255, ${opacity})`);
    ringGrad.addColorStop(1, `rgba(0, 250, 255, 0)`);
    this.ctx.fillStyle = ringGrad;
    this.ctx.beginPath();
    this.ctx.arc(px, py, ringRadius, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.strokeStyle = `rgba(0, 250, 255, ${opacity})`;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(px, py, ringRadius, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.restore();
  }

  private drawParticles(
    particles: Particle[],
    cellSize: number,
    offsetX: number,
    offsetY: number
  ): void {
    for (const p of particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      const px = offsetX + p.x * cellSize;
      const py = offsetY + p.y * cellSize;

      if (p.type === 'sonar') {
        this.ctx.fillStyle = this.hexToRgba(p.color, alpha * 0.7);
        this.ctx.beginPath();
        this.ctx.arc(px, py, p.size, 0, Math.PI * 2);
        this.ctx.fill();
      } else if (p.type === 'wake') {
        this.ctx.fillStyle = `rgba(120, 180, 255, ${alpha * 0.4})`;
        this.ctx.beginPath();
        this.ctx.arc(px, py, p.size, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
  }

  private drawCreatures(
    creatures: { id: string; x: number; y: number; type: 'jellyfish' | 'shark'; stunned: number }[],
    cellSize: number,
    offsetX: number,
    offsetY: number,
    sonar: { highlightedCells: Set<string> },
    explored: boolean[][]
  ): void {
    const time = performance.now() / 1000;

    for (const c of creatures) {
      const cx = Math.floor(c.x);
      const cy = Math.floor(c.y);
      const visible = (explored[cy]?.[cx]) || sonar.highlightedCells.has(`${cx},${cy}`);

      if (!visible && c.stunned <= 0) continue;

      const px = offsetX + c.x * cellSize;
      const py = offsetY + c.y * cellSize;
      const size = cellSize * 1.2;

      if (c.stunned > 0) {
        this.ctx.save();
        this.ctx.globalAlpha = 0.3 + 0.3 * Math.sin(time * 10);
      }

      if (c.type === 'jellyfish') {
        const wobble = Math.sin(time * 4) * size * 0.08;
        this.ctx.fillStyle = c.stunned > 0 ? 'rgba(255, 100, 200, 0.6)' : 'rgba(238, 130, 238, 0.7)';
        this.ctx.beginPath();
        this.ctx.ellipse(px, py - size * 0.1, size * 0.5 + wobble, size * 0.35, 0, Math.PI, 0, false);
        this.ctx.fill();
        for (let i = 0; i < 5; i++) {
          const tx = px + (i - 2) * size * 0.15;
          const tentacleLen = size * 0.5 + Math.sin(time * 3 + i) * size * 0.1;
          this.ctx.strokeStyle = c.stunned > 0 ? 'rgba(255, 100, 200, 0.5)' : 'rgba(238, 130, 238, 0.6)';
          this.ctx.lineWidth = 2;
          this.ctx.beginPath();
          this.ctx.moveTo(tx, py);
          this.ctx.quadraticCurveTo(tx + wobble, py + tentacleLen * 0.5, tx, py + tentacleLen);
          this.ctx.stroke();
        }
      } else {
        this.ctx.fillStyle = c.stunned > 0 ? 'rgba(200, 220, 255, 0.8)' : 'rgba(128, 128, 128, 0.85)';
        this.ctx.beginPath();
        this.ctx.ellipse(px, py, size * 0.6, size * 0.25, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.moveTo(px + size * 0.4, py);
        this.ctx.lineTo(px + size * 0.9, py - size * 0.25);
        this.ctx.lineTo(px + size * 0.6, py);
        this.ctx.lineTo(px + size * 0.9, py + size * 0.25);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.moveTo(px - size * 0.2, py - size * 0.15);
        this.ctx.lineTo(px - size * 0.1, py - size * 0.35);
        this.ctx.lineTo(px, py - size * 0.15);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.fillStyle = '#ff3333';
        this.ctx.beginPath();
        this.ctx.arc(px + size * 0.35, py - size * 0.08, size * 0.05, 0, Math.PI * 2);
        this.ctx.fill();
      }

      if (c.stunned > 0) {
        this.ctx.restore();
      }
    }
  }

  private drawSubmarine(
    sub: { x: number; y: number; rotation: number; velocity: { x: number; y: number } },
    cellSize: number,
    offsetX: number,
    offsetY: number
  ): void {
    const px = offsetX + sub.x * cellSize;
    const py = offsetY + sub.y * cellSize;
    const size = cellSize * 0.9;

    this.ctx.save();
    this.ctx.translate(px, py);
    this.ctx.rotate(sub.rotation);

    this.ctx.fillStyle = '#334155';
    this.ctx.strokeStyle = '#60a5fa';
    this.ctx.lineWidth = 2;

    this.ctx.beginPath();
    this.ctx.ellipse(0, 0, size * 0.55, size * 0.28, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.fillStyle = '#0ea5e9';
    this.ctx.beginPath();
    this.ctx.ellipse(size * 0.15, -size * 0.05, size * 0.2, size * 0.14, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.strokeStyle = '#38bdf8';
    this.ctx.stroke();

    this.ctx.fillStyle = '#1e40af';
    this.ctx.fillRect(-size * 0.05, -size * 0.32, size * 0.1, size * 0.15);
    this.ctx.fillStyle = '#facc15';
    this.ctx.beginPath();
    this.ctx.arc(0, -size * 0.38, size * 0.05, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#475569';
    this.ctx.beginPath();
    this.ctx.moveTo(-size * 0.35, size * 0.18);
    this.ctx.lineTo(-size * 0.45, size * 0.4);
    this.ctx.lineTo(-size * 0.15, size * 0.2);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.moveTo(-size * 0.35, -size * 0.18);
    this.ctx.lineTo(-size * 0.45, -size * 0.4);
    this.ctx.lineTo(-size * 0.15, -size * 0.2);
    this.ctx.closePath();
    this.ctx.fill();

    const propellerSpin = (performance.now() / 30) % (Math.PI * 2);
    this.ctx.save();
    this.ctx.translate(-size * 0.55, 0);
    this.ctx.rotate(propellerSpin);
    this.ctx.fillStyle = '#94a3b8';
    for (let i = 0; i < 3; i++) {
      this.ctx.rotate((Math.PI * 2) / 3);
      this.ctx.fillRect(-1, -size * 0.03, size * 0.15, size * 0.06);
    }
    this.ctx.restore();

    this.ctx.fillStyle = 'rgba(0, 250, 255, 0.8)';
    this.ctx.beginPath();
    this.ctx.arc(size * 0.5, 0, size * 0.04, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  private drawDarknessOverlay(
    explored: boolean[][],
    submarine: { x: number; y: number },
    sonar: { active: boolean; currentRadius: number; x: number; y: number; maxRadius: number },
    cellSize: number,
    offsetX: number,
    offsetY: number,
    width: number,
    height: number
  ): void {
    const subSightRadius = 2.5;

    this.ctx.save();
    this.ctx.globalCompositeOperation = 'source-over';

    for (let y = 0; y < explored.length; y++) {
      for (let x = 0; x < explored[0].length; x++) {
        const dx = x - submarine.x;
        const dy = y - submarine.y;
        const distToSub = Math.sqrt(dx * dx + dy * dy);

        let inSight = distToSub <= subSightRadius;
        if (sonar.active) {
          const sdx = x - sonar.x;
          const sdy = y - sonar.y;
          const sonarDist = Math.sqrt(sdx * sdx + sdy * sdy);
          if (sonarDist <= sonar.currentRadius) inSight = true;
        }

        if (!explored[y][x] && !inSight) {
          const px = offsetX + x * cellSize;
          const py = offsetY + y * cellSize;
          this.ctx.fillStyle = '#000000';
          this.ctx.fillRect(px, py, cellSize, cellSize);
        } else if (!explored[y][x]) {
          const alpha = Math.max(0.4, 0.85 - distToSub / subSightRadius * 0.5);
          const px = offsetX + x * cellSize;
          const py = offsetY + y * cellSize;
          this.ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
          this.ctx.fillRect(px, py, cellSize, cellSize);
        }
      }
    }
    this.ctx.restore();
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}
