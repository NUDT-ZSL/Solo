import {
  Game, GameState, HexCoord, PieceState, HexCell, GameEvent,
  HEX_SIZE, HEX_GAP, hexCorners, axialToPixel, Faction
} from './core';

type AnimationType = 'move' | 'attack' | 'damage' | 'death' | 'summon' | 'shockwave' | 'screenShake';

interface BaseAnim {
  id: number;
  type: AnimationType;
  elapsed: number;
  duration: number;
}

interface MoveAnim extends BaseAnim {
  type: 'move';
  pieceId: string;
  fromX: number; fromY: number;
  toX: number; toY: number;
}

interface DamageNumberAnim extends BaseAnim {
  type: 'damage';
  x: number; y: number;
  damage: number;
}

interface DeathAnim extends BaseAnim {
  type: 'death';
  x: number; y: number;
  faction: Faction;
  color: string;
  fragments: { angle: number; speed: number; size: number; rot: number; rotSpeed: number }[];
}

interface ShockwaveAnim extends BaseAnim {
  type: 'shockwave';
  x: number; y: number;
}

interface AttackFragmentsAnim extends BaseAnim {
  type: 'attack';
  x: number; y: number;
  fragments: { angle: number; speed: number; size: number; color: string }[];
}

interface ScreenShakeAnim extends BaseAnim {
  type: 'screenShake';
  magnitude: number;
}

interface SummonAnim extends BaseAnim {
  type: 'summon';
  x: number; y: number;
}

type Animation = MoveAnim | DamageNumberAnim | DeathAnim | ShockwaveAnim | AttackFragmentsAnim | ScreenShakeAnim | SummonAnim;

interface Bubble {
  x: number; y: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  hex: HexCoord;
}

const FACTION_COLORS: Record<Faction, { primary: string; secondary: string; glow: string }> = {
  player1: { primary: '#3498db', secondary: '#1a5276', glow: 'rgba(52, 152, 219, 0.6)' },
  player2: { primary: '#c0392b', secondary: '#7b241c', glow: 'rgba(192, 57, 43, 0.6)' }
};

const easeInOutCubic = (t: number): number => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

interface QuadBezier {
  p0: { x: number; y: number };
  p1: { x: number; y: number };
  p2: { x: number; y: number };
}

function computeBezierControlPoint(
  from: { x: number; y: number },
  to: { x: number; y: number }
): { x: number; y: number } {
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const perpX = -dy / (dist || 1);
  const perpY = dx / (dist || 1);
  const arcHeight = Math.min(45, dist * 0.3 + 12);
  return {
    x: midX + perpX * arcHeight,
    y: midY + perpY * arcHeight - 10
  };
}

function quadraticBezier(b: QuadBezier, t: number): { x: number; y: number } {
  const mt = 1 - t;
  return {
    x: mt * mt * b.p0.x + 2 * mt * t * b.p1.x + t * t * b.p2.x,
    y: mt * mt * b.p0.y + 2 * mt * t * b.p1.y + t * t * b.p2.y
  };
}

let animIdCounter = 0;
const nextAnimId = () => ++animIdCounter;

