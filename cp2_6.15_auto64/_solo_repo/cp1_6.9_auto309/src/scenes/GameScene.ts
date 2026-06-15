import Phaser from 'phaser';

const PLAYER_MOVE_SPEED = 300;
const JUMP_HEIGHT = 120;
const GRAVITY = 400;
const TRACK_SCROLL_SPEED = 8;
const SEGMENT_WIDTH = 600;
const METEOR_SPEED = 200;
const MAX_METEORS = 5;
const MAX_STARDUSTS = 15;
const BOOST_DURATION = 2000;
const BOOST_SPEED_MULTIPLIER = 1.5;
const STARDUST_BOOST_DURATION = 500;
const COMBO_TIMEOUT = 2000;
const PORTAL_DISTANCE = 500;
const SCENE_TRANSITION_DURATION = 600;
const SHOCKWAVE_DURATION = 200;
const TOP_PADDING = 80;
const BOTTOM_PADDING = 80;
const TRACK_HEIGHT = 300;

interface TrackSegment {
  graphics: Phaser.GameObjects.Graphics;
  x: number;
  width: number;
  edgeHue: number;
}

interface Stardust {
  container: Phaser.GameObjects.Container;
  diamond: Phaser.GameObjects.Graphics;
  trail: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  hue: number;
  phase: number;
  collected: boolean;
}

interface Meteor {
  container: Phaser.GameObjects.Container;
  polygon: Phaser.GameObjects.Graphics;
  glow: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  vertices: { x: number; y: number }[];
  radius: number;
  scale: number;
}

interface BoostPad {
  graphics: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  width: number;
  pulsePhase: number;
  used: boolean;
}

interface Portal {
  outer: Phaser.GameObjects.Graphics;
  inner: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  passed: boolean;
}

interface Shockwave {
  graphics: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  progress: number;
}

interface RingRipple {
  graphics: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  progress: number;
}

interface EdgeHalo {
  graphics: Phaser.GameObjects.Graphics;
  progress: number;
}

interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
  radius: number;
}

type ScenePhase = 'lava' | 'ice';

export class GameScene extends Phaser.Scene {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  private player!: {
    x: number;
    y: number;
    vy: number;
    isJumping: boolean;
    isOnGround: boolean;
    width: number;
    height: number;
    graphics: Phaser.GameObjects.Graphics;
    board: Phaser.GameObjects.Graphics;
    trail: TrailPoint[];
  };

  private trackSegments: TrackSegment[] = [];
  private stardusts: Stardust[] = [];
  private meteors: Meteor[] = [];
  private boostPads: BoostPad[] = [];
  private portals: Portal[] = [];
  private shockwaves: Shockwave[] = [];
  private ringRipples: RingRipple[] = [];
  private edgeHalos: EdgeHalo[] = [];

  private score: number = 0;
  private combo: number = 0;
  private lastStardustTime: number = 0;
  private distance: number = 0;
  private scenePhase: ScenePhase = 'lava';
  private edgeHueOffset: number = 0;
  private baseSpeedMultiplier: number = 1;
  private stardustBoostTimer: number = 0;
  private dashTimer: number = 0;
  private isTransitioning: boolean = false;
  private transitionProgress: number = 0;
  private transitionWhiteOut: boolean = false;
  private nextPortalDistance: number = PORTAL_DISTANCE;
  private portalPlaced: boolean = false;
  private screenShake: number = 0;
  private flashRed: number = 0;
  private trackY!: number;
  private trackBottom!: number;
  private stardustPool: Stardust[] = [];
  private meteorPool: Meteor[] = [];

  private scoreText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;

  private stars: { star: Phaser.GameObjects.Arc; phase: number; period: number; baseAlpha: number }[] = [];

  private transitionOverlay!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    this.cursors = this.input.keyboard!.createCursorKeys();

    this.trackY = TOP_PADDING;
    this.trackBottom = height - BOTTOM_PADDING;

    this.createStarField();
    this.createBackground();
    this.createPlayer();
    this.createHUD();
    this.createTrackSegments();

    this.transitionOverlay = this.add.graphics();
    this.transitionOverlay.setDepth(1000);

