import Phaser from 'phaser';

export class Crystal extends Phaser.GameObjects.Container {
  private crystalGraphics: Phaser.GameObjects.Graphics;
  private glowGraphics: Phaser.GameObjects.Graphics;
  private collected: boolean = false;
  private beingAbsorbed: boolean = false;
  private absorbProgress: number = 0;
  private targetPos: Phaser.Math.Vector2 | null = null;
  
  private pulseTime: number = 0;
  private readonly PULSE_PERIOD: number = 1200;
  
  private baseSize: number = 14;
  private currentSize: number = 14;
  
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    
    this.crystalGraphics = new Phaser.GameObjects.Graphics(scene);
    this.glowGraphics = new Phaser.GameObjects.Graphics(scene);
    
    this.add(this.glowGraphics);
    this.add(this.crystalGraphics);
    
    this.draw();
    
    scene.add.existing(this);
  }
  
  isCollected(): boolean {
    return this.collected;
  }
  
  startAbsorption(targetX: number, targetY: number): void {
    if (this.beingAbsorbed || this.collected) return;
    this.beingAbsorbed = true;
    this.absorbProgress = 0;
    this.targetPos = new Phaser.Math.Vector2(targetX, targetY);
  }
  
  update(time: number, delta: number): void {
    this.pulseTime = (this.pulseTime + delta) % this.PULSE_PERIOD;
    
    const pulsePhase = this.pulseTime / this.PULSE_PERIOD;
    const pulseFactor = 0.85 + 0.15 * Math.sin(pulsePhase * Math.PI * 2);
    this.currentSize = this.baseSize * pulseFactor;
    
    if (this.beingAbsorbed && this.targetPos) {
      this.absorbProgress += delta / 400;
      const t = Math.min(this.absorbProgress, 1);
      const easeT = 1 - Math.pow(1 - t, 3);
      
      this.x = this.x + (this.targetPos.x - this.x) * easeT * 0.2;
      this.y = this.y + (this.targetPos.y - this.y) * easeT * 0.2;
      this.currentSize = this.baseSize * (1 - t * 0.8);
      this.alpha = 1 - t * 0.5;
      
      if (this.absorbProgress >= 1) {
        this.beingAbsorbed = false;
        this.collected = true;
        this.visible = false;
      }
    }
    
    this.draw();
  }
  
  private draw(): void {
    this.drawGlow();
    this.drawCrystal();
  }
  
  private drawGlow(): void {
    const g = this.glowGraphics;
    g.clear();
    
    const pulseAlpha = 0.3 + 0.3 * Math.sin((this.pulseTime / this.PULSE_PERIOD) * Math.PI * 2);
    const glowRadius = this.currentSize * 3;
    
    for (let i = 0; i < 8; i++) {
      const r = glowRadius * (1 - i * 0.08);
      const alpha = pulseAlpha * (0.3 - i * 0.03);
      const color = i < 4 ? 0x00ff7f : 0x00bfff;
      g.fillStyle(color, Math.max(0, alpha));
      g.fillCircle(0, 0, r);
    }
  }
  
  private drawCrystal(): void {
    const g = this.crystalGraphics;
    g.clear();
    
    const s = this.currentSize;
    
    const colorTop = Phaser.Display.Color.GetColor(0, 255, 127);
    const colorBottom = Phaser.Display.Color.GetColor(0, 191, 255);
    const colorEdge = Phaser.Display.Color.GetColor(200, 255, 255);
    const colorShade = Phaser.Display.Color.GetColor(0, 100, 180);
    
    const pulseT = this.pulseTime / this.PULSE_PERIOD;
    const colorMix = 0.5 + 0.5 * Math.sin(pulseT * Math.PI * 2);
    
    const frontTopColor = this.mixColor(colorTop, colorBottom, colorMix * 0.3);
    const frontBotColor = this.mixColor(colorBottom, colorTop, colorMix * 0.3);
    
    g.fillStyle(frontTopColor, 1);
    g.beginPath();
    g.moveTo(0, -s * 1.3);
    g.lineTo(s, 0);
    g.lineTo(-s, 0);
    g.closePath();
    g.fillPath();
    
    g.fillStyle(frontBotColor, 0.9);
    g.beginPath();
    g.moveTo(0, s * 1.3);
    g.lineTo(s, 0);
    g.lineTo(-s, 0);
    g.closePath();
    g.fillPath();
    
    g.fillStyle(colorShade, 0.6);
    g.beginPath();
    g.moveTo(0, -s * 1.3);
    g.lineTo(-s, 0);
    g.lineTo(0, s * 1.3);
    g.closePath();
    g.fillPath();
    
    g.fillStyle(colorTop, 0.7);
    g.beginPath();
    g.moveTo(0, -s * 1.3);
    g.lineTo(s * 0.3, -s * 0.2);
    g.lineTo(0, -s * 0.1);
    g.closePath();
    g.fillPath();
    
    g.lineStyle(1.5, colorEdge, 0.9);
    g.beginPath();
    g.moveTo(0, -s * 1.3);
    g.lineTo(s, 0);
    g.lineTo(0, s * 1.3);
    g.lineTo(-s, 0);
    g.closePath();
    g.strokePath();
    
    g.lineStyle(1, colorEdge, 0.7);
    g.beginPath();
    g.moveTo(-s, 0);
    g.lineTo(s, 0);
    g.strokePath();
    
    g.lineStyle(1, colorEdge, 0.5);
    g.beginPath();
    g.moveTo(0, -s * 1.3);
    g.lineTo(0, s * 1.3);
    g.strokePath();
    
    g.fillStyle(0xffffff, 0.5);
    g.fillEllipse(-s * 0.2, -s * 0.5, s * 0.2, s * 0.5);
  }
  
  private mixColor(c1: number, c2: number, t: number): number {
    const r1 = (c1 >> 16) & 0xff;
    const g1 = (c1 >> 8) & 0xff;
    const b1 = c1 & 0xff;
    const r2 = (c2 >> 16) & 0xff;
    const g2 = (c2 >> 8) & 0xff;
    const b2 = c2 & 0xff;
    
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    
    return (r << 16) | (g << 8) | b;
  }
  
  getRadius(): number {
    return this.baseSize;
  }
}
