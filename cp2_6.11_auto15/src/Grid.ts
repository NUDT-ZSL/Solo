import {
  HexCell, PathSegment, IntersectionNode, EnergyBall, CubeCoord,
  GRID_COLS, GRID_ROWS, HEX_GAP, MIN_HEX_SIZE,
  RUNE_SYMBOLS, LOCK_SYMBOL, COLORS, RUNE_ACTIVATION_COLORS,
  HEX_DIRECTIONS_EVEN_R, HEX_DIRECTIONS_ODD_R, LOCKS_PER_LEVEL,
  CELL_SPACING, ACTIVATION_DECAY_TIME,
} from './types';

export class Grid {
  cells: HexCell[] = [];
  hexSize: number = MIN_HEX_SIZE;
  offsetX: number = 0;
  offsetY: number = 0;
  hoveredCell: HexCell | null = null;
  selectedStart: HexCell | null = null;
  paths: PathSegment[] = [];
  intersections: IntersectionNode[] = [];
  pathIdCounter: number = 0;
  gridWidth: number = GRID_COLS;
  gridHeight: number = GRID_ROWS;
  unlockedCount: number = 0;

  static offsetToCube(q: number, r: number): CubeCoord {
    const x = q - Math.floor(r / 2);
    const z = r;
    const y = -x - z;
    return { x, y, z };
  }

  static cubeToOffset(cube: CubeCoord): { q: number; r: number } {
    const r = cube.z;
    const q = cube.x + Math.floor(cube.z / 2);
    return { q, r };
  }

  static cubeDistance(a: CubeCoord, b: CubeCoord): number {
    return Math.max(
      Math.abs(a.x - b.x),
      Math.abs(a.y - b.y),
      Math.abs(a.z - b.z)
    );
  }

  static getHexVertices(cx: number, cy: number, size: number): { x: number; y: number }[] {
    const vertices: { x: number; y: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      vertices.push({
        x: cx + size * Math.cos(angle),
        y: cy + size * Math.sin(angle),
      });
    }
    return vertices;
  }

  private getHexDirections(r: number) {
    return r % 2 === 0 ? HEX_DIRECTIONS_EVEN_R : HEX_DIRECTIONS_ODD_R;
  }

  private hexToPixel(q: number, r: number): { x: number; y: number } {
    const size = this.hexSize + HEX_GAP / 2;
    const x = this.offsetX + size * 1.5 * q;
    const y = this.offsetY + size * Math.sqrt(3) * (r + 0.5 * (q & 1));
    return { x, y };
  }

  private pixelToHex(px: number, py: number): { q: number; r: number } {
    const size = this.hexSize + HEX_GAP / 2;
    const adjustedX = px - this.offsetX;
    const adjustedY = py - this.offsetY;

    const q = (2 / 3 * adjustedX) / size;
    const r = (-1 / 3 * adjustedX + Math.sqrt(3) / 3 * adjustedY) / size;

    return this.roundToHex(q, r);
  }

  private roundToHex(q: number, r: number): { q: number; r: number } {
    const cube: CubeCoord = {
      x: q - Math.floor(r / 2),
      z: r,
      y: -(q - Math.floor(r / 2)) - r,
    };

    let rx = Math.round(cube.x);
    let ry = Math.round(cube.y);
    let rz = Math.round(cube.z);

    const xDiff = Math.abs(rx - cube.x);
    const yDiff = Math.abs(ry - cube.y);
    const zDiff = Math.abs(rz - cube.z);

    if (xDiff > yDiff && xDiff > zDiff) {
      rx = -ry - rz;
    } else if (yDiff > zDiff) {
      ry = -rx - rz;
    } else {
      rz = -rx - ry;
    }

    return Grid.cubeToOffset({ x: rx, y: ry, z: rz });
  }

