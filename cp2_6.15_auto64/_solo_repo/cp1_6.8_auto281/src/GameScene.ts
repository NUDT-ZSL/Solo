import Phaser from 'phaser';
import { Player } from './Player';
import { Building } from './Building';
import {
  GAME_WIDTH, GAME_HEIGHT,
  COLORS, ISLAND, LIGHT_POINT,
  BUILDINGS, BRIDGE, ISLAND_GROWTH, UI, CLOUD,
  BuildingDef,
} from './config';

interface CloudData {
  container: Phaser.GameObjects.Container;
  ellipses: Phaser.GameObjects.Ellipse[];
  speed: number;
}

interface BridgeData {
  graphics: Phaser.GameObjects.Graphics;
  from: Building;
  to: Building;
  particles: Phaser.GameObjects.Ellipse[];
  timer: Phaser.Time.TimerEvent;
}

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private buildings: Building[];
  private bridges: BridgeData[];
  private clouds: CloudData[];
  private islandContainer!: Phaser.GameObjects.Container;
  private islandAngle: number;
  private selectedBuilding: BuildingDef | null;
  private wheelExpanded: boolean;
  private wheelContainer!: Phaser.GameObjects.Container;
  private wheelCards: Phaser.GameObjects.Container[];
  private hudContainer!: Phaser.GameObjects.Container;
  private hudCountText!: Phaser.GameObjects.Text;
  private placingGhost: Phaser.GameObjects.Container | null;
  private canPlace: boolean;
  private lastGrowthCount: number;

  constructor() {
    super({ key: 'GameScene' });
    this.buildings = [];
    this.bridges = [];
    this.clouds = [];
    this.islandAngle = 0;
    this.selectedBuilding = null;
    this.wheelExpanded = false;
    this.wheelCards = [];
    this.placingGhost = null;
    this.canPlace = false;
    this.lastGrowthCount = 0;
  }

  create(): void {
    this.createSkyBackground();
    this.createClouds();
    this.createIsland();
    this.createHud();
    this.createWheel();

    this.player = new Player(this);
    this.player.setHudText(this.hudCountText);
    this.player.setOnCollect(() => this.updateWheelCards());

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.handlePointerMove(pointer);
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.handlePointerDown(pointer);
    });
  }

  private createSkyBackground(): void {
    const sky = this.add.graphics();
    const gradient = sky.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    gradient.addColorStop(0, this.colorToCss(COLORS.skyTop));
    gradient.addColorStop(1, this.colorToCss(COLORS.skyBottom));
    sky.fillStyle(0xffffff, 1);
    sky.fillGradientStyle(COLORS.skyTop, COLORS.skyTop, COLORS.skyBottom, COLORS.skyBottom, 1);
    sky.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    sky.setDepth(-10);
    sky.setScrollFactor(0);

    const bg = this.add.graphics();
    bg.fillGradientStyle(COLORS.skyTop, COLORS.skyTop, COLORS.skyBottom, COLORS.skyBottom, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    bg.setDepth(-10);
  }

  private createClouds(): void {
    for (let i = 0; i < CLOUD.count; i++) {
      const cx = Phaser.Math.Between(-100, GAME_WIDTH + 100);
      const cy = Phaser.Math.Between(30, GAME_HEIGHT * 0.5);
      const w = Phaser.Math.Between(CLOUD.widthMin, CLOUD.widthMax);
      const h = Phaser.Math.Between(CLOUD.heightMin, CLOUD.heightMax);
      const speed = Phaser.Math.FloatBetween(CLOUD.speedMin, CLOUD.speedMax);
      const alpha = Phaser.Math.FloatBetween(CLOUD.alphaMin, CLOUD.alphaMax);

      const container = this.add.container(cx, cy);
      container.setDepth(-5);
      container.setAlpha(alpha);

      const ellipses: Phaser.GameObjects.Ellipse[] = [];
      const parts = Phaser.Math.Between(3, 5);
      for (let p = 0; p < parts; p++) {
        const ew = w * Phaser.Math.FloatBetween(0.5, 1.0);
        const eh = h * Phaser.Math.FloatBetween(0.5, 1.0);
        const ox = (p - parts / 2) * w * 0.3;
        const oy = Phaser.Math.FloatBetween(-eh * 0.2, eh * 0.2);
        const e = this.add.ellipse(ox, oy, ew, eh, 0xffffff, 0.35);
        container.add(e);
        ellipses.push(e);
      }

      this.clouds.push({ container, ellipses, speed });
    }
  }

  private createIsland(): void {
    this.islandContainer = this.add.container(ISLAND.centerX, ISLAND.centerY);
    this.islandContainer.setDepth(ISLAND.depthBase);

    const shadow = this.add.ellipse(4, 8, ISLAND.radiusX * 2.1, ISLAND.radiusY * 1.2, COLORS.islandShadow, 0.3);
    this.islandContainer.add(shadow);

    const edge = this.add.ellipse(0, 0, ISLAND.radiusX * 2.05, ISLAND.radiusY * 1.05, COLORS.islandEdge, 1);
    this.islandContainer.add(edge);

    const base = this.add.ellipse(0, 0, ISLAND.radiusX * 2, ISLAND.radiusY, COLORS.islandBase, 1);
    this.islandContainer.add(base);

    const highlight = this.add.ellipse(-20, -15, ISLAND.radiusX * 1.2, ISLAND.radiusY * 0.6, 0xa0d8a0, 0.4);
    this.islandContainer.add(highlight);

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const rx = ISLAND.radiusX * 0.7 + Phaser.Math.FloatBetween(-20, 20);
      const ry = ISLAND.radiusY * 0.7 + Phaser.Math.FloatBetween(-10, 10);
      const dot = this.add.ellipse(
        Math.cos(angle) * rx * 0.5,
        Math.sin(angle) * ry * 0.5,
        Phaser.Math.Between(6, 14),
        Phaser.Math.Between(4, 10),
        0x6aaa6a, 0.4
      );
      this.islandContainer.add(dot);
    }
  }

  private createHud(): void {
    this.hudContainer = this.add.container(GAME_WIDTH / 2, UI.hudHeight / 2);
    this.hudContainer.setDepth(100);
    this.hudContainer.setScrollFactor(0);

    const bg = this.add.rectangle(0, 0, 160, 40, COLORS.uiGlass, UI.uiGlassAlpha);
    bg.setStrokeStyle(1, COLORS.uiGlow, 0.3);
    this.hudContainer.add(bg);

    const icon = this.add.ellipse(-50, 0, 20, 20, COLORS.goldWarm, 0.8);
    icon.setBlendMode(Phaser.BlendModes.ADD);
    this.hudContainer.add(icon);

    this.hudCountText = this.add.text(-30, 0, '0', {
      fontSize: '22px',
      fontFamily: 'Georgia, serif',
      color: '#fff8e0',
      stroke: '#1a1225',
      strokeThickness: 3,
      shadow: {
        color: '#ffd700',
        blur: UI.numberGlowBlur,
        fill: true,
      },
    });
    this.hudCountText.setOrigin(0, 0.5);
    this.hudContainer.add(this.hudCountText);

    const label = this.add.text(20, 0, '光点', {
      fontSize: '14px',
      fontFamily: 'Georgia, serif',
      color: '#ddd8c0',
    });
    label.setOrigin(0, 0.5);
    this.hudContainer.add(label);
  }

  private createWheel(): void {
    this.wheelContainer = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT - 50);
    this.wheelContainer.setDepth(100);

    const hubBg = this.add.circle(0, 0, UI.wheelRadius * 0.35, COLORS.uiGlass, UI.uiGlassAlpha);
    hubBg.setStrokeStyle(1.5, COLORS.uiGlow, 0.4);
    this.wheelContainer.add(hubBg);

    const hubIcon = this.add.text(0, 0, '🔨', {
      fontSize: '20px',
    });
    hubIcon.setOrigin(0.5);
    this.wheelContainer.add(hubIcon);

    hubBg.setInteractive({ useHandCursor: true });
    hubBg.on('pointerdown', () => this.toggleWheel());

    const angleStep = (Math.PI * 2) / BUILDINGS.length;
    const startAngle = -Math.PI / 2;

    for (let i = 0; i < BUILDINGS.length; i++) {
      const def = BUILDINGS[i];
      const angle = startAngle + angleStep * i;
      const cardX = Math.cos(angle) * 0;
      const cardY = Math.sin(angle) * 0;

      const card = this.add.container(cardX, cardY);
      card.setAlpha(0);
      card.setVisible(false);

      const cardBg = this.add.rectangle(0, 0, UI.cardSize, UI.cardSize, COLORS.uiGlass, UI.uiGlassAlpha);
      cardBg.setStrokeStyle(1, COLORS.uiGlow, 0.3);
      card.add(cardBg);

      const iconText = this.add.text(0, -8, def.iconChar, {
        fontSize: '20px',
      });
      iconText.setOrigin(0.5);
      card.add(iconText);

      const nameText = this.add.text(0, 14, def.name, {
        fontSize: '10px',
        fontFamily: 'Georgia, serif',
        color: '#fff8e0',
      });
      nameText.setOrigin(0.5);
      card.add(nameText);

      const costText = this.add.text(0, 24, `${def.cost}`, {
        fontSize: '9px',
        fontFamily: 'Georgia, serif',
        color: '#ffd700',
      });
      costText.setOrigin(0.5);
      card.add(costText);

      cardBg.setInteractive({ useHandCursor: true });
      cardBg.on('pointerdown', () => this.selectBuilding(def));

      this.wheelContainer.add(card);
      this.wheelCards.push(card);
    }
  }

  private toggleWheel(): void {
    this.wheelExpanded = !this.wheelExpanded;
    const angleStep = (Math.PI * 2) / BUILDINGS.length;
    const startAngle = -Math.PI / 2;

    for (let i = 0; i < this.wheelCards.length; i++) {
      const card = this.wheelCards[i];
      const angle = startAngle + angleStep * i;

      if (this.wheelExpanded) {
        card.setVisible(true);
        const tx = Math.cos(angle) * UI.wheelExpandedRadius;
        const ty = Math.sin(angle) * UI.wheelExpandedRadius;

        this.tweens.add({
          targets: card,
          x: tx,
          y: ty,
          alpha: 1,
          duration: UI.animDuration,
          ease: 'Back.Out',
          delay: i * 50,
        });
      } else {
        this.tweens.add({
          targets: card,
          x: 0,
          y: 0,
          alpha: 0,
          duration: UI.animDuration,
          ease: 'Back.In',
          delay: (BUILDINGS.length - 1 - i) * 30,
          onComplete: () => card.setVisible(false),
        });
      }
    }

    this.updateWheelCards();
  }

  private updateWheelCards(): void {
    for (let i = 0; i < BUILDINGS.length; i++) {
      const card = this.wheelCards[i];
      const def = BUILDINGS[i];
      const affordable = this.player.canAfford(def.cost);
      card.setAlpha(this.wheelExpanded ? (affordable ? 1 : 0.4) : 0);

      const bg = card.getAt(0) as Phaser.GameObjects.Rectangle;
      if (bg) {
        bg.setStrokeStyle(1, affordable ? COLORS.uiGlow : COLORS.uiDisabled, affordable ? 0.5 : 0.2);
      }
    }
  }

  private selectBuilding(def: BuildingDef): void {
    if (!this.player.canAfford(def.cost)) return;
    this.selectedBuilding = def;
    this.createPlacingGhost(def);
    this.toggleWheel();
  }

  private createPlacingGhost(def: BuildingDef): void {
    if (this.placingGhost) {
      this.placingGhost.destroy();
    }

    this.placingGhost = this.add.container(0, 0);
    this.placingGhost.setDepth(0.3);
    this.placingGhost.setAlpha(0.5);

    const ghostBody = this.add.rectangle(0, 0, def.width, def.height, def.color, 0.5);
    ghostBody.setStrokeStyle(2, 0xffffff, 0.6);
    this.placingGhost.add(ghostBody);

    const ghostGlow = this.add.ellipse(0, def.height * 0.1, def.width * 2, def.width, def.glowColor, 0.15);
    ghostGlow.setBlendMode(Phaser.BlendModes.ADD);
    this.placingGhost.add(ghostGlow);
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.placingGhost || !this.selectedBuilding) return;

    this.placingGhost.setPosition(pointer.x, pointer.y);
    this.canPlace = this.isOnIsland(pointer.x, pointer.y);

    this.placingGhost.setAlpha(this.canPlace ? 0.6 : 0.25);
    const body = this.placingGhost.getAt(0) as Phaser.GameObjects.Rectangle;
    if (body) {
      body.setStrokeStyle(2, this.canPlace ? 0x88ff88 : 0xff8888, 0.7);
    }
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.placingGhost && this.selectedBuilding && this.canPlace) {
      this.placeBuilding(pointer.x, pointer.y, this.selectedBuilding);
      this.placingGhost.destroy();
      this.placingGhost = null;
      this.selectedBuilding = null;
      this.canPlace = false;
      return;
    }

    if (this.selectedBuilding) {
      this.cancelPlacing();
    }
  }

  private cancelPlacing(): void {
    if (this.placingGhost) {
      this.placingGhost.destroy();
      this.placingGhost = null;
    }
    this.selectedBuilding = null;
    this.canPlace = false;
  }

  private isOnIsland(x: number, y: number): boolean {
    const dx = (x - ISLAND.centerX) / ISLAND.radiusX;
    const dy = (y - ISLAND.centerY) / ISLAND.radiusY;
    return (dx * dx + dy * dy) <= 0.85;
  }

  private placeBuilding(x: number, y: number, def: BuildingDef): void {
    if (!this.player.spend(def.cost)) return;

    this.screenShake(UI.shakeIntensity, UI.shakeDuration);
    this.updateWheelCards();

    const building = new Building(this, x, y, def);
    this.buildings.push(building);

    building.playBuildAnimation(() => {
      this.checkBridges(building);
      this.checkIslandGrowth();
    });
  }

  private checkBridges(newBuilding: Building): void {
    const newPos = newBuilding.getPosition();

    for (const existing of this.buildings) {
      if (existing === newBuilding) continue;
      const exPos = existing.getPosition();
      const dist = Phaser.Math.Distance.Between(newPos.x, newPos.y, exPos.x, exPos.y);

      if (dist <= BRIDGE.maxDistance && dist > 30) {
        this.createBridge(existing, newBuilding);
      }
    }
  }

  private createBridge(from: Building, to: Building): void {
    const fromPos = from.getPosition();
    const toPos = to.getPosition();

    const graphics = this.add.graphics();
    graphics.setDepth(0.18);

    const glowColor = COLORS.bridgeGlow;
    const lineColor = COLORS.bridgeLine;

    graphics.lineStyle(BRIDGE.glowWidth, glowColor, 0.15);
    graphics.beginPath();
    graphics.moveTo(fromPos.x, fromPos.y);
    graphics.lineTo(toPos.x, toPos.y);
    graphics.strokePath();

    graphics.lineStyle(BRIDGE.width, lineColor, 0.6);
    graphics.beginPath();
    graphics.moveTo(fromPos.x, fromPos.y);
    graphics.lineTo(toPos.x, toPos.y);
    graphics.strokePath();

    graphics.setAlpha(0);
    this.tweens.add({
      targets: graphics,
      alpha: 1,
      duration: 500,
      ease: 'Sine.Out',
    });

    const particles: Phaser.GameObjects.Ellipse[] = [];
    const particleCount = BRIDGE.particleCount;
    for (let i = 0; i < particleCount; i++) {
      const t = i / particleCount;
      const px = Phaser.Math.Linear(fromPos.x, toPos.x, t);
      const py = Phaser.Math.Linear(fromPos.y, toPos.y, t);
      const p = this.add.ellipse(px, py, 4, 4, COLORS.dustParticle, 0.6);
      p.setBlendMode(Phaser.BlendModes.ADD);
      p.setDepth(0.19);
      particles.push(p);
    }

    let flowProgress = 0;
    const timer = this.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        flowProgress += 0.008;
        if (flowProgress > 1) flowProgress = 0;

        for (let i = 0; i < particles.length; i++) {
          const t = (flowProgress + i / particleCount) % 1;
          particles[i].x = Phaser.Math.Linear(fromPos.x, toPos.x, t);
          particles[i].y = Phaser.Math.Linear(fromPos.y, toPos.y, t);
          particles[i].setAlpha(0.3 + Math.sin(t * Math.PI) * 0.5);
        }
      },
    });

    this.bridges.push({ graphics, from, to, particles, timer });
  }

  private checkIslandGrowth(): void {
    const current = this.player.buildingsPlaced;
    const threshold = ISLAND_GROWTH.buildingsNeeded;

    if (current > 0 && current % threshold === 0 && current !== this.lastGrowthCount) {
      this.lastGrowthCount = current;
      this.triggerIslandGrowth();
    }
  }

  private triggerIslandGrowth(): void {
    this.screenShake(ISLAND_GROWTH.shakeIntensity, ISLAND_GROWTH.shakeDuration);
    this.player.activateBoost();

    const ring = this.add.ellipse(
      ISLAND.centerX, ISLAND.centerY,
      10, 6,
      ISLAND_GROWTH.ringColor, 0.7
    );
    ring.setBlendMode(Phaser.BlendModes.ADD);
    ring.setDepth(0.3);

    this.tweens.add({
      targets: ring,
      scaleX: ISLAND_GROWTH.ringMaxRadius / 5,
      scaleY: ISLAND_GROWTH.ringMaxRadius / 10 * 0.6,
      alpha: 0,
      duration: ISLAND_GROWTH.ringExpandDuration,
      ease: 'Cubic.Out',
      onComplete: () => ring.destroy(),
    });

    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const rx = ISLAND.radiusX * 0.8;
      const ry = ISLAND.radiusY * 0.8;
      const px = ISLAND.centerX + Math.cos(angle) * rx;
      const py = ISLAND.centerY + Math.sin(angle) * ry;
      const spark = this.add.ellipse(px, py, 6, 6, COLORS.goldWarm, 0.8);
      spark.setBlendMode(Phaser.BlendModes.ADD);
      spark.setDepth(0.3);

      this.tweens.add({
        targets: spark,
        x: px + Math.cos(angle) * 60,
        y: py + Math.sin(angle) * 40,
        alpha: 0,
        scaleX: 0.1,
        scaleY: 0.1,
        duration: 900,
        delay: i * 30,
        ease: 'Sine.Out',
        onComplete: () => spark.destroy(),
      });
    }

    const boostText = this.add.text(ISLAND.centerX, ISLAND.centerY - 80, '✨ 浮岛成长！', {
      fontSize: '20px',
      fontFamily: 'Georgia, serif',
      color: '#ffd700',
      stroke: '#1a1225',
      strokeThickness: 3,
    });
    boostText.setOrigin(0.5);
    boostText.setDepth(100);
    boostText.setAlpha(0);

    this.tweens.add({
      targets: boostText,
      alpha: 1,
      y: ISLAND.centerY - 100,
      duration: 400,
      ease: 'Back.Out',
      onComplete: () => {
        this.tweens.add({
          targets: boostText,
          alpha: 0,
          y: ISLAND.centerY - 120,
          duration: 800,
          delay: 1500,
          ease: 'Sine.In',
          onComplete: () => boostText.destroy(),
        });
      },
    });
  }

  private screenShake(intensity: number, duration: number): void {
    const cam = this.cameras.main;
    this.tweens.add({
      targets: cam,
      x: { from: cam.scrollX, to: cam.scrollX + Phaser.Math.FloatBetween(-intensity, intensity) },
      y: { from: cam.scrollY, to: cam.scrollY + Phaser.Math.FloatBetween(-intensity, intensity) },
      duration: duration / 4,
      yoyo: true,
      repeat: 3,
      ease: 'Sine.InOut',
    });
  }

  update(_time: number, delta: number): void {
    this.islandAngle += ISLAND.rotationSpeed * delta;
    if (this.islandContainer) {
      this.islandContainer.setRotation(this.islandAngle);
    }

    for (const cloud of this.clouds) {
      cloud.container.x += cloud.speed * (delta / 1000);
      if (cloud.container.x > GAME_WIDTH + 200) {
        cloud.container.x = -200;
      }
    }

    if (this.player) {
      this.player.update(delta, this.input.activePointer);
    }
  }

  private colorToCss(color: number): string {
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;
    return `rgb(${r},${g},${b})`;
  }
}
