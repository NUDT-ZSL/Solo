export interface Point {
  x: number;
  y: number;
}

export interface PlanetData {
  gridX: number;
  gridY: number;
  mass: number;
  color: number;
  innerColor: number;
}

export interface PortalData {
  gridX: number;
  gridY: number;
}

export interface WavePathResult {
  path: Point[];
  smoothedPath: Point[];
  reachedPortalIndex: number;
}

const DIRECTIONS = [
  { dx: 1, dy: 0 },
  { dx: -1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: 0, dy: -1 },
];

export class OrbitSimulator {
  private cols: number;
  private rows: number;
  private cellSize: number;
  private offsetX: number;
  private offsetY: number;

  constructor(
    cols: number,
    rows: number,
    cellSize: number,
    offsetX: number,
    offsetY: number
  ) {
    this.cols = cols;
    this.rows = rows;
    this.cellSize = cellSize;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
  }

  gridToWorld(gx: number, gy: number): Point {
    return {
      x: this.offsetX + gx * this.cellSize,
      y: this.offsetY + gy * this.cellSize,
    };
  }

  worldToGrid(wx: number, wy: number): { gx: number; gy: number } {
    return {
      gx: Math.round((wx - this.offsetX) / this.cellSize),
      gy: Math.round((wy - this.offsetY) / this.cellSize),
    };
  }

  isInBounds(gx: number, gy: number): boolean {
    return gx >= 0 && gx < this.cols && gy >= 0 && gy < this.rows;
  }

  simulateWavePath(
    startGridX: number,
    startGridY: number,
    dirX: number,
    dirY: number,
    planets: PlanetData[],
    portals: PortalData[]
  ): WavePathResult {
    const path: Point[] = [];
    let gx = startGridX;
    let gy = startGridY;
    let dx = dirX;
    let dy = dirY;
    const maxSteps = this.cols * this.rows * 3;
    const visited = new Set<string>();

    path.push(this.gridToWorld(gx, gy));

    for (let step = 0; step < maxSteps; step++) {
      const nextGx = gx + dx;
      const nextGy = gy + dy;

      if (!this.isInBounds(nextGx, nextGy)) {
        const edgeX = Math.max(0, Math.min(this.cols - 1, nextGx));
        const edgeY = Math.max(0, Math.min(this.rows - 1, nextGy));
        const edgePt = this.gridToWorld(edgeX, edgeY);
        if (edgePt.x !== path[path.length - 1].x || edgePt.y !== path[path.length - 1].y) {
          path.push(edgePt);
        }
        break;
      }

      gx = nextGx;
      gy = nextGy;
      path.push(this.gridToWorld(gx, gy));

      const stateKey = `${gx},${gy},${dx},${dy}`;
      if (visited.has(stateKey)) break;
      visited.add(stateKey);

      let portalIndex = -1;
      for (let i = 0; i < portals.length; i++) {
        if (portals[i].gridX === gx && portals[i].gridY === gy) {
          portalIndex = i;
          break;
        }
      }
      if (portalIndex >= 0) {
        return {
          path,
          smoothedPath: this.smoothPath(path),
          reachedPortalIndex: portalIndex,
        };
      }

      let forceX = 0;
      let forceY = 0;
      let isOnPlanet = false;

      for (const planet of planets) {
        if (planet.gridX === gx && planet.gridY === gy) {
          isOnPlanet = true;
          break;
        }
        const distX = planet.gridX - gx;
        const distY = planet.gridY - gy;
        const distSq = distX * distX + distY * distY;
        if (distSq === 0) continue;
        const dist = Math.sqrt(distSq);
        const force = planet.mass / (distSq * 0.5);
        forceX += (distX / dist) * force;
        forceY += (distY / dist) * force;
      }

      if (isOnPlanet) break;

      if (Math.abs(forceX) > 0.05 || Math.abs(forceY) > 0.05) {
        let perpForce = 0;

        if (dx !== 0 && dy === 0) {
          perpForce = forceY;
        } else if (dy !== 0 && dx === 0) {
          perpForce = forceX;
        }

        const threshold = 0.18;

        if (Math.abs(perpForce) > threshold) {
          const sign = perpForce > 0 ? 1 : -1;
          if (dx !== 0 && dy === 0) {
            dx = 0;
            dy = sign;
          } else if (dy !== 0 && dx === 0) {
            dx = sign;
            dy = 0;
          }
        }

        let alongForce = 0;
        if (dx !== 0 && dy === 0) {
          alongForce = forceX * dx;
        } else if (dy !== 0 && dx === 0) {
          alongForce = forceY * dy;
        }

        if (alongForce < -0.8) {
          dx = -dx;
          dy = -dy;
        }
      }
    }

    return {
      path,
      smoothedPath: this.smoothPath(path),
      reachedPortalIndex: -1,
    };
  }

