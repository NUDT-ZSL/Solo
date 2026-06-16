import { Position, CANVAS_WIDTH, CANVAS_HEIGHT } from '../../types';

export class HeatmapCalculator {
  private radius: number = 8;
  private opacity: number = 0.4;

  calculateDensity(positions: Position[], width: number = CANVAS_WIDTH, height: number = CANVAS_HEIGHT): number[][] {
    const cols = Math.ceil(width / 4);
    const rows = Math.ceil(height / 4);
    const matrix: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));

    for (const pos of positions) {
      const gridX = Math.floor(pos.x / 4);
      const gridY = Math.floor(pos.y / 4);
      const spread = Math.ceil(this.radius / 4);

      for (let dy = -spread; dy <= spread; dy++) {
        for (let dx = -spread; dx <= spread; dx++) {
          const nx = gridX + dx;
          const ny = gridY + dy;
          if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
            const dist = Math.sqrt(dx * dx + dy * dy) * 4;
            if (dist <= this.radius) {
              const influence = 1 - dist / this.radius;
              matrix[ny][nx] += influence;
            }
          }
        }
      }
    }

    return matrix;
  }

  getColor(density: number, maxDensity: number): string {
    if (maxDensity === 0) return 'rgba(33, 150, 243, 0)';
    const t = Math.min(density / maxDensity, 1);

    const r1 = 33, g1 = 150, b1 = 243;
    const r2 = 244, g2 = 67, b2 = 51;

    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);

    return `rgba(${r}, ${g}, ${b}, ${this.opacity})`;
  }

  renderHeatmap(ctx: CanvasRenderingContext2D, densityMatrix: number[][]): void {
    let maxDensity = 0;
    for (const row of densityMatrix) {
      for (const val of row) {
        if (val > maxDensity) maxDensity = val;
      }
    }

    if (maxDensity === 0) return;

    for (let y = 0; y < densityMatrix.length; y++) {
      for (let x = 0; x < densityMatrix[y].length; x++) {
        if (densityMatrix[y][x] > 0) {
          const color = this.getColor(densityMatrix[y][x], maxDensity);
          ctx.fillStyle = color;
          ctx.fillRect(x * 4, y * 4, 4, 4);
        }
      }
    }
  }

  renderHeatmapGaussian(ctx: CanvasRenderingContext2D, positions: Position[]): void {
    if (positions.length === 0) return;

    let maxDensity = 0;
    const densityMap = new Map<string, number>();

    for (const pos of positions) {
      const key = `${Math.round(pos.x)},${Math.round(pos.y)}`;
      densityMap.set(key, (densityMap.get(key) || 0) + 1);
      const d = densityMap.get(key)!;
      if (d > maxDensity) maxDensity = d;
    }

    if (maxDensity === 0) return;

    ctx.save();
    for (const pos of positions) {
      const key = `${Math.round(pos.x)},${Math.round(pos.y)}`;
      const density = densityMap.get(key)!;
      const t = Math.min(density / maxDensity, 1);

      const r1 = 33, g1 = 150, b1 = 243;
      const r2 = 244, g2 = 67, b2 = 51;
      const r = Math.round(r1 + (r2 - r1) * t);
      const g = Math.round(g1 + (g2 - g1) * t);
      const b = Math.round(b1 + (b2 - b1) * t);

      const gradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, this.radius);
      gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${this.opacity})`);
      gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
