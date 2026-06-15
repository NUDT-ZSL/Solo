import Phaser from 'phaser';

export class Rover extends Phaser.GameObjects.Container {
  public body: Phaser.Physics.Arcade.Body;
  private roverGraphics: Phaser.GameObjects.Graphics;
  private clawGraphics: Phaser.GameObjects.Graphics;
  
  private baseSpeed: number = 3.5;
  private currentSpeed: number;
  private level: number = 1;
  private hexCount: number = 7;
  private roverScale: number = 1;
  
  private chassisPitch: number = 0;
  private chassisRoll: number = 0;
  private targetPitch: number = 0;
  private targetRoll: number = 0;
  private readonly MAX_TILT: number = Math.PI / 12;
  
  private clawExtended: boolean = false;
  private clawExtending: boolean = false;
  private clawRetracting: boolean = false;
  private clawProgress: number = 0;
  private readonly CLAW_DURATION: number = 300;
  private readonly SEGMENT_LENGTH: number = 8;
  private readonly SEGMENT_COUNT: number = 6;
  
  private stunned: boolean = false;
  private stunTimer: number = 0;
  private stunFlashTimer: number = 0;
  
  private dustStormActive: boolean = false;
  
  private keys!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    space: Phaser.Input.Keyboard.Key;
  };
  
  private terrainHeights: Float32Array | null = null;
  
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    
    this.currentSpeed = this.baseSpeed;
    
    this.roverGraphics = new Phaser.GameObjects.Graphics(scene);
    this.clawGraphics = new Phaser.GameObjects.Graphics(scene);
    
    this.add(this.clawGraphics);
    this.add(this.roverGraphics);
    
    scene.physics.add.existing(this);
    this.body = this.body as Phaser.Physics.Arcade.Body;
    this.body.setSize(60 * this.roverScale, 40 * this.roverScale);
    this.body.setOffset(-30 * this.roverScale, -20 * this.roverScale);
    this.body.setCollideWorldBounds(true);
    this.body.setImmovable(false);
    
    this.keys = scene.input.keyboard!.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE
    }) as {
      up: Phaser.Input.Keyboard.Key;
      down: Phaser.Input.Keyboard.Key;
      left: Phaser.Input.Keyboard.Key;
      right: Phaser.Input.Keyboard.Key;
      space: Phaser.Input.Keyboard.Key;
    };
    
    this.drawRover();
    this.drawClaw();
    
    scene.add.existing(this);
  }
  
  setTerrainHeights(heights: Float32Array): void {
    this.terrainHeights = heights;
  }
  
  getLevel(): number {
    return this.level;
  }
  
  upgrade(): void {
    this.level = Math.min(this.level + 1, 10);
    this.hexCount += 3;
    this.roverScale = 1 + (this.level - 1) * 0.15;
    this.baseSpeed *= 0.9;
    this.currentSpeed = this.baseSpeed;
    this.body.setSize(60 * this.roverScale, 40 * this.roverScale);
    this.body.setOffset(-30 * this.roverScale, -20 * this.roverScale);
    this.drawRover();
  }
  
  isClawActive(): boolean {
    return this.clawExtended || this.clawExtending;
  }
  
  getClawTipPosition(): Phaser.Math.Vector2 {
    const angle = this.rotation + this.chassisPitch;
    const totalLength = this.SEGMENT_COUNT * this.SEGMENT_LENGTH * this.clawProgress;
    const tipX = this.x + Math.cos(angle) * (30 * this.roverScale + totalLength);
    const tipY = this.y + Math.sin(angle) * (30 * this.roverScale + totalLength);
    return new Phaser.Math.Vector2(tipX, tipY);
  }
  
  retractClaw(): void {
    if (this.clawExtended || this.clawExtending) {
      this.clawExtending = false;
      this.clawRetracting = true;
    }
  }
  
  setDustStormActive(active: boolean): void {
    this.dustStormActive = active;
    if (active) {
      this.currentSpeed = this.baseSpeed * 0.6;
    } else {
      this.currentSpeed = this.baseSpeed;
    }
  }
  
  applyStun(duration: number = 1000): void {
    this.stunned = true;
    this.stunTimer = duration;
    this.stunFlashTimer = 0;
  }
  
  isStunned(): boolean {
    return this.stunned;
  }
  
  update(time: number, delta: number): void {
    if (this.stunned) {
      this.updateStun(delta);
    } else {
      this.handleMovement(delta);
    }
    
    this.updateTilt();
    this.updateClaw(delta);
    this.drawRover();
    this.drawClaw();
  }
  
  private updateStun(delta: number): void {
    this.stunTimer -= delta;
    this.stunFlashTimer += delta;
    
    if (this.stunTimer <= 0) {
      this.stunned = false;
      this.visible = true;
    } else {
      if (this.stunFlashTimer > 80) {
        this.visible = !this.visible;
        this.stunFlashTimer = 0;
      }
    }
    this.body.setVelocity(0, 0);
  }
  
  private handleMovement(delta: number): void {
    const velocity = new Phaser.Math.Vector2(0, 0);
    let moving = false;
    
    if (this.keys.left?.isDown) {
      this.rotation -= 0.03 * (delta / 16);
    }
    if (this.keys.right?.isDown) {
      this.rotation += 0.03 * (delta / 16);
    }
    
    if (this.keys.up?.isDown) {
      velocity.x = Math.cos(this.rotation) * this.currentSpeed;
      velocity.y = Math.sin(this.rotation) * this.currentSpeed;
      moving = true;
    }
    if (this.keys.down?.isDown) {
      velocity.x = -Math.cos(this.rotation) * this.currentSpeed * 0.6;
      velocity.y = -Math.sin(this.rotation) * this.currentSpeed * 0.6;
      moving = true;
    }
    
    if (Phaser.Input.Keyboard.JustDown(this.keys.space) && !this.clawExtending && !this.clawRetracting && !this.clawExtended) {
      this.clawExtending = true;
      this.clawProgress = 0;
    }
    
    this.body.setVelocity(velocity.x * (delta / 16) * 60, velocity.y * (delta / 16) * 60);
    
    if (this.terrainHeights) {
      this.calculateTerrainTilt();
    }
  }
  
  private calculateTerrainTilt(): void {
    if (!this.terrainHeights) return;
    
    const cols = 300;
    const cellSize = 4;
    
    const getHeightAt = (wx: number, wy: number): number => {
      const gx = Math.floor(wx / cellSize);
      const gy = Math.floor(wy / cellSize);
      const idx = gy * cols + gx;
      if (idx < 0 || idx >= this.terrainHeights!.length) return 400;
      return this.terrainHeights![idx];
    };
    
    const halfW = 25 * this.roverScale;
    const halfH = 15 * this.roverScale;
    const cos = Math.cos(this.rotation);
    const sin = Math.sin(this.rotation);
    
    const samplePoints = [
      { x: this.x + cos * halfW - sin * halfH, y: this.y + sin * halfW + cos * halfH },
      { x: this.x + cos * halfW + sin * halfH, y: this.y + sin * halfW - cos * halfH },
      { x: this.x - cos * halfW - sin * halfH, y: this.y - sin * halfW + cos * halfH },
      { x: this.x - cos * halfW + sin * halfH, y: this.y - sin * halfW - cos * halfH },
    ];
    
    const heights = samplePoints.map(p => getHeightAt(p.x, p.y));
    
    const frontAvg = (heights[0] + heights[1]) / 2;
    const rearAvg = (heights[2] + heights[3]) / 2;
    const leftAvg = (heights[0] + heights[2]) / 2;
    const rightAvg = (heights[1] + heights[3]) / 2;
    
    const pitchRaw = (rearAvg - frontAvg) / 50;
    const rollRaw = (rightAvg - leftAvg) / 50;
    
    this.targetPitch = Phaser.Math.Clamp(pitchRaw, -this.MAX_TILT, this.MAX_TILT);
    this.targetRoll = Phaser.Math.Clamp(rollRaw, -this.MAX_TILT, this.MAX_TILT);
  }
  
  private updateTilt(): void {
    this.chassisPitch += (this.targetPitch - this.chassisPitch) * 0.1;
    this.chassisRoll += (this.targetRoll - this.chassisRoll) * 0.1;
  }
  
  private updateClaw(delta: number): void {
    if (this.clawExtending) {
      this.clawProgress += delta / this.CLAW_DURATION;
      if (this.clawProgress >= 1) {
        this.clawProgress = 1;
        this.clawExtending = false;
        this.clawExtended = true;
      }
    } else if (this.clawRetracting) {
      this.clawProgress -= delta / this.CLAW_DURATION;
      if (this.clawProgress <= 0) {
        this.clawProgress = 0;
        this.clawRetracting = false;
        this.clawExtended = false;
      }
    }
  }
  
  private drawRover(): void {
    const g = this.roverGraphics;
    g.clear();
    
    g.save();
    g.rotate(this.chassisRoll);
    
    const hexSize = 8 * this.roverScale;
    const rows = Math.ceil(Math.sqrt(this.hexCount));
    const cols = Math.ceil(this.hexCount / rows);
    const hexWidth = hexSize * Math.sqrt(3);
    const hexHeight = hexSize * 1.5;
    
    let drawn = 0;
    const startX = -(cols * hexWidth) / 2;
    const startY = -(rows * hexHeight) / 2;
    
    for (let row = 0; row < rows && drawn < this.hexCount; row++) {
      for (let col = 0; col < cols && drawn < this.hexCount; col++) {
        const offsetX = (row % 2) * (hexWidth / 2);
        const hx = startX + col * hexWidth + offsetX + hexWidth / 2;
        const hy = startY + row * hexHeight + hexHeight / 2;
        
        this.drawHexagon(g, hx, hy, hexSize, row + col);
        drawn++;
      }
    }
    
    g.fillStyle(0x333333, 1);
    g.fillRoundedRect(-28 * this.roverScale, 14 * this.roverScale, 20 * this.roverScale, 10 * this.roverScale, 3);
    g.fillRoundedRect(8 * this.roverScale, 14 * this.roverScale, 20 * this.roverScale, 10 * this.roverScale, 3);
    g.fillRoundedRect(-28 * this.roverScale, -24 * this.roverScale, 20 * this.roverScale, 10 * this.roverScale, 3);
    g.fillRoundedRect(8 * this.roverScale, -24 * this.roverScale, 20 * this.roverScale, 10 * this.roverScale, 3);
    
    g.fillStyle(0x1a1a2e, 0.9);
    g.fillRoundedRect(-8 * this.roverScale, -8 * this.roverScale, 16 * this.roverScale, 12 * this.roverScale, 3);
    g.lineStyle(2, 0x00bfff, 0.8);
    g.strokeRoundedRect(-8 * this.roverScale, -8 * this.roverScale, 16 * this.roverScale, 12 * this.roverScale, 3);
    
    g.restore();
  }
  
  private drawHexagon(g: Phaser.GameObjects.Graphics, x: number, y: number, size: number, seed: number): void {
    const colors = [0x888888, 0x989898, 0xa8a8a8, 0x787878, 0xb0b0b0, 0x808080];
    const colorIdx = Math.abs(Math.floor(Math.sin(seed * 12.9898 + this.level * 78.233) * 43758.5453)) % colors.length;
    
    g.fillStyle(colors[colorIdx], 1);
    g.beginPath();
    
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const px = x + size * Math.cos(angle);
      const py = y + size * Math.sin(angle);
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    
    g.closePath();
    g.fillPath();
    
    g.lineStyle(1.5, 0x555555, 0.8);
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const px = x + size * Math.cos(angle);
      const py = y + size * Math.sin(angle);
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.closePath();
    g.strokePath();
    
    const hlSize = size * 0.4;
    g.fillStyle(0xcccccc, 0.3);
    g.fillCircle(x - hlSize * 0.3, y - hlSize * 0.3, hlSize * 0.5);
  }
  
  private drawClaw(): void {
    const g = this.clawGraphics;
    g.clear();
    
    if (this.clawProgress <= 0) return;
    
    g.save();
    g.rotate(this.chassisRoll);
    
    const baseX = 28 * this.roverScale;
    const baseY = 0;
    const totalSegs = this.SEGMENT_COUNT;
    const segsDrawn = Math.ceil(totalSegs * this.clawProgress);
    const partialSeg = (totalSegs * this.clawProgress) % 1;
    
    let currentX = baseX;
    let currentY = baseY;
    
    for (let i = 0; i < segsDrawn; i++) {
      const segLen = (i === segsDrawn - 1 && partialSeg > 0) 
        ? this.SEGMENT_LENGTH * partialSeg 
        : this.SEGMENT_LENGTH;
      
      const nextX = currentX + segLen;
      const nextY = currentY;
      
      g.lineStyle(3, 0x444444, 1);
      g.lineBetween(currentX, currentY, nextX, nextY);
      
      g.fillStyle(0x666666, 1);
      g.fillCircle(currentX, currentY, 3);
      
      currentX = nextX;
      currentY = nextY;
    }
    
    if (segsDrawn > 0 || partialSeg > 0.1) {
      const tipX = baseX + totalSegs * this.SEGMENT_LENGTH * this.clawProgress;
      
      g.lineStyle(2, 0xffd700, 1);
      g.lineBetween(tipX, 0, tipX + 8, -6);
      g.lineBetween(tipX, 0, tipX + 8, 6);
      g.lineBetween(tipX, 0, tipX + 10, 0);
      
      g.fillStyle(0xffd700, 0.8);
      g.fillCircle(tipX, 0, 4);
    }
    
    g.restore();
  }
  
  getSpeedMultiplier(): number {
    return this.currentSpeed / this.baseSpeed;
  }
}
