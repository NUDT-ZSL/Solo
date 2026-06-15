import type { GameState, Unit, Skill, AIDecision } from './types';
import { BattleMap } from './BattleMap';
import { AIController } from './AIController';
import { createUnit, renderUnit, updateUnitAnimation, startAttackAnimation, startHurtAnimation, applyDamage, getHpColor } from './Unit';

const MAP_OFFSET_X = 280;
const MAP_OFFSET_Y = 40;
const PANEL_WIDTH = 280;
const BANNER_HEIGHT = 50;

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private battleMap: BattleMap;
  private aiController: AIController;
  private state: GameState;
  private lastTime: number = 0;
  private animationFrameId: number | null = null;
  private aiActionIndex: number = 0;
  private aiActionTimer: number = 0;
  private pendingDecision: AIDecision | null = null;
  private skillButtonRects: { x: number; y: number; width: number; height: number; skill: Skill }[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.battleMap = new BattleMap(8, 8, 80);
    this.aiController = new AIController(this.battleMap);
    this.state = this.initializeState();
    this.setupEventListeners();
    this.startGameLoop();
  }

  private initializeState(): GameState {
    const units: Unit[] = [];

    const playerPositions = [
      { x: 0, y: 2, prof: 'warrior' as const },
      { x: 0, y: 4, prof: 'mage' as const },
      { x: 0, y: 5, prof: 'archer' as const }
    ];

    playerPositions.forEach((pos, i) => {
      const unit = createUnit(`player_${i}`, pos.prof, pos.x, pos.y, true);
      units.push(unit);
      this.battleMap.setOccupant(pos.x, pos.y, unit);
    });

    const aiPositions = [
      { x: 7, y: 2, prof: 'warrior' as const },
      { x: 7, y: 4, prof: 'mage' as const },
      { x: 7, y: 5, prof: 'archer' as const }
    ];

    aiPositions.forEach((pos, i) => {
      const unit = createUnit(`ai_${i}`, pos.prof, pos.x, pos.y, false);
      units.push(unit);
      this.battleMap.setOccupant(pos.x, pos.y, unit);
    });

    return {
      phase: 'selectUnit',
      currentTurn: 'player',
      selectedUnit: null,
      selectedSkill: null,
      units,
      battleMap: this.battleMap.getData(),
      turnNumber: 1,
      gameStatus: 'playing',
      moveableCells: [],
      attackableUnits: [],
      turnBannerProgress: 1,
      turnBannerDirection: 0
    };
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('click', (e) => this.handleClick(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
  }

  private handleClick(e: MouseEvent): void {
    if (this.state.phase === 'animating' || this.state.phase === 'aiThinking' || this.state.gameStatus !== 'playing') {
      return;
    }

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    for (const btn of this.skillButtonRects) {
      if (x >= btn.x && x <= btn.x + btn.width && y >= btn.y && y <= btn.y + btn.height) {
        if (btn.skill.currentCooldown === 0 && this.state.selectedUnit && !this.state.selectedUnit.hasActed) {
          this.state.selectedSkill = btn.skill;
          this.updateAttackableUnits();
          this.state.phase = 'selectAttackTarget';
        }
        return;
      }
    }

    const gridX = Math.floor((x - MAP_OFFSET_X) / this.battleMap.getData().cellSize);
    const gridY = Math.floor((y - MAP_OFFSET_Y) / this.battleMap.getData().cellSize);

    if (gridX < 0 || gridX >= 8 || gridY < 0 || gridY >= 8) {
      return;
    }

    this.handleGridClick(gridX, gridY);
  }

  private handleGridClick(gridX: number, gridY: number): void {
    const clickedUnit = this.state.units.find(u => u.gridX === gridX && u.gridY === gridY && u.hp > 0);

    switch (this.state.phase) {
      case 'selectUnit':
        if (clickedUnit && clickedUnit.isPlayer && !clickedUnit.hasMoved && !clickedUnit.hasActed) {
          this.selectUnit(clickedUnit);
        }
        break;

      case 'selectMoveTarget':
        if (clickedUnit && clickedUnit.isPlayer && !clickedUnit.hasMoved && !clickedUnit.hasActed) {
          this.selectUnit(clickedUnit);
        } else {
          const isMoveable = this.state.moveableCells.some(c => c.x === gridX && c.y === gridY);
          if (isMoveable && this.state.selectedUnit) {
            this.moveUnit(this.state.selectedUnit, gridX, gridY);
          } else {
            this.cancelSelection();
          }
        }
        break;

      case 'selectAttackTarget':
        if (clickedUnit && !clickedUnit.isPlayer && this.state.attackableUnits.includes(clickedUnit.id)) {
          this.performAttack(clickedUnit);
        } else if (clickedUnit && clickedUnit.isPlayer && !clickedUnit.hasMoved && !clickedUnit.hasActed) {
          this.selectUnit(clickedUnit);
        } else {
          this.state.selectedSkill = null;
          this.state.phase = 'selectMoveTarget';
          this.updateAttackableUnits();
        }
        break;
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    for (const btn of this.skillButtonRects) {
      if (x >= btn.x && x <= btn.x + btn.width && y >= btn.y && y <= btn.y + btn.height) {
        this.canvas.style.cursor = 'pointer';
        return;
      }
    }

    const gridX = Math.floor((x - MAP_OFFSET_X) / this.battleMap.getData().cellSize);
    const gridY = Math.floor((y - MAP_OFFSET_Y) / this.battleMap.getData().cellSize);

    if (gridX >= 0 && gridX < 8 && gridY >= 0 && gridY < 8) {
      this.canvas.style.cursor = 'pointer';
    } else {
      this.canvas.style.cursor = 'default';
    }
  }

  private selectUnit(unit: Unit): void {
    this.state.selectedUnit = unit;
    this.state.selectedSkill = null;
    this.state.moveableCells = this.battleMap.getMoveableCells(unit);
    this.state.phase = 'selectMoveTarget';
    this.updateAttackableUnits();
  }

  private cancelSelection(): void {
    this.state.selectedUnit = null;
    this.state.selectedSkill = null;
    this.state.moveableCells = [];
    this.state.attackableUnits = [];
    this.state.phase = 'selectUnit';
  }

  private updateAttackableUnits(): void {
    if (!this.state.selectedUnit) {
      this.state.attackableUnits = [];
      return;
    }

    const attacker = this.state.selectedUnit;
    const range = this.state.selectedSkill ? this.state.selectedSkill.range : attacker.attackRange;
    const ignoreObstacle = this.state.selectedSkill?.ignoreObstacle || false;

    this.state.attackableUnits = this.state.units
      .filter(u => {
        if (u.isPlayer === attacker.isPlayer || u.hp <= 0) return false;
        const dist = this.battleMap.getDistance(attacker.gridX, attacker.gridY, u.gridX, u.gridY);
        if (dist > range) return false;
        if (ignoreObstacle) return true;
        return this.battleMap.hasLineOfSight(attacker.gridX, attacker.gridY, u.gridX, u.gridY);
      })
      .map(u => u.id);
  }

  private moveUnit(unit: Unit, targetX: number, targetY: number): void {
    this.battleMap.setOccupant(unit.gridX, unit.gridY, null);
    unit.gridX = targetX;
    unit.gridY = targetY;
    this.battleMap.setOccupant(targetX, targetY, unit);
    unit.hasMoved = true;
    this.state.moveableCells = [];
    this.state.phase = 'selectAttackTarget';
    this.updateAttackableUnits();

    if (this.state.attackableUnits.length === 0) {
      this.endUnitTurn(unit);
    }
  }

  private performAttack(target: Unit): void {
    if (!this.state.selectedUnit) return;

    const attacker = this.state.selectedUnit;
    const skill = this.state.selectedSkill;

    this.state.phase = 'animating';

    startAttackAnimation(attacker, target.gridX, target.gridY);

    setTimeout(() => {
      applyDamage(attacker, target, skill ?? undefined);
      startHurtAnimation(target);

      if (skill) {
        skill.currentCooldown = skill.cooldown;
      }

      attacker.hasActed = true;

      this.checkGameOver();

      setTimeout(() => {
        this.endUnitTurn(attacker);
      }, 200);
    }, 100);
  }

  private endUnitTurn(unit: Unit): void {
    unit.hasMoved = true;
    unit.hasActed = true;
    this.cancelSelection();

    const playerUnits = this.state.units.filter(u => u.isPlayer && u.hp > 0);
    const allDone = playerUnits.every(u => u.hasMoved && u.hasActed);

    if (allDone && this.state.currentTurn === 'player') {
      this.endPlayerTurn();
    }
  }

  private endPlayerTurn(): void {
    this.state.currentTurn = 'ai';
    this.state.phase = 'aiThinking';
    this.state.turnBannerDirection = -1;
    this.aiActionIndex = 0;
    this.aiActionTimer = 0;

    this.state.units.filter(u => u.isPlayer && u.hp > 0).forEach(u => {
      u.skills.forEach(s => {
        if (s.currentCooldown > 0) s.currentCooldown--;
      });
    });
  }

  private processAITurn(deltaTime: number): void {
    const aiUnits = this.state.units.filter(u => !u.isPlayer && u.hp > 0);

    if (this.aiActionIndex >= aiUnits.length) {
      this.endAITurn();
      return;
    }

    const currentUnit = aiUnits[this.aiActionIndex];

    if (currentUnit.hasMoved && currentUnit.hasActed) {
      this.aiActionIndex++;
      this.aiActionTimer = 0;
      return;
    }

    this.aiActionTimer += deltaTime;

    if (!this.pendingDecision && this.aiActionTimer >= 300) {
      const playerUnits = this.state.units.filter(u => u.isPlayer && u.hp > 0);
      this.pendingDecision = this.aiController.makeDecision(currentUnit, playerUnits, this.state.units);
      this.aiActionTimer = 0;
    }

    if (this.pendingDecision && this.aiActionTimer >= 200) {
      this.executeAIDecision(currentUnit, this.pendingDecision);
      this.pendingDecision = null;
      this.aiActionTimer = 0;
    }
  }

  private executeAIDecision(unit: Unit, decision: AIDecision): void {
    switch (decision.action) {
      case 'move':
        if (decision.targetX !== undefined && decision.targetY !== undefined) {
          this.battleMap.setOccupant(unit.gridX, unit.gridY, null);
          unit.gridX = decision.targetX;
          unit.gridY = decision.targetY;
          this.battleMap.setOccupant(decision.targetX, decision.targetY, unit);
        }
        unit.hasMoved = true;
        break;

      case 'attack':
        if (decision.targetUnitId) {
          const target = this.state.units.find(u => u.id === decision.targetUnitId);
          if (target) {
            this.state.phase = 'animating';
            startAttackAnimation(unit, target.gridX, target.gridY);
            setTimeout(() => {
              applyDamage(unit, target);
              startHurtAnimation(target);
              unit.hasActed = true;
              this.checkGameOver();
              this.state.phase = 'aiThinking';
            }, 100);
            return;
          }
        }
        unit.hasActed = true;
        break;

      case 'skill':
        if (decision.targetUnitId && decision.skillId) {
          const target = this.state.units.find(u => u.id === decision.targetUnitId);
          const skill = unit.skills.find(s => s.id === decision.skillId);
          if (target && skill) {
            this.state.phase = 'animating';
            startAttackAnimation(unit, target.gridX, target.gridY);
            setTimeout(() => {
              applyDamage(unit, target, skill);
              startHurtAnimation(target);
              skill.currentCooldown = skill.cooldown;
              unit.hasActed = true;
              this.checkGameOver();
              this.state.phase = 'aiThinking';
            }, 100);
            return;
          }
        }
        unit.hasActed = true;
        break;

      case 'end':
        unit.hasMoved = true;
        unit.hasActed = true;
        break;
    }
  }

  private endAITurn(): void {
    this.state.currentTurn = 'player';
    this.state.phase = 'selectUnit';
    this.state.turnNumber++;
    this.state.turnBannerDirection = 1;

    this.state.units.forEach(u => {
      u.hasMoved = false;
      u.hasActed = false;
      if (!u.isPlayer && u.hp > 0) {
        u.skills.forEach(s => {
          if (s.currentCooldown > 0) s.currentCooldown--;
        });
      }
    });
  }

  private checkGameOver(): void {
    const playerAlive = this.state.units.some(u => u.isPlayer && u.hp > 0);
    const aiAlive = this.state.units.some(u => !u.isPlayer && u.hp > 0);

    if (!playerAlive) {
      this.state.gameStatus = 'defeat';
      this.state.phase = 'gameOver';
    } else if (!aiAlive) {
      this.state.gameStatus = 'victory';
      this.state.phase = 'gameOver';
    }
  }

  private startGameLoop(): void {
    this.lastTime = performance.now();
    this.gameLoop();
  }

  private gameLoop = (): void => {
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.render();

    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  private update(deltaTime: number): void {
    this.state.units.forEach(unit => {
      updateUnitAnimation(unit, deltaTime);
    });

    if (this.state.turnBannerDirection !== 0) {
      this.state.turnBannerProgress += this.state.turnBannerDirection * deltaTime / 300;
      if (this.state.turnBannerProgress >= 1) {
        this.state.turnBannerProgress = 1;
        this.state.turnBannerDirection = 0;
      } else if (this.state.turnBannerProgress <= 0) {
        this.state.turnBannerProgress = 1;
        this.state.turnBannerDirection = 0;
      }
    }

    if (this.state.phase === 'aiThinking' && this.state.gameStatus === 'playing') {
      this.processAITurn(deltaTime);
    }

    if (this.state.phase === 'animating') {
      const anyAnimating = this.state.units.some(u => u.isAttacking || u.isHurt);
      if (!anyAnimating) {
        if (this.state.currentTurn === 'player') {
          this.state.phase = 'selectUnit';
        } else {
          this.state.phase = 'aiThinking';
        }
      }
    }
  }

  private render(): void {
    const ctx = this.ctx;
    const { width, height } = this.canvas;

    ctx.fillStyle = '#1A1A2E';
    ctx.fillRect(0, 0, width, height);

    this.renderTurnBanner();
    this.battleMap.render(ctx, MAP_OFFSET_X, MAP_OFFSET_Y);

    if (this.state.moveableCells.length > 0) {
      this.battleMap.renderMoveableCells(ctx, this.state.moveableCells, MAP_OFFSET_X, MAP_OFFSET_Y);
    }

    const aliveUnits = this.state.units.filter(u => u.hp > 0);
    aliveUnits.forEach(unit => {
      const isSelected = this.state.selectedUnit?.id === unit.id;
      const isTargetable = this.state.attackableUnits.includes(unit.id);
      renderUnit(ctx, unit, MAP_OFFSET_X, MAP_OFFSET_Y, this.battleMap.getData().cellSize, isSelected, isTargetable);
    });

    this.renderInfoPanel();
    this.renderGameOver();
  }

  private renderTurnBanner(): void {
    const ctx = this.ctx;
    const { width } = this.canvas;
    const bannerY = 10;
    const bannerWidth = 240;
    const progress = this.state.turnBannerProgress;
    const offsetX = (1 - progress) * (this.state.currentTurn === 'player' ? -bannerWidth : bannerWidth);

    const gradient = ctx.createLinearGradient(width / 2 - bannerWidth / 2 + offsetX, 0, width / 2 + bannerWidth / 2 + offsetX, 0);
    if (this.state.currentTurn === 'player') {
      gradient.addColorStop(0, '#3498DB');
      gradient.addColorStop(0.5, '#2ECC71');
      gradient.addColorStop(1, '#3498DB');
    } else {
      gradient.addColorStop(0, '#E74C3C');
      gradient.addColorStop(0.5, '#9B59B6');
      gradient.addColorStop(1, '#E74C3C');
    }

    ctx.fillStyle = gradient;
    this.roundRect(ctx, width / 2 - bannerWidth / 2 + offsetX, bannerY, bannerWidth, BANNER_HEIGHT, 8);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const text = this.state.currentTurn === 'player' ? `玩家回合 - 第${this.state.turnNumber}回合` : `AI回合 - 第${this.state.turnNumber}回合`;
    ctx.fillText(text, width / 2 + offsetX, bannerY + BANNER_HEIGHT / 2);
  }

  private renderInfoPanel(): void {
    const ctx = this.ctx;
    const { width, height } = this.canvas;
    const panelX = width - PANEL_WIDTH - 20;
    const panelY = 80;
    const panelHeight = height - 100;

    ctx.fillStyle = 'rgba(22, 33, 62, 0.8)';
    this.roundRect(ctx, panelX, panelY, PANEL_WIDTH, panelHeight, 8);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    this.roundRect(ctx, panelX, panelY, PANEL_WIDTH, panelHeight, 8);
    ctx.stroke();

    if (this.state.selectedUnit) {
      this.renderUnitDetails(ctx, this.state.selectedUnit, panelX, panelY);
    } else {
      ctx.fillStyle = '#BDC3C7';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('点击选择一个角色', panelX + PANEL_WIDTH / 2, panelY + 40);
      ctx.font = '12px sans-serif';
      ctx.fillText('左侧角色为己方，右侧为敌方', panelX + PANEL_WIDTH / 2, panelY + 70);
    }

    this.renderTurnInstructions(ctx, 20, 80);
  }

  private renderUnitDetails(ctx: CanvasRenderingContext2D, unit: Unit, panelX: number, panelY: number): void {
    const contentX = panelX + 20;
    let currentY = panelY + 30;

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(unit.name, contentX, currentY);
    currentY += 10;

    ctx.fillStyle = unit.color;
    ctx.beginPath();
    ctx.arc(contentX + PANEL_WIDTH - 60, currentY - 5, 20, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    const icon = unit.profession === 'warrior' ? '⚔' : unit.profession === 'mage' ? '🔮' : '🏹';
    ctx.fillText(icon, contentX + PANEL_WIDTH - 60, currentY - 2);
    ctx.textAlign = 'left';

    currentY += 30;

    ctx.fillStyle = '#BDC3C7';
    ctx.font = '14px sans-serif';
    ctx.fillText('生命值', contentX, currentY);
    currentY += 8;

    const hpBarWidth = PANEL_WIDTH - 60;
    const hpBarHeight = 14;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(contentX, currentY, hpBarWidth, hpBarHeight);

    const hpPercent = unit.displayHp / unit.maxHp;
    ctx.fillStyle = getHpColor(hpPercent);
    ctx.fillRect(contentX, currentY, hpBarWidth * hpPercent, hpBarHeight);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.strokeRect(contentX, currentY, hpBarWidth, hpBarHeight);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.ceil(unit.displayHp)}/${unit.maxHp}`, contentX + hpBarWidth, currentY + hpBarHeight + 16);
    ctx.textAlign = 'left';
    currentY += 35;

    ctx.fillStyle = '#BDC3C7';
    ctx.font = '14px sans-serif';
    ctx.fillText(`攻击力: ${unit.attack}`, contentX, currentY);
    currentY += 22;
    ctx.fillText(`移动范围: ${unit.moveRange}格`, contentX, currentY);
    currentY += 22;
    ctx.fillText(`攻击范围: ${unit.attackRange}格`, contentX, currentY);
    currentY += 30;

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('技能', contentX, currentY);
    currentY += 25;

    this.skillButtonRects = [];
    unit.skills.forEach((skill) => {
      const btnX = contentX;
      const btnY = currentY;
      const btnWidth = PANEL_WIDTH - 40;
      const btnHeight = 50;

      const isOnCooldown = skill.currentCooldown > 0;
      const canUse = !isOnCooldown && !unit.hasActed && unit.isPlayer;

      ctx.fillStyle = isOnCooldown ? 'rgba(127, 140, 141, 0.6)' : (this.state.selectedSkill?.id === skill.id ? 'rgba(52, 152, 219, 0.8)' : 'rgba(52, 73, 94, 0.8)');
      this.roundRect(ctx, btnX, btnY, btnWidth, btnHeight, 6);
      ctx.fill();

      ctx.strokeStyle = canUse ? 'rgba(52, 152, 219, 0.8)' : 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 2;
      this.roundRect(ctx, btnX, btnY, btnWidth, btnHeight, 6);
      ctx.stroke();

      ctx.font = '24px sans-serif';
      ctx.fillStyle = isOnCooldown ? '#7F8C8D' : '#FFFFFF';
      ctx.fillText(skill.icon, btnX + 12, btnY + 32);

      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(skill.name, btnX + 50, btnY + 20);

      ctx.font = '11px sans-serif';
      ctx.fillStyle = isOnCooldown ? '#95A5A6' : '#BDC3C7';
      ctx.fillText(skill.description, btnX + 50, btnY + 38);

      if (isOnCooldown) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.roundRect(ctx, btnX, btnY, btnWidth, btnHeight, 6);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(skill.currentCooldown.toString(), btnX + btnWidth / 2, btnY + btnHeight / 2 + 8);
        ctx.textAlign = 'left';
      }

      if (canUse) {
        this.skillButtonRects.push({ x: btnX, y: btnY, width: btnWidth, height: btnHeight, skill });
      }

      currentY += btnHeight + 10;
    });

    if (!unit.hasActed && this.state.attackableUnits.length > 0) {
      ctx.fillStyle = '#2ECC71';
      ctx.font = '12px sans-serif';
      ctx.fillText('💡 点击敌人进行攻击', contentX, currentY);
    }

    if (unit.hasMoved && unit.hasActed) {
      ctx.fillStyle = '#E74C3C';
      ctx.font = '12px sans-serif';
      ctx.fillText('本回合已行动完毕', contentX, currentY);
    }
  }

  private renderTurnInstructions(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const panelWidth = 200;
    const panelHeight = 180;

    ctx.fillStyle = 'rgba(22, 33, 62, 0.8)';
    this.roundRect(ctx, x, y, panelWidth, panelHeight, 8);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    this.roundRect(ctx, x, y, panelWidth, panelHeight, 8);
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('操作提示', x + panelWidth / 2, y + 25);

    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#BDC3C7';
    ctx.textAlign = 'left';
    const instructions = [
      '1. 点击己方角色选中',
      '2. 蓝色格子为可移动范围',
      '3. 移动后选择技能或普攻',
      '4. 点击红圈敌人进行攻击',
      '5. 所有角色行动完切换回合'
    ];

    instructions.forEach((text, i) => {
      ctx.fillText(text, x + 15, y + 50 + i * 22);
    });
  }

  private renderGameOver(): void {
    if (this.state.gameStatus === 'playing') return;

    const ctx = this.ctx;
    const { width, height } = this.canvas;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, width, height);

    const isVictory = this.state.gameStatus === 'victory';
    ctx.fillStyle = isVictory ? '#2ECC71' : '#E74C3C';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(isVictory ? '🎉 胜利！' : '💀 失败...', width / 2, height / 2);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '20px sans-serif';
    ctx.fillText(`游戏结束 - 共${this.state.turnNumber}回合`, width / 2, height / 2 + 50);
    ctx.font = '16px sans-serif';
    ctx.fillText('刷新页面重新开始', width / 2, height / 2 + 90);
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  public destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}
