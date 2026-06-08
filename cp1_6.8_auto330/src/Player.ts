import Phaser from 'phaser';
import { Unit, SpikeBug, ShieldBug, PlagueBug, WorkerBug, UnitType } from './Unit';

export interface UnitCost {
  energy: number;
}

const UNIT_COSTS: Record<string, UnitCost> = {
  [UnitType.Spike]: { energy: 40 },
  [UnitType.Shield]: { energy: 50 },
  [UnitType.Plague]: { energy: 60 },
};

export class Player {
  public energy: number = 50;
  public maxEnergy: number = 500;
  public ancientBug: Phaser.Physics.Arcade.Sprite;
  public units: Unit[] = [];
  public workers: WorkerBug[] = [];
  public selectedUnits: Unit[] = [];
  public unitCounts: Record<string, number> = {
    [UnitType.Spike]: 0,
    [UnitType.Shield]: 0,
    [UnitType.Plague]: 0,
    [UnitType.Worker]: 0,
  };

  private scene: Phaser.Scene;
  private selectionBox: Phaser.GameObjects.Graphics | null = null;
  private isDragging: boolean = false;
  private dragStart: Phaser.Math.Vector2 | null = null;

  constructor(scene: Phaser.Scene, spawnX: number, spawnY: number) {
    this.scene = scene;

    this.ancientBug = scene.physics.add.sprite(spawnX, spawnY, 'ancient_bug');
    this.ancientBug.setDepth(10);
    const body = this.ancientBug.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setSize(48, 36);
    body.setOffset(8, 6);

    this.setupInput();
    this.setupAncientBugGlow();
  }