  initialize(canvasWidth: number, canvasHeight: number, level: number = 1) {
    this.cells = [];
    this.paths = [];
    this.intersections = [];
    this.selectedStart = null;
    this.hoveredCell = null;
    this.unlockedCount = 0;
    this.pathIdCounter = 0;

    const gridAreaW = canvasWidth * 0.65;
    const gridAreaH = canvasHeight * 0.8;

    const hexSizeByW = gridAreaW / (GRID_COLS * 1.5 + 0.5) - HEX_GAP / 2;
    const hexSizeByH = gridAreaH / ((GRID_ROWS + 0.5) * Math.sqrt(3)) - HEX_GAP / 2;
    this.hexSize = Math.max(MIN_HEX_SIZE, Math.min(hexSizeByW, hexSizeByH));

    const size = this.hexSize + HEX_GAP / 2;
    const totalW = size * 1.5 * (GRID_COLS - 1) + size * 2;
    const totalH = size * Math.sqrt(3) * (GRID_ROWS + 0.5);

    this.offsetX = (canvasWidth - totalW) / 2 + size;
    this.offsetY = (canvasHeight - totalH) / 2 + size * Math.sqrt(3) / 2 + canvasHeight * 0.05;

    const lockPositions = this.generateLockPositions(level);

    for (let r = 0; r < GRID_ROWS; r++) {
      for (let q = 0; q < GRID_COLS; q++) {
        const cube = Grid.offsetToCube(q, r);
        const pos = this.hexToPixel(q, r);
        const isLocked = lockPositions.some(lp => lp.q === q && lp.r === r);

        this.cells.push({
          q, r, cube,
          symbol: isLocked ? LOCK_SYMBOL : RUNE_SYMBOLS[Math.floor(Math.random() * RUNE_SYMBOLS.length)],
          isLocked,
          isPassable: !isLocked,
          activationCount: 0,
          lastActivatedTime: -Infinity,
          x: pos.x,
          y: pos.y,
          pulseTime: 0,
          shakeTime: 0,
          shakeOffsetX: 0,
          shakeOffsetY: 0,
          unlockAnimTime: 0,
          isUnlockAnimating: false,
          ballVisits: [],
        });
      }
    }
  }

  private generateLockPositions(level: number): { q: number; r: number }[] {
    const positions: { q: number; r: number }[] = [];
    const used = new Set<string>();
    const count = LOCKS_PER_LEVEL;

    while (positions.length < count) {
      const q = 1 + Math.floor(Math.random() * (GRID_COLS - 2));
      const r = 1 + Math.floor(Math.random() * (GRID_ROWS - 2));
      const key = `${q},${r}`;
      if (!used.has(key)) {
        used.add(key);
        positions.push({ q, r });
      }
    }
    return positions;
  }

  getCellAt(q: number, r: number): HexCell | null {
    return this.cells.find(c => c.q === q && c.r === r) || null;
  }

  getCellAtCube(cube: CubeCoord): HexCell | null {
    const offset = Grid.cubeToOffset(cube);
    return this.getCellAt(offset.q, offset.r);
  }

  getCellAtPixel(px: number, py: number): HexCell | null {
    let closest: HexCell | null = null;
    let closestDist = Infinity;

    for (const cell of this.cells) {
      const dx = px - cell.x;
      const dy = py - cell.y;
      const dist = dx * dx + dy * dy;
      if (dist < closestDist && dist < (this.hexSize * 1.1) ** 2) {
        closestDist = dist;
        closest = cell;
      }
    }
    return closest;
  }

  getHexDistance(a: HexCell, b: HexCell): number {
    return Grid.cubeDistance(a.cube, b.cube);
  }

  getNeighbors(cell: HexCell): HexCell[] {
    const directions = this.getHexDirections(cell.r);
    const neighbors: HexCell[] = [];
    for (const dir of directions) {
      const n = this.getCellAt(cell.q + dir.dq, cell.r + dir.dr);
      if (n) neighbors.push(n);
    }
    return neighbors;
  }

  isWithinRange(from: HexCell, to: HexCell, maxDist: number = 3): boolean {
    return this.getHexDistance(from, to) <= maxDist;
  }

  addPath(from: HexCell, to: HexCell): PathSegment {
    const cp = this.calculateDefaultControlPoint(from, to);
    const path: PathSegment = {
      id: this.pathIdCounter++,
      fromCell: from,
      toCell: to,
      controlPoint: cp,
      intersections: [],
    };
    this.paths.push(path);
    this.checkPathIntersections(path);
    return path;
  }

