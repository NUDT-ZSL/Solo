import Phaser from 'phaser';
import { Player } from './units/Player';
import { EnemyAI } from './units/EnemyAI';
import { HUD } from './ui/HUD';

export const MAP_WIDTH = 3200;
export const MAP_HEIGHT = 2400;

export interface UnitData {
  sprite: Phaser.GameObjects.Sprite;
  type: 'spike' | 'shield' | 'plague' | 'worker' | 'enemy';
  hp: number;
  maxHp: number;
  speed: number;
  attack: number;
  attackRange: number;
  attackCooldown: number;
  lastAttackTime: number;
  target: UnitData | null;
  moveTarget: Phaser.Math.Vector2 | null;
  isSelected: boolean;
  team: 'player' | 'enemy';
  slowTimer: number;
}

export interface CreepNode {
  sprite: Phaser.GameObjects.Sprite;
  pulse: Phaser.GameObjects.Ellipse;
  pos: Phaser.Math.Vector2;
  captured: boolean;
  energyRate: number;
}

export interface Projectile {
  sprite: Phaser.GameObjects.Sprite;
  velocity: Phaser.Math.Vector2;
  damage: number;
  team: 'player' | 'enemy';
  lifetime: number;
}

export class GameScene extends Phaser.Scene {
  public player!: Player;
  public enemyAI!: EnemyAI;
  public hud!: HUD;

  public playerUnits: UnitData[] = [];
  public enemyUnits: UnitData[] = [];
  public creepNodes: CreepNode[] = [];
  public projectiles: Projectile[] = [];

  public energy = 0;
  public moonCoreActive = false;
  public moonCoreTimer = 0;
  public moonCoreOccupant: 'player' | 'enemy' | null = null;
  public moonCoreHoldTime = 0;
  public moonCoreSprite!: Phaser.GameObjects.Sprite;
  public moonCoreGlow!: Phaser.GameObjects.Ellipse;

  public enemyNestSprite!: Phaser.GameObjects.Sprite;
  public enemyNestHp = 500;
  public enemyNestMaxHp = 500;

  public selectedUnits: UnitData[] = [];
  public selectionBox: Phaser.GameObjects.Graphics | null = null;
  public selectionStart: Phaser.Math.Vector2 | null = null;

  public moveMarkers: Phaser.GameObjects.Arc[] = [];
  public pathLines: Phaser.GameObjects.Graphics | null = null;

  private bgGraphics!: Phaser.GameObjects.Graphics;
  private creepGraphics!: Phaser.GameObjects.Graphics;
  private terrainGraphics!: Phaser.GameObjects.Graphics;

  public particleEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;

