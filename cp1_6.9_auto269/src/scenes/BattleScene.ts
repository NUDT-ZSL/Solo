import Phaser from 'phaser';
import { Piece, Position, RecordedAction, PieceType, PIECE_CONFIGS } from '../entities/Piece';
import { BoardSystem, BOARD_SIZE, CELL_SIZE } from '../systems/BoardSystem';
import { ShadowSystem, Shadow } from '../systems/ShadowSystem';

const BOARD_OFFSET_X = 40;
const BOARD_OFFSET_Y = 100;
const TOTAL_CELLS = BOARD_SIZE * CELL_SIZE;

export class BattleScene extends Phaser.Scene {
  private board!: BoardSystem;
  private shadowSystem!: ShadowSystem;
  private pieces!: Piece[];

  private currentPlayer: number = 1;
  private turnNumber: number = 1;
  private actionsUsedThisTurn: number = 0;
  private maxActionsPerTurn: number = 1;
  private hasExtraMove: boolean = false;
  private gameEnded: boolean = false;

  private selectedPiece: Piece | null = null;
  private movableCells: Position[] = [];
  private attackableCells: Position[] = [];
  private highlightGraphics: Phaser.GameObjects.Graphics | null = null;
  private boardGraphics: Phaser.GameObjects.Graphics | null = null;
  private coreNodeGraphics: Phaser.GameObjects.Graphics | null = null;
  private shadowGraphics: Phaser.GameObjects.Graphics | null = null;
  private uiGraphics: Phaser.GameObjects.Graphics | null = null;

  private turnLabel!: Phaser.GameObjects.Text;
  private playerLabel!: Phaser.GameObjects.Text;
  private extraMoveIcon!: Phaser.GameObjects.Container | null;

  private pieceSprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private shadowSprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private coreNodeAnimations: Phaser.Time.TimerEvent | null = null;

  private isProcessing: boolean = false;
  private animatingShadows: boolean = false;

  constructor() {
    super({ key: 'BattleScene' });
  }

  public create(): void {
    this.board = new BoardSystem();
    this.shadowSystem = new ShadowSystem();
    this.pieces = [];

    this.createLayers();
    this.drawBoard();
    this.createUI();
    this.initializePieces();
    this.drawCoreNodes();
    this.setupInput();
    this.syncOccupancy();
    this.startTurn(1);
    this.updateSidePanel();
    this.startCoreNodePulse();
  }

  private createLayers(): void {
    this.boardGraphics = this.add.graphics();
    this.highlightGraphics = this.add.graphics();
    this.coreNodeGraphics = this.add.graphics();
    this.shadowGraphics = this.add.graphics();
    this.uiGraphics = this.add.graphics();
  }