  private calculateDefaultControlPoint(from: HexCell, to: HexCell): { x: number; y: number } {
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const perpX = -dy * 0.25;
    const perpY = dx * 0.25;
    return { x: midX + perpX, y: midY + perpY };
  }

  private checkPathIntersections(newPath: PathSegment) {
    for (const existingPath of this.paths) {
      if (existingPath.id === newPath.id) continue;
      const intersection = this.findPathIntersection(newPath, existingPath);
      if (intersection) {
        const node: IntersectionNode = {
          x: intersection.x,
          y: intersection.y,
          pathA: newPath,
          pathB: existingPath,
          rainbowPhase: 0,
          chosenDirection: null,
        };
        newPath.intersections.push(node);
        existingPath.intersections.push(node);
        this.intersections.push(node);
      }
    }
  }

  private findPathIntersection(
    pathA: PathSegment,
    pathB: PathSegment
  ): { x: number; y: number } | null {
    const steps = 30;
    for (let i = 1; i < steps; i++) {
      const tA = i / steps;
      const pA = this.getPointOnPath(pathA, tA);
      for (let j = 1; j < steps; j++) {
        const tB = j / steps;
        const pB = this.getPointOnPath(pathB, tB);
        const dx = pA.x - pB.x;
        const dy = pA.y - pB.y;
        if (dx * dx + dy * dy < (this.hexSize * 0.4) ** 2) {
          return { x: (pA.x + pB.x) / 2, y: (pA.y + pB.y) / 2 };
        }
      }
    }
    return null;
  }

  getPointOnPath(path: PathSegment, t: number): { x: number; y: number } {
    const from = path.fromCell;
    const to = path.toCell;
    const cp = path.controlPoint;
    if (!cp) {
      return {
        x: from.x + (to.x - from.x) * t,
        y: from.y + (to.y - from.y) * t,
      };
    }
    const u = 1 - t;
    return {
      x: u * u * from.x + 2 * u * t * cp.x + t * t * to.x,
      y: u * u * from.y + 2 * u * t * cp.y + t * t * to.y,
    };
  }

