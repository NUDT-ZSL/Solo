import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { Rune, RuneType, RuneTeam, RUNE_COLORS } from '../entities/Rune';
import { GameManager, GamePhase, GameStats, AttackAction } from '../managers/GameManager';

interface Projectile {
  gfx: Graphics;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  progress: number;
  color: number;
  onHit?: () => void;
}

export class BattleScene extends Container {
  private gm: GameManager;
  private boardContainer: Container;
  private runeContainer: Container;
  private projectileContainer: Container;
  private hudContainer: Container;
  private overlayContainer: Container;
  private selectorContainer: Container;

  private cellSize: number = 60;
  private boardOffsetX: number = 0;
  private boardOffsetY: number = 0;

  private turnLabel!: Text;
  private playerCountLabel!: Text;
  private enemyCountLabel!: Text;
  private timerBarBg!: Graphics;
  private timerBarFill!: Graphics;
  private timerLabel!: Text;
  private hintLabel!: Text;
  private phaseLabel!: Text;

  private selectedType: RuneType = RuneType.FIRE;
  private typeButtons: { type: RuneType; bg: Graphics; icon: Graphics }[] = [];
  private confirmBtn!: Graphics;
  private confirmLabel!: Text;

  private projectiles: Projectile[] = [];
  private isAnimating: boolean = false;
  private battleSubPhase: 'idle' | 'moving' | 'attacking' = 'idle';
  private phaseTransitionAlpha: number = 0;
  private phaseTransitioning: boolean = false;
  private pendingPhase: GamePhase | null = null;
  private fadeOverlay!: Graphics;

  private onGameEnd?: (winner: RuneTeam, stats: GameStats) => void;

  constructor(gameManager: GameManager) {
    super();
    this.gm = gameManager;

    this.boardContainer = new Container();
    this.runeContainer = new Container();
    this.projectileContainer = new Container();
    this.hudContainer = new Container();
    this.overlayContainer = new Container();
    this.selectorContainer = new Container();

    this.addChild(this.boardContainer);
    this.addChild(this.runeContainer);
    this.addChild(this.projectileContainer);
    this.addChild(this.hudContainer);
    this.addChild(this.overlayContainer);
    this.addChild(this.selectorContainer);

    this.createFadeOverlay();
    this.createHud();
    this.createSelector();
    this.layout(this.getWidth(), this.getHeight());

    this.gm.setCallbacks(
      (phase) => this.onPhaseChange(phase),
      (team, turn) => this.onTurnChange(team, turn),
      (time) => this.onTimerUpdate(time),
      (winner, stats) => this.onGameOver(winner, stats),
    );
  }

  setOnGameEnd(cb: (winner: RuneTeam, stats: GameStats) => void): void {
    this.onGameEnd = cb;
  }

  private getWidth(): number {
    return (this.parent as any)?.width ?? window.innerWidth;
  }

  private getHeight(): number {
    return (this.parent as any)?.height ?? window.innerHeight;
  }

  layout(screenW: number, screenH: number): void {
    const maxCellW = (screenW * 0.9) / this.gm.COLS;
    const maxCellH = (screenH * 0.65) / this.gm.ROWS;
    this.cellSize = Math.floor(Math.min(maxCellW, maxCellH, 80));

    const boardW = this.cellSize * this.gm.COLS;
    const boardH = this.cellSize * this.gm.ROWS;
    this.boardOffsetX = (screenW - boardW) / 2;
    this.boardOffsetY = (screenH - boardH) / 2 - 20;

    this.boardContainer.x = this.boardOffsetX;
    this.boardContainer.y = this.boardOffsetY;
    this.runeContainer.x = this.boardOffsetX;
    this.runeContainer.y = this.boardOffsetY;

    this.drawBoard();
    this.repositionRunes();
    this.layoutHud(screenW, screenH);
    this.layoutSelector(screenW, screenH);
    this.layoutOverlay(screenW, screenH);
  }

