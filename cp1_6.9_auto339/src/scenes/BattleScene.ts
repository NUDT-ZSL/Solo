import Phaser from 'phaser';
import { Engine, Piece, GRID_SIZE, PlayerType } from '../modules/Engine';
import { UIModule } from '../modules/UIModule';

interface VisualPiece {
  pieceId: string;
  container: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Graphics;
  currents: { path: Phaser.Curves.Spline; t: number; speed: number; amplitude: number }[];
  stepText: Phaser.GameObjects.Text;
  startGridX: number;
  startGridY: number;
  prevGridX: number;
  prevGridY: number;
  hoverScale: number;
  particlePool: Phaser.GameObjects.Graphics;
}

interface RippleEffect {
  x: number;
  y: number;
  progress: number;
  startRadius: number;
  endRadius: number;
  particles: { angle: number; speed: number; life: number; offset: number }[];
}

interface SplitParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  life: number;
  maxLife: number;
  color: number;
}

interface TideWave {
  direction: 'north' | 'south' | 'east' | 'west';
  progress: number;
  targetCells: { x: number; y: number }[];
  particles: { x: number; y: number; phase: number; speed: number }[];
}

interface SubmergedCell {
  x: number;
  y: number;
  progress: number;
  phase: number;
}

export class BattleScene extends Phaser.Scene {
  private engine!: Engine;
  private ui!: UIModule;

  private readonly CELL_SIZE = 64;
  private readonly BOARD_ORIGIN_X = 384;
  private readonly BOARD_ORIGIN_Y = 100;
  private readonly TURN_TIME_LIMIT = 30;
  private readonly TIDE_INTERVAL = 10;

  private boardGraphics!: Phaser.GameObjects.Graphics;
  private pieceLayer!: Phaser.GameObjects.Graphics;
  private effectLayer!: Phaser.GameObjects.Graphics;
  private tideLayer!: Phaser.GameObjects.Graphics;
  private submergedOverlay!: Phaser.GameObjects.Graphics;

  private visualPieces: Map<string, VisualPiece> = new Map();
  private pieceContainers: Map<string, Phaser.GameObjects.Container> = new Map();

  private turnTimer = 30;
  private tideTimer = 10;
  private matchStarted = false;

  private ripples: RippleEffect[] = [];
  private splitParticles: SplitParticle[] = [];
  private tideWaves: TideWave[] = [];
  private submergedCells: Map<string, SubmergedCell> = new Map();

  private isDragging = false;
  private dragPieceId: string | null = null;
  private mouseWorldX = 0;
  private mouseWorldY = 0;

  private aiActionDelay = 0;
  private pendingGameOverShown = false;

  constructor() {
    super({ key: 'BattleScene' });
  }

  create(): void {
    this.engine = new Engine();
    this.ui = new UIModule(this, this.engine, this.CELL_SIZE, this.BOARD_ORIGIN_X, this.BOARD_ORIGIN_Y);
    this.ui.create();

    this.boardGraphics = this.add.graphics();
    this.submergedOverlay = this.add.graphics();
    this.pieceLayer = this.add.graphics();
    this.effectLayer = this.add.graphics();
    this.tideLayer = this.add.graphics();

    this.drawBoard();
    this.createAllVisualPieces();
    this.setupInput();

    this.turnTimer = this.TURN_TIME_LIMIT;
    this.tideTimer = this.TIDE_INTERVAL;

    this.ui.showMatchStart(() => {
      this.matchStarted = true;
    });
  }