    this.registry.set('score', 0);
  }

  private createStarField(): void {
    const { width, height } = this.cameras.main;
    const count = 200;

    for (let i = 0; i < count; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const size = Phaser.Math.Between(1, 3);
      const baseAlpha = Phaser.Math.FloatBetween(0.2, 0.8);
      const period = Phaser.Math.FloatBetween(2000, 5000);
      const phase = Phaser.Math.FloatBetween(0, Math.PI * 2);

      const star = this.add.circle(x, y, size, 0xffffff, baseAlpha);
      star.setDepth(0);

      this.stars.push({ star, phase, period, baseAlpha });
    }
  }

  private createBackground(): void {
    this.updateSceneBackground();
  }

  private updateSceneBackground(): void {
    const { width, height } = this.cameras.main;

    let topHue: number, topLight: number, bottomHue: number, bottomLight: number;

    if (this.scenePhase === 'lava') {
      topHue = 0; topLight = 0.12;
      bottomHue = 30; bottomLight = 0.18;
    } else {
      topHue = 220; topLight = 0.10;
      bottomHue = 280; bottomLight = 0.20;
    }

    const bg = this.add.graphics();
    bg.setDepth(-1);
    const topColor = Phaser.Display.Color.HSVToRGB(topHue / 360, 0.8, topLight);
    const bottomColor = Phaser.Display.Color.HSVToRGB(bottomHue / 360, 0.8, bottomLight);
    bg.fillGradientStyle(
      topColor.color, topColor.color,
      bottomColor.color, bottomColor.color,
      1
    );
    bg.fillRect(0, 0, width, height);
  }

  private createPlayer(): void {
    const { width } = this.cameras.main;
    const startX = width * 0.25;
    const groundY = this.trackBottom - 24;

    this.player = {
      x: startX,
      y: groundY,
      vy: 0,
      isJumping: false,
      isOnGround: true,
      width: 32,
      height: 48,
      graphics: this.add.graphics(),
      board: this.add.graphics(),
      trail: []
    };

    this.player.graphics.setDepth(50);
    this.player.board.setDepth(49);
  }

  private createHUD(): void {
    this.scoreText = this.add.text(20, 20, '0', {
      fontFamily: 'sans-serif',
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setDepth(200);
    this.scoreText.setShadow(0, 0, 10, 0xffffff, true);

    this.comboText = this.add.text(20, 52, '', {
      fontFamily: 'sans-serif',
      fontSize: '18px',
      color: '#ffdd55',
      fontStyle: 'bold'
    }).setDepth(200);
    this.comboText.setShadow(0, 0, 8, 0xffaa00, true);
    this.comboText.setVisible(false);
  }

  private createTrackSegments(): void {
    const { width } = this.cameras.main;

    const initialSegments = Math.ceil(width / SEGMENT_WIDTH) + 2;

    for (let i = 0; i < initialSegments; i++) {
      this.createTrackSegment(i * SEGMENT_WIDTH);
    }
  }

  private createTrackSegment(startX: number): void {
    const { width } = this.cameras.main;
    const graphics = this.add.graphics();
    graphics.setDepth(10);

    const edgeHue = (200 + (startX / SEGMENT_WIDTH) * 50) % 100;

    this.fillTrackSegment(graphics, startX, edgeHue);

    const seg: TrackSegment = {
      graphics,
      x: startX,
      width: SEGMENT_WIDTH,
      edgeHue
    };

    this.trackSegments.push(seg);

    this.populateSegmentContent(seg);

  }

  private fillTrackSegment(graphics: Phaser.GameObjects.Graphics, x: number, baseHue: number): void {
    const { width } = this.cameras.main;
    graphics.clear();

    const topY = this.trackY;
    const bottomY = this.trackBottom;

    const trackMidY = (topY + bottomY) / 2;
    const trackHeight = bottomY - topY;

    graphics.lineStyle(2, 0x000000, 0);

    for (let i = 0; i < SEGMENT_WIDTH; i += 4) {
      const t = i / SEGMENT_WIDTH;
      const hue1 = (baseHue + this.edgeHueOffset + t * 100) % 360;
      const hue2 = (baseHue + 50 + this.edgeHueOffset + t * 100) % 360;

      const color1 = Phaser.Display.Color.HSVToRGB(hue1 / 360, 1, 0.9);
      const color2 = Phaser.Display.Color.HSVToRGB(hue2 / 360, 1, 0.9);

      graphics.lineStyle(2, color1.color, 0.9);
      graphics.beginPath();
      graphics.moveTo(x + i, topY + 40);
      graphics.lineTo(x + i + 4, topY + 40);
      graphics.strokePath();

      graphics.lineStyle(2, color2.color, 0.9);
      graphics.beginPath();
      graphics.moveTo(x + i, bottomY - 40);
      graphics.lineTo(x + i + 4, bottomY - 40);
      graphics.strokePath();
    }

    const numStardusts = Phaser.Math.Between(3, 6);
    const currentStardustsCount = this.stardusts.length;
    const canAdd = MAX_STARDUSTS - currentStardustsCount;
    const toAdd = Math.min(numStardusts, canAdd);

    for (let i = 0; i < toAdd; i++) {
      if (this.stardusts.length >= MAX_STARDUSTS) break;

      const sx = x + Phaser.Math.Between(50, SEGMENT_WIDTH - 50);
      const sy = Phaser.Math.Between(topY + 60, bottomY - 60);
      const hue = Phaser.Math.Between(0, 360);

      this.createStardust(sx, sy, hue);
    }

    const padChance = 0.3;
    if (Math.random() < padChance) {
      const px = x + Phaser.Math.Between(100, SEGMENT_WIDTH - 140);
      const py = bottomY - 45;
      this.createBoostPad(px, py);
    }
  }

  private populateSegmentContent(seg: TrackSegment): void {
    const meteorCount = Phaser.Math.Between(0, 2);

    for (let i = 0; i < meteorCount; i++) {
      if (this.meteors.length >= MAX_METEORS) break;
      this.spawnMeteor(seg.x + Phaser.Math.Between(400, SEGMENT_WIDTH - 100));
    }

    if (!this.portalPlaced && this.distance >= this.nextPortalDistance) {
      const px = seg.x + SEGMENT_WIDTH - 200;
      const py = (this.trackY + this.trackBottom) / 2;
      this.createPortal(px, py);
      this.portalPlaced = true;
    }
  }

  private createStardust(x: number, y: number, hue: number): void {
    let stardust: Stardust;

    if (this.stardustPool.length > 0) {
      stardust = this.stardustPool.pop()!;
      stardust.x = x;
      stardust.y = y;
      stardust.hue = hue;
      stardust.collected = false;
      stardust.phase = Math.random() * Math.PI * 2;
      stardust.container.setPosition(x, y);
      stardust.container.setVisible(true);
      stardust.container.setActive(true);
    } else {
      const container = this.add.container(x, y);
      container.setDepth(30);

      const diamond = this.add.graphics();
      const trail = this.add.graphics();
      trail.setDepth(29);
      container.add([trail, diamond]);

      stardust = {
        container,
        diamond,
        trail,
        x,
        y,
        hue,
        phase: Math.random() * Math.PI * 2,
        collected: false
      };
    }

    this.drawStardust(stardust);
    this.stardusts.push(stardust);
  }

  private drawStardust(s: Stardust): void {
    const { diamond, trail, hue } = s;
    const size = 8;

    trail.clear();
    const trailColor = Phaser.Display.Color.HSVToRGB(hue / 360, 1, 0.8);
    for (let i = 9; i >= 0; i--) {
      const t = i / 10;
      const tx = -3 * i;
      const alpha = 1 - t;
      const r = 4 * (1 - t * 0.5);

      trail.fillStyle(trailColor.color, alpha * 0.5);
      trail.fillCircle(tx, 0, r);
    }

    diamond.clear();
    const color = Phaser.Display.Color.HSVToRGB(hue / 360, 1, 1);
    const glow = Phaser.Display.Color.HSVToRGB(hue / 360, 0.5, 0.8);

    diamond.fillStyle(glow.color, 0.4);
    diamond.fillCircle(0, 0, 10);

    diamond.fillStyle(color.color, 1);
    diamond.beginPath();
    diamond.moveTo(0, -size);
    diamond.lineTo(size, 0);
    diamond.lineTo(0, size);
    diamond.lineTo(-size, 0);
    diamond.closePath();
    diamond.fillPath();
  }

  private spawnMeteor(x: number): void {
    let meteor: Meteor;
    const topY = this.trackY + 60;
    const bottomY = this.trackBottom - 60;
    const y = Phaser.Math.Between(topY, bottomY);
    const vertices = this.generateMeteorVertices();
    const radius = Phaser.Math.Between(15, 25);

    if (this.meteorPool.length > 0) {
      meteor = this.meteorPool.pop()!;
      meteor.x = x;
      meteor.y = y;
      meteor.vertices = vertices;
      meteor.radius = radius;
      meteor.scale = 1;
      meteor.container.setPosition(x, y);
      meteor.container.setVisible(true);
      meteor.container.setActive(true);
    } else {
      const container = this.add.container(x, y);
      container.setDepth(40);

      const glow = this.add.graphics();
      glow.setDepth(39);
      const polygon = this.add.graphics();

      container.add([glow, polygon]);

      meteor = {
        container,
        polygon,
        glow,
        x,
        y,
        vertices,
        radius,
        scale: 1
      };
    }

    this.drawMeteor(meteor);
    this.meteors.push(meteor);
  }

  private generateMeteorVertices(): { x: number; y: number }[] {
    const verts: { x: number; y: number }[] = [];
    const numVerts = Phaser.Math.Between(6, 10);
    for (let i = 0; i < numVerts; i++) {
      const angle = (i / numVerts) * Math.PI * 2;
      const r = Phaser.Math.FloatBetween(0.6, 1.0);
      verts.push({
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r
      });
    }
    return verts;
  }

  private drawMeteor(m: Meteor): void {
    const { polygon, glow, vertices, radius, scale } = m;
    const hue = this.scenePhase === 'lava' ? 0 : 270;
    const meteorColor = this.scenePhase === 'lava' ? 0x3a3a3a : 0x2a1a4a;
    const haloColor = Phaser.Display.Color.HSVToRGB(hue / 360, 0.8, 0.6);

    glow.clear();
    glow.fillStyle(haloColor.color, 0.3);
    glow.beginPath();
    glow.arc(0, 0, radius * scale * 1.3, 0, Math.PI * 2);
    glow.fillPath();

    polygon.clear();
    polygon.fillStyle(meteorColor, 1);
    polygon.lineStyle(1, 0x111111, 0.8);
    polygon.beginPath();

    vertices.forEach((v, i) => {
      const px = v.x * radius * scale;
      const py = v.y * radius * scale;
      if (i === 0) polygon.moveTo(px, py);
      else polygon.lineTo(px, py);
    });
    polygon.closePath();
    polygon.fillPath();
    polygon.strokePath();
  }

  private createBoostPad(x: number, y: number): void {
    const graphics = this.add.graphics();
    graphics.setDepth(25);

    const pad: BoostPad = {
      graphics,
      x,
      y,
      width: 40,
      pulsePhase: Math.random() * Math.PI * 2,
      used: false
    };

    this.drawBoostPad(pad);
    this.boostPads.push(pad);
  }

  private drawBoostPad(pad: BoostPad): void {
    const { graphics, x, y, pulsePhase } = pad;
    graphics.clear();
    graphics.x = x;
    graphics.y = y;

    const lightness = 0.7 + 0.3 * Math.sin(pulsePhase);
    const color1 = Phaser.Display.Color.HSVToRGB(45 / 360, 1, lightness);
    const color2 = Phaser.Display.Color.HSVToRGB(45 / 360, 0.8, Math.min(1, lightness + 0.1));
    const color3 = Phaser.Display.Color.HSVToRGB(45 / 360, 1, lightness * 0.5);

    graphics.fillGradientStyle(
      color1.color, color1.color,
      color3.color, color3.color, 1);
    graphics.fillRoundedRect(-20, -7, 40, 14, 4);

    graphics.lineStyle(2, color2.color, 0.8);
    graphics.strokeRoundedRect(-20, -7, 40, 14, 4);
  }

  private createPortal(x: number, y: number): void {
    const outer = this.add.graphics();
    const inner = this.add.graphics();
    outer.setDepth(35);
    inner.setDepth(36);

    const portal: Portal = {
      outer,
      inner,
      x,
      y,
      passed: false
    };

    this.drawPortal(portal);
    this.portals.push(portal);
  }

  private drawPortal(p: Portal): void {
    const { outer, inner, x, y } = p;

    outer.clear();
    inner.clear();
    outer.x = x;
    outer.y = y;
    inner.x = x;
    inner.y = y;

    for (let i = 0; i < 30; i++) {
      const t = i / 30;
      const hue = (200 + this.edgeHueOffset + t * 80) % 360;
      const alpha = 1 - t * 0.7;
      const color = Phaser.Display.Color.HSVToRGB(hue / 360, 1, 0.9);
      outer.lineStyle(3, color.color, alpha);
      outer.beginPath();
      outer.arc(0, -15, 30 - t * 5, 0, Math.PI * 2);
      outer.strokePath();

      inner.lineStyle(2, color.color, alpha * 0.8);
      inner.beginPath();
      inner.arc(0, 15, 20 - t * 3, 0, Math.PI * 2);
      inner.strokePath();
    }
  }

  update(time: number, delta: number): void {
    const dt = delta / 1000;
    const { width } = this.cameras.main;

    this.updateStarField(time);

    if (this.isTransitioning) {
      this.updateTransition(dt);
      if (this.transitionProgress >= 1 && !this.transitionWhiteOut) return;
    }

    this.updateBoosts(dt);
    this.updatePlayerMovement(dt);
    const effectiveScrollSpeed = TRACK_SCROLL_SPEED * this.baseSpeedMultiplier;
    this.distance += effectiveScrollSpeed;

    this.updateTrack(effectiveScrollSpeed);
    this.updateStardusts(effectiveScrollSpeed, time);
    this.updateMeteors(effectiveScrollSpeed, dt);
    this.updateBoostPads(effectiveScrollSpeed, time);
    this.updatePortals(effectiveScrollSpeed, time);
    this.updateEffects(dt);
    this.drawPlayer();
    this.updatePlayer();
    this.checkCollisions();

    if (this.screenShake > 0) this.updateScreenShake();
    if (this.flashRed > 0) this.updateRedFlash(dt);
    this.updateScoreDisplay();
  }

  private updateStarField(time: number): void {
    for (const s of this.stars) {
      const alpha = s.baseAlpha * (0.5 + 0.5 * Math.sin(time / s.period * 1000) * Math.PI * 2 + s.phase);
      s.star.alpha = Phaser.Math.Clamp(alpha, 0.2, 0.8);
    }
  }

  private updateBoosts(dt: number): void {
    if (this.stardustBoostTimer > 0) {
      this.stardustBoostTimer -= dt * 1000;
    }
    if (this.dashTimer > 0) {
      this.dashTimer -= dt * 1000;
    }

    let mult = 1;
    if (this.stardustBoostTimer > 0) mult += 0.2;
    if (this.dashTimer > 0) mult += 0.5;
    this.baseSpeedMultiplier = mult;
  }

  private updatePlayerMovement(dt: number): void {
    const { width } = this.cameras.main;

    const moveSpeed = PLAYER_MOVE_SPEED * dt;

    if (this.cursors.left?.isDown) {
      this.player.x -= moveSpeed;
    }
    if (this.cursors.right?.isDown) {
      this.player.x += moveSpeed;
    }

    this.player.x = Phaser.Math.Clamp(this.player.x, 60, width - 60);

    const groundY = this.trackBottom - 24;

    if (this.cursors.space?.isDown && this.player.isOnGround) {
      this.player.vy = -Math.sqrt(2 * GRAVITY * JUMP_HEIGHT);
      this.player.isJumping = true;
      this.player.isOnGround = false;
    }

    this.player.vy += GRAVITY * dt;
    this.player.y += this.player.vy;

    if (this.player.y >= groundY) {
      if (!this.player.isOnGround && this.player.vy > 50) {
        this.createShockwave(this.player.x, this.trackBottom - 40);
      }
      this.player.y = groundY;
      this.player.vy = 0;
      this.player.isJumping = false;
      this.player.isOnGround = true;
    }

    const trail: TrailPoint = {
      x: this.player.x,
      y: this.player.y + 20,
      alpha: 1,
      radius: 8
    };
    this.player.trail.unshift(trail);
    if (this.player.trail.length > 10) {
      this.player.trail.pop();
    }
    for (let i = 0; i < this.player.trail.length; i++) {
      const t = i / this.player.trail.length;
      this.player.trail[i].alpha = 1 - t;
      this.player.trail[i].radius = 8 * (1 - t * 0.6);
    }
  }

  private createShockwave(x: number, y: number): void {
    const g = this.add.graphics();
    g.setDepth(55);

    this.shockwaves.push({
      graphics: g,
      x,
      y,
      progress: 0
    });
  }

  private updateTrack(scroll: number): void {
    const { width } = this.cameras.main;

    for (const seg of this.trackSegments) {
      seg.x -= scroll;
      seg.graphics.x = seg.graphics;

      this.fillTrackSegment(seg.graphics, seg.x, seg.edgeHue);
    }

    while (this.trackSegments.length > 0 && this.trackSegments[0].x + SEGMENT_WIDTH < -100) {
      const lastX = this.trackSegments[this.trackSegments.length - 1].x;
      const removed = this.trackSegments.shift()!;
      removed.x = lastX + SEGMENT_WIDTH;
      removed.edgeHue = (removed.edgeHue + 100) % 360;
      this.fillTrackSegment(removed.graphics, removed.x, removed.edgeHue);
      this.trackSegments.push(removed);
    }

    if (this.distance >= this.nextPortalDistance + 200 && this.portalPlaced) {
      this.portalPlaced = false;
      this.nextPortalDistance += PORTAL_DISTANCE;
    }
  }

  private updateStardusts(scroll: number, time: number): void {
    for (let i = this.stardusts.length - 1; i >= 0; i--) {
      const s = this.stardusts[i];
      s.x -= scroll;
      s.phase += 0.05;
      s.container.x = s.x;
      s.container.y = s.y + Math.sin(s.phase) * 3;

      this.drawStardust(s);
    }

    for (let i = this.stardusts.length - 1; i >= 0; i--) {
      const s = this.stardusts[i];
      if (s.x < -50) {
        s.container.setVisible(false);
        s.container.setActive(false);
        this.stardusts.splice(i, 1);
        this.stardustPool.push(s);
      } else if (s.collected) {
        s.container.setVisible(false);
        s.container.setActive(false);
        this.stardusts.splice(i, 1);
        this.stardustPool.push(s);
      }
    }
  }

  private updateMeteors(scroll: number, dt: number): void {
    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const m = this.meteors[i];
      const totalScroll = scroll + METEOR_SPEED * dt;
      m.x -= totalScroll;

      const dx = m.x - this.player.x;
      const dy = m.y - this.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 100) {
        m.scale = 1 + 0.2 * (1 - dist / 100);
      } else {
        m.scale = 1;
      }

      m.container.x = m.x;
      m.container.y = m.y;
      this.drawMeteor(m);
    }

    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const m = this.meteors[i];
      if (m.x < -60) {
        m.container.setVisible(false);
        m.container.setActive(false);
        this.meteors.splice(i, 1);
        this.meteorPool.push(m);
      }
    }

    if (this.meteors.length < MAX_METEORS && Math.random() < 0.01) {
      const { width } = this.cameras.main;
      this.spawnMeteor(width + 100);
    }
  }

  private updateBoostPads(scroll: number, time: number): void {
    for (let i = this.boostPads.length - 1; i >= 0; i--) {
      const pad = this.boostPads[i];
      pad.x -= scroll;
      pad.pulsePhase += 0.1;
      this.drawBoostPad(pad);
    }

    for (let i = this.boostPads.length - 1; i >= 0; i--) {
      if (this.boostPads[i].x < -60) {
        this.boostPads[i].graphics.destroy();
        this.boostPads.splice(i, 1);
      } else if (this.boostPads[i].used) {
        this.boostPads[i].graphics.destroy();
        this.boostPads.splice(i, 1);
      }
    }
  }

  private updatePortals(scroll: number, time: number): void {
    for (let i = this.portals.length - 1; i >= 0; i--) {
      const p = this.portals[i];
      p.x -= scroll;
      this.drawPortal(p);
    }

    for (let i = this.portals.length - 1; i >= 0; i--) {
      if (this.portals[i].x < -80) {
        this.portals[i].outer.destroy();
        this.portals[i].inner.destroy();
        this.portals.splice(i, 1);
      }
    }
  }

  private updateEffects(dt: number): void {
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.progress += dt * 1000 / SHOCKWAVE_DURATION;
      if (sw.progress >= 1) {
        sw.graphics.destroy();
        this.shockwaves.splice(i, 1);
        continue;
      }

      const r = 5 + sw.progress * 25;
      const alpha = 1 - sw.progress;
      const hue = this.scenePhase === 'lava' ? 0 : 200;
      const color = Phaser.Display.Color.HSVToRGB(hue / 360, 1, 0.9);
      sw.graphics.clear();
      sw.graphics.lineStyle(3, color.color, alpha);
      sw.graphics.beginPath();
      sw.graphics.arc(sw.x, sw.y, r, 0, Math.PI * 2);
      sw.graphics.strokePath();
    }

    for (let i = this.ringRipples.length - 1; i >= 0; i--) {
      const r = this.ringRipples[i];
      r.progress += dt * 1000 / 800;
      if (r.progress >= 1) {
        r.graphics.destroy();
        this.ringRipples.splice(i, 1);
        continue;
      }

      const radius = 30 + r.progress * 100;
      const alpha = 1 - r.progress;
      r.graphics.clear();
      const c = Phaser.Display.Color.HSVToRGB(45 / 360, 1, 0.9);
      r.graphics.lineStyle(3, c.color, alpha);
      r.graphics.beginPath();
      r.graphics.arc(r.x, r.y, radius, 0, Math.PI * 2);
      r.graphics.strokePath();
    }

    for (let i = this.edgeHalos.length - 1; i >= 0; i--) {
      const h = this.edgeHalos[i];
      h.progress += dt * 1000 / 500;
      if (h.progress >= 1) {
        h.graphics.destroy();
        this.edgeHalos.splice(i, 1);
        continue;
      }

      const { width, height } = this.cameras.main;
      const alpha = (1 - h.progress) * 0.6;
      const hue = 180 + h.progress * 180;
      const color = Phaser.Display.Color.HSVToRGB(hue / 360, 1, 0.9);

      h.graphics.clear();
      h.graphics.fillStyle(color.color, alpha);
      h.graphics.fillRect(0, 0, width, 20);
      h.graphics.fillRect(0, height - 20, width, 20);
      h.graphics.fillRect(0, 0, 20, height);
      h.graphics.fillRect(width - 20, 0, 20, height);
    }
  }

  private drawPlayer(): void {
    const { graphics, board, x, y, trail } = this.player;

    graphics.clear();
    board.clear();

    const hue = 200;
    const boardHue = 320;

    const trailHue = this.dashTimer > 0 ? 45 : (this.baseSpeedMultiplier > 1 ? 50 : hue);

    for (let i = trail.length - 1; i >= 0; i--) {
      const t = trail[i];
      const c = Phaser.Display.Color.HSVToRGB(trailHue / 360, 1, 0.8);
      board.fillStyle(c.color, t.alpha * 0.7);
      board.fillCircle(t.x, t.y, t.radius);
    }

    graphics.x = x;
    graphics.y = y;
    board.x = 0;
    board.y = 0;

    const pColor = Phaser.Display.Color.HSVToRGB(hue / 360, 0.9, 0.8);

    graphics.fillStyle(pColor.color, 1);
    graphics.fillRoundedRect(-10, -30, 20, 25, 4);

    graphics.fillStyle(0xffe4c4, 1);
    graphics.fillCircle(0, -36, 10);

    const eye = 0x000000;
    graphics.fillStyle(eye, 1);
    graphics.fillCircle(-4, -38, 2);
    graphics.fillCircle(4, -38, 2);

    graphics.fillStyle(pColor.color, 1);
    graphics.fillRect(-12, -8, 24, 8);

    graphics.fillStyle(0x222222, 1);
    graphics.fillRect(-18, 2, 36, 4);
  graphics.fillStyle(Phaser.Display.Color.HSVToRGB(boardHue / 360, 1, 0.8).color, 1);
    graphics.fillRoundedRect(-18, 0, 36, 6, 2);
  }

  private checkCollisions(): void {
    const { x: px, y: py, width: pw, height: ph } = this.player;
    const playerLeft = px - pw / 2 + 4;
    const playerRight = px + pw / 2 - 4;
    const playerTop = py - ph;
    const playerBottom = py;

    for (const s of this.stardusts) {
      if (s.collected) continue;
      const dx = s.x - px;
      const dy = s.y - (py - ph / 2);
      if (dx * dx + dy * dy < 20 * 20) {
        s.collected = true;
        this.onStardustCollected();
      }
    }

    for (const m of this.meteors) {
      const dx = m.x - px;
      const dy = m.y - (py - ph / 2);
      if (dx * dx + dy * dy < (m.radius * m.scale + 15) * (m.radius * m.scale + 15)) {
        this.onGameOver();
        return;
      }
    }

    for (const pad of this.boostPads) {
      if (pad.used) continue;
      if (px + 18 >= pad.x - 20 &&
          px - 18 <= pad.x + 20 &&
          py >= pad.y - 10 &&
          py - 5 <= pad.y + 5) {
        pad.used = true;
        this.onBoostPad();
      }
    }

    for (const p of this.portals) {
      if (p.passed) continue;
      if (Math.abs(p.x - px) < 20 &&
          Math.abs(p.y - (py - ph / 2)) < 50) {
        p.passed = true;
        this.onPortal();
      }
    }
  }

  private onStardustCollected(): void {
    const now = this.time.now;

    if (now - this.lastStardustTime <= COMBO_TIMEOUT) {
      this.combo++;
    } else {
      this.combo = 1;
    }
    this.lastStardustTime = now;

    let points = 10;
    if (this.combo >= 5) points = 50;
    else if (this.combo >= 2) points = 20;

    this.score += points;
    this.stardustBoostTimer = STARDUST_BOOST_DURATION;

    const { width, height } = this.cameras.main;
    const haloG = this.add.graphics();
    haloG.setDepth(150);
    this.edgeHalos.push({
      graphics: haloG,
      progress: 0
    });
  }

  private onBoostPad(): void {
    this.dashTimer = BOOST_DURATION;

    const ringG = this.add.graphics();
    ringG.setDepth(60);
    this.ringRipples.push({
      graphics: ringG,
      x: this.player.x,
      y: this.player.y - 20,
      progress: 0
    });
  }

  private onPortal(): void {
    this.score += 100;

    this.isTransitioning = true;
    this.transitionProgress = 0;
    this.transitionWhiteOut = true;
  }

  private updateTransition(dt: number): void {
    this.transitionProgress += dt * 1000 / SCENE_TRANSITION_DURATION * 2;

    const { width, height } = this.cameras.main;

    if (this.transitionWhiteOut) {
      const alpha = Math.min(1, this.transitionProgress);
      this.transitionOverlay.clear();
      this.transitionOverlay.fillStyle(0xffffff, alpha);
      this.transitionOverlay.fillRect(0, 0, width, height);

      if (this.transitionProgress >= 1) {
        this.scenePhase = this.scenePhase === 'lava' ? 'ice' : 'lava';
        this.edgeHueOffset = (this.edgeHueOffset + 180) % 360;
        this.updateSceneBackground();
        this.transitionWhiteOut = false;
        this.transitionProgress = 0;
      }
    } else {
      const alpha = 1 - Math.min(1, this.transitionProgress);
      this.transitionOverlay.clear();
      this.transitionOverlay.fillStyle(0xffffff, alpha);
      this.transitionOverlay.fillRect(0, 0, width, height);

      if (this.transitionProgress >= 1) {
        this.isTransitioning = false;
        this.transitionProgress = 0;
        this.transitionOverlay.clear();
      }
    }
  }

  private onGameOver(): void {
    this.flashRed = 600;
    this.screenShake = 15;

    this.cameras.main.shake(300, 0.02);

    this.time.delayedCall(400, () => {
      this.scene.start('GameOverScene', { score: this.score });
    });
  }

  private updateScreenShake(): void {
    this.screenShake--;
  }

  private updateRedFlash(dt: number): void {
    this.flashRed -= dt * 1000;
    const alpha = Math.min(1, this.flashRed / 600 * 0.5);
    if (alpha > 0) {
      const flash = this.add.graphics();
      flash.setDepth(500);
      flash.fillStyle(0xff0000, alpha);
      flash.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);
      this.time.delayedCall(16, () => flash.destroy());
    }
  }

  private updateScoreDisplay(): void {
    this.scoreText.setText(`${this.score}`);

    const now = this.time.now;
    if (now - this.lastStardustTime > COMBO_TIMEOUT || this.combo <= 1) {
      this.comboText.setVisible(false);
      return;
    }

    let multiplier = 1;
    if (this.combo >= 5) multiplier = 5;
    else if (this.combo >= 2) multiplier = 2;

    this.comboText.setText(`连击 x${multiplier} (${this.combo})`);
    this.comboText.setVisible(true);
  }
}
