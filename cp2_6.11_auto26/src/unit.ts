export type Team = 'red' | 'blue';
export type UnitType = 'king' | 'knight' | 'archer';

export interface Position {
  x: number;
  y: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  glow?: boolean;
}

export interface DamageNumber {
  x: number;
  y: number;
  value: number;
  life: number;
  maxLife: number;
  vy: number;
}

export const UNIT_STATS: Record<UnitType, {
  hp: number;
  attack: number;
  moveRange: number;
  attackRange: number;
  skillName: string;
}> = {
  king: {
    hp: 15,
    attack: 3,
    moveRange: 1,
    attackRange: 1,
    skillName: '暗影庇护',
  },
  knight: {
    hp: 10,
    attack: 5,
    moveRange: 1,
    attackRange: 1,
    skillName: '突袭冲锋',
  },
  archer: {
    hp: 8,
    attack: 4,
    moveRange: 1,
    attackRange: 2,
    skillName: '贯穿之箭',
  },
};

export const TEAM_COLORS: Record<Team, string> = {
  red: '#E94560',
  blue: '#4A90D9',
};

let unitIdCounter = 0;

export class Unit {
  public id: string;
  public type: UnitType;
  public team: Team;
  public hp: number;
  public maxHp: number;
  public attack: number;
  public moveRange: number;
  public attackRange: number;
  public position: Position;
  public energy: number = 0;
  public shield: number = 0;
  public shieldTurns: number = 0;
  public skillCooldown: number = 0;
  public isAlive: boolean = true;
  public hasMoved: boolean = false;
  public hasAttacked: boolean = false;

  constructor(type: UnitType, team: Team, position: Position) {
    this.id = `unit_${++unitIdCounter}`;
    this.type = type;
    this.team = team;
    const stats = UNIT_STATS[type];
    this.maxHp = stats.hp;
    this.hp = stats.hp;
    this.attack = stats.attack;
    this.moveRange = stats.moveRange;
    this.attackRange = stats.attackRange;
    this.position = { ...position };
  }

  takeDamage(damage: number): number {
    let actualDamage = damage;
    if (this.shield > 0) {
      const absorbed = Math.min(this.shield, damage);
      this.shield -= absorbed;
      actualDamage -= absorbed;
    }
    this.hp = Math.max(0, this.hp - actualDamage);
    this.addEnergy(10);
    if (this.hp <= 0) {
      this.isAlive = false;
    }
    return actualDamage;
  }

  addEnergy(amount: number): void {
    this.energy = Math.min(100, this.energy + amount);
  }

  canUseSkill(): boolean {
    return this.energy >= 100 && this.skillCooldown <= 0;
  }

  useSkill(): void {
    if (this.canUseSkill()) {
      this.energy = 0;
    }
  }

  getColor(): string {
    return TEAM_COLORS[this.team];
  }
}

export function createExplosionParticles(
  x: number,
  y: number,
  color: string,
  count: number = 12
): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const speed = 1 + Math.random() * 2;
    const radius = 30;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color,
      size: 2 + Math.random() * 3,
      life: 0.4,
      maxLife: 0.4,
      glow: true,
    });
    void radius;
  }
  return particles;
}

export function createDeathParticles(
  x: number,
  y: number,
  color: string
): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < 20; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.5 + Math.random() * 3;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1,
      color,
      size: 2 + Math.random() * 4,
      life: 0.6,
      maxLife: 0.6,
      glow: false,
    });
  }
  return particles;
}

export function createDamageNumber(
  x: number,
  y: number,
  value: number
): DamageNumber {
  return {
    x,
    y,
    value,
    life: 0.2,
    maxLife: 0.2,
    vy: -1.5,
  };
}