  private drawBoard(): void {
    this.boardContainer.removeChildren();
    const g = new Graphics();

    g.beginFill(0x0a0a0a, 1);
    g.drawRect(0, 0, this.cellSize * this.gm.COLS, this.cellSize * this.gm.ROWS);
    g.endFill();

    for (let r = 0; r < this.gm.ROWS; r++) {
      for (let c = 0; c < this.gm.COLS; c++) {
        const x = c * this.cellSize;
        const y = r * this.cellSize;
        const isPlayerZone = r >= this.gm.ROWS - 2;
        const isEnemyZone = r <= 1;

        if (isPlayerZone) {
          g.beginFill(0x1a1008, 0.5);
        } else if (isEnemyZone) {
          g.beginFill(0x081018, 0.5);
        } else {
          g.beginFill(0x0e0e12, 0.3);
        }
        g.drawRect(x + 1, y + 1, this.cellSize - 2, this.cellSize - 2);
        g.endFill();

        g.lineStyle(1, 0x334455, 0.25);
        g.drawRect(x, y, this.cellSize, this.cellSize);
      }
    }

    g.lineStyle(2, 0x446688, 0.4);
    g.drawRect(0, 0, this.cellSize * this.gm.COLS, this.cellSize * this.gm.ROWS);

    this.boardContainer.addChild(g);
  }

  private repositionRunes(): void {
    const allRunes = [...this.gm.playerRunes, ...this.gm.enemyRunes];
    for (const rune of allRunes) {
      rune.x = rune.gridX * this.cellSize + this.cellSize / 2;
      rune.y = rune.gridY * this.cellSize + this.cellSize / 2;
      rune.setCellSize(this.cellSize);
    }
  }

  private createHud(): void {
    const textStyle = new TextStyle({
      fontFamily: 'Consolas, monospace',
      fontSize: 16,
      fill: 0xccddff,
      dropShadow: true,
      dropShadowColor: 0x000000,
      dropShadowDistance: 1,
    });

    this.turnLabel = new Text('', { ...textStyle, fontSize: 18 });
    this.playerCountLabel = new Text('', textStyle);
    this.enemyCountLabel = new Text('', textStyle);
    this.timerLabel = new Text('', { ...textStyle, fontSize: 14 });
    this.hintLabel = new Text('', { ...textStyle, fontSize: 13, fill: 0x99aabb });
    this.phaseLabel = new Text('', { ...textStyle, fontSize: 24, fill: 0xffcc44 });

    this.timerBarBg = new Graphics();
    this.timerBarFill = new Graphics();

    this.hudContainer.addChild(this.turnLabel);
    this.hudContainer.addChild(this.playerCountLabel);
    this.hudContainer.addChild(this.enemyCountLabel);
    this.hudContainer.addChild(this.timerBarBg);
    this.hudContainer.addChild(this.timerBarFill);
    this.hudContainer.addChild(this.timerLabel);
    this.hudContainer.addChild(this.hintLabel);
    this.hudContainer.addChild(this.phaseLabel);
  }

  private layoutHud(screenW: number, screenH: number): void {
    const pad = 15;
    this.turnLabel.x = pad;
    this.turnLabel.y = pad;
    this.playerCountLabel.x = pad;
    this.playerCountLabel.y = pad + 28;
    this.enemyCountLabel.x = pad;
    this.enemyCountLabel.y = pad + 50;

    const barW = 180;
    const barH = 14;
    const barX = screenW - barW - pad;
    const barY = pad + 5;

    this.timerBarBg.clear();
    this.timerBarBg.beginFill(0x222233, 0.7);
    this.timerBarBg.drawRoundedRect(barX, barY, barW, barH, 4);
    this.timerBarBg.endFill();

    this.timerLabel.x = barX + barW / 2;
    this.timerLabel.y = barY + barH + 4;
    this.timerLabel.anchor.set(0.5, 0);

    this.hintLabel.x = screenW / 2;
    this.hintLabel.anchor.set(0.5, 0);
    this.hintLabel.y = screenH - 35;

    this.phaseLabel.x = screenW / 2;
    this.phaseLabel.anchor.set(0.5, 0);
    this.phaseLabel.y = screenH / 2 - 30;
    this.phaseLabel.visible = false;
  }

