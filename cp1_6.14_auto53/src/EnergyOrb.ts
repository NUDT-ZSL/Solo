export type EnergyOrbType = 'heal' | 'shield' | 'speed' | 'missile';

const ORB_COLORS: Record<EnergyOrbType, string> = {
  heal: '#4ade80',
  shield: '#60a5fa',
  speed: '#fb923c',
  missile: '#ef4444',
};

const ORB_RADIUS = 12;

export class EnergyOrb {
  x: number;
  y: number;
  type: EnergyOrbType;
  sides: number;
  radius: number = ORB_RADIUS;
  rotation: number = 0;
  alive: boolean = true;
  color: string;

  constructor(x: number, y: number, type: EnergyOrbType) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.color = ORB_COLORS[type];
    this.sides = 4 + Math.floor(Math.random() * 5);
  }

  update(dt: number) {
    this.rotation += dt * 2;
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (!this.alive) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    ctx.shadowColor = this.color;
    ctx.shadowBlur = 12;

    ctx.beginPath();
    for (let i = 0; i < this.sides; i++) {
      const a = (Math.PI * 2 * i) / this.sides;
      const px = Math.cos(a) * this.radius;
      const py = Math.sin(a) * this.radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();

    ctx.fillStyle = this.color + '40';
    ctx.fill();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.shadowBlur = 0;

    ctx.fillStyle = this.color;
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const symbols: Record<EnergyOrbType, string> = {
      heal: '+',
      shield: 'S',
      speed: '>',
      missile: 'M',
    };
    ctx.fillText(symbols[this.type], 0, 1);

    ctx.restore();
  }

  checkCollision(shipX: number, shipY: number, shipRadius: number): boolean {
    const dx = this.x - shipX;
    const dy = this.y - shipY;
    return dx * dx + dy * dy < (this.radius + shipRadius) * (this.radius + shipRadius);
  }

  static randomType(): EnergyOrbType {
    const types: EnergyOrbType[] = ['heal', 'shield', 'speed', 'missile'];
    return types[Math.floor(Math.random() * types.length)];
  }

  static spawnInBounds(left: number, top: number, right: number, bottom: number): EnergyOrb {
    const margin = 30;
    const x = left + margin + Math.random() * (right - left - margin * 2);
    const y = top + margin + Math.random() * (bottom - top - margin * 2);
    return new EnergyOrb(x, y, EnergyOrb.randomType());
  }
}