export function updateParticles(particles: Particle[], deltaTime: number): void {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * deltaTime * 60;
    p.y += p.vy * deltaTime * 60;
    p.vy += 0.05 * deltaTime * 60;
    p.life -= deltaTime;
    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

export function updateDamageNumbers(
  numbers: DamageNumber[],
  deltaTime: number
): void {
  for (let i = numbers.length - 1; i >= 0; i--) {
    const n = numbers[i];
    n.y += n.vy * deltaTime * 60;
    n.life -= deltaTime;
    if (n.life <= 0) {
      numbers.splice(i, 1);
    }
  }
}

export function drawUnit(
  ctx: CanvasRenderingContext2D,
  unit: Unit,
  cellSize: number,
  pixelX: number,
  pixelY: number,
  time: number,
  hovered: boolean = false,
  selected: boolean = false,
  canAct: boolean = false,
  scale: number = 1
): void {
  const radius = (cellSize * 0.38) * scale;
  const centerX = pixelX + cellSize / 2;
  const centerY = pixelY + cellSize / 2;

  if (canAct && !hovered) {
    const pulseScale = 1 + 0.15 * Math.sin(time * 0.008 * Math.PI * 2);
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * pulseScale * 1.3, 0, Math.PI * 2);
    const pulseAlpha = 0.3 * (0.5 + 0.5 * Math.sin(time * 0.008 * Math.PI * 2));
    ctx.strokeStyle = `rgba(255, 215, 0, ${pulseAlpha})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  if (hovered) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 1.15 + 5, 0, Math.PI * 2);
    const glowGradient = ctx.createRadialGradient(
      centerX, centerY, radius * 1.15,
      centerX, centerY, radius * 1.15 + 8
    );
    glowGradient.addColorStop(0, 'rgba(100, 180, 255, 0.3)');
    glowGradient.addColorStop(1, 'rgba(100, 180, 255, 0)');
    ctx.fillStyle = glowGradient;
    ctx.fill();
    ctx.restore();
  }

  if (selected) {
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 1.25, 0, Math.PI * 2);
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  const drawRadius = hovered ? radius * 1.15 : radius;

  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, drawRadius, 0, Math.PI * 2);
  const baseColor = unit.getColor();
  const gradient = ctx.createRadialGradient(
    centerX - drawRadius * 0.3,
    centerY - drawRadius * 0.3,
    0,
    centerX,
    centerY,
    drawRadius
  );
  gradient.addColorStop(0, lightenColor(baseColor, 30));
  gradient.addColorStop(1, darkenColor(baseColor, 30));
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 2;
  ctx.stroke();

  if (unit.shield > 0) {
    ctx.beginPath();
    ctx.arc(centerX, centerY, drawRadius * 1.15, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(100, 200, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${drawRadius * 0.9}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  let symbol = '';
  switch (unit.type) {
    case 'king':
      symbol = '♔';
      break;
    case 'knight':
      symbol = '♞';
      break;
    case 'archer':
      symbol = '🏹';
      ctx.font = `${drawRadius * 0.75}px Arial`;
      break;
  }
  ctx.fillText(symbol, centerX, centerY + 2);

  const barWidth = drawRadius * 1.8;
  const barHeight = 4;
  const barX = centerX - barWidth / 2;
  const barY = centerY + drawRadius + 8;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(barX, barY, barWidth, barHeight);

  const hpPercent = unit.hp / unit.maxHp;
  const hpColor = hpPercent > 0.5 ? '#4CAF50' : hpPercent > 0.25 ? '#FFC107' : '#F44336';
  ctx.fillStyle = hpColor;
  ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);

  const energyBarY = barY + barHeight + 2;
  ctx.fillStyle = 'rgba(60, 60, 80, 0.8)';
  ctx.fillRect(barX, energyBarY, barWidth, 3);

  if (unit.energy > 0) {
    const energyPercent = unit.energy / 100;
    const energyGradient = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
    energyGradient.addColorStop(0, '#555577');
    energyGradient.addColorStop(1, unit.getColor());
    ctx.fillStyle = energyGradient;
    ctx.fillRect(barX, energyBarY, barWidth * energyPercent, 3);
  }

  if (unit.canUseSkill()) {
    ctx.beginPath();
    ctx.arc(centerX + drawRadius * 0.9, centerY - drawRadius * 0.9, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#FFD700';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  ctx.restore();
}

export function drawParticles(
  ctx: CanvasRenderingContext2D,
  particles: Particle[]
): void {
  for (const p of particles) {
    const alpha = p.life / p.maxLife;
    ctx.save();
    if (p.glow) {
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;
    }
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    ctx.restore();
  }
}

export function drawDamageNumbers(
  ctx: CanvasRenderingContext2D,
  numbers: DamageNumber[]
): void {
  for (const n of numbers) {
    const alpha = n.life / n.maxLife;
    const shakeX = n.life > 0 ? (Math.random() - 0.5) * 3 : 0;
    const shakeY = n.life > 0 ? (Math.random() - 0.5) * 3 : 0;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFD700';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.strokeText(`-${n.value}`, n.x + shakeX, n.y + shakeY);
    ctx.fillText(`-${n.value}`, n.x + shakeX, n.y + shakeY);
    ctx.restore();
  }
}

function lightenColor(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
  const B = Math.min(255, (num & 0x0000ff) + amt);
  return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
}

function darkenColor(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, (num >> 16) - amt);
  const G = Math.max(0, ((num >> 8) & 0x00ff) - amt);
  const B = Math.max(0, (num & 0x0000ff) - amt);
  return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
}
