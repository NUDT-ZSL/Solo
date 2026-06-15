import Phaser from 'phaser';
import { Board, HexCoord } from '../objects/Board';
import { Unit, UnitType, UNIT_STATS } from '../objects/Unit';

type GamePhase = 'select' | 'move' | 'attack' | 'end';

export class BattleScene extends Phaser.Scene {
  public board!: Board;
  public units: Unit[] = [];
  public currentPlayer: number = 0;
  public currentTurn: number = 1;
  public phase: GamePhase = 'select';
  public selectedUnit: Unit | null = null;

  private moveHighlights: Phaser.GameObjects.Graphics[] = [];
  private attackHighlights: Phaser.GameObjects.Graphics[] = [];
  private highlightGraphics: Phaser.GameObjects.Graphics | null = null;

  private turnTimer: number = 25;
  private turnTimerEvent: Phaser.Time.TimerEvent | null = null;
  private readonly TURN_DURATION: number = 25;

  private hudTimerText!: Phaser.GameObjects.Text;
  private hudTurnText!: Phaser.GameObjects.Text;
  private hudPlayerText!: Phaser.GameObjects.Text;
  private hudNodeText!: Phaser.GameObjects.Text;
  private hudUnitHpText!: Phaser.GameObjects.Text;
  private hudUnitAtkText!: Phaser.GameObjects.Text;
  private hudUnitTypeText!: Phaser.GameObjects.Text;
  private endTurnButton!: Phaser.GameObjects.Container;

  private turnOverlay!: Phaser.GameObjects.Graphics;
  private turnOverlayText!: Phaser.GameObjects.Text;
  private gameWon: boolean = false;

  private ambientParticles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

  constructor() {
    super({ key: 'BattleScene' });
  }

  create(): void {
    this.createBackground();
    this.createAmbientParticles();

    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    this.board = new Board(this);
    this.board.generate();
    const boardW = this.board.getWidth();
    const boardH = this.board.getHeight();
    this.board.setOffset(centerX - boardW / 2, centerY - boardH / 2 + 20);
    this.board.renderBoard();

    this.placeInitialUnits();
    this.createHUD();
    this.createCellInteractions();
    this.createUnitInteractions();
    this.startTurn(0);
    this.updateHUD();
  }