  private setupInput(): void {
    const scene = this.scene;

    scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown()) return;
      this.dragStart = new Phaser.Math.Vector2(pointer.worldX, pointer.worldY);
      this.isDragging = false;
    });

    scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.dragStart || !pointer.isDown) return;
      const dist = Phaser.Math.Distance.Between(
        pointer.worldX, pointer.worldY, this.dragStart.x, this.dragStart.y
      );
      if (dist > 8) {
        this.isDragging = true;
        this.drawSelectionBox(pointer);
      }
    });

    scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown()) {
        this.handleRightClick(pointer);
        this.dragStart = null;
        return;
      }

      if (this.isDragging && this.dragStart) {
        this.handleBoxSelect(pointer);
      } else {
        this.handleClick(pointer);
      }

      this.isDragging = false;
      this.dragStart = null;
      if (this.selectionBox) {
        this.selectionBox.clear();
      }
    });

    scene.input.keyboard!.on('keydown-ONE', () => this.selectAllOfType(UnitType.Spike));
    scene.input.keyboard!.on('keydown-TWO', () => this.selectAllOfType(UnitType.Shield));
    scene.input.keyboard!.on('keydown-THREE', () => this.selectAllOfType(UnitType.Plague));
  }

  private setupAncientBugGlow(): void {
    const scene = this.scene;
    const glow = scene.add.circle(
      this.ancientBug.x, this.ancientBug.y,
      38, 0x7c3aed, 0.15
    );
    glow.setDepth(9);
    scene.tweens.add({
      targets: glow,
      scale: 1.15,
      alpha: 0.25,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.ancientBug.setData('glow', glow);
  }

  private handleClick(pointer: Phaser.Input.Pointer): void {
    const clickedUnit = this.getUnitAtPoint(pointer.worldX, pointer.worldY);

    if (clickedUnit && clickedUnit.isPlayerUnit) {
      this.deselectAll();
      clickedUnit.setSelected(true);
      this.selectedUnits = [clickedUnit];
    } else {
      this.deselectAll();
    }
  }

  private handleRightClick(pointer: Phaser.Input.Pointer): void {
    if (this.selectedUnits.length === 0) return;

    const clickedEnemy = this.getEnemyAtPoint(pointer.worldX, pointer.worldY);
    if (clickedEnemy) {
      for (const unit of this.selectedUnits) {
        unit.attackTarget(clickedEnemy);
      }
      return;
    }

    const target = new Phaser.Math.Vector2(pointer.worldX, pointer.worldY);
    for (const unit of this.selectedUnits) {
      unit.moveToward(target.clone());
    }
    this.showMoveIndicator(target);
  }

  private handleBoxSelect(pointer: Phaser.Input.Pointer): void {
    if (!this.dragStart) return;
    const rect = Phaser.Geom.Rectangle.FromPoints([
      new Phaser.Math.Vector2(this.dragStart.x, this.dragStart.y),
      new Phaser.Math.Vector2(pointer.worldX, pointer.worldY),
    ]);

    this.deselectAll();
    this.selectedUnits = [];

    for (const unit of this.units) {
      if (rect.contains(unit.x, unit.y)) {
        unit.setSelected(true);
        this.selectedUnits.push(unit);
      }
    }
  }

  private drawSelectionBox(pointer: Phaser.Input.Pointer): void {
    if (!this.selectionBox) {
      this.selectionBox = this.scene.add.graphics();
      this.selectionBox.setDepth(50);
    }
    this.selectionBox.clear();
    this.selectionBox.fillStyle(0x7c3aed, 0.15);
    this.selectionBox.lineStyle(1.5, 0xc084fc, 0.6);

    const sx = this.dragStart!.x;
    const sy = this.dragStart!.y;
    const ex = pointer.worldX;
    const ey = pointer.worldY;
    const w = ex - sx;
    const h = ey - sy;

    this.selectionBox.fillRect(sx, sy, w, h);
    this.selectionBox.strokeRect(sx, sy, w, h);
  }

  private selectAllOfType(type: UnitType): void {
    this.deselectAll();
    this.selectedUnits = [];
    for (const unit of this.units) {
      if (unit.unitType === type) {
        unit.setSelected(true);
        this.selectedUnits.push(unit);
      }
    }
  }

  private getUnitAtPoint(wx: number, wy: number): Unit | null {
    for (const unit of this.units) {
      const dist = Phaser.Math.Distance.Between(wx, wy, unit.x, unit.y);
      if (dist < 20) return unit;
    }
    return null;
  }

  private getEnemyAtPoint(wx: number, wy: number): Unit | null {
    const enemies = this.scene.physics.overlapCirc(wx, wy, 25) as unknown;
    return null;
  }

  private showMoveIndicator(target: Phaser.Math.Vector2): void {
    const ring = this.scene.add.circle(target.x, target.y, 12, 0xc084fc, 0.4);
    ring.setStrokeStyle(1.5, 0xc084fc, 0.7);
    ring.setDepth(8);
    this.scene.tweens.add({
      targets: ring,
      alpha: 0,
      scale: 2,
      duration: 500,
      onComplete: () => ring.destroy(),
    });
  }

  deselectAll(): void {
    for (const unit of this.selectedUnits) {
      unit.setSelected(false);
    }
    this.selectedUnits = [];
  }

  summonUnit(type: UnitType, x: number, y: number): Unit | null {
    const cost = UNIT_COSTS[type];
    if (!cost || this.energy < cost.energy) return null;

    this.energy -= cost.energy;
    let unit: Unit;

    switch (type) {
      case UnitType.Spike:
        unit = new SpikeBug(this.scene, x, y, true);
        break;
      case UnitType.Shield:
        unit = new ShieldBug(this.scene, x, y, true);
        break;
      case UnitType.Plague:
        unit = new PlagueBug(this.scene, x, y, true);
        break;
      default:
        return null;
    }

    this.units.push(unit);
    this.unitCounts[type]++;
    this.spawnSummonEffect(x, y);
    return unit;
  }

  deployWorker(x: number, y: number): WorkerBug | null {
    if (this.energy < 15) return null;
    this.energy -= 15;
    const worker = new WorkerBug(this.scene, x, y);
    this.units.push(worker);
    this.workers.push(worker);
    this.unitCounts[UnitType.Worker]++;
    this.spawnSummonEffect(x, y);
    return worker;
  }

  addEnergy(amount: number): void {
    this.energy = Math.min(this.energy + amount, this.maxEnergy);
  }

  update(time: number, delta: number): void {
    const glow = this.ancientBug.getData('glow') as Phaser.GameObjects.Arc;
    if (glow) {
      glow.setPosition(this.ancientBug.x, this.ancientBug.y);
    }

    for (const worker of this.workers) {
      if (worker.carryAmount >= worker.maxCarry) {
        this.addEnergy(worker.carryAmount);
        worker.carryAmount = 0;
      }
    }

    for (let i = this.units.length - 1; i >= 0; i--) {
      if (!this.units[i].active) {
        const u = this.units[i];
        this.unitCounts[u.unitType] = Math.max(0, (this.unitCounts[u.unitType] || 0) - 1);
        if (u.unitType === UnitType.Worker) {
          const wi = this.workers.indexOf(u as WorkerBug);
          if (wi >= 0) this.workers.splice(wi, 1);
        }
        const si = this.selectedUnits.indexOf(u);
        if (si >= 0) this.selectedUnits.splice(si, 1);
        this.units.splice(i, 1);
      } else {
        this.units[i].update(time, delta);
      }
    }
  }

  private spawnSummonEffect(x: number, y: number): void {
    const scene = this.scene;
    const ring = scene.add.circle(x, y, 5, 0xc084fc, 0.5);
    ring.setStrokeStyle(2, 0xc084fc, 0.8);
    ring.setDepth(15);
    scene.tweens.add({
      targets: ring,
      scale: 3,
      alpha: 0,
      duration: 500,
      onComplete: () => ring.destroy(),
    });
  }

  getUnitCost(type: UnitType): number {
    return UNIT_COSTS[type]?.energy ?? 0;
  }
}