  private patrolTimer = 0;
  private moonCoreSpawnTimer = 0;
  private creepPulseTime = 0;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.cameras.main.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);
    this.physics.world.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);

    this.drawBackground();
    this.drawTerrain();
    this.setupCreepNodes();
    this.setupMoonCore();
    this.setupEnemyNest();

    this.player = new Player(this);
    this.enemyAI = new EnemyAI(this);
    this.hud = new HUD(this);

    this.setupInput();

    this.particleEmitter = this.add.particles(0, 0, 'projectile', {
      speed: { min: 20, max: 60 },
      scale: { start: 0.5, end: 0 },
      lifespan: 400,
      blendMode: 'ADD',
      emitting: false,
    });

    this.events.on('update', this.gameUpdate, this);
  }

  private drawBackground(): void {
    this.bgGraphics = this.add.graphics();
    this.bgGraphics.fillGradientStyle(
      0x0d001a, 0x0d001a,
      0x1a0030, 0x1a0030,
      1,
    );
    this.bgGraphics.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

    for (let i = 0; i < 80; i++) {
      const x = Phaser.Math.Between(0, MAP_WIDTH);
      const y = Phaser.Math.Between(0, MAP_HEIGHT);
      const r = Phaser.Math.Between(1, 3);
      const a = Phaser.Math.FloatBetween(0.2, 0.8);
      this.bgGraphics.fillStyle(0xffffff, a);
      this.bgGraphics.fillCircle(x, y, r);
    }
  }

  private drawTerrain(): void {
    this.terrainGraphics = this.add.graphics();
    for (let i = 0; i < 25; i++) {
      const x = Phaser.Math.Between(100, MAP_WIDTH - 100);
      const y = Phaser.Math.Between(100, MAP_HEIGHT - 100);
      const rx = Phaser.Math.Between(30, 80);
      const ry = Phaser.Math.Between(20, 60);
      this.terrainGraphics.fillStyle(0x1a1020, 0.6);
      this.terrainGraphics.fillEllipse(x, y, rx * 2, ry * 2);
      this.terrainGraphics.lineStyle(1, 0x2a1838, 0.4);
      this.terrainGraphics.strokeEllipse(x, y, rx * 2, ry * 2);
    }

    for (let i = 0; i < 12; i++) {
      const x = Phaser.Math.Between(200, MAP_WIDTH - 200);
      const y = Phaser.Math.Between(200, MAP_HEIGHT - 200);
      const w = Phaser.Math.Between(60, 200);
      const h = Phaser.Math.Between(20, 50);
      this.terrainGraphics.fillStyle(0x252535, 0.7);
      this.terrainGraphics.fillRect(x - w / 2, y - h / 2, w, h);
      this.terrainGraphics.lineStyle(1, 0x3a3a5a, 0.5);
      this.terrainGraphics.strokeRect(x - w / 2, y - h / 2, w, h);
    }
  }

  private setupCreepNodes(): void {
    this.creepGraphics = this.add.graphics();
    const positions = [
      { x: 300, y: 400 }, { x: 600, y: 200 }, { x: 900, y: 500 },
      { x: 400, y: 900 }, { x: 700, y: 700 }, { x: 1100, y: 300 },
      { x: 1300, y: 600 }, { x: 1600, y: 400 }, { x: 1800, y: 800 },
      { x: 2100, y: 300 }, { x: 2400, y: 600 }, { x: 2600, y: 900 },
      { x: 2200, y: 1100 }, { x: 2800, y: 500 }, { x: 2000, y: 1000 },
    ];

    positions.forEach((p) => {
      const sprite = this.add.sprite(p.x, p.y, 'creep_node').setDepth(1);
      const pulse = this.add.ellipse(p.x, p.y, 40, 40, 0xb020a0, 0.2).setDepth(0);
      const node: CreepNode = {
        sprite,
        pulse,
        pos: new Phaser.Math.Vector2(p.x, p.y),
        captured: false,
        energyRate: Phaser.Math.Between(3, 8),
      };
      this.creepNodes.push(node);
    });
  }

  private setupMoonCore(): void {
    this.moonCoreSprite = this.add.sprite(MAP_WIDTH / 2, MAP_HEIGHT / 2, 'moon_core')
      .setDepth(2)
      .setVisible(false)
      .setAlpha(0);
    this.moonCoreGlow = this.add.ellipse(
      MAP_WIDTH / 2, MAP_HEIGHT / 2, 80, 80, 0xffd700, 0.15,
    )
      .setDepth(1)
      .setVisible(false);
  }

  private setupEnemyNest(): void {
    this.enemyNestSprite = this.add.sprite(
      MAP_WIDTH - 250, MAP_HEIGHT / 2, 'enemy_nest',
    ).setDepth(2);
  }

  private setupInput(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown()) {
        this.handleRightClick(pointer);
      } else {
        this.handleLeftClick(pointer);
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.selectionStart && pointer.isDown && !pointer.rightButtonDown()) {
        this.drawSelectionBox(pointer);
      }

      const cam = this.cameras.main;
      const margin = 30;
      const scrollSpeed = 8;
      if (pointer.x < margin) cam.scrollX -= scrollSpeed;
      if (pointer.x > cam.width - margin) cam.scrollX += scrollSpeed;
      if (pointer.y < margin) cam.scrollY -= scrollSpeed;
      if (pointer.y > cam.height - margin) cam.scrollY += scrollSpeed;
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.selectionStart && !pointer.rightButtonDown()) {
        this.finishSelection(pointer);
      }
    });

    this.input.keyboard!.on('keydown-ONE', () => this.selectUnitsByType('spike'));
    this.input.keyboard!.on('keydown-TWO', () => this.selectUnitsByType('shield'));
    this.input.keyboard!.on('keydown-THREE', () => this.selectUnitsByType('plague'));

    this.input.keyboard!.on('keydown-Q', () => this.player.summonUnit('spike'));
    this.input.keyboard!.on('keydown-W', () => this.player.summonUnit('shield'));
    this.input.keyboard!.on('keydown-E', () => this.player.summonUnit('plague'));
  }

  private handleLeftClick(pointer: Phaser.Input.Pointer): void {
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const clickedUnit = this.findUnitAt(worldPoint.x, worldPoint.y, this.playerUnits);

    if (clickedUnit) {
      if (this.input.keyboard!.shiftKey) {
        this.toggleUnitSelection(clickedUnit);
      } else {
        this.clearSelection();
        this.selectUnit(clickedUnit);
      }
    } else {
      const clickedNode = this.findCreepNodeAt(worldPoint.x, worldPoint.y);
      if (clickedNode) {
        this.player.deployWorker(clickedNode);
      } else {
        this.selectionStart = new Phaser.Math.Vector2(worldPoint.x, worldPoint.y);
      }
    }
  }

  private handleRightClick(pointer: Phaser.Input.Pointer): void {
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

    if (this.selectedUnits.length === 0) return;

    const enemyTarget = this.findUnitAt(worldPoint.x, worldPoint.y, this.enemyUnits);

    if (enemyTarget) {
      this.selectedUnits.forEach((u) => {
        u.target = enemyTarget;
        u.moveTarget = null;
      });
      this.showAttackIndicator(worldPoint.x, worldPoint.y);
    } else {
      const distToNest = Phaser.Math.Distance.Between(
        worldPoint.x, worldPoint.y,
        this.enemyNestSprite.x, this.enemyNestSprite.y,
      );
      if (distToNest < 50) {
        this.selectedUnits.forEach((u) => {
          u.target = null;
          u.moveTarget = new Phaser.Math.Vector2(
            this.enemyNestSprite.x, this.enemyNestSprite.y,
          );
        });
      } else {
        this.moveSelectedUnits(worldPoint.x, worldPoint.y);
      }
    }
  }

  private moveSelectedUnits(wx: number, wy: number): void {
    const count = this.selectedUnits.length;
    const cols = Math.ceil(Math.sqrt(count));
    const spacing = 30;

    this.selectedUnits.forEach((u, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const offsetX = (col - (cols - 1) / 2) * spacing;
      const offsetY = (row - (Math.ceil(count / cols) - 1) / 2) * spacing;
      u.moveTarget = new Phaser.Math.Vector2(wx + offsetX, wy + offsetY);
      u.target = null;
    });

    this.showMoveIndicator(wx, wy);
    this.showPathLines(wx, wy);
  }

  private showMoveIndicator(x: number, y: number): void {
    const marker = this.add.circle(x, y, 8, 0x00ff88, 0.6).setDepth(5);
    this.tweens.add({
      targets: marker,
      scaleX: 3,
      scaleY: 3,
      alpha: 0,
      duration: 600,
      ease: 'Power2',
      onComplete: () => marker.destroy(),
    });
  }

  private showAttackIndicator(x: number, y: number): void {
    const ring = this.add.circle(x, y, 12, 0xff4444, 0).setDepth(5)
      .setStrokeStyle(2, 0xff4444, 0.8);
    this.tweens.add({
      targets: ring,
      scaleX: 2.5,
      scaleY: 2.5,
      alpha: 0,
      duration: 500,
      ease: 'Power2',
      onComplete: () => ring.destroy(),
    });
  }

  private showPathLines(wx: number, wy: number): void {
    if (this.pathLines) this.pathLines.destroy();
    this.pathLines = this.add.graphics().setDepth(4);
    this.pathLines.lineStyle(1, 0x00ff88, 0.3);

    this.selectedUnits.forEach((u) => {
      this.pathLines!.lineBetween(u.sprite.x, u.sprite.y, wx, wy);
    });

    this.time.delayedCall(1500, () => {
      if (this.pathLines) {
        this.pathLines.destroy();
        this.pathLines = null;
      }
    });
  }

  private drawSelectionBox(pointer: Phaser.Input.Pointer): void {
    if (!this.selectionBox) {
      this.selectionBox = this.add.graphics().setDepth(10);
    }
    this.selectionBox.clear();
    this.selectionBox.lineStyle(1, 0x00ff88, 0.6);
    this.selectionBox.fillStyle(0x00ff88, 0.1);

    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const sx = this.selectionStart!.x;
    const sy = this.selectionStart!.y;
    const ex = worldPoint.x;
    const ey = worldPoint.y;

    this.selectionBox.fillRect(sx, sy, ex - sx, ey - sy);
    this.selectionBox.strokeRect(sx, sy, ex - sx, ey - sy);
  }

  private finishSelection(pointer: Phaser.Input.Pointer): void {
    if (!this.selectionStart) return;

    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const sx = Math.min(this.selectionStart.x, worldPoint.x);
    const sy = Math.min(this.selectionStart.y, worldPoint.y);
    const ex = Math.max(this.selectionStart.x, worldPoint.x);
    const ey = Math.max(this.selectionStart.y, worldPoint.y);

    if (!this.input.keyboard!.shiftKey) {
      this.clearSelection();
    }

    this.playerUnits.forEach((u) => {
      if (u.sprite.x >= sx && u.sprite.x <= ex && u.sprite.y >= sy && u.sprite.y <= ey) {
        this.selectUnit(u);
      }
    });

    if (this.selectionBox) {
      this.selectionBox.destroy();
      this.selectionBox = null;
    }
    this.selectionStart = null;
  }

  public selectUnit(unit: UnitData): void {
    unit.isSelected = true;
    if (!this.selectedUnits.includes(unit)) {
      this.selectedUnits.push(unit);
    }
    this.addSelectionPulse(unit);
  }

  private toggleUnitSelection(unit: UnitData): void {
    if (unit.isSelected) {
      unit.isSelected = false;
      this.selectedUnits = this.selectedUnits.filter((u) => u !== unit);
    } else {
      this.selectUnit(unit);
    }
  }

  public clearSelection(): void {
    this.selectedUnits.forEach((u) => {
      u.isSelected = false;
    });
    this.selectedUnits = [];
  }

  private selectUnitsByType(type: 'spike' | 'shield' | 'plague'): void {
    this.clearSelection();
    this.playerUnits
      .filter((u) => u.type === type)
      .forEach((u) => this.selectUnit(u));
  }

  private addSelectionPulse(unit: UnitData): void {
    const pulse = this.add.circle(
      unit.sprite.x, unit.sprite.y + 2, 14, 0x00ff88, 0.2,
    ).setDepth(3);

    this.tweens.add({
      targets: pulse,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        if (unit.sprite.active) {
          pulse.setPosition(unit.sprite.x, unit.sprite.y + 2);
        } else {
          pulse.destroy();
        }
      },
      onComplete: () => pulse.destroy(),
    });
  }

  private findUnitAt(x: number, y: number, units: UnitData[]): UnitData | null {
    for (const u of units) {
      if (Phaser.Math.Distance.Between(x, y, u.sprite.x, u.sprite.y) < 20) {
        return u;
      }
    }
    return null;
  }

  private findCreepNodeAt(x: number, y: number): CreepNode | null {
    for (const n of this.creepNodes) {
      if (Phaser.Math.Distance.Between(x, y, n.pos.x, n.pos.y) < 24) {
        return n;
      }
    }
    return null;
  }

  private gameUpdate(_time: number, delta: number): void {
    const dt = delta / 1000;

    this.updateCreepPulse(dt);
    this.updateUnits(this.playerUnits, dt);
    this.updateUnits(this.enemyUnits, dt);
    this.updateProjectiles(dt);
    this.updateCombat(this.playerUnits, this.enemyUnits, dt);
    this.updateCombat(this.enemyUnits, this.playerUnits, dt);
    this.updateWorkerEnergy(dt);
    this.updateMoonCore(dt);

    this.enemyAI.update(dt);
    this.hud.update(dt);

    this.patrrolTimerLogic(dt);
    this.moonCoreSpawnLogic(dt);

    this.checkVictoryConditions();
  }

  private updateCreepPulse(dt: number): void {
    this.creepPulseTime += dt;
    this.creepNodes.forEach((node) => {
      const scale = 1 + Math.sin(this.creepPulseTime * 2 + node.pos.x * 0.01) * 0.15;
      node.pulse.setScale(scale);
      node.pulse.setAlpha(0.15 + Math.sin(this.creepPulseTime * 3) * 0.05);
    });
  }

  private updateUnits(units: UnitData[], dt: number): void {
    units.forEach((u) => {
      if (u.hp <= 0) return;

      if (u.slowTimer > 0) u.slowTimer -= dt;

      if (u.target) {
        if (!u.target.sprite.active || u.target.hp <= 0) {
          u.target = null;
        }
      }

      if (u.target) {
        const dist = Phaser.Math.Distance.Between(
          u.sprite.x, u.sprite.y,
          u.target.sprite.x, u.target.sprite.y,
        );
        if (dist > u.attackRange) {
          this.moveUnitToward(u, u.target.sprite.x, u.target.sprite.y, dt);
        }
      } else if (u.moveTarget) {
        const dist = Phaser.Math.Distance.Between(
          u.sprite.x, u.sprite.y,
          u.moveTarget.x, u.moveTarget.y,
        );
        if (dist < 5) {
          u.moveTarget = null;
        } else {
          this.moveUnitToward(u, u.moveTarget.x, u.moveTarget.y, dt);
        }
      }
    });

    for (let i = units.length - 1; i >= 0; i--) {
      if (units[i].hp <= 0) {
        this.killUnit(units[i], units);
      }
    }
  }

  private moveUnitToward(u: UnitData, tx: number, ty: number, dt: number): void {
    const speed = u.slowTimer > 0 ? u.speed * 0.4 : u.speed;
    const angle = Phaser.Math.Angle.Between(u.sprite.x, u.sprite.y, tx, ty);
    u.sprite.x += Math.cos(angle) * speed * dt;
    u.sprite.y += Math.sin(angle) * speed * dt;
    u.sprite.x = Phaser.Math.Clamp(u.sprite.x, 10, MAP_WIDTH - 10);
    u.sprite.y = Phaser.Math.Clamp(u.sprite.y, 10, MAP_HEIGHT - 10);
  }

  private updateCombat(
    attackers: UnitData[],
    defenders: UnitData[],
    dt: number,
  ): void {
    const now = this.time.now;
    attackers.forEach((u) => {
      if (!u.target || u.hp <= 0) return;
      const dist = Phaser.Math.Distance.Between(
        u.sprite.x, u.sprite.y,
        u.target.sprite.x, u.target.sprite.y,
      );
      if (dist <= u.attackRange && now - u.lastAttackTime >= u.attackCooldown) {
        u.lastAttackTime = now;
        if (u.type === 'spike' || u.type === 'enemy') {
          this.fireProjectile(u, u.target);
        } else if (u.type === 'shield') {
          this.meleeAttack(u, u.target);
        } else if (u.type === 'plague') {
          this.aoeAttack(u, u.target, defenders);
        }
      }
    });
  }

  private fireProjectile(attacker: UnitData, target: UnitData): void {
    const sprite = this.add.sprite(attacker.sprite.x, attacker.sprite.y, 'projectile')
      .setDepth(6);
    const angle = Phaser.Math.Angle.Between(
      attacker.sprite.x, attacker.sprite.y,
      target.sprite.x, target.sprite.y,
    );
    const speed = 300;
    this.projectiles.push({
      sprite,
      velocity: new Phaser.Math.Vector2(Math.cos(angle) * speed, Math.sin(angle) * speed),
      damage: attacker.attack,
      team: attacker.team,
      lifetime: 2,
    });
  }

  private meleeAttack(attacker: UnitData, target: UnitData): void {
    target.hp -= attacker.attack;
    this.spawnHitParticles(target.sprite.x, target.sprite.y, 0x4090ff);
  }

  private aoeAttack(attacker: UnitData, target: UnitData, defenders: UnitData[]): void {
    const aoeRange = 80;
    defenders.forEach((d) => {
      const dist = Phaser.Math.Distance.Between(
        target.sprite.x, target.sprite.y,
        d.sprite.x, d.sprite.y,
      );
      if (dist < aoeRange) {
        d.hp -= attacker.attack;
        d.slowTimer = 3;
      }
    });

    const ring = this.add.sprite(target.sprite.x, target.sprite.y, 'aoe_ring')
      .setDepth(5).setAlpha(0.6).setScale(0.3);
    this.tweens.add({
      targets: ring,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 500,
      onComplete: () => ring.destroy(),
    });
    this.spawnHitParticles(target.sprite.x, target.sprite.y, 0x20ff40);
  }

  private updateProjectiles(dt: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.sprite.x += p.velocity.x * dt;
      p.sprite.y += p.velocity.y * dt;
      p.lifetime -= dt;

      const targets = p.team === 'player' ? this.enemyUnits : this.playerUnits;
      let hit = false;
      for (const t of targets) {
        if (Phaser.Math.Distance.Between(p.sprite.x, p.sprite.y, t.sprite.x, t.sprite.y) < 16) {
          t.hp -= p.damage;
          this.spawnHitParticles(t.sprite.x, t.sprite.y, p.team === 'player' ? 0xff4040 : 0xff8040);
          hit = true;
          break;
        }
      }

      if (hit || p.lifetime <= 0 ||
          p.sprite.x < 0 || p.sprite.x > MAP_WIDTH ||
          p.sprite.y < 0 || p.sprite.y > MAP_HEIGHT) {
        p.sprite.destroy();
        this.projectiles.splice(i, 1);
      }
    }
  }

  private spawnHitParticles(x: number, y: number, color: number): void {
    for (let i = 0; i < 6; i++) {
      const p = this.add.circle(x, y, 2, color, 0.8).setDepth(7);
      const angle = Math.random() * Math.PI * 2;
      const dist = Phaser.Math.Between(10, 30);
      this.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        scaleX: 0.2,
        scaleY: 0.2,
        duration: 300,
        ease: 'Power2',
        onComplete: () => p.destroy(),
      });
    }
  }

  private updateWorkerEnergy(dt: number): void {
    this.playerUnits
      .filter((u) => u.type === 'worker')
      .forEach((u) => {
        const nearNode = this.creepNodes.find(
          (n) => Phaser.Math.Distance.Between(u.sprite.x, u.sprite.y, n.pos.x, n.pos.y) < 40,
        );
        if (nearNode) {
          nearNode.captured = true;
          this.energy += nearNode.energyRate * dt;
        }
      });
  }

  private updateMoonCore(dt: number): void {
    if (!this.moonCoreActive) return;

    const mx = this.moonCoreSprite.x;
    const my = this.moonCoreSprite.y;

    let playerNear = false;
    let enemyNear = false;

    this.playerUnits.forEach((u) => {
      if (Phaser.Math.Distance.Between(u.sprite.x, u.sprite.y, mx, my) < 60) {
        playerNear = true;
      }
    });
    this.enemyUnits.forEach((u) => {
      if (Phaser.Math.Distance.Between(u.sprite.x, u.sprite.y, mx, my) < 60) {
        enemyNear = true;
      }
    });

    if (playerNear && !enemyNear) {
      if (this.moonCoreOccupant !== 'player') {
        this.moonCoreOccupant = 'player';
        this.moonCoreHoldTime = 0;
      }
      this.moonCoreHoldTime += dt;
    } else if (enemyNear && !playerNear) {
      if (this.moonCoreOccupant !== 'enemy') {
        this.moonCoreOccupant = 'enemy';
        this.moonCoreHoldTime = 0;
      }
      this.moonCoreHoldTime += dt;
    } else {
      this.moonCoreHoldTime = 0;
      this.moonCoreOccupant = null;
    }

    this.moonCoreGlow.setAlpha(
      0.15 + Math.sin(this.time.now * 0.003) * 0.1,
    );
  }

  private patrrolTimerLogic(dt: number): void {
    this.patrolTimer += dt;
    if (this.patrolTimer >= 15) {
      this.patrolTimer = 0;
      this.enemyAI.spawnPatrol();
    }
  }

  private moonCoreSpawnLogic(dt: number): void {
    this.moonCoreSpawnTimer += dt;
    if (this.moonCoreSpawnTimer >= 90 && !this.moonCoreActive) {
      this.moonCoreActive = true;
      this.moonCoreSprite.setVisible(true);
      this.moonCoreGlow.setVisible(true);
      this.tweens.add({
        targets: this.moonCoreSprite,
        alpha: 1,
        duration: 2000,
        ease: 'Sine.easeInOut',
      });
      this.enemyAI.startAssault();
    }
  }

  private killUnit(unit: UnitData, list: UnitData[]): void {
    this.spawnHitParticles(unit.sprite.x, unit.sprite.y, 0xff00ff);
    unit.sprite.destroy();
    const idx = list.indexOf(unit);
    if (idx !== -1) list.splice(idx, 1);
    const selIdx = this.selectedUnits.indexOf(unit);
    if (selIdx !== -1) this.selectedUnits.splice(selIdx, 1);
  }

  public addPlayerUnit(unit: UnitData): void {
    this.playerUnits.push(unit);
  }

  public addEnemyUnit(unit: UnitData): void {
    this.enemyUnits.push(unit);
  }

  public damageEnemyNest(damage: number): void {
    this.enemyNestHp -= damage;
    this.tweens.add({
      targets: this.enemyNestSprite,
      tint: 0xff0000,
      duration: 100,
      yoyo: true,
      onComplete: () => this.enemyNestSprite.clearTint(),
    });
  }

  private checkVictoryConditions(): void {
    if (this.enemyNestHp <= 0) {
      this.showEndScreen('胜利！敌方母巢已摧毁！');
    }
    if (this.moonCoreActive && this.moonCoreHoldTime >= 60) {
      this.showEndScreen(
        this.moonCoreOccupant === 'player'
          ? '胜利！月核占领成功！'
          : '失败！敌方占领了月核！',
      );
    }
  }

  private showEndScreen(message: string): void {
    this.physics.pause();
    const cx = this.cameras.main.scrollX + this.cameras.main.width / 2;
    const cy = this.cameras.main.scrollY + this.cameras.main.height / 2;

    const overlay = this.add.rectangle(cx, cy, 600, 200, 0x0a0014, 0.9).setDepth(100);
    overlay.setStrokeStyle(2, 0xc9a030);
    const text = this.add.text(cx, cy - 20, message, {
      fontSize: '32px',
      fontFamily: 'serif',
      color: '#c9a030',
      align: 'center',
    }).setOrigin(0.5).setDepth(101);

    const restartText = this.add.text(cx, cy + 30, '点击重新开始', {
      fontSize: '18px',
      fontFamily: 'serif',
      color: '#a080d0',
    }).setOrigin(0.5).setDepth(101);

    this.tweens.add({
      targets: [overlay, text, restartText],
      alpha: { from: 0, to: 1 },
      duration: 1000,
    });

    this.input.once('pointerdown', () => {
      this.scene.restart();
    });
  }
}