  private createBackground(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#0a0a2e');
    gradient.addColorStop(1, '#2a1a4e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    this.textures.addCanvas('bgGrad', canvas);
    const bgImage = this.add.image(w / 2, h / 2, 'bgGrad');
    bgImage.setDepth(-100);

    const starCount = 80;
    for (let i = 0; i < starCount; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const size = Math.random() * 2 + 0.5;
      const star = this.add.circle(x, y, size, 0xffffff, Math.random() * 0.6 + 0.2);
      star.setDepth(-90);
      this.tweens.add({
        targets: star,
        alpha: { from: Math.random() * 0.4, to: Math.random() * 0.6 + 0.3 },
        duration: 1500 + Math.random() * 2500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
  }

  private createAmbientParticles(): void {
    // Particle effects handled via individual tween-based objects for object pool control
  }

  private placeInitialUnits(): void {
    const placements: Array<{ player: number; type: UnitType; coord: HexCoord }> = [
      { player: 0, type: 'attack', coord: { q: 0, r: 0 } },
      { player: 0, type: 'defense', coord: { q: 1, r: 1 } },
      { player: 0, type: 'balanced', coord: { q: 0, r: 2 } },
      { player: 1, type: 'attack', coord: { q: 5, r: 5 } },
      { player: 1, type: 'defense', coord: { q: 4, r: 4 } },
      { player: 1, type: 'balanced', coord: { q: 5, r: 3 } }
    ];

    for (const p of placements) {
      const unit = new Unit(this, this.board, p.type, p.player, p.coord);
      this.units.push(unit);
    }
  }

  private createHUD(): void {
    const w = this.cameras.main.width;

    this.hudTurnText = this.add.text(w / 2, 20, '', {
      fontFamily: 'Microsoft YaHei',
      fontSize: '22px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(100);

    this.hudTimerText = this.add.text(w / 2, 55, '', {
      fontFamily: 'Microsoft YaHei',
      fontSize: '32px',
      color: '#ffff44',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(100);

    this.hudPlayerText = this.add.text(w / 2, 90, '', {
      fontFamily: 'Microsoft YaHei',
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(100);

    this.hudNodeText = this.add.text(w / 2, 125, '', {
      fontFamily: 'Microsoft YaHei',
      fontSize: '16px',
      color: '#ffd700'
    }).setOrigin(0.5).setDepth(100);

    this.hudUnitTypeText = this.add.text(50, this.cameras.main.height - 70, '', {
      fontFamily: 'Microsoft YaHei',
      fontSize: '18px',
      color: '#ffffff'
    }).setDepth(100);

    this.hudUnitHpText = this.add.text(50, this.cameras.main.height - 45, '', {
      fontFamily: 'Microsoft YaHei',
      fontSize: '18px',
      color: '#44ff44'
    }).setDepth(100);

    this.hudUnitAtkText = this.add.text(220, this.cameras.main.height - 45, '', {
      fontFamily: 'Microsoft YaHei',
      fontSize: '18px',
      color: '#ff4444'
    }).setDepth(100);

    this.createEndTurnButton();
    this.createTurnOverlay();
  }

  private createEndTurnButton(): void {
    const w = this.cameras.main.width;
    const btnX = w - 120;
    const btnY = this.cameras.main.height - 60;

    this.endTurnButton = this.add.container(btnX, btnY);
    this.endTurnButton.setDepth(100);

    const bg = this.add.graphics();
    bg.fillStyle(0x333366, 0.9);
    bg.fillRoundedRect(-80, -25, 160, 50, 10);
    bg.lineStyle(2, 0xaaaaff, 0.8);
    bg.strokeRoundedRect(-80, -25, 160, 50, 10);
    this.endTurnButton.add(bg);

    const label = this.add.text(0, 0, '结束回合', {
      fontFamily: 'Microsoft YaHei',
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.endTurnButton.add(label);

    this.endTurnButton.setSize(160, 50);
    this.endTurnButton.setInteractive({ useHandCursor: true });

    this.endTurnButton.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0x4444aa, 1);
      bg.fillRoundedRect(-80, -25, 160, 50, 10);
      bg.lineStyle(2, 0xffffff, 1);
      bg.strokeRoundedRect(-80, -25, 160, 50, 10);
      this.tweens.add({
        targets: this.endTurnButton,
        scale: { from: 1, to: 1.05 },
        duration: 100
      });
    });

    this.endTurnButton.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x333366, 0.9);
      bg.fillRoundedRect(-80, -25, 160, 50, 10);
      bg.lineStyle(2, 0xaaaaff, 0.8);
      bg.strokeRoundedRect(-80, -25, 160, 50, 10);
      this.tweens.add({
        targets: this.endTurnButton,
        scale: { from: 1.05, to: 1 },
        duration: 100
      });
    });

    this.endTurnButton.on('pointerdown', () => {
      this.tweens.add({
        targets: this.endTurnButton,
        scale: { from: 1.05, to: 0.95 },
        duration: 80,
        yoyo: true,
        onComplete: () => this.endTurn()
      });
    });
  }

  private createTurnOverlay(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    this.turnOverlay = this.add.graphics();
    this.turnOverlay.fillStyle(0x000000, 0);
    this.turnOverlay.fillRect(0, 0, w, h);
    this.turnOverlay.setDepth(999);
    this.turnOverlay.setAlpha(0);

    this.turnOverlayText = this.add.text(w / 2, h / 2, '', {
      fontFamily: 'Microsoft YaHei',
      fontSize: '60px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(1000).setAlpha(0);
  }

  private createCellInteractions(): void {
    for (const [key, g] of this.board.cellGraphics) {
      g.on('pointerdown', () => {
        if (this.gameWon) return;
        const coord = Board.parseKey(key);
        this.handleCellClick(coord);
      });
    }
  }

  private createUnitInteractions(): void {
    for (const unit of this.units) {
      unit.container.on('pointerdown', () => {
        if (this.gameWon) return;
        this.handleUnitClick(unit);
      });
    }
  }

  private handleCellClick(coord: HexCoord): void {
    if (this.phase === 'move' && this.selectedUnit) {
      const occupied = this.getOccupiedPositions();
      if (this.board.canStandOn(coord.q, coord.r, this.selectedUnit.playerId, occupied)) {
        const moveTargets = this.selectedUnit.getMoveTargets(occupied);
        const isTarget = moveTargets.some(t => t.q === coord.q && t.r === coord.r);
        if (isTarget) {
          this.executeMove(this.selectedUnit, coord);
        }
      }
    } else if (this.phase === 'attack' && this.selectedUnit) {
      const key = Board.coordKey(coord.q, coord.r);
      const target = this.units.find(u =>
        u.isAlive &&
        u.playerId !== this.selectedUnit!.playerId &&
        Board.coordKey(u.coord.q, u.coord.r) === key
      );
      if (target) {
        const attackTargets = this.selectedUnit.getAttackTargets(this.units);
        if (attackTargets.includes(target)) {
          this.executeAttack(this.selectedUnit, target);
        }
      }
    }
  }

  private handleUnitClick(unit: Unit): void {
    if (!unit.isAlive) return;

    if (unit.playerId !== this.currentPlayer) {
      if (this.phase === 'attack' && this.selectedUnit) {
        const attackTargets = this.selectedUnit.getAttackTargets(this.units);
        if (attackTargets.includes(unit)) {
          this.executeAttack(this.selectedUnit, unit);
          return;
        }
      }
      this.showUnitInfo(unit);
      return;
    }

    if (this.selectedUnit === unit) {
      this.clearSelection();
      return;
    }

    this.selectUnit(unit);
  }

  private selectUnit(unit: Unit): void {
    if (this.selectedUnit) {
      this.selectedUnit.deselect();
    }

    this.selectedUnit = unit;
    unit.select();
    this.showUnitInfo(unit);

    this.clearHighlights();

    if (!unit.hasMoved) {
      this.phase = 'move';
      const occupied = this.getOccupiedPositions();
      const moveTargets = unit.getMoveTargets(occupied);
      this.showMoveHighlights(moveTargets);
    } else if (!unit.hasAttacked) {
      this.phase = 'attack';
      const attackTargets = unit.getAttackTargets(this.units);
      this.showAttackHighlights(attackTargets);
    } else {
      this.phase = 'select';
    }
  }

  private clearSelection(): void {
    if (this.selectedUnit) {
      this.selectedUnit.deselect();
      this.selectedUnit = null;
    }
    this.phase = 'select';
    this.clearHighlights();
    this.clearUnitInfo();
  }

  private showMoveHighlights(coords: HexCoord[]): void {
    for (const c of coords) {
      const g = this.board.highlightCell(c, 0x44ff44, 0.35);
      this.moveHighlights.push(g);
    }
    if (this.selectedUnit) {
      const key = Board.coordKey(this.selectedUnit.coord.q, this.selectedUnit.coord.r);
      const cg = this.board.cellGraphics.get(key);
      if (cg) {
        cg.setDepth(10);
      }
    }
  }

  private showAttackHighlights(targets: Unit[]): void {
    for (const t of targets) {
      const g = this.board.highlightCell(t.coord, 0xff4444, 0.45);
      this.attackHighlights.push(g);
    }
  }

  private clearHighlights(): void {
    for (const g of this.moveHighlights) g.destroy();
    this.moveHighlights = [];
    for (const g of this.attackHighlights) g.destroy();
    this.attackHighlights = [];
  }

  private getOccupiedPositions(): Set<string> {
    const s = new Set<string>();
    for (const u of this.units) {
      if (u.isAlive) s.add(Board.coordKey(u.coord.q, u.coord.r));
    }
    return s;
  }

  private async executeMove(unit: Unit, target: HexCoord): Promise<void> {
    const fromPixel = this.board.hexToPixel(unit.coord.q, unit.coord.r);
    const toPixel = this.board.hexToPixel(target.q, target.r);
    unit.emitMoveParticles(fromPixel.x, fromPixel.y, toPixel.x, toPixel.y);

    const oldCoord = { ...unit.coord };
    await unit.setPosition(target);
    unit.hasMoved = true;

    const cell = this.board.getCell(target.q, target.r);
    if (cell && cell.isNode && cell.owner !== unit.playerId) {
      this.board.startCapturing(target.q, target.r, unit.playerId, this.currentTurn);
    }

    const oldCell = this.board.getCell(oldCoord.q, oldCoord.r);
    if (oldCell && oldCell.isNode && oldCell.occupyingPlayer === unit.playerId) {
      const samePos = oldCoord.q === unit.coord.q && oldCoord.r === unit.coord.r;
      if (!samePos) {
        this.board.cancelCapture(oldCoord.q, oldCoord.r);
      }
    }

    this.clearHighlights();

    if (!unit.hasAttacked) {
      this.phase = 'attack';
      const attackTargets = unit.getAttackTargets(this.units);
      if (attackTargets.length > 0) {
        this.showAttackHighlights(attackTargets);
      } else {
        this.phase = 'select';
        this.selectedUnit = null;
        unit.deselect();
        this.clearUnitInfo();
      }
    } else {
      this.phase = 'select';
      this.selectedUnit = null;
      unit.deselect();
      this.clearUnitInfo();
    }

    this.updateHUD();
    this.checkVictory();
  }

  private async executeAttack(attacker: Unit, target: Unit): Promise<void> {
    this.clearHighlights();
    await attacker.playAttackAnimation(target);
    const damage = attacker.attack;
    attacker.hasAttacked = true;
    await target.takeDamage(damage);

    this.phase = 'select';
    if (this.selectedUnit) {
      this.selectedUnit.deselect();
      this.selectedUnit = null;
    }
    this.clearUnitInfo();
    this.updateHUD();
    this.checkVictory();
  }

  private showUnitInfo(unit: Unit): void {
    const typeNames: Record<UnitType, string> = {
      attack: '攻击型',
      defense: '防御型',
      balanced: '均衡型'
    };
    const playerColor = unit.playerId === 0 ? '（红方）' : '（蓝方）';
    this.hudUnitTypeText.setText(`${typeNames[unit.type]} ${playerColor}`);
    this.hudUnitHpText.setText(`HP: ${unit.hp} / ${unit.maxHp}`);
    this.hudUnitAtkText.setText(`攻击: ${unit.attack}`);
  }

  private clearUnitInfo(): void {
    this.hudUnitTypeText.setText('');
    this.hudUnitHpText.setText('');
    this.hudUnitAtkText.setText('');
  }

  private updateHUD(): void {
    this.hudTurnText.setText(`第 ${this.currentTurn} 回合`);
    const playerName = this.currentPlayer === 0 ? '红方回合' : '蓝方回合';
    const playerColor = this.currentPlayer === 0 ? '#ff5555' : '#5555ff';
    this.hudPlayerText.setText(playerName).setColor(playerColor);

    const timerColor = this.turnTimer <= 5 ? '#ff4444' : this.turnTimer <= 10 ? '#ffaa44' : '#ffff44';
    this.hudTimerText.setText(`${this.turnTimer.toFixed(1)}s`).setColor(timerColor);

    const p0Nodes = this.board.getNodeCountForPlayer(0);
    const p1Nodes = this.board.getNodeCountForPlayer(1);
    const total = this.board.getTotalNodes();
    this.hudNodeText.setText(`节点占领 红方: ${p0Nodes}/${total}  蓝方: ${p1Nodes}/${total}`);
  }

  private startTurn(player: number): void {
    this.currentPlayer = player;
    this.turnTimer = this.TURN_DURATION;
    this.gameWon = false;

    const playerUnits = this.units.filter(u => u.playerId === player && u.isAlive);
    for (const u of playerUnits) {
      u.startNewTurn();
    }

    const captured = this.board.processCaptures(this.currentTurn);
    for (const c of captured) {
      this.board.updateNodeVisual(c.coord);
      this.board.updateCellVisual(c.coord);
      this.emitCaptureParticles(c.coord, c.playerId);
    }

    this.playTurnTransition(player);

    if (this.turnTimerEvent) this.turnTimerEvent.remove(false);
    this.turnTimerEvent = this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        this.turnTimer -= 0.1;
        if (this.turnTimer <= 0) {
          this.turnTimer = 0;
          this.updateHUD();
          this.endTurn();
          return;
        }
        this.updateHUD();
      }
    });

    this.clearSelection();
    this.updateHUD();
    this.checkVictory();
  }

  private emitCaptureParticles(coord: HexCoord, playerId: number): void {
    const { x, y } = this.board.hexToPixel(coord.q, coord.r);
    const color = playerId === 0 ? 0xff5555 : 0x5555ff;

    for (let i = 0; i < 25; i++) {
      const angle = (Math.PI * 2 * i) / 25;
      const speed = 40 + Math.random() * 80;
      const size = 2 + Math.random() * 4;
      const p = this.add.circle(x, y, size, color, 1);
      p.setDepth(60);

      this.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        alpha: { from: 1, to: 0 },
        scale: { from: 1.2, to: 0 },
        duration: 500 + Math.random() * 300,
        ease: 'Cubic.easeOut',
        onComplete: () => p.destroy()
      });
    }
  }

  private playTurnTransition(player: number): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const color = player === 0 ? 0xff4444 : 0x4444ff;
    const name = player === 0 ? '红方回合' : '蓝方回合';

    this.turnOverlay.clear();
    this.turnOverlay.fillStyle(color, 0.4);
    this.turnOverlay.fillRect(0, 0, w, h);
    this.turnOverlayText.setText(name).setColor(player === 0 ? '#ffaaaa' : '#aaaaff');

    this.tweens.add({
      targets: [this.turnOverlay, this.turnOverlayText],
      alpha: { from: 0, to: 1 },
      duration: 150,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: [this.turnOverlay, this.turnOverlayText],
          alpha: { from: 1, to: 0 },
          duration: 150,
          delay: 150,
          ease: 'Cubic.easeIn'
        });
      }
    });
  }

  private endTurn(): void {
    if (this.gameWon) return;

    if (this.turnTimerEvent) {
      this.turnTimerEvent.remove(false);
      this.turnTimerEvent = null;
    }

    const nextPlayer = 1 - this.currentPlayer;
    if (nextPlayer === 0) {
      this.currentTurn++;
    }

    this.clearSelection();
    this.startTurn(nextPlayer);
  }

  private checkVictory(): void {
    if (this.gameWon) return;

    const totalNodes = this.board.getTotalNodes();
    const p0Nodes = this.board.getNodeCountForPlayer(0);
    const p1Nodes = this.board.getNodeCountForPlayer(1);

    if (p0Nodes >= totalNodes) {
      this.triggerVictory(0);
      return;
    }
    if (p1Nodes >= totalNodes) {
      this.triggerVictory(1);
      return;
    }

    const p0Alive = this.units.some(u => u.playerId === 0 && u.isAlive);
    const p1Alive = this.units.some(u => u.playerId === 1 && u.isAlive);

    if (!p0Alive && !p1Alive) {
      this.triggerVictory(-1);
      return;
    }
    if (!p0Alive) {
      this.triggerVictory(1);
      return;
    }
    if (!p1Alive) {
      this.triggerVictory(0);
      return;
    }
  }

  private triggerVictory(winner: number): void {
    this.gameWon = true;
    if (this.turnTimerEvent) {
      this.turnTimerEvent.remove(false);
      this.turnTimerEvent = null;
    }
    this.clearSelection();

    const text = winner === -1 ? '平局' : winner === 0 ? '红方胜利！' : '蓝方胜利！';
    this.playVictoryAnimation(text, winner);
  }

  private playVictoryAnimation(text: string, winner: number): void {
    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;
    const color = winner === 0 ? 0xff5555 : winner === 1 ? 0x5555ff : 0xaaaaaa;

    const particleCount = 200;
    const chars = text.split('');

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 50 + Math.random() * 150;
      const tx = cx + Math.cos(angle) * radius;
      const ty = cy + Math.sin(angle) * radius;

      const startAngle = Math.random() * Math.PI * 2;
      const startRadius = 300 + Math.random() * 150;
      const sx = cx + Math.cos(startAngle) * startRadius;
      const sy = cy + Math.sin(startAngle) * startRadius;

      const size = 3 + Math.random() * 4;
      const alpha = 0.6 + Math.random() * 0.4;

      const p = this.add.circle(sx, sy, size, Math.random() < 0.3 ? 0xffffff : color, alpha);
      p.setDepth(2000);

      const delay = Math.random() * 800;
      this.tweens.add({
        targets: p,
        x: tx,
        y: ty,
        duration: 900 + Math.random() * 500,
        delay,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          this.tweens.add({
            targets: p,
            alpha: { from: alpha, to: 0 },
            scale: { from: 1, to: 0.2 },
            y: ty - 80 - Math.random() * 80,
            duration: 700 + Math.random() * 500,
            delay: 300 + Math.random() * 200,
            ease: 'Cubic.easeIn',
            onComplete: () => p.destroy()
          });
        }
      });
    }

    this.time.delayedCall(600, () => {
      const vt = this.add.text(cx, cy, text, {
        fontFamily: 'Microsoft YaHei',
        fontSize: '80px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: winner === -1 ? '#888888' : winner === 0 ? '#ff4444' : '#4444ff',
        strokeThickness: 8
      }).setOrigin(0.5).setDepth(2100).setAlpha(0).setScale(0.2);

      this.tweens.add({
        targets: vt,
        alpha: { from: 0, to: 1 },
        scale: { from: 0.2, to: 1.1 },
        duration: 400,
        ease: 'Back.easeOut',
        onComplete: () => {
          this.tweens.add({
            targets: vt,
            scale: { from: 1.1, to: 1 },
            duration: 200,
            ease: 'Cubic.easeOut'
          });
        }
      });

      this.time.delayedCall(2000, () => {
        this.tweens.add({
          targets: vt,
          alpha: { from: 1, to: 0 },
          scale: { from: 1, to: 0.5 },
          duration: 500,
          ease: 'Cubic.easeIn'
        });
      });
    });

    this.time.delayedCall(3000, () => {
      const btnX = cx;
      const btnY = cy + 120;
      const container = this.add.container(btnX, btnY);
      container.setDepth(2200);

      const bg = this.add.graphics();
      bg.fillStyle(0x336633, 0.95);
      bg.fillRoundedRect(-100, -30, 200, 60, 12);
      bg.lineStyle(2, 0x88ff88, 1);
      bg.strokeRoundedRect(-100, -30, 200, 60, 12);
      container.add(bg);

      const label = this.add.text(0, 0, '重新开始', {
        fontFamily: 'Microsoft YaHei',
        fontSize: '24px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      container.add(label);

      container.setSize(200, 60);
      container.setInteractive({ useHandCursor: true });

      container.on('pointerover', () => {
        bg.clear();
        bg.fillStyle(0x44aa44, 1);
        bg.fillRoundedRect(-100, -30, 200, 60, 12);
        bg.lineStyle(2, 0xffffff, 1);
        bg.strokeRoundedRect(-100, -30, 200, 60, 12);
      });
      container.on('pointerout', () => {
        bg.clear();
        bg.fillStyle(0x336633, 0.95);
        bg.fillRoundedRect(-100, -30, 200, 60, 12);
        bg.lineStyle(2, 0x88ff88, 1);
        bg.strokeRoundedRect(-100, -30, 200, 60, 12);
      });
      container.on('pointerdown', () => {
        this.cleanup();
        this.scene.restart();
      });
    });
  }

  private cleanup(): void {
    for (const u of this.units) u.destroy();
    this.units = [];
  }

  update(time: number, delta: number): void {
    // Game loop reserved for future animation updates
  }
}