  private createSelector(): void {
    this.selectorContainer.visible = false;
    const types = [RuneType.FIRE, RuneType.ICE, RuneType.LIGHTNING];
    const labels = ['火', '冰', '雷'];

    for (let i = 0; i < types.length; i++) {
      const btnW = 60;
      const btnH = 40;
      const bg = new Graphics();
      bg.beginFill(RUNE_COLORS[types[i]], 0.3);
      bg.lineStyle(2, RUNE_COLORS[types[i]], 0.6);
      bg.drawRoundedRect(0, 0, btnW, btnH, 6);
      bg.endFill();
      bg.interactive = true;
      bg.cursor = 'pointer';

      const iconText = new Text(labels[i], {
        fontFamily: 'Consolas, monospace',
        fontSize: 18,
        fill: RUNE_COLORS[types[i]],
      });
      iconText.anchor.set(0.5);
      iconText.x = btnW / 2;
      iconText.y = btnH / 2;

      const btnContainer = new Container();
      btnContainer.addChild(bg);
      btnContainer.addChild(iconText);

      const capturedType = types[i];
      btnContainer.interactive = true;
      btnContainer.cursor = 'pointer';
      btnContainer.on('pointerdown', () => {
        this.selectedType = capturedType;
        this.updateSelectorHighlight();
      });

      this.typeButtons.push({ type: types[i], bg, icon: bg });
      this.selectorContainer.addChild(btnContainer);
    }

    this.confirmBtn = new Graphics();
    this.confirmBtn.beginFill(0x336633, 0.6);
    this.confirmBtn.lineStyle(2, 0x55aa55, 0.8);
    this.confirmBtn.drawRoundedRect(0, 0, 80, 40, 6);
    this.confirmBtn.endFill();
    this.confirmBtn.interactive = true;
    this.confirmBtn.cursor = 'pointer';

    this.confirmLabel = new Text('出战', {
      fontFamily: 'Consolas, monospace',
      fontSize: 16,
      fill: 0x88ff88,
    });
    this.confirmLabel.anchor.set(0.5);
    this.confirmLabel.x = 40;
    this.confirmLabel.y = 20;

    const confirmContainer = new Container();
    confirmContainer.addChild(this.confirmBtn);
    confirmContainer.addChild(this.confirmLabel);
    confirmContainer.interactive = true;
    confirmContainer.cursor = 'pointer';
    confirmContainer.on('pointerdown', () => this.onConfirmDeploy());

    this.selectorContainer.addChild(confirmContainer);
  }

  private layoutSelector(screenW: number, screenH: number): void {
    const totalW = 3 * 70 + 20 + 90;
    let startX = (screenW - totalW) / 2;
    const y = screenH - 85;

    for (let i = 0; i < this.typeButtons.length; i++) {
      const child = this.selectorContainer.children[i] as Container;
      child.x = startX;
      child.y = y;
      startX += 70;
    }

    const confirmChild = this.selectorContainer.children[3] as Container;
    confirmChild.x = startX + 20;
    confirmChild.y = y;

    this.updateSelectorHighlight();
  }

  private updateSelectorHighlight(): void {
    for (let i = 0; i < this.typeButtons.length; i++) {
      const btn = this.typeButtons[i];
      const container = this.selectorContainer.children[i] as Container;
      const bg = container.children[0] as Graphics;
      bg.clear();
      const isSelected = btn.type === this.selectedType;
      bg.beginFill(RUNE_COLORS[btn.type], isSelected ? 0.6 : 0.25);
      bg.lineStyle(2, RUNE_COLORS[btn.type], isSelected ? 1 : 0.4);
      bg.drawRoundedRect(0, 0, 60, 40, 6);
      bg.endFill();
    }
  }

  private createFadeOverlay(): void {
    this.fadeOverlay = new Graphics();
    this.fadeOverlay.beginFill(0x000000, 1);
    this.fadeOverlay.drawRect(0, 0, 2000, 2000);
    this.fadeOverlay.endFill();
    this.fadeOverlay.alpha = 0;
    this.overlayContainer.addChild(this.fadeOverlay);
  }

  private layoutOverlay(screenW: number, screenH: number): void {
    this.fadeOverlay.clear();
    this.fadeOverlay.beginFill(0x000000, 1);
    this.fadeOverlay.drawRect(0, 0, screenW, screenH);
    this.fadeOverlay.endFill();
  }

  update(delta: number): void {
    const deltaSec = delta / 60;

    if (this.gm.phase === GamePhase.DEPLOY) {
      this.gm.updateDeployTimer(deltaSec);
    } else if (this.gm.phase === GamePhase.BATTLE && !this.isAnimating) {
      this.gm.updateTurnTimer(deltaSec);
      this.processBattleTick();
    }

    this.updateProjectiles(delta);
    this.updateRunes(delta);
    this.updateHudText();

    if (this.phaseTransitioning) {
      this.updatePhaseTransition(deltaSec);
    }
  }