  private drawBoard(): void {
    this.boardGraphics.clear();

    const framePadding = 12;
    this.boardGraphics.fillStyle(0x0D1B2A, 0.4);
    this.boardGraphics.fillRoundedRect(
      this.BOARD_ORIGIN_X - framePadding,
      this.BOARD_ORIGIN_Y - framePadding,
      GRID_SIZE * this.CELL_SIZE + framePadding * 2,
      GRID_SIZE * this.CELL_SIZE + framePadding * 2,
      12
    );
    this.boardGraphics.lineStyle(2, 0x4A6A8A, 0.35);
    this.boardGraphics.strokeRoundedRect(
      this.BOARD_ORIGIN_X - framePadding,
      this.BOARD_ORIGIN_Y - framePadding,
      GRID_SIZE * this.CELL_SIZE + framePadding * 2,
      GRID_SIZE * this.CELL_SIZE + framePadding * 2,
      12
    );

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const isLight = (x + y) % 2 === 0;
        const px = this.BOARD_ORIGIN_X + x * this.CELL_SIZE;
        const py = this.BOARD_ORIGIN_Y + y * this.CELL_SIZE;

        this.boardGraphics.fillStyle(0x0D1B2A, isLight ? 0.28 : 0.12);
        this.boardGraphics.fillRect(px, py, this.CELL_SIZE, this.CELL_SIZE);

        this.boardGraphics.lineStyle(1, 0x4A6A8A, 0.3);
        this.boardGraphics.strokeRect(px, py, this.CELL_SIZE, this.CELL_SIZE);
      }
    }

    for (let i = 0; i <= GRID_SIZE; i++) {
      this.boardGraphics.lineStyle(1.5, 0x4A6A8A, 0.2);
      this.boardGraphics.beginPath();
      this.boardGraphics.moveTo(this.BOARD_ORIGIN_X + i * this.CELL_SIZE, this.BOARD_ORIGIN_Y - 4);
      this.boardGraphics.lineTo(this.BOARD_ORIGIN_X + i * this.CELL_SIZE, this.BOARD_ORIGIN_Y + GRID_SIZE * this.CELL_SIZE + 4);
      this.boardGraphics.strokePath();

      this.boardGraphics.beginPath();
      this.boardGraphics.moveTo(this.BOARD_ORIGIN_X - 4, this.BOARD_ORIGIN_Y + i * this.CELL_SIZE);
      this.boardGraphics.lineTo(this.BOARD_ORIGIN_X + GRID_SIZE * this.CELL_SIZE + 4, this.BOARD_ORIGIN_Y + i * this.CELL_SIZE);
      this.boardGraphics.strokePath();
    }

    const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    for (let i = 0; i < GRID_SIZE; i++) {
      this.add.text(this.BOARD_ORIGIN_X + i * this.CELL_SIZE + this.CELL_SIZE / 2, this.BOARD_ORIGIN_Y - 20, labels[i], {
        fontFamily: 'Arial', fontSize: '11px', color: '#4A6A8A'
      }).setOrigin(0.5);

      this.add.text(this.BOARD_ORIGIN_X - 20, this.BOARD_ORIGIN_Y + i * this.CELL_SIZE + this.CELL_SIZE / 2, String(8 - i), {
        fontFamily: 'Arial', fontSize: '11px', color: '#4A6A8A'
      }).setOrigin(0.5);
    }
  }

  private createAllVisualPieces(): void {
    for (const vp of this.visualPieces.values()) {
      vp.container.destroy();
    }
    this.visualPieces.clear();
    this.pieceContainers.clear();

    for (const piece of this.engine.state.pieces) {
      this.createVisualPiece(piece);
    }
  }

  private createVisualPiece(piece: Piece): void {
    const { x, y } = this.gridToWorld(piece.gridX, piece.gridY);
    const container = this.add.container(x, y);
    container.setDepth(100);

    const body = this.add.graphics();
    container.add(body);

    const currents: VisualPiece['currents'] = [];
    for (let i = 0; i < 3; i++) {
      const angle = Math.random() * Math.PI * 2;
      const points: Phaser.Math.Vector2[] = [];
      for (let j = 0; j < 5; j++) {
        const t = j / 4;
        const ox = Math.cos(angle + t * Math.PI) * piece.radius * 0.6 * (t - 0.5);
        const oy = Math.sin(angle + t * Math.PI * 1.3) * piece.radius * 0.4;
        points.push(new Phaser.Math.Vector2(ox, oy));
      }
      currents.push({
        path: new Phaser.Curves.Spline(points),
        t: Math.random(),
        speed: 0.08 + Math.random() * 0.05,
        amplitude: 2
      });
    }

    const fontSize = Math.max(8, Math.floor(piece.radius / 2));
    const stepText = this.add.text(0, -piece.radius - 12, '', {
      fontFamily: 'Arial',
      fontSize: `${fontSize}px`,
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    stepText.setShadow(0, 0, '#87CEEB', 4, true, true);
    container.add(stepText);

    container.setInteractive(new Phaser.Geom.Circle(0, 0, piece.radius + 4), Phaser.Geom.Circle.Contains);

    const visualPiece: VisualPiece = {
      pieceId: piece.id,
      container,
      body,
      currents,
      stepText,
      startGridX: piece.gridX,
      startGridY: piece.gridY,
      prevGridX: piece.gridX,
      prevGridY: piece.gridY,
      hoverScale: 1,
      particlePool: this.add.graphics()
    };

    this.drawPieceBody(visualPiece, piece, 0);
    this.updateStepText(visualPiece, piece);

    this.visualPieces.set(piece.id, visualPiece);
    this.pieceContainers.set(piece.id, container);
  }

  private drawPieceBody(vp: VisualPiece, piece: Piece, animT: number): void {
    const g = vp.body;
    g.clear();

    let radius = piece.radius;
    let scale = vp.hoverScale;
    let opacityMod = 1;

    if (piece.isMoving && piece.animProgress !== undefined) {
      const t = Math.min(1, piece.animProgress);
      const bob = Math.sin(t * Math.PI) * 3;
      vp.container.y += 0;
    }

    if (piece.isFusing && piece.animProgress !== undefined) {
      const t = Math.min(1, piece.animProgress);
      scale *= 1 - t * 0.3;
      opacityMod = 1 - t * 0.5;
    }

    if (piece.isSplitting && piece.animProgress !== undefined) {
      const t = Math.min(1, piece.animProgress);
      scale *= 1 + t * 0.3;
      opacityMod = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
    }

    if (piece.submerged) {
      opacityMod *= 0.6;
      scale *= 0.95;
    }

    const finalRadius = radius * scale;

    const baseColor = piece.owner === 'player' ? 0x5dade2 : 0xe74c3c;
    const baseGlow = piece.owner === 'player' ? 'rgba(135,206,235,' : 'rgba(231,76,60,';

    for (let i = 5; i >= 0; i--) {
      const r = finalRadius + i * 2;
      const a = (0.15 * (1 - i / 6)) * opacityMod;
      g.fillStyle(baseColor, a);
      g.fillCircle(0, 0, r);
    }

    const gradientSteps = 12;
    for (let i = 0; i < gradientSteps; i++) {
      const t = i / (gradientSteps - 1);
      const r = finalRadius * t;
      let alpha, colorStr;
      if (t < 0.3) {
        alpha = 0.9 * (1 - t * 0.5) * opacityMod;
        colorStr = piece.owner === 'player' ? 'rgba(135,206,235,' : 'rgba(255,150,150,';
      } else if (t < 0.7) {
        alpha = (0.9 - (t - 0.3) * 0.875) * opacityMod;
        colorStr = piece.owner === 'player' ? 'rgba(180,230,255,' : 'rgba(255,200,200,';
      } else {
        alpha = (0.55 - (t - 0.7) * 1.17) * opacityMod;
        colorStr = 'rgba(255,255,255,';
      }
      const colorInt = this.parseRgbaColor(colorStr + alpha.toFixed(3) + ')');
      g.fillStyle(colorInt, alpha);
      g.fillCircle(0, 0, r);
    }

    g.fillStyle(0xffffff, 0.35 * opacityMod);
    g.fillCircle(-finalRadius * 0.3, -finalRadius * 0.3, finalRadius * 0.25);
    g.fillStyle(0xffffff, 0.15 * opacityMod);
    g.fillCircle(finalRadius * 0.2, finalRadius * 0.15, finalRadius * 0.1);

    const time = Date.now() * 0.0005;
    for (let i = 0; i < vp.currents.length; i++) {
      const c = vp.currents[i];
      c.t += c.speed * 0.016;
      if (c.t > 1) c.t -= 1;

      const points: { x: number; y: number }[] = [];
      for (let j = 0; j <= 20; j++) {
        const localT = (c.t + j / 20) % 1;
        const pt = c.path.getPoint(localT);
        const wobbleX = Math.sin(localT * 8 + time * 4 + i) * c.amplitude;
        const wobbleY = Math.cos(localT * 6 + time * 3 + i * 2) * c.amplitude * 0.7;
        points.push({
          x: pt.x * scale + wobbleX,
          y: pt.y * scale + wobbleY
        });
      }

      g.lineStyle(1.5, piece.owner === 'player' ? 0xffffff : 0xffdddd, 0.35 * opacityMod);
      g.beginPath();
      g.moveTo(points[0].x, points[0].y);
      for (let j = 1; j < points.length; j++) {
        g.lineTo(points[j].x, points[j].y);
      }
      g.strokePath();
    }

    g.lineStyle(1.5, baseColor, 0.5 * opacityMod);
    g.strokeCircle(0, 0, finalRadius);
  }

  private parseRgbaColor(rgba: string): number {
    const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      const r = parseInt(match[1]);
      const g = parseInt(match[2]);
      const b = parseInt(match[3]);
      return (r << 16) | (g << 8) | b;
    }
    return 0x87CEEB;
  }

  private updateStepText(vp: VisualPiece, piece: Piece): void {
    const fontSize = Math.max(8, Math.floor(piece.radius / 2));
    vp.stepText.setFontSize(fontSize);
    vp.stepText.setText(`${piece.remainingSteps}`);
    vp.stepText.y = -piece.radius - 10;
    vp.stepText.setAlpha(piece.submerged ? 0.5 : 1);

    if (piece.owner === 'ai') {
      vp.stepText.setColor('#ffcccc');
      vp.stepText.setShadow(0, 0, '#e74c3c', 3, true, true);
    } else {
      vp.stepText.setColor('#ffffff');
      vp.stepText.setShadow(0, 0, '#87CEEB', 3, true, true);
    }
  }

  private gridToWorld(gx: number, gy: number): { x: number; y: number } {
    return {
      x: this.BOARD_ORIGIN_X + gx * this.CELL_SIZE + this.CELL_SIZE / 2,
      y: this.BOARD_ORIGIN_Y + gy * this.CELL_SIZE + this.CELL_SIZE / 2
    };
  }

  private worldToGrid(wx: number, wy: number): { x: number; y: number } {
    return {
      x: Math.floor((wx - this.BOARD_ORIGIN_X) / this.CELL_SIZE),
      y: Math.floor((wy - this.BOARD_ORIGIN_Y) / this.CELL_SIZE)
    };
  }

  private setupInput(): void {
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.mouseWorldX = pointer.x;
      this.mouseWorldY = pointer.y;

      if (!this.matchStarted) return;

      const grid = this.worldToGrid(pointer.x, pointer.y);
      if (grid.x >= 0 && grid.x < GRID_SIZE && grid.y >= 0 && grid.y < GRID_SIZE) {
        this.ui.setHoverCell(grid);
      } else {
        this.ui.setHoverCell(null);
      }

      if (this.isDragging && this.dragPieceId) {
        const vp = this.visualPieces.get(this.dragPieceId);
        if (vp) {
          const piece = this.engine.state.pieces.find(p => p.id === this.dragPieceId);
          if (piece) {
            this.ui.showGhostCircle(pointer.x, pointer.y, piece.radius + 4);
          }
        }
      }

      for (const vp of this.visualPieces.values()) {
        const piece = this.engine.state.pieces.find(p => p.id === vp.pieceId);
        if (!piece) continue;

        const bounds = vp.container.getBounds();
        const hover = bounds.contains(pointer.x, pointer.y);

        if (hover && piece.owner === this.engine.state.currentTurn && !piece.isFusing && !piece.isSplitting && !piece.submerged) {
          vp.hoverScale = 1.1;
        } else if (vp.pieceId === this.engine.state.selectedPieceId) {
          vp.hoverScale = 1.08;
        } else {
          vp.hoverScale = 1;
        }
      }
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.matchStarted) return;
      if (this.engine.state.gameOver) return;
      if (this.engine.state.currentTurn !== 'player') return;

      if (pointer.rightButtonDown()) {
        const selectedId = this.engine.state.selectedPieceId;
        if (selectedId && this.engine.canSplitPiece(selectedId)) {
          const piece = this.engine.state.pieces.find(p => p.id === selectedId);
          if (piece) {
            this.emitSplitParticles(piece);
          }
          this.engine.splitPiece(selectedId);
          setTimeout(() => this.syncVisualPieces(), 820);
        }
        return;
      }

      let hitPieceId: string | null = null;
      for (const [pid, vp] of this.visualPieces.entries()) {
        const bounds = vp.container.getBounds();
        if (bounds.contains(pointer.x, pointer.y)) {
          hitPieceId = pid;
          break;
        }
      }

      if (hitPieceId) {
        const hitPiece = this.engine.state.pieces.find(p => p.id === hitPieceId);
        if (!hitPiece) return;

        if (this.engine.state.selectedPieceId && hitPiece.owner === 'player' && hitPieceId !== this.engine.state.selectedPieceId) {
          const selectedId = this.engine.state.selectedPieceId;
          if (this.engine.canMovePiece(selectedId, hitPiece.gridX, hitPiece.gridY)) {
            const res = this.engine.movePiece(selectedId, hitPiece.gridX, hitPiece.gridY);
            if (res.success && res.action === 'fuse') {
              this.createFusionRipple(hitPiece);
            }
            this.engine.selectPiece(null);
            setTimeout(() => this.syncVisualPieces(), 620);
            return;
          }
        }

        if (hitPiece.owner === 'player') {
          this.engine.selectPiece(hitPieceId);
          this.isDragging = true;
          this.dragPieceId = hitPieceId;
        } else {
          const selectedId = this.engine.state.selectedPieceId;
          if (selectedId) {
            this.tryMoveSelected(hitPiece.gridX, hitPiece.gridY);
          }
        }
      } else {
        const grid = this.worldToGrid(pointer.x, pointer.y);
        if (grid.x >= 0 && grid.x < GRID_SIZE && grid.y >= 0 && grid.y < GRID_SIZE) {
          this.tryMoveSelected(grid.x, grid.y);
        } else {
          this.engine.selectPiece(null);
        }
      }
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!this.matchStarted) return;

      if (this.isDragging && this.dragPieceId) {
        const grid = this.worldToGrid(pointer.x, pointer.y);
        if (grid.x >= 0 && grid.x < GRID_SIZE && grid.y >= 0 && grid.y < GRID_SIZE) {
          this.tryMoveSelected(grid.x, grid.y);
        }
      }
      this.isDragging = false;
      this.dragPieceId = null;
      this.ui.clearGhostCircle();
    });
  }

  private tryMoveSelected(toX: number, toY: number): void {
    const selectedId = this.engine.state.selectedPieceId;
    if (!selectedId) return;

    if (this.engine.canMovePiece(selectedId, toX, toY)) {
      const res = this.engine.movePiece(selectedId, toX, toY);
      if (res.success && res.action === 'fuse') {
        const target = this.engine.getPieceAt(toX, toY);
        if (target) this.createFusionRipple(target);
        setTimeout(() => this.syncVisualPieces(), 620);
      }
    }
    this.engine.selectPiece(null);
  }

  private createFusionRipple(piece: Piece): void {
    const pos = this.gridToWorld(piece.gridX, piece.gridY);
    const particles: RippleEffect['particles'] = [];
    for (let i = 0; i < 16; i++) {
      particles.push({
        angle: (i / 16) * Math.PI * 2,
        speed: 80 + Math.random() * 40,
        life: 0.8,
        offset: Math.random() * 20
      });
    }
    this.ripples.push({
      x: pos.x,
      y: pos.y,
      progress: 0,
      startRadius: 20,
      endRadius: 80,
      particles
    });
  }

  private emitSplitParticles(piece: Piece): void {
    const pos = this.gridToWorld(piece.gridX, piece.gridY);
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 80 + Math.random() * 60;
      this.splitParticles.push({
        x: pos.x,
        y: pos.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2 + Math.random() * 4,
        life: 0.5,
        maxLife: 0.5,
        color: piece.owner === 'player' ? 0x87CEEB : 0xff8888
      });
    }
  }

  private syncVisualPieces(): void {
    const aliveIds = new Set<string>();

    for (const piece of this.engine.state.pieces) {
      aliveIds.add(piece.id);
      if (!this.visualPieces.has(piece.id)) {
        this.createVisualPiece(piece);
      }
      const vp = this.visualPieces.get(piece.id)!;
      vp.prevGridX = vp.startGridX;
      vp.prevGridY = vp.startGridY;
      vp.startGridX = piece.gridX;
      vp.startGridY = piece.gridY;
    }

    for (const [pid, vp] of this.visualPieces.entries()) {
      if (!aliveIds.has(pid)) {
        const piece = this.engine.state.pieces.find(p => p.id === pid);
        if (piece && piece.radius < 4) {
          this.emitSplitParticles(piece);
        }
        vp.container.destroy();
        this.visualPieces.delete(pid);
        this.pieceContainers.delete(pid);
      }
    }
  }

  update(time: number, delta: number): void {
    const dt = Math.min(delta / 1000, 0.05);

    if (this.matchStarted && !this.engine.state.matchWinner) {
      this.turnTimer -= dt;
      this.tideTimer -= dt;

      if (this.tideTimer <= 0) {
        this.triggerTideEvent();
        this.tideTimer = this.TIDE_INTERVAL;
      }

      if (this.turnTimer <= 0) {
        this.engine.endTurn();
        this.turnTimer = this.TURN_TIME_LIMIT;
      }

      if (this.engine.state.currentTurn === 'ai' && !this.engine.state.gameOver) {
        this.aiActionDelay -= dt;
        if (this.aiActionDelay <= 0) {
          this.executeAIAction();
          this.aiActionDelay = 0.8 + Math.random() * 0.6;
        }
      }
    }

    this.engine.updateTideSubmergence(dt);
    this.updateVisualPieces(dt);
    this.updateRipples(dt);
    this.updateSplitParticles(dt);
    this.updateTideWaves(dt);
    this.updateSubmergedOverlay(dt);
    this.ui.update(dt, this.turnTimer);

    if (this.engine.state.gameOver && !this.pendingGameOverShown) {
      this.pendingGameOverShown = true;
      this.time.delayedCall(500, () => {
        const winner = this.engine.state.winner || 'player';
        const isMatch = this.engine.state.matchWinner !== null;
        this.ui.showGameOver(winner, isMatch, () => {
          this.handleRestart(isMatch);
        });
      });
    }
  }

  private updateVisualPieces(dt: number): void {
    for (const vp of this.visualPieces.values()) {
      const piece = this.engine.state.pieces.find(p => p.id === vp.pieceId);
      if (!piece) continue;

      let targetX: number, targetY: number;

      if (piece.isFusing && piece.targetX !== undefined && piece.targetY !== undefined) {
        const mid = this.gridToWorld(piece.targetX, piece.targetY);
        const orig = this.gridToWorld(vp.startGridX, vp.startGridY);
        const t = Math.min(1, piece.animProgress || 0);
        targetX = orig.x + (mid.x - orig.x) * t;
        targetY = orig.y + (mid.y - orig.y) * t;
      } else if (piece.isMoving && piece.animProgress !== undefined) {
        const t = Math.min(1, piece.animProgress);
        const startPos = this.gridToWorld(vp.prevGridX, vp.prevGridY);
        const endPos = this.gridToWorld(piece.gridX, piece.gridY);
        const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        targetX = startPos.x + (endPos.x - startPos.x) * easeT;
        targetY = startPos.y + (endPos.y - startPos.y) * easeT - Math.sin(t * Math.PI) * 8;
      } else {
        const pos = this.gridToWorld(piece.gridX, piece.gridY);
        targetX = pos.x;
        targetY = pos.y;
      }

      if (this.isDragging && this.dragPieceId === vp.pieceId) {
        const pos = this.gridToWorld(piece.gridX, piece.gridY);
        const t = 0.6;
        vp.container.x = pos.x + (this.mouseWorldX - pos.x) * t;
        vp.container.y = pos.y + (this.mouseWorldY - pos.y) * t;
      } else {
        vp.container.x += (targetX - vp.container.x) * Math.min(1, dt * 15);
        vp.container.y += (targetY - vp.container.y) * Math.min(1, dt * 15);
      }

      this.drawPieceBody(vp, piece, 0);
      this.updateStepText(vp, piece);

      if (piece.isSplitting && piece.animProgress !== undefined && piece.animProgress > 0.3) {
        if (Math.random() < 0.4) {
          const angle = Math.random() * Math.PI * 2;
          this.splitParticles.push({
            x: vp.container.x,
            y: vp.container.y,
            vx: Math.cos(angle) * 60,
            vy: Math.sin(angle) * 60,
            radius: 1.5 + Math.random() * 2,
            life: 0.4,
            maxLife: 0.4,
            color: piece.owner === 'player' ? 0x87CEEB : 0xff8888
          });
        }
      }
    }
  }

  private updateRipples(dt: number): void {
    this.effectLayer.clear();

    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.progress += dt / 0.8;

      if (r.progress >= 1) {
        this.ripples.splice(i, 1);
        continue;
      }

      const t = r.progress;
      const radius = r.startRadius + (r.endRadius - r.startRadius) * t;
      const alpha = 1 - t;

      this.effectLayer.lineStyle(2, 0xffffff, 0.5 * alpha);
      this.effectLayer.strokeCircle(r.x, r.y, radius);
      this.effectLayer.lineStyle(1, 0x5dade2, 0.4 * alpha);
      this.effectLayer.strokeCircle(r.x, r.y, radius * 0.85);

      for (const p of r.particles) {
        const pr = radius + p.offset;
        const px = r.x + Math.cos(p.angle + t * 2) * pr;
        const py = r.y + Math.sin(p.angle + t * 2) * pr;
        this.effectLayer.fillStyle(0xffffff, 0.7 * alpha);
        this.effectLayer.fillCircle(px, py, 1.5 + alpha * 2);
      }
    }
  }

  private updateSplitParticles(dt: number): void {
    for (let i = this.splitParticles.length - 1; i >= 0; i--) {
      const p = this.splitParticles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 100 * dt;
      p.life -= dt;

      if (p.life <= 0) {
        this.splitParticles.splice(i, 1);
        continue;
      }

      const alpha = p.life / p.maxLife;
      this.effectLayer.fillStyle(p.color, alpha);
      this.effectLayer.fillCircle(p.x, p.y, p.radius * alpha);
    }
  }

  private triggerTideEvent(): void {
    const result = this.engine.triggerTide();
    if (result.cells.length === 0) return;

    const direction = result.cells[0].direction as TideWave['direction'];
    const particles: TideWave['particles'] = [];
    for (let i = 0; i < 180; i++) {
      particles.push({
        x: 0,
        y: 0,
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 1
      });
    }

    this.tideWaves.push({
      direction,
      progress: 0,
      targetCells: result.cells.map(c => ({ x: c.x, y: c.y })),
      particles
    });

    for (const cell of result.cells) {
      const key = `${cell.x},${cell.y}`;
      this.submergedCells.set(key, {
        x: cell.x,
        y: cell.y,
        progress: 0,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  private updateTideWaves(dt: number): void {
    this.tideLayer.clear();

    for (let i = this.tideWaves.length - 1; i >= 0; i--) {
      const w = this.tideWaves[i];
      w.progress += dt * 1.8;

      if (w.progress >= 1) {
        this.tideWaves.splice(i, 1);
        continue;
      }

      const t = w.progress;
      const waveHeight = 30;
      const waveWidth = 200;
      const boardStartX = this.BOARD_ORIGIN_X;
      const boardStartY = this.BOARD_ORIGIN_Y;
      const boardEndX = boardStartX + GRID_SIZE * this.CELL_SIZE;
      const boardEndY = boardStartY + GRID_SIZE * this.CELL_SIZE;

      let originX = 0, originY = 0, dirX = 0, dirY = 0;
      switch (w.direction) {
        case 'north': originX = (boardStartX + boardEndX) / 2; originY = boardStartY; dirX = 0; dirY = 1; break;
        case 'south': originX = (boardStartX + boardEndX) / 2; originY = boardEndY; dirX = 0; dirY = -1; break;
        case 'east': originX = boardEndX; originY = (boardStartY + boardEndY) / 2; dirX = -1; dirY = 0; break;
        case 'west': originX = boardStartX; originY = (boardStartY + boardEndY) / 2; dirX = 1; dirY = 0; break;
      }

      const waveProgress = t * 1.2;
      const arcDist = waveProgress * waveWidth;

      for (let s = -waveWidth / 2; s <= waveWidth / 2; s += 4) {
        const st = (s + waveWidth / 2) / waveWidth;
        const arc = Math.sin(st * Math.PI) * waveHeight * Math.max(0, 1 - Math.abs(t - 0.5) * 2);
        const mainDist = arcDist - Math.abs(s) * 0.3;
        const baseX = originX + (dirY !== 0 ? s : 0) + dirX * mainDist;
        const baseY = originY + (dirX !== 0 ? s : 0) + dirY * mainDist;

        const pcount = Math.floor(w.particles.length / 60);
        for (let pi = 0; pi < 3; pi++) {
          const idx = ((s / 4) | 0) * 3 + pi;
          if (idx >= w.particles.length) continue;
          const p = w.particles[idx];
          const wobble = Math.sin(t * 6 + p.phase) * 6;
          const wobble2 = Math.cos(t * 5 + p.phase) * 4;
          const px = baseX + (dirX !== 0 ? wobble : wobble2);
          const py = baseY - arc + (dirY !== 0 ? wobble : wobble2);

          const alpha = (1 - t) * 0.6 * Math.sin(st * Math.PI);
          const colorMix = st < 0.5 ? 0x1a5276 : 0x5dade2;

          this.tideLayer.fillStyle(colorMix, alpha * 0.7);
          this.tideLayer.fillCircle(px, py, 2 + Math.sin(t * 8 + p.phase) * 1);
        }
      }

      for (let j = 0; j < 10; j++) {
        const jt = j / 10;
        const arc = Math.sin(jt * Math.PI) * waveHeight * Math.max(0, 1 - Math.abs(t - 0.5) * 1.5);
        const mainDist = waveProgress * waveWidth * 0.8;
        const sx = originX + (dirY !== 0 ? (jt - 0.5) * waveWidth : 0) + dirX * mainDist;
        const sy = originY - arc + (dirX !== 0 ? (jt - 0.5) * waveWidth : 0) + dirY * mainDist;

        const alpha = (1 - t) * 0.4;
        this.tideLayer.lineStyle(3, 0x5dade2, alpha);
        this.tideLayer.beginPath();
        this.tideLayer.arc(sx, sy, 8, 0, Math.PI * 2);
        this.tideLayer.strokePath();
      }
    }
  }

  private updateSubmergedOverlay(dt: number): void {
    this.submergedOverlay.clear();

    for (const [key, sc] of this.submergedCells) {
      const cell = this.engine.state.grid[sc.y]?.[sc.x];
      if (!cell || !cell.submerged) {
        sc.progress += dt / 0.4;
        if (sc.progress >= 1) {
          this.submergedCells.delete(key);
          continue;
        }
      } else {
        sc.progress = Math.min(1, sc.progress + dt / 0.3);
      }

      sc.phase += dt * 2;

      const alpha = cell?.submerged ? sc.progress : 1 - sc.progress;
      const px = this.BOARD_ORIGIN_X + sc.x * this.CELL_SIZE;
      const py = this.BOARD_ORIGIN_Y + sc.y * this.CELL_SIZE;

      this.submergedOverlay.fillStyle(0x1a5276, 0.35 * alpha);
      this.submergedOverlay.fillRect(px, py, this.CELL_SIZE, this.CELL_SIZE);

      for (let line = 0; line < 3; line++) {
        const lineY = py + this.CELL_SIZE * (0.2 + line * 0.3);
        this.submergedOverlay.lineStyle(1.5, 0x5dade2, 0.4 * alpha);
        this.submergedOverlay.beginPath();
        for (let lx = 0; lx <= this.CELL_SIZE; lx += 2) {
          const waveY = lineY + Math.sin((lx / this.CELL_SIZE) * Math.PI * 4 + sc.phase + line) * 2;
          if (lx === 0) this.submergedOverlay.moveTo(px + lx, waveY);
          else this.submergedOverlay.lineTo(px + lx, waveY);
        }
        this.submergedOverlay.strokePath();
      }

      this.submergedOverlay.lineStyle(1, 0x87CEEB, 0.5 * alpha);
      this.submergedOverlay.strokeRect(px + 2, py + 2, this.CELL_SIZE - 4, this.CELL_SIZE - 4);
    }
  }

  private executeAIAction(): void {
    const action = this.engine.getAIAction();

    switch (action.type) {
      case 'move':
        if (action.pieceId !== undefined && action.toX !== undefined && action.toY !== undefined) {
          const res = this.engine.movePiece(action.pieceId, action.toX, action.toY);
          if (res.success && res.action === 'fuse') {
            const target = this.engine.getPieceAt(action.toX, action.toY);
            if (target) this.createFusionRipple(target);
            setTimeout(() => this.syncVisualPieces(), 620);
          }
        }
        break;
      case 'fuse':
        if (action.pieceId && action.targetId) {
          const target = this.engine.state.pieces.find(p => p.id === action.targetId);
          if (target) {
            const res = this.engine.fusePieces(action.pieceId, action.targetId);
            if (res.success) {
              this.createFusionRipple(target);
              setTimeout(() => this.syncVisualPieces(), 620);
            }
          }
        }
        break;
      case 'split':
        if (action.pieceId) {
          const piece = this.engine.state.pieces.find(p => p.id === action.pieceId);
          if (piece) this.emitSplitParticles(piece);
          this.engine.splitPiece(action.pieceId);
          setTimeout(() => this.syncVisualPieces(), 820);
        }
        break;
      case 'endTurn':
      default:
        this.engine.endTurn();
        this.turnTimer = this.TURN_TIME_LIMIT;
        break;
    }
  }

  private handleRestart(isMatchReset: boolean): void {
    this.pendingGameOverShown = false;
    this.ripples = [];
    this.splitParticles = [];
    this.tideWaves = [];
    this.submergedCells.clear();
    this.turnTimer = this.TURN_TIME_LIMIT;
    this.tideTimer = this.TIDE_INTERVAL;

    if (isMatchReset) {
      this.engine.state.scores = { player: 0, ai: 0 };
      this.engine.state.matchWinner = null;
    }

    this.engine.resetRound();
    this.syncVisualPieces();
  }
}