  private drawBoard(): void {
    if (!this.boardGraphics) return;
    const g = this.boardGraphics;

    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        const px = BOARD_OFFSET_X + x * CELL_SIZE;
        const py = BOARD_OFFSET_Y + y * CELL_SIZE;
        const cell = this.board.cells[y][x];

        const isChecker = (x + y) % 2 === 0;
        const baseAlpha = isChecker ? 0.35 : 0.25;
        let ownerColor = 0x2a1a4a;
        if (cell.ownerPlayerId === 1) ownerColor = 0x1a4a6e;
        else if (cell.ownerPlayerId === 2) ownerColor = 0x6e1a2a;

        g.fillStyle(ownerColor, baseAlpha);
        g.fillRect(px, py, CELL_SIZE, CELL_SIZE);
      }
    }

    g.lineStyle(1, 0xffffff, 0.4);
    for (let i = 0; i <= BOARD_SIZE; i++) {
      g.beginPath();
      g.moveTo(BOARD_OFFSET_X + i * CELL_SIZE, BOARD_OFFSET_Y);
      g.lineTo(BOARD_OFFSET_X + i * CELL_SIZE, BOARD_OFFSET_Y + TOTAL_CELLS);
      g.strokePath();

      g.beginPath();
      g.moveTo(BOARD_OFFSET_X, BOARD_OFFSET_Y + i * CELL_SIZE);
      g.lineTo(BOARD_OFFSET_X + TOTAL_CELLS, BOARD_OFFSET_Y + i * CELL_SIZE);
      g.strokePath();
    }
  }

  private redrawBoardCells(): void {
    if (!this.boardGraphics) return;
    this.boardGraphics.clear();
    this.drawBoard();
  }

  private createUI(): void {
    if (!this.uiGraphics) return;
    const g = this.uiGraphics;

    g.fillStyle(0x000000, 0.3);
    this.drawRoundedRect(g, BOARD_OFFSET_X, 20, TOTAL_CELLS, 60, 10);

    this.turnLabel = this.add.text(
      BOARD_OFFSET_X + 20, 40,
      `回合 1`,
      { fontFamily: 'Microsoft YaHei', fontSize: '24px', color: '#ffffff', fontStyle: 'bold' }
    );

    this.playerLabel = this.add.text(
      BOARD_OFFSET_X + TOTAL_CELLS - 120, 40,
      `玩家1`,
      { fontFamily: 'Microsoft YaHei', fontSize: '24px', color: '#4fc3f7', fontStyle: 'bold' }
    );

    this.extraMoveIcon = null;
  }

  private drawRoundedRect(
    g: Phaser.GameObjects.Graphics,
    x: number, y: number, w: number, h: number, r: number
  ): void {
    g.fillRoundedRect(x, y, w, h, r);
  }

  private initializePieces(): void {
    const p1Positions: { type: PieceType; pos: Position }[] = [
      { type: 'commander', pos: { x: 3, y: 7 } },
      { type: 'guardian', pos: { x: 2, y: 7 } },
      { type: 'sniper', pos: { x: 5, y: 7 } },
      { type: 'sentinel', pos: { x: 6, y: 7 } }
    ];
    const p2Positions: { type: PieceType; pos: Position }[] = [
      { type: 'commander', pos: { x: 4, y: 0 } },
      { type: 'guardian', pos: { x: 5, y: 0 } },
      { type: 'sniper', pos: { x: 2, y: 0 } },
      { type: 'sentinel', pos: { x: 1, y: 0 } }
    ];

    for (const cfg of p1Positions) {
      this.createPiece(1, cfg.type, cfg.pos);
    }
    for (const cfg of p2Positions) {
      this.createPiece(2, cfg.type, cfg.pos);
    }
  }

  private createPiece(playerId: number, type: PieceType, pos: Position): void {
    const piece = new Piece(playerId, type, pos);
    this.pieces.push(piece);
    this.createPieceSprite(piece);
  }

  private createPieceSprite(piece: Piece): void {
    const pos = this.board.gridToPixel(piece.position, BOARD_OFFSET_X, BOARD_OFFSET_Y);
    const container = this.add.container(pos.x, pos.y);
    container.setSize(50, 50);

    const color = piece.getPlayerColor();
    const base = this.add.graphics();
    base.fillStyle(0x000000, 0.5);
    base.fillCircle(2, 2, 25);

    const body = this.add.graphics();
    for (let i = 5; i >= 0; i--) {
      const shade = Phaser.Display.Color.IntegerToColor(color);
      shade.lighten(i * 4);
      body.fillStyle(shade.color, 1 - i * 0.08);
      body.fillCircle(0, -i * 0.8, 25 - i * 0.5);
    }

    const highlight = this.add.graphics();
    highlight.fillStyle(0xffffff, 0.35);
    highlight.fillCircle(-7, -8, 7);

    const glow = this.add.graphics();
    glow.lineStyle(2, color, 0.7);
    glow.strokeCircle(0, 0, 27);

    const symbolText = this.add.text(
      0, 0, piece.config.symbol,
      { fontFamily: 'Microsoft YaHei', fontSize: '22px', color: '#ffffff', fontStyle: 'bold' }
    );
    symbolText.setOrigin(0.5, 0.5);

    container.add([base, body, glow, highlight, symbolText]);
    container.setData('pieceId', piece.id);
    container.setInteractive(new Phaser.Geom.Circle(0, 0, 27), Phaser.Geom.Circle.Contains);

    piece.sprite = container;
    this.pieceSprites.set(piece.id, container);
  }

  private drawCoreNodes(): void {
    if (!this.coreNodeGraphics) return;
    const g = this.coreNodeGraphics;
    g.clear();

    for (const node of this.board.coreNodes) {
      const pos = this.board.gridToPixel(node, BOARD_OFFSET_X, BOARD_OFFSET_Y);
      const cell = this.board.cells[node.y][node.x];

      let ownerColor = 0xffd700;
      if (cell.ownerPlayerId === 1) ownerColor = 0x4fc3f7;
      else if (cell.ownerPlayerId === 2) ownerColor = 0xef5350;

      g.lineStyle(2, ownerColor, 0.85);
      g.strokeCircle(pos.x, pos.y, 20);

      g.fillStyle(ownerColor, 0.35);
      g.fillCircle(pos.x, pos.y, 12);

      g.lineStyle(1, 0xffffff, 0.5);
      g.strokeCircle(pos.x, pos.y, 12);
    }
  }

  private startCoreNodePulse(): void {
    this.coreNodeAnimations = this.time.addEvent({
      delay: 2000,
      loop: true,
      callback: () => {
        this.tweens.addCounter({
          from: 1,
          to: 1.5,
          duration: 1000,
          ease: Phaser.Math.Easing.Sine.InOut,
          yoyo: true,
          onUpdate: (tween) => {
            if (!this.coreNodeGraphics) return;
            this.coreNodeGraphics.clear();
            const scale = tween.getValue() ?? 1;
            for (const node of this.board.coreNodes) {
              const pos = this.board.gridToPixel(node, BOARD_OFFSET_X, BOARD_OFFSET_Y);
              const cell = this.board.cells[node.y][node.x];

              let ownerColor = 0xffd700;
              if (cell.ownerPlayerId === 1) ownerColor = 0x4fc3f7;
              else if (cell.ownerPlayerId === 2) ownerColor = 0xef5350;

              this.coreNodeGraphics!.lineStyle(2, ownerColor, 0.85);
              this.coreNodeGraphics!.strokeCircle(pos.x, pos.y, 20 * scale);

              this.coreNodeGraphics!.fillStyle(ownerColor, 0.35);
              this.coreNodeGraphics!.fillCircle(pos.x, pos.y, 12);

              this.coreNodeGraphics!.lineStyle(1, 0xffffff, 0.5);
              this.coreNodeGraphics!.strokeCircle(pos.x, pos.y, 12);
            }
          }
        });
      }
    });
  }

  private setupInput(): void {
    this.input.on('gameobjectdown', (pointer: Phaser.Input.Pointer, obj: any) => {
      if (this.gameEnded || this.isProcessing || this.animatingShadows) return;
      if (this.currentPlayer !== 1) return;
      const pieceId = obj.getData('pieceId');
      if (pieceId) {
        const piece = this.pieces.find(p => p.id === pieceId);
        if (piece && piece.playerId === this.currentPlayer) {
          this.selectPiece(piece);
        } else if (piece && this.selectedPiece) {
          this.tryAttackTarget(piece);
        }
      }
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.gameEnded || this.isProcessing || this.animatingShadows) return;
      if (this.currentPlayer !== 1) return;
      const gridPos = this.board.pixelToGrid(pointer.x, pointer.y, BOARD_OFFSET_X, BOARD_OFFSET_Y);
      if (!this.board.isValidPosition(gridPos)) {
        this.deselectPiece();
        return;
      }
      if (this.selectedPiece) {
        const isMove = this.movableCells.some(c => c.x === gridPos.x && c.y === gridPos.y);
        if (isMove) {
          this.executePlayerMove(this.selectedPiece, gridPos);
          return;
        }
        const targetPiece = this.pieces.find(p =>
          p.position.x === gridPos.x && p.position.y === gridPos.y && p.isAlive()
        );
        const isAttack = this.attackableCells.some(c => c.x === gridPos.x && c.y === gridPos.y);
        if (isAttack && targetPiece) {
          this.executePlayerAttack(this.selectedPiece, targetPiece);
          return;
        }
        const pieceAtCell = this.pieces.find(p =>
          p.position.x === gridPos.x && p.position.y === gridPos.y &&
          p.playerId === this.currentPlayer && p.isAlive()
        );
        if (!pieceAtCell) {
          this.deselectPiece();
        }
      }
    });
  }

  private selectPiece(piece: Piece): void {
    if (piece.hasActed) return;
    this.selectedPiece = piece;
    const legal = this.board.getLegalMoveTargets(piece, this.pieces);
    this.movableCells = legal.moves;
    this.attackableCells = legal.attacks;
    this.drawHighlights();
    this.showPieceSelectionGlow(piece, true);
  }

  private deselectPiece(): void {
    if (this.selectedPiece) {
      this.showPieceSelectionGlow(this.selectedPiece, false);
    }
    this.selectedPiece = null;
    this.movableCells = [];
    this.attackableCells = [];
    if (this.highlightGraphics) {
      this.highlightGraphics.clear();
    }
  }

  private showPieceSelectionGlow(piece: Piece, show: boolean): void {
    const sprite = this.pieceSprites.get(piece.id);
    if (!sprite || !piece.sprite) return;
    const glow = sprite.getAt(2) as Phaser.GameObjects.Graphics;
    if (!glow) return;
    glow.clear();
    const color = show ? 0xffd700 : piece.getPlayerColor();
    const alpha = show ? 1 : 0.7;
    const width = show ? 4 : 2;
    glow.lineStyle(width, color, alpha);
    glow.strokeCircle(0, 0, show ? 30 : 27);
  }

  private drawHighlights(): void {
    if (!this.highlightGraphics) return;
    const g = this.highlightGraphics;
    g.clear();

    for (const cell of this.movableCells) {
      const px = BOARD_OFFSET_X + cell.x * CELL_SIZE;
      const py = BOARD_OFFSET_Y + cell.y * CELL_SIZE;
      g.fillStyle(0x66ff99, 0.35);
      g.fillRect(px + 3, py + 3, CELL_SIZE - 6, CELL_SIZE - 6);
      g.lineStyle(2, 0x88ffaa, 0.7);
      g.strokeRect(px + 3, py + 3, CELL_SIZE - 6, CELL_SIZE - 6);
    }

    for (const cell of this.attackableCells) {
      const px = BOARD_OFFSET_X + cell.x * CELL_SIZE;
      const py = BOARD_OFFSET_Y + cell.y * CELL_SIZE;
      g.fillStyle(0xff5555, 0.4);
      g.fillRect(px + 3, py + 3, CELL_SIZE - 6, CELL_SIZE - 6);
      g.lineStyle(2, 0xff8888, 0.8);
      g.strokeRect(px + 3, py + 3, CELL_SIZE - 6, CELL_SIZE - 6);
    }
  }

  private tryAttackTarget(target: Piece): void {
    if (!this.selectedPiece || !target.isAlive()) return;
    const isAttack = this.attackableCells.some(
      c => c.x === target.position.x && c.y === target.position.y
    );
    if (isAttack) {
      this.executePlayerAttack(this.selectedPiece, target);
    }
  }

  private executePlayerMove(piece: Piece, target: Position): void {
    this.isProcessing = true;
    this.deselectPiece();

    const oldPos = { ...piece.position };
    const action: RecordedAction = { type: 'move', from: oldPos, to: target };
    this.animateMove(piece, target, () => {
      this.board.vacateCell(oldPos);
      piece.move(target);
      this.board.occupyCell(target, piece.id);

      const cell = this.board.getCell(target);
      if (cell && cell.isCoreNode && cell.ownerPlayerId !== piece.playerId) {
        cell.ownerPlayerId = piece.playerId;
        this.drawCoreNodes();
        this.redrawBoardCells();
        this.checkVictory();
      }

      this.shadowSystem.createShadow(piece, oldPos, action);
      this.renderShadows();

      piece.hasActed = true;
      this.dimPieceSprite(piece);
      this.finishAction();
    });
  }

  private executePlayerAttack(piece: Piece, target: Piece): void {
    this.isProcessing = true;
    const oldPos = { ...piece.position };
    const action: RecordedAction = {
      type: 'attack', from: oldPos, to: { ...target.position }, targetId: target.id
    };

    this.animateAttack(piece, target, () => {
      const dead = target.takeDamage(piece.config.attack);
      this.flashDamage(target, piece.config.attack);

      this.shadowSystem.createShadow(piece, oldPos, action);
      this.renderShadows();

      if (dead) {
        this.handlePieceDeath(target);
      }

      piece.hasActed = true;
      this.dimPieceSprite(piece);
      this.deselectPiece();
      this.checkVictory();
      this.finishAction();
    });
  }

  private animateMove(piece: Piece, target: Position, onComplete: () => void): void {
    const sprite = this.pieceSprites.get(piece.id);
    if (!sprite) { onComplete(); return; }
    const px = BOARD_OFFSET_X + target.x * CELL_SIZE + CELL_SIZE / 2;
    const py = BOARD_OFFSET_Y + target.y * CELL_SIZE + CELL_SIZE / 2;
    this.tweens.add({
      targets: sprite,
      x: px, y: py,
      duration: 300,
      ease: Phaser.Math.Easing.Quadratic.Out,
      onComplete
    });
  }

  private animateAttack(
    piece: Piece, target: Piece, onComplete: () => void
  ): void {
    const sprite = this.pieceSprites.get(piece.id);
    const targetSprite = this.pieceSprites.get(target.id);
    if (!sprite || !targetSprite) { onComplete(); return; }

    const origX = sprite.x;
    const origY = sprite.y;
    const dx = targetSprite.x - origX;
    const dy = targetSprite.y - origY;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const lungeX = origX + (dx / dist) * 15;
    const lungeY = origY + (dy / dist) * 15;

    this.tweens.add({
      targets: sprite,
      x: lungeX, y: lungeY,
      duration: 100,
      ease: Phaser.Math.Easing.Quadratic.Out,
      yoyo: true,
      hold: 50,
      onComplete: () => {
        this.cameras.main.flash(200, 255, 255, 255, false);
        const flash = this.add.graphics();
        flash.fillStyle(0xffffff, 0.9);
        flash.fillCircle(targetSprite.x, targetSprite.y, 28);
        this.tweens.add({
          targets: flash,
          alpha: 0,
          duration: 200,
          onComplete: () => flash.destroy()
        });
        sprite.x = origX;
        sprite.y = origY;
        onComplete();
      }
    });
  }

  private flashDamage(piece: Piece, damage: number): void {
    const sprite = this.pieceSprites.get(piece.id);
    if (!sprite) return;
    const body = sprite.getAt(1) as Phaser.GameObjects.Graphics;
    if (body) {
      const origColor = piece.getPlayerColor();
      this.tweens.addCounter({
        from: 0, to: 1, duration: 500,
        onUpdate: (t) => {
          const v = t.getValue() ?? 0;
          const r = 1 - Math.abs(v - 0.5) * 2;
          body.clear();
          const origRGB = Phaser.Display.Color.IntegerToRGB(origColor);
          const tint = Phaser.Display.Color.GetColor(
            Math.min(255, origRGB.r + Math.floor(255 * r * 0.8)),
            Math.max(0, origRGB.g - Math.floor(100 * r)),
            Math.max(0, origRGB.b - Math.floor(100 * r))
          );
          for (let i = 5; i >= 0; i--) {
            const shade = Phaser.Display.Color.IntegerToColor(tint);
            shade.lighten(i * 4);
            body.fillStyle(shade.color, 1 - i * 0.08);
            body.fillCircle(0, -i * 0.8, 25 - i * 0.5);
          }
        },
        onComplete: () => {
          body.clear();
          for (let i = 5; i >= 0; i--) {
            const shade = Phaser.Display.Color.IntegerToColor(origColor);
            shade.lighten(i * 4);
            body.fillStyle(shade.color, 1 - i * 0.08);
            body.fillCircle(0, -i * 0.8, 25 - i * 0.5);
          }
        }
      });
    }

    const dmgLabel = this.add.text(
      sprite.x, sprite.y - 30,
      `-${damage}`,
      { fontFamily: 'Microsoft YaHei', fontSize: '18px', color: '#ff6b6b', fontStyle: 'bold' }
    );
    dmgLabel.setOrigin(0.5, 0.5);
    this.tweens.add({
      targets: dmgLabel,
      y: sprite.y - 60,
      alpha: 0,
      duration: 600,
      ease: Phaser.Math.Easing.Quadratic.Out,
      onComplete: () => dmgLabel.destroy()
    });
  }

  private handlePieceDeath(piece: Piece): void {
    const sprite = this.pieceSprites.get(piece.id);
    if (sprite) {
      this.tweens.add({
        targets: sprite,
        alpha: 0, scaleX: 0, scaleY: 0,
        duration: 400,
        ease: Phaser.Math.Easing.Back.In,
        onComplete: () => {
          sprite.destroy();
          this.pieceSprites.delete(piece.id);
        }
      });
    }
    this.board.vacateCell(piece.position);
    piece.hp = 0;
  }

  private dimPieceSprite(piece: Piece): void {
    const sprite = this.pieceSprites.get(piece.id);
    if (!sprite) return;
    this.tweens.add({
      targets: sprite,
      alpha: 0.55,
      duration: 200
    });
  }

  private undimAllPieces(playerId: number): void {
    for (const piece of this.pieces) {
      if (piece.playerId === playerId && piece.isAlive()) {
        piece.hasActed = false;
        const sprite = this.pieceSprites.get(piece.id);
        if (sprite) {
          this.tweens.add({ targets: sprite, alpha: 1, duration: 200 });
        }
      }
    }
  }

  private syncOccupancy(): void {
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        this.board.cells[y][x].occupied = false;
        this.board.cells[y][x].occupantId = null;
      }
    }
    for (const piece of this.pieces) {
      if (piece.isAlive()) {
        this.board.occupyCell(piece.position, piece.id);
      }
    }
  }

  private startTurn(playerId: number): void {
    this.currentPlayer = playerId;
    this.actionsUsedThisTurn = 0;
    this.hasExtraMove = this.checkExtraMove(playerId);
    this.maxActionsPerTurn = this.hasExtraMove ? 2 : 1;

    this.turnLabel.setText(`回合 ${this.turnNumber}`);
    this.playerLabel.setText(`玩家${playerId}`);
    this.playerLabel.setColor(playerId === 1 ? '#4fc3f7' : '#ef5350');

    this.showExtraMoveIcon(this.hasExtraMove);
    this.undimAllPieces(playerId);
    this.updateSidePanel();

    if (playerId === 2 && !this.gameEnded) {
      this.time.delayedCall(600, () => this.runAITurn());
    }
  }

  private checkExtraMove(playerId: number): boolean {
    for (const piece of this.pieces) {
      if (piece.playerId === playerId && piece.isAlive()) {
        const cell = this.board.getCell(piece.position);
        if (cell && cell.isCoreNode && cell.ownerPlayerId === playerId) {
          return true;
        }
      }
    }
    return false;
  }

  private showExtraMoveIcon(show: boolean): void {
    if (this.extraMoveIcon) {
      this.extraMoveIcon.destroy();
      this.extraMoveIcon = null;
    }
    if (!show) return;

    const cx = BOARD_OFFSET_X + TOTAL_CELLS / 2;
    this.extraMoveIcon = this.add.container(cx, 50);
    const iconBg = this.add.graphics();
    iconBg.fillStyle(0xffd700, 0.25);
    iconBg.lineStyle(2, 0xffd700, 1);
    this.drawRoundedRectShape(iconBg, -40, -15, 80, 30, 8);
    const iconText = this.add.text(
      0, 0, '再动',
      { fontFamily: 'Microsoft YaHei', fontSize: '14px', color: '#ffd700', fontStyle: 'bold' }
    );
    iconText.setOrigin(0.5, 0.5);
    this.extraMoveIcon.add([iconBg, iconText]);

    this.tweens.add({
      targets: this.extraMoveIcon,
      alpha: 0.4,
      duration: 500,
      yoyo: true,
      loop: -1
    });
  }

  private drawRoundedRectShape(
    g: Phaser.GameObjects.Graphics,
    x: number, y: number, w: number, h: number, r: number
  ): void {
    g.fillRoundedRect(x, y, w, h, r);
    g.strokeRoundedRect(x, y, w, h, r);
  }

  private finishAction(): void {
    this.actionsUsedThisTurn++;
    this.syncOccupancy();
    this.updateSidePanel();

    if (this.gameEnded) {
      this.isProcessing = false;
      return;
    }

    if (this.actionsUsedThisTurn >= this.maxActionsPerTurn) {
      this.time.delayedCall(300, () => this.endCurrentTurn());
    } else {
      this.isProcessing = false;
    }
  }

  private endCurrentTurn(): void {
    this.deselectPiece();
    this.animatingShadows = true;
    this.executeShadowReplay(() => {
      this.animatingShadows = false;
      if (this.gameEnded) {
        this.isProcessing = false;
        return;
      }
      if (this.currentPlayer === 2) {
        this.turnNumber++;
      }
      const nextPlayer = this.currentPlayer === 1 ? 2 : 1;
      this.startTurn(nextPlayer);
      this.isProcessing = false;
    });
  }

  private executeShadowReplay(onComplete: () => void): void {
    const expiring = this.shadowSystem.tickShadows();
    if (expiring.length === 0) {
      this.renderShadows();
      onComplete();
      return;
    }

    let idx = 0;
    const doNext = () => {
      if (idx >= expiring.length) {
        for (const s of expiring) this.shadowSystem.removeShadow(s);
        this.renderShadows();
        onComplete();
        return;
      }
      const shadow = expiring[idx++];
      this.playShadowAction(shadow, () => doNext());
    };
    doNext();
  }

  private playShadowAction(shadow: Shadow, onComplete: () => void): void {
    if (shadow.action.type === 'move') {
      this.animateShadowMove(shadow, shadow.action.to, onComplete);
    } else if (shadow.action.type === 'attack') {
      this.animateShadowAttack(shadow, shadow.action, onComplete);
    } else {
      onComplete();
    }
  }

  private animateShadowMove(shadow: Shadow, target: Position, onComplete: () => void): void {
    const sprite = this.shadowSprites.get(shadow.id);
    if (!sprite) { onComplete(); return; }
    const px = BOARD_OFFSET_X + target.x * CELL_SIZE + CELL_SIZE / 2;
    const py = BOARD_OFFSET_Y + target.y * CELL_SIZE + CELL_SIZE / 2;

    this.tweens.add({
      targets: sprite,
      x: px, y: py,
      duration: 300,
      ease: Phaser.Math.Easing.Quadratic.Out,
      onComplete: () => {
        const enemy = this.pieces.find(p =>
          p.position.x === target.x && p.position.y === target.y &&
          p.playerId !== shadow.playerId && p.isAlive()
        );
        if (enemy) {
          const cfg = PIECE_CONFIGS[shadow.pieceType];
          const dmg = Math.ceil(cfg.attack / 2);
          this.flashDamage(enemy, dmg);
          const dead = enemy.takeDamage(dmg);
          if (dead) this.handlePieceDeath(enemy);
          this.checkVictory();
        }
        this.tweens.add({
          targets: sprite,
          alpha: 0,
          scaleX: 0.5, scaleY: 0.5,
          duration: 250,
          onComplete: () => {
            sprite.destroy();
            this.shadowSprites.delete(shadow.id);
            onComplete();
          }
        });
      }
    });
  }

  private animateShadowAttack(
    shadow: Shadow, action: RecordedAction, onComplete: () => void
  ): void {
    const sprite = this.shadowSprites.get(shadow.id);
    const target = this.pieces.find(p => p.id === action.targetId && p.isAlive());
    if (!sprite) { onComplete(); return; }

    const origX = sprite.x;
    const origY = sprite.y;

    const tgtPos = target
      ? { x: target.position.x, y: target.position.y }
      : action.to;
    const tgtPx = BOARD_OFFSET_X + tgtPos.x * CELL_SIZE + CELL_SIZE / 2;
    const tgtPy = BOARD_OFFSET_Y + tgtPos.y * CELL_SIZE + CELL_SIZE / 2;

    const dx = tgtPx - origX;
    const dy = tgtPy - origY;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const lungeX = origX + (dx / dist) * 15;
    const lungeY = origY + (dy / dist) * 15;

    this.tweens.add({
      targets: sprite,
      x: lungeX, y: lungeY,
      duration: 100,
      yoyo: true,
      hold: 60,
      ease: Phaser.Math.Easing.Quadratic.Out,
      onComplete: () => {
        sprite.x = origX;
        sprite.y = origY;
        if (target) {
          const cfg = PIECE_CONFIGS[shadow.pieceType];
          const dmg = Math.ceil(cfg.attack / 2);
          this.flashDamage(target, dmg);
          const dead = target.takeDamage(dmg);
          if (dead) this.handlePieceDeath(target);
          this.checkVictory();
        }
        this.tweens.add({
          targets: sprite,
          alpha: 0, scaleX: 0.5, scaleY: 0.5,
          duration: 250,
          onComplete: () => {
            sprite.destroy();
            this.shadowSprites.delete(shadow.id);
            onComplete();
          }
        });
      }
    });
  }

  private renderShadows(): void {
    for (const [id, sp] of Array.from(this.shadowSprites.entries())) {
      const found = this.shadowSystem.getAllShadows().find(s => s.id === id);
      if (!found) {
        sp.destroy();
        this.shadowSprites.delete(id);
      }
    }

    if (this.shadowGraphics) this.shadowGraphics.clear();

    for (const shadow of this.shadowSystem.getAllShadows()) {
      let sprite = this.shadowSprites.get(shadow.id);
      const pos = this.board.gridToPixel(shadow.position, BOARD_OFFSET_X, BOARD_OFFSET_Y);

      if (!sprite) {
        sprite = this.add.container(pos.x, pos.y);
        const color = shadow.playerId === 1 ? 0x4fc3f7 : 0xef5350;
        const body = this.add.graphics();
        body.lineStyle(2.5, 0xffffff, 0.6);
        body.strokeCircle(0, 0, 22);
        body.lineStyle(2, color, 0.4);
        body.strokeCircle(0, 0, 25);
        body.fillStyle(color, 0.15);
        body.fillCircle(0, 0, 20);

        const cfg = PIECE_CONFIGS[shadow.pieceType];
        const symbol = this.add.text(
          0, 0, cfg.symbol,
          { fontFamily: 'Microsoft YaHei', fontSize: '18px', color: shadow.playerId === 1 ? '#4fc3f7' : '#ef5350' }
        );
        symbol.setOrigin(0.5, 0.5);
        symbol.setAlpha(0.5);
        sprite.add([body, symbol]);
        sprite.setAlpha(0.5);
        this.shadowSprites.set(shadow.id, sprite);
      } else {
        sprite.setPosition(pos.x, pos.y);
      }
    }
  }

  private runAITurn(): void {
    if (this.gameEnded) return;
    const actable = this.pieces.filter(p =>
      p.playerId === 2 && p.isAlive() && !p.hasActed
    );
    if (actable.length === 0) {
      this.finishAction();
      return;
    }

    let didAction = false;
    for (const piece of actable) {
      const legal = this.board.getLegalMoveTargets(piece, this.pieces);
      if (legal.attacks.length > 0) {
        let bestTarget: Piece | null = null;
        let bestScore = -Infinity;
        for (const atk of legal.attacks) {
          const target = this.pieces.find(p =>
            p.position.x === atk.x && p.position.y === atk.y && p.isAlive()
          );
          if (target) {
            let score = piece.config.attack >= target.hp ? 100 : target.hp * 5;
            if (target.type === 'commander') score += 50;
            if (score > bestScore) { bestScore = score; bestTarget = target; }
          }
        }
        if (bestTarget) {
          this.isProcessing = true;
          this.executeAIAttack(piece, bestTarget);
          didAction = true;
          return;
        }
      }
    }

    if (!didAction) {
      for (const piece of actable) {
        const legal = this.board.getLegalMoveTargets(piece, this.pieces);
        const nearest = this.board.findNearestCoreNode(piece.position, 2);
        const nearestEnemy = this.board.findNearestEnemy(piece.position, 2, this.pieces);

        let bestMove: Position | null = null;
        let bestScore = -Infinity;
        for (const mv of legal.moves) {
          let score = 0;
          if (nearest) {
            const dist = Math.abs(mv.x - nearest.x) + Math.abs(mv.y - nearest.y);
            score -= dist * 2;
          }
          const cell = this.board.getCell(mv);
          if (cell && cell.isCoreNode && cell.ownerPlayerId !== 2) score += 40;
          if (nearestEnemy) {
            const dist = Math.abs(mv.x - nearestEnemy.position.x) + Math.abs(mv.y - nearestEnemy.position.y);
            score -= dist;
          }
          if (score > bestScore) { bestScore = score; bestMove = mv; }
        }

        if (bestMove) {
          this.isProcessing = true;
          this.executeAIMove(piece, bestMove);
          didAction = true;
          return;
        }
      }
    }

    if (!didAction) {
      for (const piece of actable) {
        const legal = this.board.getLegalMoveTargets(piece, this.pieces);
        if (legal.moves.length > 0) {
          const mv = legal.moves[Math.floor(Math.random() * legal.moves.length)];
          this.isProcessing = true;
          this.executeAIMove(piece, mv);
          return;
        }
      }
      this.finishAction();
    }
  }

  private executeAIMove(piece: Piece, target: Position): void {
    const oldPos = { ...piece.position };
    const action: RecordedAction = { type: 'move', from: oldPos, to: target };
    this.animateMove(piece, target, () => {
      this.board.vacateCell(oldPos);
      piece.move(target);
      this.board.occupyCell(target, piece.id);

      const cell = this.board.getCell(target);
      if (cell && cell.isCoreNode && cell.ownerPlayerId !== piece.playerId) {
        cell.ownerPlayerId = piece.playerId;
        this.drawCoreNodes();
        this.redrawBoardCells();
        this.checkVictory();
      }

      this.shadowSystem.createShadow(piece, oldPos, action);
      this.renderShadows();
      piece.hasActed = true;
      this.dimPieceSprite(piece);
      this.time.delayedCall(400, () => {
        this.finishAction();
        if (!this.gameEnded && this.actionsUsedThisTurn < this.maxActionsPerTurn) {
          this.runAITurn();
        }
      });
    });
  }

  private executeAIAttack(piece: Piece, target: Piece): void {
    const oldPos = { ...piece.position };
    const action: RecordedAction = {
      type: 'attack', from: oldPos, to: { ...target.position }, targetId: target.id
    };
    this.animateAttack(piece, target, () => {
      const dead = target.takeDamage(piece.config.attack);
      this.flashDamage(target, piece.config.attack);
      this.shadowSystem.createShadow(piece, oldPos, action);
      this.renderShadows();
      if (dead) this.handlePieceDeath(target);
      piece.hasActed = true;
      this.dimPieceSprite(piece);
      this.checkVictory();
      this.time.delayedCall(400, () => {
        this.finishAction();
        if (!this.gameEnded && this.actionsUsedThisTurn < this.maxActionsPerTurn) {
          this.runAITurn();
        }
      });
    });
  }

  private checkVictory(): void {
    if (this.gameEnded) return;
    const p1Commander = this.pieces.find(p => p.playerId === 1 && p.type === 'commander');
    const p2Commander = this.pieces.find(p => p.playerId === 2 && p.type === 'commander');

    if (p1Commander && !p1Commander.isAlive()) { this.triggerVictory(2); return; }
    if (p2Commander && !p2Commander.isAlive()) { this.triggerVictory(1); return; }

    const p1Nodes = this.board.getPlayerNodeCount(1);
    const p2Nodes = this.board.getPlayerNodeCount(2);
    const total = this.board.coreNodes.length;

    if (p1Nodes >= total) { this.triggerVictory(1); return; }
    if (p2Nodes >= total) { this.triggerVictory(2); return; }
  }

  private triggerVictory(playerId: number): void {
    if (this.gameEnded) return;
    this.gameEnded = true;

    const cx = BOARD_OFFSET_X + TOTAL_CELLS / 2;
    const cy = BOARD_OFFSET_Y + TOTAL_CELLS / 2;

    const beam = this.add.graphics();
    beam.fillGradientStyle(
      0xffd700, 0xffd700,
      0xffeb3b, 0xffeb3b,
      1, 1, 0, 0
    );
    beam.fillRect(cx - 30, BOARD_OFFSET_Y - 40, 60, TOTAL_CELLS + 80);
    beam.setAlpha(0);

    this.tweens.add({
      targets: beam,
      alpha: { from: 0, to: 0.9 },
      duration: 600,
      ease: Phaser.Math.Easing.Quadratic.Out,
      yoyo: true,
      hold: 1800,
      onComplete: () => beam.destroy()
    });

    const text = this.add.text(
      cx, cy, 'VICTORY',
      { fontFamily: 'Microsoft YaHei', fontSize: '48px', color: playerId === 1 ? '#4fc3f7' : '#ef5350', fontStyle: 'bold' }
    );
    text.setOrigin(0.5, 0.5);
    text.setAlpha(0);
    text.setScale(0.5);

    this.tweens.add({
      targets: text,
      alpha: 1, scale: 1.1,
      duration: 800,
      ease: Phaser.Math.Easing.Back.Out
    });

    const particles: Phaser.GameObjects.Graphics[] = [];
    for (let i = 0; i < 80; i++) {
      const p = this.add.graphics();
      const col = i % 2 === 0 ? 0xffd700 : (playerId === 1 ? 0x4fc3f7 : 0xef5350);
      p.fillStyle(col, 1);
      p.fillCircle(0, 0, Phaser.Math.Between(2, 5));
      p.setPosition(cx + Phaser.Math.Between(-20, 20), cy + Phaser.Math.Between(-20, 20));
      const angle = Math.random() * Math.PI * 2;
      const speed = Phaser.Math.Between(40, 160);
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      particles.push(p);
      this.tweens.add({
        targets: p,
        x: p.x + vx * 2,
        y: p.y + vy * 2,
        alpha: 0,
        scaleX: 0, scaleY: 0,
        duration: Phaser.Math.Between(1200, 2200),
        ease: Phaser.Math.Easing.Quadratic.Out,
        onComplete: () => p.destroy()
      });
    }

    const subText = this.add.text(
      cx, cy + 60,
      `玩家${playerId}获胜！`,
      { fontFamily: 'Microsoft YaHei', fontSize: '22px', color: '#ffffff' }
    );
    subText.setOrigin(0.5, 0.5);
    subText.setAlpha(0);
    this.tweens.add({
      targets: subText,
      alpha: 1,
      delay: 500,
      duration: 500
    });
  }

  private updateSidePanel(): void {
    const boardStatus = document.getElementById('board-status');
    const p1Panel = document.getElementById('player1-pieces');
    const p2Panel = document.getElementById('player2-pieces');
    if (!boardStatus || !p1Panel || !p2Panel) return;

    const total = this.board.coreNodes.length;
    const p1n = this.board.getPlayerNodeCount(1);
    const p2n = this.board.getPlayerNodeCount(2);
    const uncapt = total - p1n - p2n;
    boardStatus.innerHTML = `
      <div class="node-status"><span>核心节点总数</span><span style="color:#ffd700">${total}</span></div>
      <div class="node-status"><span class="player1-text">蓝方占领</span><span>${p1n}</span></div>
      <div class="node-status"><span class="player2-text">红方占领</span><span>${p2n}</span></div>
      <div class="node-status"><span style="color:#aaa">未占领</span><span>${uncapt}</span></div>
    `;

    p1Panel.innerHTML = this.renderPiecesPanel(1);
    p2Panel.innerHTML = this.renderPiecesPanel(2);
  }

  private renderPiecesPanel(playerId: number): string {
    const pieces = this.pieces.filter(p => p.playerId === playerId);
    return pieces.map(p => {
      const alive = p.isAlive();
      const acted = p.hasActed;
      const cfg = p.config;
      const shadowCnt = this.shadowSystem.getPiecesShadowCount(p.id);
      return `
        <div class="piece-status player${playerId}" style="opacity:${alive ? 1 : 0.3}">
          <div class="piece-name">
            <span class="piece-icon"></span>
            <span style="text-decoration:${acted ? 'line-through' : 'none'}">${cfg.name}</span>
          </div>
          <div class="piece-stat"><span>生命</span><span>${p.hp}/${p.maxHp}</span></div>
          <div class="piece-stat"><span>攻击</span><span>${cfg.attack}</span></div>
          <div class="piece-stat"><span>移动</span><span>${cfg.movePower}</span></div>
          <div class="piece-stat"><span>残影</span><span>${shadowCnt}</span></div>
        </div>
      `;
    }).join('');
  }
}