  private updateRunes(delta: number): void {
    for (const rune of [...this.gm.playerRunes, ...this.gm.enemyRunes]) {
      if (!rune.isAlive) continue;
      const targetX = rune.gridX * this.cellSize + this.cellSize / 2;
      const targetY = rune.gridY * this.cellSize + this.cellSize / 2;
      const dx = targetX - rune.x;
      const dy = targetY - rune.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 1) {
        const speed = 2.5;
        rune.x += dx * speed * delta / 60;
        rune.y += dy * speed * delta / 60;
        if (dist > 3) {
          rune.spawnTrailParticle(rune.x - dx * 0.1, rune.y - dy * 0.1);
        }
      } else {
        rune.x = targetX;
        rune.y = targetY;
      }

      rune.update(delta);
    }

    for (let i = this.gm.playerRunes.length - 1; i >= 0; i--) {
      const r = this.gm.playerRunes[i];
      if (!r.isAlive && r.particles && r.particles.length > 0) {
        r.update(delta);
      } else if (!r.isAlive && (!r.particles || r.particles.length === 0)) {
        this.runeContainer.removeChild(r);
        this.gm.playerRunes.splice(i, 1);
      }
    }
    for (let i = this.gm.enemyRunes.length - 1; i >= 0; i--) {
      const r = this.gm.enemyRunes[i];
      if (!r.isAlive && r.particles && r.particles.length > 0) {
        r.update(delta);
      } else if (!r.isAlive && (!r.particles || r.particles.length === 0)) {
        this.runeContainer.removeChild(r);
        this.gm.enemyRunes.splice(i, 1);
      }
    }
  }

  private updateProjectiles(delta: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.progress += 0.03 * delta;

      if (p.progress >= 1) {
        p.onHit?.();
        this.projectileContainer.removeChild(p.gfx);
        p.gfx.destroy();
        this.projectiles.splice(i, 1);
        continue;
      }

      const t = this.easeInOutCubic(p.progress);
      p.gfx.x = p.fromX + (p.toX - p.fromX) * t;
      p.gfx.y = p.fromY + (p.toY - p.fromY) * t;

      if (Math.random() < 0.4) {
        const trailGfx = new Graphics();
        trailGfx.beginFill(p.color, 0.5);
        trailGfx.drawCircle(0, 0, 2 + Math.random() * 2);
        trailGfx.endFill();
        trailGfx.x = p.gfx.x + (Math.random() - 0.5) * 4;
        trailGfx.y = p.gfx.y + (Math.random() - 0.5) * 4;

        const tp = {
          gfx: trailGfx,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          life: 0,
          maxLife: 12 + Math.random() * 8,
          size: 2,
        };
        this.projectileContainer.addChild(trailGfx);

        const self = this;
        const animateTrail = () => {
          tp.life += delta;
          tp.gfx.x += tp.vx * delta;
          tp.gfx.y += tp.vy * delta;
          tp.gfx.alpha = Math.max(0, 1 - tp.life / tp.maxLife);
          if (tp.life >= tp.maxLife) {
            self.projectileContainer.removeChild(tp.gfx);
            tp.gfx.destroy();
          } else {
            requestAnimationFrame(animateTrail);
          }
        };
        requestAnimationFrame(animateTrail);
      }
    }
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private updateHudText(): void {
    const pAlive = this.gm.getAliveCount(RuneTeam.PLAYER);
    const eAlive = this.gm.getAliveCount(RuneTeam.ENEMY);

    if (this.gm.phase === GamePhase.DEPLOY) {
      this.turnLabel.text = `部署阶段`;
      this.playerCountLabel.text = `己方符文: ${this.gm.playerDeployedCount}/${this.gm.maxDeployRunes}`;
      this.enemyCountLabel.text = `敌方: 待部署`;
    } else {
      const turnTeam = this.gm.currentTurn === RuneTeam.PLAYER ? '己方' : '敌方';
      this.turnLabel.text = `第 ${this.gm.turnNumber} 回合 - ${turnTeam}`;
      this.playerCountLabel.text = `己方符文: ${pAlive}`;
      this.enemyCountLabel.text = `敌方符文: ${eAlive}`;
    }

    this.updateTimerBar();

    if (this.gm.phase === GamePhase.DEPLOY) {
      this.hintLabel.text = `点击底部两行格子部署符文 | 剩余 ${this.gm.playerDeployedCount}/${this.gm.maxDeployRunes}`;
    } else if (this.isAnimating) {
      this.hintLabel.text = '战斗进行中...';
    } else if (this.gm.currentTurn === RuneTeam.PLAYER) {
      this.hintLabel.text = '己方回合 - 自动攻击中';
    } else {
      this.hintLabel.text = '敌方回合';
    }
  }

  private updateTimerBar(): void {
    const pad = 15;
    const screenW = (this.parent as any)?.width ?? window.innerWidth;
    const barW = 180;
    const barH = 14;
    const barX = screenW - barW - pad;
    const barY = pad + 5;

    const maxTime = this.gm.phase === GamePhase.DEPLOY ? 30 : 15;
    const currentTime = this.gm.phase === GamePhase.DEPLOY ? this.gm.deployTimer : this.gm.turnTimer;
    const pct = Math.max(0, currentTime / maxTime);

    this.timerBarFill.clear();
    const fillColor = pct > 0.5 ? 0x44aa44 : pct > 0.25 ? 0xccaa22 : 0xcc3333;
    this.timerBarFill.beginFill(fillColor, 0.8);
    this.timerBarFill.drawRoundedRect(barX, barY, barW * pct, barH, 4);
    this.timerBarFill.endFill();

    this.timerLabel.text = `${Math.ceil(Math.max(0, currentTime))}s`;
  }

  handleBoardClick(globalX: number, globalY: number): void {
    if (this.gm.phase !== GamePhase.DEPLOY) return;
    if (this.gm.playerDeployedCount >= this.gm.maxDeployRunes) return;

    const localX = globalX - this.boardOffsetX;
    const localY = globalY - this.boardOffsetY;
    const col = Math.floor(localX / this.cellSize);
    const row = Math.floor(localY / this.cellSize);

    if (row < this.gm.ROWS - 2 || row >= this.gm.ROWS || col < 0 || col >= this.gm.COLS) return;

    const existing = this.gm.grid[row][col];
    if (existing && existing.team === RuneTeam.PLAYER) {
      this.gm.removeRuneAt(col, row);
      this.runeContainer.removeChild(existing);
      existing.destroy();
      return;
    }

    if (existing !== null) return;

    const rune = new Rune(this.selectedType, RuneTeam.PLAYER, this.cellSize);
    if (this.gm.deployRune(rune, col, row)) {
      rune.x = col * this.cellSize + this.cellSize / 2;
      rune.y = row * this.cellSize + this.cellSize / 2;
      this.runeContainer.addChild(rune);
      rune.spawnAttackBurst(RUNE_COLORS[rune.runeType], 8);
    }
  }

  private onConfirmDeploy(): void {
    if (this.gm.phase !== GamePhase.DEPLOY) return;
    if (this.gm.playerDeployedCount === 0) return;

    this.gm.autoDeployEnemy();
    for (const rune of this.gm.enemyRunes) {
      rune.x = rune.gridX * this.cellSize + this.cellSize / 2;
      rune.y = rune.gridY * this.cellSize + this.cellSize / 2;
      this.runeContainer.addChild(rune);
    }

    this.startPhaseTransition(GamePhase.BATTLE);
  }

  private processBattleTick(): void {
    if (this.battleSubPhase !== 'idle') return;
    if (this.gm.phase !== GamePhase.BATTLE) return;

    if (this.gm.currentTurn === RuneTeam.ENEMY) {
      this.executeEnemyTurn();
    } else {
      this.executePlayerTurn();
    }
  }

  private async executePlayerTurn(): Promise<void> {
    this.isAnimating = true;
    this.battleSubPhase = 'moving';

    const actions = this.gm.computeActions();
    if (actions.length === 0) {
      this.battleSubPhase = 'idle';
      this.isAnimating = false;
      this.gm.endTurn();
      return;
    }

    this.battleSubPhase = 'attacking';
    await this.executeAttackActions(actions);

    this.battleSubPhase = 'idle';
    this.isAnimating = false;
    this.gm.endTurn();
  }

  private async executeEnemyTurn(): Promise<void> {
    this.isAnimating = true;
    this.battleSubPhase = 'moving';

    const moves = this.gm.computeAIMoves();
    for (const move of moves) {
      this.gm.applyMove(move.rune, move.toCol, move.toRow);
    }

    await this.delay(500);

    this.battleSubPhase = 'attacking';
    const actions = this.gm.computeActions();
    await this.executeAttackActions(actions);

    this.battleSubPhase = 'idle';
    this.isAnimating = false;
    this.gm.endTurn();
  }

  private async executeAttackActions(actions: AttackAction[]): Promise<void> {
    const promises = actions.map((action, idx) =>
      new Promise<void>((resolve) => {
        setTimeout(() => {
          this.fireProjectile(action.attacker, action.target, action.damage, action.multiplier, resolve);
        }, idx * 300);
      }),
    );
    await Promise.all(promises);
    await this.delay(400);
  }

  private fireProjectile(attacker: Rune, target: Rune, damage: number, multiplier: number, onDone: () => void): void {
    const color = RUNE_COLORS[attacker.runeType];
    const fromX = attacker.gridX * this.cellSize + this.cellSize / 2;
    const fromY = attacker.gridY * this.cellSize + this.cellSize / 2;
    const toX = target.gridX * this.cellSize + this.cellSize / 2;
    const toY = target.gridY * this.cellSize + this.cellSize / 2;

    const projGfx = new Graphics();
    projGfx.beginFill(color, 0.9);
    projGfx.drawCircle(0, 0, 5);
    projGfx.endFill();
    projGfx.beginFill(0xffffff, 0.6);
    projGfx.drawCircle(0, 0, 2.5);
    projGfx.endFill();
    projGfx.x = fromX;
    projGfx.y = fromY;

    this.projectileContainer.addChild(projGfx);

    const proj: Projectile = {
      gfx: projGfx,
      fromX,
      fromY,
      toX,
      toY,
      progress: 0,
      color,
      onHit: () => {
        target.spawnAttackBurst(color, 15);
        this.gm.applyAction({ attacker, target, damage, multiplier });
        if (!target.isAlive) {
          this.cleanupDeadRune(target);
        }
        onDone();
      },
    };

    this.projectiles.push(proj);
  }

  private cleanupDeadRune(rune: Rune): void {
    rune.spawnDestroyBurst();
  }

  private startPhaseTransition(targetPhase: GamePhase): void {
    this.phaseTransitioning = true;
    this.pendingPhase = targetPhase;
    this.phaseTransitionAlpha = 0;
    this.phaseLabel.visible = true;
    this.phaseLabel.text = targetPhase === GamePhase.BATTLE ? '⚔ 对战开始 ⚔' : '';
    this.phaseLabel.alpha = 0;
  }

  private updatePhaseTransition(deltaSec: number): void {
    if (!this.phaseTransitioning || !this.pendingPhase) return;

    this.phaseTransitionAlpha += deltaSec * 1.5;

    if (this.phaseTransitionAlpha < 1) {
      const t = this.easeInOutCubic(Math.min(1, this.phaseTransitionAlpha));
      this.fadeOverlay.alpha = t * 0.7;
      this.phaseLabel.alpha = t;
    } else if (this.phaseTransitionAlpha < 2) {
      if (this.pendingPhase === GamePhase.BATTLE) {
        this.gm.startBattle();
        this.selectorContainer.visible = false;
      }
      this.pendingPhase = null;
    } else if (this.phaseTransitionAlpha < 3) {
      const t = 1 - (this.phaseTransitionAlpha - 2);
      this.fadeOverlay.alpha = Math.max(0, t * 0.7);
      this.phaseLabel.alpha = Math.max(0, t);
    } else {
      this.fadeOverlay.alpha = 0;
      this.phaseLabel.visible = false;
      this.phaseTransitioning = false;
    }
  }

  private onPhaseChange(phase: GamePhase): void {
    if (phase === GamePhase.BATTLE) {
      this.selectorContainer.visible = false;
    }
  }

  private onTurnChange(team: RuneTeam, turn: number): void {
  }

  private onTimerUpdate(time: number): void {
  }

  private onGameOver(winner: RuneTeam, stats: GameStats): void {
    this.onGameEnd?.(winner, stats);
  }

  showDeployUI(): void {
    this.selectorContainer.visible = true;
    this.gm.phase = GamePhase.DEPLOY;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  override destroy(options?: any): void {
    for (const p of this.projectiles) {
      this.projectileContainer.removeChild(p.gfx);
      p.gfx.destroy();
    }
    this.projectiles = [];
    super.destroy(options);
  }
}