export class Renderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  game: Game;
  originX: number = 0;
  originY: number = 0;
  animations: Animation[] = [];
  selectedPieceId: string | null = null;
  movableHexes: HexCoord[] = [];
  attackableHexes: HexCoord[] = [];
  hoverHex: HexCoord | null = null;
  private bubbles: Bubble[] = [];
  private bubbleTimers: Map<string, number> = new Map();
  private haloAngle: number = 0;
  private time: number = 0;
  private lastFrameTime: number = 0;
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private offscreenCtx: CanvasRenderingContext2D | null = null;
  screenShakeOffsetX: number = 0;
  screenShakeOffsetY: number = 0;

  constructor(canvas: HTMLCanvasElement, game: Game) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.game = game;
    this.originX = canvas.width / 2;
    this.originY = canvas.height / 2;
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = canvas.width;
    this.offscreenCanvas.height = canvas.height;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d')!;
  }

  setSelection(pieceId: string | null, movable: HexCoord[], attackable: HexCoord[]): void {
    this.selectedPieceId = pieceId;
    this.movableHexes = movable;
    this.attackableHexes = attackable;
  }

  clearSelection(): void {
    this.selectedPieceId = null;
    this.movableHexes = [];
    this.attackableHexes = [];
  }

  setHover(hex: HexCoord | null): void {
    this.hoverHex = hex;
  }

  handleEvents(events: GameEvent[]): void {
    events.forEach(ev => {
      if (ev.type === 'move') {
        const from = axialToPixel(ev.from, this.originX, this.originY);
        const to = axialToPixel(ev.to, this.originX, this.originY);
        this.animations.push({
          id: nextAnimId(), type: 'move', elapsed: 0, duration: 0.6,
          pieceId: ev.pieceId,
          fromX: from.x, fromY: from.y, toX: to.x, toY: to.y
        });
      } else if (ev.type === 'attack') {
        const defPos = axialToPixel(ev.defenderPos, this.originX, this.originY);
        const fragments = [];
        const count = 30 + Math.floor(Math.random() * 21);
        for (let i = 0; i < count; i++) {
          fragments.push({
            angle: Math.random() * Math.PI * 2,
            speed: 60 + Math.random() * 120,
            size: 2 + Math.random() * 4,
            color: Math.random() > 0.5 ? '#d4a758' : '#8B7355'
          });
        }
        this.animations.push({
          id: nextAnimId(), type: 'attack', elapsed: 0, duration: 0.3,
          x: defPos.x, y: defPos.y, fragments
        });
        this.animations.push({
          id: nextAnimId(), type: 'screenShake', elapsed: 0, duration: 0.2,
          magnitude: 2
        });
        this.animations.push({
          id: nextAnimId(), type: 'damage', elapsed: 0, duration: 0.8,
          x: defPos.x, y: defPos.y - 20, damage: ev.damage
        });
      } else if (ev.type === 'death') {
        const pos = axialToPixel(ev.position, this.originX, this.originY);
        const color = FACTION_COLORS[ev.faction].primary;
        const fragments = [];
        const count = 8 + Math.floor(Math.random() * 5);
        for (let i = 0; i < count; i++) {
          fragments.push({
            angle: (i / count) * Math.PI * 2 + Math.random() * 0.3,
            speed: 100 + Math.random() * 100,
            size: 6 + Math.random() * 6,
            rot: Math.random() * Math.PI,
            rotSpeed: (Math.random() - 0.5) * 10
          });
        }
        this.animations.push({
          id: nextAnimId(), type: 'death', elapsed: 0, duration: 0.4,
          x: pos.x, y: pos.y, faction: ev.faction, color, fragments
        });
        this.animations.push({
          id: nextAnimId(), type: 'shockwave', elapsed: 0, duration: 1.0,
          x: pos.x, y: pos.y
        });
      } else if (ev.type === 'summon') {
        const pos = axialToPixel(ev.piece.position, this.originX, this.originY);
        this.animations.push({
          id: nextAnimId(), type: 'summon', elapsed: 0, duration: 1.0,
          x: pos.x, y: pos.y
        });
      }
    });
  }

  private updateBubbles(dt: number): void {
    const swampCells = this.game.grid.getAllCells().filter(c => c.terrain === 'swamp');
    swampCells.forEach(cell => {
      const key = `${cell.coord.q},${cell.coord.r}`;
      const last = this.bubbleTimers.get(key) || 0;
      if (this.time - last >= 1.5) {
        this.bubbleTimers.set(key, this.time);
        const pos = axialToPixel(cell.coord, this.originX, this.originY);
        this.bubbles.push({
          x: pos.x + (Math.random() - 0.5) * 30,
          y: pos.y + 10,
          vy: -20 - Math.random() * 20,
          size: 3 + Math.random() * 5,
          alpha: 0.6,
          life: 0,
          maxLife: 1.0 + Math.random() * 0.5,
          hex: cell.coord
        });
      }
    });

    this.bubbles = this.bubbles.filter(b => {
      b.life += dt;
      b.y += b.vy * dt;
      b.alpha = 0.6 * (1 - b.life / b.maxLife);
      return b.life < b.maxLife;
    });
  }

  update(dt: number): void {
    this.time += dt;
    this.haloAngle += dt * 0.3;

    this.animations = this.animations.filter(a => {
      a.elapsed += dt;
      return a.elapsed < a.duration;
    });

    const shake = this.animations.find(a => a.type === 'screenShake') as ScreenShakeAnim | undefined;
    if (shake) {
      const t = shake.elapsed / shake.duration;
      const mag = shake.magnitude * (1 - t);
      this.screenShakeOffsetX = (Math.random() - 0.5) * mag * 2;
      this.screenShakeOffsetY = (Math.random() - 0.5) * mag * 2;
    } else {
      this.screenShakeOffsetX = 0;
      this.screenShakeOffsetY = 0;
    }

    this.updateBubbles(dt);
  }

  render(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(this.screenShakeOffsetX, this.screenShakeOffsetY);

    this.drawBackground(ctx);
    this.drawHalo(ctx);
    this.drawGrid(ctx);
    this.drawTerrainMarkers(ctx);
    this.drawInteractionMarkers(ctx);
    this.drawPieces(ctx);
    this.drawMoveTrails(ctx);
    this.drawEffects(ctx);
    this.drawBubbles(ctx);

    ctx.restore();
  }

  private drawBackground(ctx: CanvasRenderingContext2D): void {
    const grad = ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
    grad.addColorStop(0, '#2C3E50');
    grad.addColorStop(1, '#8B0000');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private drawHalo(ctx: CanvasRenderingContext2D): void {
    const cx = this.originX;
    const cy = this.originY;
    const radius = (HEX_SIZE + HEX_GAP) * 4.6;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.haloAngle);

    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(0, 0, radius + i * 8, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(180, 140, 60, ${0.15 - i * 0.04})`;
      ctx.lineWidth = 3 - i;
      ctx.stroke();
    }

    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const r1 = radius - 5;
      const r2 = radius + 20;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * r1, Math.sin(angle) * r1);
      ctx.lineTo(Math.cos(angle) * r2, Math.sin(angle) * r2);
      ctx.strokeStyle = 'rgba(200, 160, 70, 0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawGrid(ctx: CanvasRenderingContext2D): void {
    const cells = this.game.grid.getAllCells();
    const canvasW = this.canvas.width;
    const canvasH = this.canvas.height;
    const margin = (HEX_SIZE + HEX_GAP) * 2;
    cells.forEach(cell => {
      const pos = axialToPixel(cell.coord, this.originX, this.originY);
      const yOffset = cell.terrain === 'highland' ? -10 : 0;
      const corners = hexCorners(pos.x, pos.y + yOffset, HEX_SIZE);
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (let i = 0; i < corners.length; i++) {
        const c = corners[i];
        if (c.x < minX) minX = c.x;
        if (c.x > maxX) maxX = c.x;
        if (c.y < minY) minY = c.y;
        if (c.y > maxY) maxY = c.y;
      }
      if (maxX < -margin || minX > canvasW + margin || maxY < -margin || minY > canvasH + margin) {
        return;
      }
      this.drawHexCell(ctx, cell);
    });
  }

  private drawHexCell(ctx: CanvasRenderingContext2D, cell: HexCell): void {
    const pos = axialToPixel(cell.coord, this.originX, this.originY);
    const corners = hexCorners(pos.x, pos.y, HEX_SIZE);
    let yOffset = 0;
    if (cell.terrain === 'highland') yOffset = -10;

    ctx.save();
    ctx.translate(0, yOffset);

    if (cell.terrain === 'highland') {
      ctx.beginPath();
      corners.forEach((c, i) => {
        if (i === 0) ctx.moveTo(c.x, c.y + 10);
        else ctx.lineTo(c.x, c.y + 10);
      });
      ctx.closePath();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.filter = 'blur(4px)';
      ctx.fill();
      ctx.filter = 'none';
    }

    ctx.beginPath();
    corners.forEach((c, i) => {
      if (i === 0) ctx.moveTo(c.x, c.y);
      else ctx.lineTo(c.x, c.y);
    });
    ctx.closePath();

    let fillColor = '#3d3528';
    if (cell.terrain === 'swamp') fillColor = '#1e2a1e';
    else if (cell.terrain === 'highland') fillColor = '#5a4d38';
    else if (cell.terrain === 'altar') fillColor = '#2e1e3a';

    if (cell.altarOwner === 'player1') fillColor = '#1a3a5a';
    else if (cell.altarOwner === 'player2') fillColor = '#5a1a1a';

    ctx.fillStyle = fillColor;
    ctx.fill();

    ctx.save();
    ctx.globalAlpha = 0.08;
    for (let i = 0; i < 20; i++) {
      const nx = pos.x + (Math.sin(cell.coord.q * 13.7 + i * 3.1) * HEX_SIZE * 0.8);
      const ny = pos.y + (Math.cos(cell.coord.r * 17.3 + i * 2.7) * HEX_SIZE * 0.8);
      ctx.fillStyle = i % 2 === 0 ? '#d4b896' : '#8a7050';
      ctx.fillRect(nx - 1, ny - 1, 2, 2);
    }
    ctx.restore();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (cell.terrain === 'altar') {
      const rotAngle = this.time * 0.8;
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(rotAngle);
      const haloGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 30);
      haloGrad.addColorStop(0, 'rgba(180, 80, 220, 0.9)');
      haloGrad.addColorStop(0.5, 'rgba(140, 50, 180, 0.5)');
      haloGrad.addColorStop(1, 'rgba(100, 30, 150, 0)');
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#b060e0';
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.lineTo(Math.cos(a) * 10, Math.sin(a) * 10);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  private drawTerrainMarkers(ctx: CanvasRenderingContext2D): void {
    // Additional terrain visual hints (handled in drawHexCell mostly)
  }

  private drawInteractionMarkers(ctx: CanvasRenderingContext2D): void {
    const pulse = (Math.sin(this.time * Math.PI / 0.6) + 1) / 2;

    this.movableHexes.forEach(hex => {
      const pos = axialToPixel(hex, this.originX, this.originY);
      const corners = hexCorners(pos.x, pos.y, HEX_SIZE - 4);
      ctx.beginPath();
      corners.forEach((c, i) => {
        if (i === 0) ctx.moveTo(c.x, c.y);
        else ctx.lineTo(c.x, c.y);
      });
      ctx.closePath();
      const alpha = 0.2 + pulse * 0.3;
      ctx.fillStyle = `rgba(0, 255, 200, ${alpha})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(0, 255, 220, ${0.5 + pulse * 0.3})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    const blink = Math.floor(this.time * 4) % 2 === 0 ? 1 : 0.3;
    this.attackableHexes.forEach(hex => {
      const pos = axialToPixel(hex, this.originX, this.originY);
      const corners = hexCorners(pos.x, pos.y, HEX_SIZE - 4);
      ctx.beginPath();
      corners.forEach((c, i) => {
        if (i === 0) ctx.moveTo(c.x, c.y);
        else ctx.lineTo(c.x, c.y);
      });
      ctx.closePath();
      ctx.fillStyle = `rgba(255, 50, 50, ${0.25 * blink})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(255, 60, 60, ${0.8 * blink})`;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    });

    if (this.hoverHex) {
      const pos = axialToPixel(this.hoverHex, this.originX, this.originY);
      const corners = hexCorners(pos.x, pos.y, HEX_SIZE - 2);
      ctx.beginPath();
      corners.forEach((c, i) => {
        if (i === 0) ctx.moveTo(c.x, c.y);
        else ctx.lineTo(c.x, c.y);
      });
      ctx.closePath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  private getPieceRenderPosition(piece: PieceState): { x: number; y: number } {
    const moveAnim = this.animations.find(a => a.type === 'move' && a.pieceId === piece.id) as MoveAnim | undefined;
    if (moveAnim) {
      const t = easeInOutCubic(moveAnim.elapsed / moveAnim.duration);
      const from = { x: moveAnim.fromX, y: moveAnim.fromY };
      const to = { x: moveAnim.toX, y: moveAnim.toY };
      const cp = computeBezierControlPoint(from, to);
      return quadraticBezier({ p0: from, p1: cp, p2: to }, t);
    }
    return axialToPixel(piece.position, this.originX, this.originY);
  }

  private drawPieces(ctx: CanvasRenderingContext2D): void {
    const state = this.game.getState();
    const pieces = Array.from(state.pieces.values());
    pieces.sort((a, b) => a.position.r - b.position.r);

    pieces.forEach(piece => {
      const moving = this.animations.some(a => a.type === 'move' && a.pieceId === piece.id);
      const pos = this.getPieceRenderPosition(piece);
      const cell = this.game.grid.getCell(piece.position);
      let yOffset = 0;
      if (cell?.terrain === 'highland') yOffset = -10;

      this.drawPiece(ctx, piece, pos.x, pos.y + yOffset, piece.id === this.selectedPieceId);

      if (moving) {
        ctx.beginPath();
        ctx.ellipse(pos.x, pos.y + 25 + yOffset, 18, 6, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fill();
      }
    });

    if (state.gameOver && state.winner) {
      const winnerPieces = pieces.filter(p => p.faction === state.winner);
      winnerPieces.forEach(piece => {
        const pos = this.getPieceRenderPosition(piece);
        const cell = this.game.grid.getCell(piece.position);
        let yOffset = cell?.terrain === 'highland' ? -10 : 0;
        const glowPulse = (Math.sin(this.time * 3) + 1) / 2;
        const grad = ctx.createRadialGradient(pos.x, pos.y + yOffset, 5, pos.x, pos.y + yOffset, 50 + glowPulse * 15);
        grad.addColorStop(0, `rgba(255, 215, 0, ${0.7 + glowPulse * 0.3})`);
        grad.addColorStop(1, 'rgba(255, 200, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y + yOffset, 50 + glowPulse * 15, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }

  private drawPiece(ctx: CanvasRenderingContext2D, piece: PieceState, x: number, y: number, selected: boolean): void {
    const colors = FACTION_COLORS[piece.faction];
    const deathAnim = this.animations.find(a =>
      a.type === 'death' &&
      Math.abs((a as DeathAnim).x - x) < 1 &&
      Math.abs((a as DeathAnim).y - y) < 40
    ) as DeathAnim | undefined;

    let alpha = 1;
    if (deathAnim) {
      const blinkPhase = (deathAnim.elapsed / 0.5) * 3;
      alpha = 0.3 + 0.7 * Math.abs(Math.sin(blinkPhase * Math.PI));
      if (deathAnim.elapsed > 0.5) alpha = Math.max(0, 1 - (deathAnim.elapsed - 0.5) / (deathAnim.duration - 0.5));
    }

    const summonAnim = this.animations.find(a =>
      a.type === 'summon' &&
      Math.abs((a as SummonAnim).x - x) < 1 &&
      Math.abs((a as SummonAnim).y - y) < 40
    ) as SummonAnim | undefined;
    if (summonAnim) {
      const t = summonAnim.elapsed / summonAnim.duration;
      alpha = Math.min(1, t * 2);
    }

    ctx.save();
    ctx.globalAlpha = alpha;

    ctx.beginPath();
    ctx.ellipse(x, y + 22, 16, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fill();

    if (selected) {
      const selectedGrad = ctx.createLinearGradient(x - 28, y - 28, x + 28, y + 28);
      selectedGrad.addColorStop(0, '#00FF88');
      selectedGrad.addColorStop(1, '#0088FF');
      ctx.beginPath();
      ctx.arc(x, y, 30, 0, Math.PI * 2);
      ctx.strokeStyle = selectedGrad;
      ctx.lineWidth = 4;
      ctx.shadowColor = '#00FF88';
      ctx.shadowBlur = 15;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    const bodyGrad = ctx.createRadialGradient(x - 5, y - 10, 2, x, y, 22);
    bodyGrad.addColorStop(0, colors.primary);
    bodyGrad.addColorStop(1, colors.secondary);

    ctx.beginPath();
    if (piece.type === 'sword') {
      ctx.moveTo(x, y - 24);
      ctx.lineTo(x + 10, y + 18);
      ctx.lineTo(x, y + 10);
      ctx.lineTo(x - 10, y + 18);
      ctx.closePath();
    } else {
      ctx.moveTo(x - 16, y - 16);
      ctx.lineTo(x + 16, y - 16);
      ctx.lineTo(x + 18, y + 12);
      ctx.quadraticCurveTo(x, y + 24, x - 18, y + 12);
      ctx.closePath();
    }
    ctx.fillStyle = bodyGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (piece.type === 'sword') {
      ctx.beginPath();
      ctx.moveTo(x, y - 24);
      ctx.lineTo(x, y + 8);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#8B7355';
      ctx.fillRect(x - 7, y + 6, 14, 4);
    } else {
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#d4a758';
      ctx.fill();
      ctx.strokeStyle = '#8B7355';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    const hpRatio = Math.max(0, piece.hp / piece.maxHp);
    const barWidth = 32;
    const barHeight = 4;
    const barX = x - barWidth / 2;
    const barY = y + 24;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    const hpColor = hpRatio > 0.5 ? '#4caf50' : hpRatio > 0.25 ? '#ff9800' : '#f44336';
    ctx.fillStyle = hpColor;
    ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(barX, barY, barWidth, barHeight);

    ctx.restore();
  }

  private drawMoveTrails(ctx: CanvasRenderingContext2D): void {
    this.animations.filter(a => a.type === 'move').forEach(a => {
      const anim = a as MoveAnim;
      const rawT = anim.elapsed / anim.duration;
      const from = { x: anim.fromX, y: anim.fromY };
      const to = { x: anim.toX, y: anim.toY };
      const cp = computeBezierControlPoint(from, to);
      const curve: QuadBezier = { p0: from, p1: cp, p2: to };

      ctx.save();
      ctx.beginPath();
      const steps = 28;
      for (let i = 0; i <= steps; i++) {
        const linearParam = (i / steps) * rawT;
        const easedParam = easeInOutCubic(linearParam);
        const pt = quadraticBezier(curve, easedParam);
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      const trailGrad = ctx.createLinearGradient(anim.fromX, anim.fromY, anim.toX, anim.toY);
      trailGrad.addColorStop(0, 'rgba(0, 255, 200, 0)');
      trailGrad.addColorStop(0.5, 'rgba(0, 230, 230, 0.35)');
      trailGrad.addColorStop(1, 'rgba(0, 200, 255, 0.75)');
      ctx.strokeStyle = trailGrad;
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.restore();
    });
  }

  private drawEffects(ctx: CanvasRenderingContext2D): void {
    this.animations.forEach(a => {
      if (a.type === 'attack') this.drawAttackFragments(ctx, a as AttackFragmentsAnim);
      else if (a.type === 'damage') this.drawDamageNumber(ctx, a as DamageNumberAnim);
      else if (a.type === 'death') this.drawDeathFragments(ctx, a as DeathAnim);
      else if (a.type === 'shockwave') this.drawShockwave(ctx, a as ShockwaveAnim);
      else if (a.type === 'summon') this.drawSummonEffect(ctx, a as SummonAnim);
    });
  }

  private drawAttackFragments(ctx: CanvasRenderingContext2D, anim: AttackFragmentsAnim): void {
    const t = anim.elapsed / anim.duration;
    anim.fragments.forEach(f => {
      const dist = f.speed * anim.elapsed;
      const x = anim.x + Math.cos(f.angle) * dist;
      const y = anim.y + Math.sin(f.angle) * dist - (dist * 0.3);
      ctx.save();
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = f.color;
      ctx.fillRect(x - f.size / 2, y - f.size / 2, f.size, f.size);
      ctx.restore();
    });
  }

  private drawDamageNumber(ctx: CanvasRenderingContext2D, anim: DamageNumberAnim): void {
    const t = anim.elapsed / anim.duration;
    const size = 24 + t * 12;
    ctx.save();
    ctx.globalAlpha = 1 - t;
    ctx.font = `bold ${size}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    const yOff = -t * 30;
    ctx.strokeText(`-${anim.damage}`, anim.x, anim.y + yOff);
    ctx.fillText(`-${anim.damage}`, anim.x, anim.y + yOff);
    ctx.restore();
  }

  private drawDeathFragments(ctx: CanvasRenderingContext2D, anim: DeathAnim): void {
    if (anim.elapsed < 0.5) return;
    const t = (anim.elapsed - 0.5) / (anim.duration - 0.5);
    anim.fragments.forEach(f => {
      const dist = f.speed * (anim.elapsed - 0.5);
      const x = anim.x + Math.cos(f.angle) * dist;
      const y = anim.y + Math.sin(f.angle) * dist + (dist * 0.2);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(f.rot + f.rotSpeed * anim.elapsed);
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = anim.color;
      ctx.beginPath();
      ctx.moveTo(0, -f.size / 2);
      ctx.lineTo(f.size / 2, f.size / 2);
      ctx.lineTo(-f.size / 2, f.size / 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });
  }

  private drawShockwave(ctx: CanvasRenderingContext2D, anim: ShockwaveAnim): void {
    const t = anim.elapsed / anim.duration;
    const radius = 10 + t * 30;
    ctx.save();
    ctx.globalAlpha = 0.5 * (1 - t);
    ctx.beginPath();
    ctx.arc(anim.x, anim.y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 220, 150, 0.9)';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();
  }

  private drawSummonEffect(ctx: CanvasRenderingContext2D, anim: SummonAnim): void {
    const t = anim.elapsed / anim.duration;
    ctx.save();
    ctx.globalAlpha = 1 - t;
    const grad = ctx.createRadialGradient(anim.x, anim.y, 2, anim.x, anim.y, 30 + t * 20);
    grad.addColorStop(0, 'rgba(180, 100, 220, 0.8)');
    grad.addColorStop(1, 'rgba(150, 60, 200, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(anim.x, anim.y, 30 + t * 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawBubbles(ctx: CanvasRenderingContext2D): void {
    this.bubbles.forEach(b => {
      ctx.save();
      ctx.globalAlpha = b.alpha;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(100, 180, 120, 0.6)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(180, 220, 180, 0.8)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
      ctx.restore();
    });
  }
}