  private smoothPath(rawPath: Point[]): Point[] {
    if (rawPath.length < 3) return rawPath;

    const smoothed: Point[] = [rawPath[0]];
    const curveOffset = 0.35;

    for (let i = 1; i < rawPath.length - 1; i++) {
      const prev = rawPath[i - 1];
      const curr = rawPath[i];
      const next = rawPath[i + 1];

      const prevDx = curr.x - prev.x;
      const prevDy = curr.y - prev.y;
      const nextDx = next.x - curr.x;
      const nextDy = next.y - curr.y;

      if (
        Math.sign(prevDx) !== Math.sign(nextDx) ||
        Math.sign(prevDy) !== Math.sign(nextDy)
      ) {
        const beforePt = {
          x: curr.x - prevDx * curveOffset,
          y: curr.y - prevDy * curveOffset,
        };
        const afterPt = {
          x: curr.x + nextDx * curveOffset,
          y: curr.y + nextDy * curveOffset,
        };

        smoothed.push(beforePt);

        const steps = 6;
        for (let t = 1; t <= steps; t++) {
          const s = t / steps;
          const q0x = beforePt.x + (curr.x - beforePt.x) * s;
          const q0y = beforePt.y + (curr.y - beforePt.y) * s;
          const q1x = curr.x + (afterPt.x - curr.x) * s;
          const q1y = curr.y + (afterPt.y - curr.y) * s;
          const bx = q0x + (q1x - q0x) * s;
          const by = q0y + (q1y - q0y) * s;
          smoothed.push({ x: bx, y: by });
        }

        smoothed.push(afterPt);
      } else {
        smoothed.push(curr);
      }
    }

    smoothed.push(rawPath[rawPath.length - 1]);
    return smoothed;
  }

  findReachablePortals(
    planets: PlanetData[],
    portals: PortalData[]
  ): Map<number, { gx: number; gy: number; dx: number; dy: number }[]> {
    const result = new Map<number, { gx: number; gy: number; dx: number; dy: number }[]>();

    for (let pi = 0; pi < portals.length; pi++) {
      result.set(pi, []);
    }

    for (let gy = 0; gy < this.rows; gy++) {
      for (let gx = 0; gx < this.cols; gx++) {
        let onPlanet = false;
        for (const p of planets) {
          if (p.gridX === gx && p.gridY === gy) {
            onPlanet = true;
            break;
          }
        }
        if (onPlanet) continue;

        for (const dir of DIRECTIONS) {
          const simResult = this.simulateWavePath(
            gx,
            gy,
            dir.dx,
            dir.dy,
            planets,
            portals
          );
          if (simResult.reachedPortalIndex >= 0) {
            const list = result.get(simResult.reachedPortalIndex);
            if (list) {
              list.push({ gx, gy, dx: dir.dx, dy: dir.dy });
            }
          }
        }
      }
    }

    return result;
  }

  getCols() { return this.cols; }
  getRows() { return this.rows; }
  getCellSize() { return this.cellSize; }
  getOffsetX() { return this.offsetX; }
  getOffsetY() { return this.offsetY; }
}
