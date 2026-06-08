import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './main';
import { Player } from './Player';
import { EnemyAI, EnemyAIConfig } from './EnemyAI';
import { Unit, UnitType, WorkerBug } from './Unit';

const WORLD_W = 2400;
const WORLD_H = 2400;
const CREEP_COUNT = 14;
const CRATER_COUNT = 20;
const HIGHLAND_COUNT = 8;
const MOON_CORE_OCCUPY_TIME = 60000;

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private enemyAI!: EnemyAI;
  private creepNodes: Phaser.GameObjects.Sprite[] = [];
  private craters: Phaser.Physics.Arcade.StaticGroup | null = null;
  private highlands: Phaser.GameObjects.Rectangle[] = [];
  private moonCore!: Phaser.GameObjects.Sprite;
  private moonCoreCaptured: boolean = false;
  private moonCoreTimer: number = 0;
  private moonCoreSpawnTime: number = 45000;
  private moonCoreAppeared: boolean = false;
  private gameElapsedTime: number = 0;
  private gameOver: boolean = false;

  private uiPanel!: Phaser.GameObjects.Graphics;
  private energyText!: Phaser.GameObjects.Text;
  private unitCountText!: Phaser.GameObjects.Text;
  private miniMapBg!: Phaser.GameObjects.Sprite;
  private miniMapDots: Phaser.GameObjects.Arc[] = [];
  private btnSpike!: Phaser.GameObjects.Container;
  private btnShield!: Phaser.GameObjects.Container;
  private btnPlague!: Phaser.GameObjects.Container;
  private btnWorker!: Phaser.GameObjects.Container;
  private moonCoreBar!: Phaser.GameObjects.Graphics;
  private moonCoreLabel!: Phaser.GameObjects.Text;
  private victoryOverlay: Phaser.GameObjects.Container | null = null;

  private bgGraphics!: Phaser.GameObjects.Graphics;
  private creepPulseTime: number = 0;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);

    this.generateBackground();
    this.generateCraters();
    this.generateHighlands();
    this.generateCreepNodes();
    this.setupMoonCore();

    const playerSpawnX = 300;
    const playerSpawnY = WORLD_H / 2;
    this.player = new Player(this, playerSpawnX, playerSpawnY);

    const enemyConfig: EnemyAIConfig = {
      hiveX: WORLD_W - 300,
      hiveY: WORLD_H / 2,
      patrolInterval: 15000,
      moonCoreX: WORLD_W / 2,
      moonCoreY: WORLD_H / 2,
    };
    this.enemyAI = new EnemyAI(this, this.player, enemyConfig);

    this.setupCamera();
    this.setupUI();
    this.setupCombat();

    this.cameras.main.fadeIn(1000, 10, 0, 16);
  }

  private generateBackground(): void {
    this.bgGraphics = this.add.graphics();
    this.bgGraphics.setDepth(0);
    this.bgGraphics.fillStyle(0x0a0010, 1);
    this.bgGraphics.fillRect(0, 0, WORLD_W, WORLD_H);

    const gradient = this.add.graphics();
    gradient.setDepth(0);
    for (let y = 0; y < WORLD_H; y += 4) {
      const t = y / WORLD_H;
      const r = Math.floor(0x0a * (1 - t) + 0x05 * t);
      const g = Math.floor(0x00 * (1 - t) + 0x00 * t);
      const b = Math.floor(0x10 * (1 - t) + 0x20 * t);
      gradient.fillStyle(Phaser.Display.Color.GetColor(r, g, b), 1);
      gradient.fillRect(0, y, WORLD_W, 4);
    }

    for (let i = 0; i < 80; i++) {
      const sx = Phaser.Math.Between(0, WORLD_W);
      const sy = Phaser.Math.Between(0, WORLD_H);
      const star = this.add.circle(sx, sy, Phaser.Math.Between(1, 2), 0xffffff, Phaser.Math.FloatBetween(0.2, 0.6));
      star.setDepth(0);
      this.tweens.add({
        targets: star,
        alpha: Phaser.Math.FloatBetween(0.1, 0.3),
        duration: Phaser.Math.Between(1500, 4000),
        yoyo: true,
        repeat: -1,
      });
    }
  }

  private generateCraters(): void {
    this.craters = this.physics.add.staticGroup();
    for (let i = 0; i < CRATER_COUNT; i++) {
      const cx = Phaser.Math.Between(100, WORLD_W - 100);
      const cy = Phaser.Math.Between(100, WORLD_H - 100);
      if (Phaser.Math.Distance.Between(cx, cy, WORLD_W / 2, WORLD_H / 2) < 120) continue;
      if (cx < 400 && cy > WORLD_H / 2 - 200 && cy < WORLD_H / 2 + 200) continue;
      if (cx > WORLD_W - 400 && cy > WORLD_H / 2 - 200 && cy < WORLD_H / 2 + 200) continue;
      const crater = this.craters.create(cx, cy, 'crater') as Phaser.Physics.Arcade.Sprite;
      crater.setDepth(1);
      crater.setAlpha(0.7);
    }
  }

  private generateHighlands(): void {
    for (let i = 0; i < HIGHLAND_COUNT; i++) {
      const hx = Phaser.Math.Between(200, WORLD_W - 200);
      const hy = Phaser.Math.Between(200, WORLD_H - 200);
      const rect = this.add.rectangle(hx, hy, 64, 64, 0x3b1d6e, 0.3);
      rect.setStrokeStyle(1, 0x7c3aed, 0.25);
      rect.setDepth(2);
      rect.setData('isHighland', true);
      this.highlands.push(rect);

      const label = this.add.text(hx, hy, '▲', {
        fontSize: '10px',
        color: '#7c3aed',
      }).setOrigin(0.5).setDepth(2).setAlpha(0.4);
    }
  }

  private generateCreepNodes(): void {
    for (let i = 0; i < CREEP_COUNT; i++) {
      const nx = Phaser.Math.Between(150, WORLD_W - 150);
      const ny = Phaser.Math.Between(150, WORLD_H - 150);
      const node = this.add.sprite(nx, ny, 'creep_node');
      node.setDepth(3);
      node.setData('energyRemaining', 300);
      node.setData('maxEnergy', 300);
      this.creepNodes.push(node);

      this.tweens.add({
        targets: node,
        scale: 1.1,
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: i * 200,
      });
    }
  }

  private setupMoonCore(): void {
    this.moonCore = this.add.sprite(WORLD_W / 2, WORLD_H / 2, 'moon_core');
    this.moonCore.setDepth(4);
    this.moonCore.setVisible(false);
    this.moonCore.setActive(false);
    this.moonCore.setScale(0);

    this.tweens.add({
      targets: this.moonCore,
      scale: 1,
      duration: 1000,
      ease: 'Back.easeOut',
      paused: true,
    });
  }

  private showMoonCore(): void {
    if (this.moonCoreAppeared) return;
    this.moonCoreAppeared = true;
    this.moonCore.setVisible(true);
    this.moonCore.setActive(true);

    this.tweens.add({
      targets: this.moonCore,
      scale: 1,
      duration: 1000,
      ease: 'Back.easeOut',
    });

    this.tweens.add({
      targets: this.moonCore,
      alpha: 0.7,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.enemyAI.activateMoonCore();

    const announce = this.add.text(WORLD_W / 2, WORLD_H / 2 - 60, '月核出现!', {
      fontSize: '24px',
      fontFamily: 'serif',
      color: '#e879f9',
      stroke: '#0a0010',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(60).setScrollFactor(0);

    this.tweens.add({
      targets: announce,
      alpha: 0,
      y: announce.y - 40,
      duration: 2500,
      onComplete: () => announce.destroy(),
    });
  }

  private setupCamera(): void {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, WORLD_W, WORLD_H);
    cam.startFollow(this.player.ancientBug, true, 0.08, 0.08);

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown && pointer.rightButtonDown()) return;
      const edgeMargin = 30;
      const speed = 6;
      if (pointer.x < edgeMargin) cam.scrollX -= speed;
      if (pointer.x > GAME_WIDTH - edgeMargin) cam.scrollX += speed;
      if (pointer.y < edgeMargin) cam.scrollY -= speed;
      if (pointer.y > GAME_HEIGHT - edgeMargin) cam.scrollY += speed;
    });
  }

  private setupUI(): void {
    this.uiPanel = this.add.graphics().setScrollFactor(0).setDepth(50);
    this.drawUiPanel();

    this.energyText = this.add.text(20, 16, '', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#c084fc',
    }).setScrollFactor(0).setDepth(51);

    this.unitCountText = this.add.text(20, 38, '', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#a78bfa',
    }).setScrollFactor(0).setDepth(51);

    this.moonCoreBar = this.add.graphics().setScrollFactor(0).setDepth(51);
    this.moonCoreLabel = this.add.text(GAME_WIDTH / 2, 16, '', {
      fontSize: '13px',
      fontFamily: 'monospace',
      color: '#e879f9',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(51);

    this.miniMapBg = this.add.sprite(GAME_WIDTH - 90, GAME_HEIGHT - 70, 'minimap_bg');
    this.miniMapBg.setScrollFactor(0).setDepth(50);

    this.btnSpike = this.createSummonBtn(GAME_WIDTH - 240, GAME_HEIGHT - 40, '刺虫', '1', UnitType.Spike, 0xef4444);
    this.btnShield = this.createSummonBtn(GAME_WIDTH - 175, GAME_HEIGHT - 40, '盾虫', '2', UnitType.Shield, 0x3b82f6);
    this.btnPlague = this.createSummonBtn(GAME_WIDTH - 110, GAME_HEIGHT - 40, '疫虫', '3', UnitType.Plague, 0x22c55e);
    this.btnWorker = this.createSummonBtn(GAME_WIDTH - 310, GAME_HEIGHT - 40, '工兵', 'W', UnitType.Worker, 0xa855f7);
  }

  private drawUiPanel(): void {
    this.uiPanel.clear();
    this.uiPanel.fillStyle(0x0a0010, 0.6);
    this.uiPanel.fillRoundedRect(10, 8, 220, 58, 8);
    this.uiPanel.fillStyle(0x0a0010, 0.5);
    this.uiPanel.fillRoundedRect(GAME_WIDTH - 320, GAME_HEIGHT - 70, 310, 62, 8);
  }

  private createSummonBtn(
    x: number, y: number, label: string, hotkey: string,
    unitType: UnitType, tint: number
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y).setScrollFactor(0).setDepth(51);

    const bg = this.add.sprite(0, 0, 'btn_frame');
    bg.setTint(tint);

    const text = this.add.text(0, -4, label, {
      fontSize: '11px',
      fontFamily: 'monospace',
      color: '#e2e8f0',
    }).setOrigin(0.5);

    const costText = this.add.text(0, 10, `${this.player.getUnitCost(unitType) || 15}`, {
      fontSize: '9px',
      fontFamily: 'monospace',
      color: '#c084fc',
    }).setOrigin(0.5);

    const hotkeyLabel = this.add.text(20, -18, hotkey, {
      fontSize: '9px',
      fontFamily: 'monospace',
      color: '#94a3b8',
    }).setOrigin(0.5);

    container.add([bg, text, costText, hotkeyLabel]);

    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => {
      this.tweens.add({ targets: container, scaleX: 1.12, scaleY: 1.12, duration: 150, ease: 'Back.easeOut' });
      const halo = this.add.circle(x, y, 32, tint, 0.15).setScrollFactor(0).setDepth(50);
      this.tweens.add({ targets: halo, alpha: 0, scale: 1.6, duration: 400, onComplete: () => halo.destroy() });
    });
    bg.on('pointerout', () => {
      this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 200, ease: 'Sine.easeOut' });
    });
    bg.on('pointerdown', () => {
      this.handleSummon(unitType);
    });

    this.input.keyboard!.on(`keydown-${hotkey}`, () => {
      this.handleSummon(unitType);
    });

    return container;
  }

  private handleSummon(type: UnitType): void {
    const spawnX = this.player.ancientBug.x + Phaser.Math.Between(-40, 40);
    const spawnY = this.player.ancientBug.y + Phaser.Math.Between(-40, 40);

    if (type === UnitType.Worker) {
      const worker = this.player.deployWorker(spawnX, spawnY);
      if (worker) {
        const nearestNode = this.findNearestCreepNode(spawnX, spawnY);
        if (nearestNode) worker.setGatherTarget(nearestNode);
      }
    } else {
      this.player.summonUnit(type, spawnX, spawnY);
    }
  }

  private findNearestCreepNode(x: number, y: number): Phaser.GameObjects.Sprite | null {
    let closest: Phaser.GameObjects.Sprite | null = null;
    let closestDist = Infinity;
    for (const node of this.creepNodes) {
      if (!node.active) continue;
      const energy = node.getData('energyRemaining') as number;
      if (energy <= 0) continue;
      const dist = Phaser.Math.Distance.Between(x, y, node.x, node.y);
      if (dist < closestDist) {
        closestDist = dist;
        closest = node;
      }
    }
    return closest;
  }

  private setupCombat(): void {
    this.input.on('gameobjectdown', (pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject) => {
      if (obj.getData('isCreepNode')) {
        for (const worker of this.player.workers) {
          if (worker.isSelected) {
            worker.setGatherTarget(obj as Phaser.GameObjects.Sprite);
          }
        }
      }
    });
  }

  update(time: number, delta: number): void {
    if (this.gameOver) return;

    this.gameElapsedTime += delta;

    if (!this.moonCoreAppeared && this.gameElapsedTime >= this.moonCoreSpawnTime) {
      this.showMoonCore();
    }

    this.player.update(time, delta);
    this.enemyAI.update(time, delta);

    this.updateWorkerGathering(delta);
    this.updateCombatCollisions();
    this.updateMoonCoreCapture(delta);
    this.updateHighlandCheck();
    this.updateCreepPulse(delta);
    this.updateUI();
    this.checkWinConditions();
  }

  private updateWorkerGathering(delta: number): void {
    for (const worker of this.player.workers) {
      if (worker.isGathering && worker.targetNode && worker.targetNode.active) {
        const energyLeft = worker.targetNode.getData('energyRemaining') as number;
        if (energyLeft <= 0) {
          worker.isGathering = false;
          worker.targetNode.setAlpha(0.3);
          const newNode = this.findNearestCreepNode(worker.x, worker.y);
          if (newNode) worker.setGatherTarget(newNode);
        } else {
          const drain = (worker.gatherRate * delta) / 1000;
          const actual = Math.min(drain, energyLeft);
          worker.targetNode.setData('energyRemaining', energyLeft - actual);
        }
      }
    }
  }

  private updateCombatCollisions(): void {
    for (const playerUnit of this.player.units) {
      if (!playerUnit.active) continue;
      for (const enemyUnit of this.enemyAI.units) {
        if (!enemyUnit.active) continue;
        const dist = Phaser.Math.Distance.Between(
          playerUnit.x, playerUnit.y, enemyUnit.x, enemyUnit.y
        );
        if (dist < playerUnit.attackRange && playerUnit.attackDamage > 0) {
          if (!playerUnit.targetEnemy || !playerUnit.targetEnemy.active) {
            playerUnit.attackTarget(enemyUnit);
          }
        }
        if (dist < enemyUnit.attackRange) {
          if (!enemyUnit.targetEnemy || !enemyUnit.targetEnemy.active) {
            enemyUnit.attackTarget(playerUnit);
          }
        }
      }
    }

    for (const enemyUnit of this.enemyAI.units) {
      if (!enemyUnit.active) continue;
      if (enemyUnit.getData('attackingAncient')) {
        // Damage to ancient bug handled via timer
      }
      const distToHive = Phaser.Math.Distance.Between(
        enemyUnit.x, enemyUnit.y, this.enemyAI.hive.x, this.enemyAI.hive.y
      );
    }

    for (const playerUnit of this.player.units) {
      if (!playerUnit.active) continue;
      const distToHive = Phaser.Math.Distance.Between(
        playerUnit.x, playerUnit.y, this.enemyAI.hive.x, this.enemyAI.hive.y
      );
      if (distToHive < 40 && this.enemyAI.hive.active) {
        if (!playerUnit.targetEnemy) {
          this.enemyAI.takeHiveDamage(playerUnit.attackDamage * 0.01);
        }
      }
    }
  }

  private updateMoonCoreCapture(delta: number): void {
    if (!this.moonCoreAppeared || !this.moonCore.active) return;

    let playerNear = false;
    let enemyNear = false;

    for (const unit of this.player.units) {
      const dist = Phaser.Math.Distance.Between(unit.x, unit.y, this.moonCore.x, this.moonCore.y);
      if (dist < 60) { playerNear = true; break; }
    }

    const ancientDist = Phaser.Math.Distance.Between(
      this.player.ancientBug.x, this.player.ancientBug.y,
      this.moonCore.x, this.moonCore.y
    );
    if (ancientDist < 60) playerNear = true;

    for (const enemy of this.enemyAI.units) {
      const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.moonCore.x, this.moonCore.y);
      if (dist < 60) { enemyNear = true; break; }
    }

    if (playerNear && !enemyNear) {
      this.moonCoreTimer += delta;
      this.moonCoreCaptured = false;
    } else if (enemyNear && !playerNear) {
      this.moonCoreTimer = Math.max(0, this.moonCoreTimer - delta * 0.5);
      this.moonCoreCaptured = false;
    } else {
      this.moonCoreCaptured = false;
    }
  }

  private updateHighlandCheck(): void {
    for (const unit of this.player.units) {
      let onHighland = false;
      for (const hl of this.highlands) {
        const dist = Phaser.Math.Distance.Between(unit.x, unit.y, hl.x, hl.y);
        if (dist < 40) { onHighland = true; break; }
      }
      unit.isOnHighland = onHighland;
    }
  }

  private updateCreepPulse(delta: number): void {
    this.creepPulseTime += delta * 0.001;
    for (let i = 0; i < this.creepNodes.length; i++) {
      const node = this.creepNodes[i];
      if (!node.active) continue;
      const energy = node.getData('energyRemaining') as number;
      const maxEnergy = node.getData('maxEnergy') as number;
      const ratio = energy / maxEnergy;
      const pulse = 0.7 + Math.sin(this.creepPulseTime * 2 + i) * 0.15;
      node.setAlpha(pulse * ratio);
    }
  }

  private updateUI(): void {
    this.energyText.setText(`月岩能量: ${Math.floor(this.player.energy)} / ${this.player.maxEnergy}`);
    const counts = this.player.unitCounts;
    this.unitCountText.setText(
      `刺虫:${counts[UnitType.Spike]} 盾虫:${counts[UnitType.Shield]} 疫虫:${counts[UnitType.Plague]} 工兵:${counts[UnitType.Worker]}`
    );

    this.moonCoreBar.clear();
    if (this.moonCoreAppeared) {
      const progress = this.moonCoreTimer / MOON_CORE_OCCUPY_TIME;
      const barW = 200;
      const barX = GAME_WIDTH / 2 - barW / 2;
      const barY = 30;
      this.moonCoreBar.fillStyle(0x1a0a2e, 0.7);
      this.moonCoreBar.fillRoundedRect(barX, barY, barW, 8, 4);
      this.moonCoreBar.fillStyle(0xe879f9, 0.8);
      this.moonCoreBar.fillRoundedRect(barX, barY, barW * Math.min(progress, 1), 8, 4);
      this.moonCoreLabel.setText(`月核占领 ${Math.floor(progress * 100)}%`);
    } else {
      const timeLeft = Math.max(0, Math.ceil((this.moonCoreSpawnTime - this.gameElapsedTime) / 1000));
      this.moonCoreLabel.setText(`月核出现: ${timeLeft}s`);
    }

    this.updateMiniMap();
  }

  private updateMiniMap(): void {
    for (const dot of this.miniMapDots) dot.destroy();
    this.miniMapDots = [];

    const mapX = GAME_WIDTH - 90;
    const mapY = GAME_HEIGHT - 70;
    const scaleX = 140 / WORLD_W;
    const scaleY = 100 / WORLD_H;

    const playerDot = this.add.circle(
      mapX + (this.player.ancientBug.x - WORLD_W / 2) * scaleX,
      mapY + (this.player.ancientBug.y - WORLD_H / 2) * scaleY,
      3, 0xc084fc, 0.9
    ).setScrollFactor(0).setDepth(52);
    this.miniMapDots.push(playerDot);

    for (const unit of this.player.units) {
      if (!unit.active) continue;
      const dot = this.add.circle(
        mapX + (unit.x - WORLD_W / 2) * scaleX,
        mapY + (unit.y - WORLD_H / 2) * scaleY,
        1.5, 0xa855f7, 0.7
      ).setScrollFactor(0).setDepth(52);
      this.miniMapDots.push(dot);
    }

    if (this.enemyAI.hive.active) {
      const hiveDot = this.add.circle(
        mapX + (this.enemyAI.hive.x - WORLD_W / 2) * scaleX,
        mapY + (this.enemyAI.hive.y - WORLD_H / 2) * scaleY,
        3, 0xef4444, 0.9
      ).setScrollFactor(0).setDepth(52);
      this.miniMapDots.push(hiveDot);
    }

    for (const enemy of this.enemyAI.units) {
      if (!enemy.active) continue;
      const dot = this.add.circle(
        mapX + (enemy.x - WORLD_W / 2) * scaleX,
        mapY + (enemy.y - WORLD_H / 2) * scaleY,
        1.5, 0xef4444, 0.6
      ).setScrollFactor(0).setDepth(52);
      this.miniMapDots.push(dot);
    }

    if (this.moonCoreAppeared) {
      const coreDot = this.add.circle(
        mapX + (this.moonCore.x - WORLD_W / 2) * scaleX,
        mapY + (this.moonCore.y - WORLD_H / 2) * scaleY,
        2.5, 0xe879f9, 0.9
      ).setScrollFactor(0).setDepth(52);
      this.miniMapDots.push(coreDot);
    }
  }

  private checkWinConditions(): void {
    if (this.gameOver) return;

    if (this.enemyAI.isHiveDestroyed()) {
      this.endGame(true, '敌方母巢已摧毁!');
      return;
    }

    if (this.moonCoreTimer >= MOON_CORE_OCCUPY_TIME) {
      this.endGame(true, '月核占领完成!');
      return;
    }

    if (!this.player.ancientBug.active) {
      this.endGame(false, '远古巨虫已陨落...');
    }
  }

  private endGame(victory: boolean, message: string): void {
    this.gameOver = true;
    this.physics.pause();

    this.victoryOverlay = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setScrollFactor(0).setDepth(100);

    const bg = this.add.rectangle(0, 0, 400, 200, 0x0a0010, 0.85);
    bg.setStrokeStyle(2, victory ? 0xc084fc : 0xef4444, 0.8);

    const title = this.add.text(0, -40, victory ? '胜 利' : '失 败', {
      fontSize: '36px',
      fontFamily: 'serif',
      color: victory ? '#c084fc' : '#ef4444',
    }).setOrigin(0.5);

    const desc = this.add.text(0, 10, message, {
      fontSize: '16px',
      fontFamily: 'serif',
      color: '#e2e8f0',
    }).setOrigin(0.5);

    const restartBtn = this.add.text(0, 55, '[ 重新开始 ]', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#a78bfa',
    }).setOrigin(0.5);

    restartBtn.setInteractive({ useHandCursor: true });
    restartBtn.on('pointerover', () => restartBtn.setColor('#c084fc'));
    restartBtn.on('pointerout', () => restartBtn.setColor('#a78bfa'));
    restartBtn.on('pointerdown', () => {
      this.scene.restart();
    });

    this.victoryOverlay.add([bg, title, desc, restartBtn]);

    this.tweens.add({
      targets: this.victoryOverlay,
      alpha: { from: 0, to: 1 },
      scale: { from: 0.8, to: 1 },
      duration: 600,
      ease: 'Back.easeOut',
    });
  }
}