  getPathLength(path: PathSegment): number {
    let len = 0;
    const steps = 30;
    let prev = this.getPointOnPath(path, 0);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const curr = this.getPointOnPath(path, t);
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      len += Math.sqrt(dx * dx + dy * dy);
      prev = curr;
    }
    return len;
  }

  updatePathControlPoint(path: PathSegment, cx: number, cy: number) {
    path.controlPoint = { x: cx, y: cy };
    path.intersections = [];
    this.intersections = this.intersections.filter(
      n => n.pathA.id !== path.id && n.pathB.id !== path.id
    );
    this.checkPathIntersections(path);
  }

  findPathNear(px: number, py: number, threshold: number = 15): PathSegment | null {
    for (const path of this.paths) {
      for (let t = 0; t <= 1; t += 0.05) {
        const p = this.getPointOnPath(path, t);
        const dx = px - p.x;
        const dy = py - p.y;
        if (dx * dx + dy * dy < threshold * threshold) {
          return path;
        }
      }
    }
    return null;
  }

  unlockCell(cell: HexCell) {
    if (!cell.isLocked) return;
    cell.isLocked = false;
    cell.isPassable = true;
    cell.isUnlockAnimating = true;
    cell.unlockAnimTime = 0.6;
    cell.symbol = RUNE_SYMBOLS[Math.floor(Math.random() * RUNE_SYMBOLS.length)];
    this.unlockedCount++;

    this.expandGrid(cell);
  }

  private expandGrid(unlockedCell: HexCell) {
    const directions = this.getHexDirections(unlockedCell.r);
    for (const dir of directions) {
      const nq = unlockedCell.q + dir.dq;
      const nr = unlockedCell.r + dir.dr;
      if (!this.getCellAt(nq, nr) && nq >= -1 && nr >= -1) {
        const cube = Grid.offsetToCube(nq, nr);
        const pos = this.hexToPixel(nq, nr);

        this.cells.push({
          q: nq, r: nr, cube,
          symbol: RUNE_SYMBOLS[Math.floor(Math.random() * RUNE_SYMBOLS.length)],
          isLocked: false,
          isPassable: true,
          activationCount: 0,
          lastActivatedTime: -Infinity,
          x: pos.x,
          y: pos.y,
          pulseTime: 0,
          shakeTime: 0,
          shakeOffsetX: 0,
          shakeOffsetY: 0,
          unlockAnimTime: 0,
          isUnlockAnimating: false,
          ballVisits: [],
        });
      }
    }
  }

  update(dt: number, currentTime: number) {
    for (const cell of this.cells) {
      if (cell.pulseTime > 0) {
        cell.pulseTime = Math.max(0, cell.pulseTime - dt);
      }
      if (cell.shakeTime > 0) {
        cell.shakeTime = Math.max(0, cell.shakeTime - dt);
        const intensity = cell.shakeTime / 0.15;
        cell.shakeOffsetX = (Math.random() - 0.5) * 5 * intensity;
        cell.shakeOffsetY = (Math.random() - 0.5) * 5 * intensity;
      } else {
        cell.shakeOffsetX = 0;
        cell.shakeOffsetY = 0;
      }
      if (cell.isUnlockAnimating) {
        cell.unlockAnimTime -= dt;
        if (cell.unlockAnimTime <= 0) {
          cell.isUnlockAnimating = false;
          cell.unlockAnimTime = 0;
        }
      }

      if (cell.activationCount > 0 && !cell.isLocked && cell.lastActivatedTime > 0) {
        const elapsed = currentTime - cell.lastActivatedTime;
        if (elapsed > ACTIVATION_DECAY_TIME) {
          cell.activationCount = Math.max(0, cell.activationCount - 1);
          cell.lastActivatedTime = cell.activationCount > 0 ? currentTime : -Infinity;
        }
      }
    }

    for (const node of this.intersections) {
      node.rainbowPhase += dt * 3;
    }
  }

  draw(ctx: CanvasRenderingContext2D, currentTime: number) {
    this.drawBorder(ctx);

    for (const cell of this.cells) {
      this.drawCell(ctx, cell, currentTime);
    }

    for (const path of this.paths) {
      this.drawPath(ctx, path);
    }

    for (const node of this.intersections) {
      this.drawIntersection(ctx, node);
    }
  }

  private drawBorder(ctx: CanvasRenderingContext2D) {
    if (this.cells.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const cell of this.cells) {
      minX = Math.min(minX, cell.x - this.hexSize);
      minY = Math.min(minY, cell.y - this.hexSize);
      maxX = Math.max(maxX, cell.x + this.hexSize);
      maxY = Math.max(maxY, cell.y + this.hexSize);
    }

    const pad = 15;
    ctx.strokeStyle = COLORS.glowBorder;
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(123, 107, 154, 0.5)';
    ctx.shadowBlur = 15;

    const rx = minX - pad;
    const ry = minY - pad;
    const rw = maxX - minX + pad * 2;
    const rh = maxY - minY + pad * 2;
    const radius = 12;

    ctx.beginPath();
    ctx.moveTo(rx + radius, ry);
    ctx.lineTo(rx + rw - radius, ry);
    ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + radius);
    ctx.lineTo(rx + rw, ry + rh - radius);
    ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - radius, ry + rh);
    ctx.lineTo(rx + radius, ry + rh);
    ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - radius);
    ctx.lineTo(rx, ry + radius);
    ctx.quadraticCurveTo(rx, ry, rx + radius, ry);
    ctx.closePath();
    ctx.stroke();

    ctx.shadowBlur = 0;
  }

  private drawCell(ctx: CanvasRenderingContext2D, cell: HexCell, currentTime: number) {
    const x = cell.x + cell.shakeOffsetX;
    const y = cell.y + cell.shakeOffsetY;
    const size = this.hexSize;

    ctx.save();

    const isHovered = cell === this.hoveredCell;
    const isSelected = cell === this.selectedStart;

    let fillColor: string;
    let strokeColor: string;
    let strokeAlpha = 0.25;

    if (cell.isLocked) {
      fillColor = '#2A2A3A';
      strokeColor = COLORS.lockRune;
    } else {
      const colorIdx = Math.min(cell.activationCount, RUNE_ACTIVATION_COLORS.length - 1);
      fillColor = RUNE_ACTIVATION_COLORS[colorIdx];
      strokeColor = fillColor;
    }

    if (isHovered || isSelected) {
      strokeAlpha = isSelected ? COLORS.clickGlow : COLORS.hoverGlow;
    }

    if (cell.pulseTime > 0) {
      const pulseProgress = cell.pulseTime / 0.2;
      ctx.shadowColor = COLORS.runePulseEnd;
      ctx.shadowBlur = 15 * pulseProgress;
      fillColor = this.lerpColor(COLORS.runePulseEnd, COLORS.runePulseStart, 1 - pulseProgress);
      strokeColor = fillColor;
      strokeAlpha = 1;
    }

    if (cell.shakeTime > 0) {
      ctx.shadowColor = COLORS.invalidFlash;
      ctx.shadowBlur = 10;
      strokeColor = COLORS.invalidFlash;
      strokeAlpha = 1;
    }

    this.drawHexagon(ctx, x, y, size);
    ctx.fillStyle = this.hexToRgba(fillColor, 0.15);
    ctx.fill();
    ctx.strokeStyle = this.hexToRgba(strokeColor, strokeAlpha);
    ctx.lineWidth = isHovered || isSelected ? 2 : 1.5;
    ctx.stroke();

    ctx.shadowBlur = 0;

    ctx.font = `bold ${size * 0.75}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = cell.isLocked ? COLORS.lockRune : fillColor;
    if (cell.pulseTime > 0) {
      ctx.fillStyle = '#FFFFFF';
    }
    ctx.fillText(cell.symbol, x, y + 1);

    if (cell.isUnlockAnimating) {
      const progress = 1 - cell.unlockAnimTime / 0.6;
      ctx.globalAlpha = 1 - progress;
      ctx.font = `bold ${size * 0.75}px serif`;
      ctx.fillStyle = COLORS.unlockGold;
      ctx.fillText(LOCK_SYMBOL, x, y + 1);
      ctx.globalAlpha = 1;
    }

    if (cell.activationCount > 0 && !cell.isLocked && cell.pulseTime <= 0) {
      const elapsed = currentTime - cell.lastActivatedTime;
      if (elapsed < 1) {
        const glow = 1 - elapsed;
        this.drawHexagon(ctx, x, y, size + 3);
        ctx.strokeStyle = this.hexToRgba(COLORS.runePulseEnd, glow * 0.6);
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  drawHexagon(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
    const vertices = Grid.getHexVertices(cx, cy, size);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const v = vertices[i];
      if (i === 0) ctx.moveTo(v.x, v.y);
      else ctx.lineTo(v.x, v.y);
    }
    ctx.closePath();
  }

  private drawPath(ctx: CanvasRenderingContext2D, path: PathSegment) {
    const from = path.fromCell;
    const to = path.toCell;
    const cp = path.controlPoint;

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    if (cp) {
      ctx.quadraticCurveTo(cp.x, cp.y, to.x, to.y);
    } else {
      ctx.lineTo(to.x, to.y);
    }
    ctx.strokeStyle = COLORS.pathColor;
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(100, 220, 255, 0.5)';
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  drawPreviewPath(ctx: CanvasRenderingContext2D, from: HexCell, toX: number, toY: number, cp: { x: number; y: number } | null) {
    ctx.beginPath();
    ctx.setLineDash([5, 5]);
    ctx.moveTo(from.x, from.y);
    if (cp) {
      ctx.quadraticCurveTo(cp.x, cp.y, toX, toY);
    } else {
      ctx.lineTo(toX, toY);
    }
    ctx.strokeStyle = COLORS.pathPreviewColor;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private drawIntersection(ctx: CanvasRenderingContext2D, node: IntersectionNode) {
    const idx = Math.floor(node.rainbowPhase) % COLORS.intersectionRainbow.length;
    const color = COLORS.intersectionRainbow[idx];

    ctx.save();
    ctx.beginPath();

    const size = 6;
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const hx = node.x + size * Math.cos(angle);
      const hy = node.y + size * Math.sin(angle);
      if (i === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    }
    ctx.closePath();

    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.fill();

    if (node.chosenDirection === null) {
      this.drawDirectionArrows(ctx, node);
    }

    ctx.restore();
  }

  private drawDirectionArrows(ctx: CanvasRenderingContext2D, node: IntersectionNode) {
    const arrowSize = 12;
    const paths = [node.pathA, node.pathB];
    const labels = ['A', 'B'];

    for (let i = 0; i < 2; i++) {
      const path = paths[i];
      const t = 0.15;
      const p = this.getPointOnPath(path, path.fromCell === node.pathA.fromCell || path.fromCell === node.pathB.fromCell ? t : 1 - t);
      const angle = Math.atan2(p.y - node.y, p.x - node.x);

      ctx.save();
      ctx.translate(node.x + Math.cos(angle) * 20, node.y + Math.sin(angle) * 20);
      ctx.rotate(angle);

      ctx.beginPath();
      ctx.moveTo(arrowSize, 0);
      ctx.lineTo(-arrowSize * 0.5, -arrowSize * 0.4);
      ctx.lineTo(-arrowSize * 0.5, arrowSize * 0.4);
      ctx.closePath();

      ctx.fillStyle = i === 0 ? COLORS.energyBallMain : COLORS.energyBallSub;
      ctx.globalAlpha = 0.7;
      ctx.fill();

      ctx.globalAlpha = 1;
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(labels[i], 0, 0);

      ctx.restore();
    }
  }

  getIntersectionAt(px: number, py: number): IntersectionNode | null {
    for (const node of this.intersections) {
      const dx = px - node.x;
      const dy = py - node.y;
      if (dx * dx + dy * dy < 15 * 15) {
        return node;
      }
    }
    return null;
  }

  getDirectionArrowAt(px: number, py: number, node: IntersectionNode): 'A' | 'B' | null {
    const paths = [node.pathA, node.pathB];
    const labels: ('A' | 'B')[] = ['A', 'B'];

    for (let i = 0; i < 2; i++) {
      const path = paths[i];
      const t = 0.15;
      const p = this.getPointOnPath(path, path.fromCell === node.pathA.fromCell || path.fromCell === node.pathB.fromCell ? t : 1 - t);
      const ax = node.x + Math.cos(Math.atan2(p.y - node.y, p.x - node.x)) * 20;
      const ay = node.y + Math.sin(Math.atan2(p.y - node.y, p.x - node.x)) * 20;

      const dx = px - ax;
      const dy = py - ay;
      if (dx * dx + dy * dy < 15 * 15) {
        return labels[i];
      }
    }
    return null;
  }

  private lerpColor(a: string, b: string, t: number): string {
    const ar = parseInt(a.slice(1, 3), 16);
    const ag = parseInt(a.slice(3, 5), 16);
    const ab = parseInt(a.slice(5, 7), 16);
    const br = parseInt(b.slice(1, 3), 16);
    const bg = parseInt(b.slice(3, 5), 16);
    const bb = parseInt(b.slice(5, 7), 16);
    const rr = Math.round(ar + (br - ar) * t);
    const rg = Math.round(ag + (bg - ag) * t);
    const rb = Math.round(ab + (bb - ab) * t);
    return `#${rr.toString(16).padStart(2, '0')}${rg.toString(16).padStart(2, '0')}${rb.toString(16).padStart(2, '0')}`;
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  getSerializationData() {
    return this.cells.map(c => ({
      q: c.q, r: c.r, symbol: c.symbol,
      isLocked: c.isLocked, isPassable: c.isPassable,
      activationCount: c.activationCount,
      lastActivatedTime: c.lastActivatedTime,
    }));
  }
}
