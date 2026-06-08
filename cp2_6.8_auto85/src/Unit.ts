import { HexGrid, HexCoord, Point } from './HexGrid';

export type Faction = 'red' | 'blue';
export type UnitClass = 'warrior' | 'archer' | 'mage';

export interface UnitStats {
  maxHP: number;
  attack: number;
  move: number;
  range: number;
  name: string;
  icon: string;
}

export const CLASS_STATS: Record<UnitClass, UnitStats> = {
  warrior: { maxHP: 6, attack: 3, move: 4, range: 1, name: '战士',   icon: '⚔️' },
  archer:  { maxHP: 4, attack: 4, move: 3, range: 3, name: '弓箭手', icon: '🏹' },
  mage:    { maxHP: 3, attack: 5, move: 2, range: 2, name: '法师',   icon: '🔮' }
};

export const FACTION_COLORS: Record<Faction, { main: string; light: string; dark: string }> = {
  red:  { main: '#E53E3E', light: '#FC8181', dark: '#9B2C2C' },
  blue: { main: '#3182CE', light: '#63B3ED', dark: '#2C5282' }
};

export class Unit {
  id: string;
  faction: Faction;
  unitClass: UnitClass;
  hp: number;
  maxHP: number;
  attack: number;
  move: number;
  range: number;
  position: HexCoord;
  alive: boolean;

  static nextId = 1;

  constructor(faction: Faction, unitClass: UnitClass, position: HexCoord) {
    this.id = `unit_${Unit.nextId++}`;
    this.faction = faction;
    this.unitClass = unitClass;
    const stats = CLASS_STATS[unitClass];
    this.maxHP = stats.maxHP;
    this.hp = stats.maxHP;
    this.attack = stats.attack;
    this.move = stats.move;
    this.range = stats.range;
    this.position = { ...position };
    this.alive = true;
  }

  getStats(): UnitStats {
    return CLASS_STATS[this.unitClass];
  }

  getName(): string {
    return CLASS_STATS[this.unitClass].name;
  }

  getIcon(): string {
    return CLASS_STATS[this.unitClass].icon;
  }

  getEffectiveAttack(grid: HexGrid): number {
    let atk = this.attack;
    const terrain = grid.getTerrainInfo(this.position);
    if (terrain.rangeBonus > 0 && (this.unitClass === 'archer' || this.unitClass === 'mage')) {
      atk += terrain.rangeBonus;
    }
    return atk;
  }

  getEffectiveDefense(grid: HexGrid): number {
    const terrain = grid.getTerrainInfo(this.position);
    return this.hp + terrain.defBonus;
  }

  getEffectiveRange(grid: HexGrid): number {
    let r = this.range;
    const terrain = grid.getTerrainInfo(this.position);
    if (terrain.rangeBonus > 0 && (this.unitClass === 'archer' || this.unitClass === 'mage')) {
      r += terrain.rangeBonus;
    }
    return r;
  }

  computeMoveRange(grid: HexGrid, allUnits: Unit[]): Set<string> {
    const result = new Set<string>();
    const visited = new Map<string, number>();
    const queue: { hex: HexCoord; cost: number }[] = [];

    const startKey = grid.hexKey(this.position);
    visited.set(startKey, 0);
    queue.push({ hex: this.position, cost: 0 });

    while (queue.length > 0) {
      const current = queue.shift()!;

      for (const neighbor of grid.getNeighbors(current.hex)) {
        if (!grid.isPassable(neighbor)) continue;

        const occupied = allUnits.some(u =>
          u.alive && u.id !== this.id && u.position.q === neighbor.q && u.position.r === neighbor.r
        );
        if (occupied) continue;

        const moveCost = grid.getTerrainInfo(neighbor).moveCost;
        const totalCost = current.cost + moveCost;
        if (totalCost > this.move) continue;

        const key = grid.hexKey(neighbor);
        if (!visited.has(key) || visited.get(key)! > totalCost) {
          visited.set(key, totalCost);
          result.add(key);
          queue.push({ hex: neighbor, cost: totalCost });
        }
      }
    }

    return result;
  }

  computeAttackRange(grid: HexGrid, fromPosition?: HexCoord): Set<string> {
    const result = new Set<string>();
    const pos = fromPosition || this.position;
    const effRange = this.getEffectiveRange(grid);

    for (let dq = -effRange; dq <= effRange; dq++) {
      for (let dr = -effRange; dr <= effRange; dr++) {
        const target = { q: pos.q + dq, r: pos.r + dr };
        if (!grid.isValid(target)) continue;
        const dist = grid.hexDistance(pos, target);
        if (dist > 0 && dist <= effRange) {
          result.add(grid.hexKey(target));
        }
      }
    }

    return result;
  }

  takeDamage(damage: number): boolean {
    this.hp = Math.max(0, this.hp - damage);
    if (this.hp <= 0) {
      this.alive = false;
      return true;
    }
    return false;
  }

  render(ctx: CanvasRenderingContext2D, grid: HexGrid, isSelected: boolean = false, isHighlighted: boolean = false, showMoveRange: boolean = false, allUnits: Unit[] = []): void {
    if (!this.alive) return;

    const center = grid.hexToPixel(this.position);
    const colors = FACTION_COLORS[this.faction];

    if (showMoveRange) {
      const moveRange = this.computeMoveRange(grid, allUnits);
      ctx.save();
      ctx.fillStyle = colors.light;
      ctx.globalAlpha = 0.3;
      moveRange.forEach(key => {
        const hex = grid.parseKey(key);
        const hc = grid.hexToPixel(hex);
        ctx.beginPath();
        ctx.arc(hc.x, hc.y, 15, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }

    if (isHighlighted) {
      ctx.save();
      ctx.strokeStyle = '#F6E05E';
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(center.x, center.y, 16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (isSelected) {
      ctx.save();
      ctx.strokeStyle = '#F6E05E';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(center.x, center.y, 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    const gradient = ctx.createRadialGradient(center.x - 3, center.y - 3, 2, center.x, center.y, 10);
    gradient.addColorStop(0, colors.light);
    gradient.addColorStop(1, colors.dark);

    ctx.beginPath();
    ctx.arc(center.x, center.y, 10, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = colors.main;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(this.getIcon(), center.x, center.y);

    const barW = 20;
    const barH = 3;
    const barX = center.x - barW / 2;
    const barY = center.y + 14;

    ctx.fillStyle = '#1A202C';
    ctx.fillRect(barX, barY, barW, barH);

    const hpRatio = this.hp / this.maxHP;
    const hpColor = hpRatio > 0.5 ? '#48BB78' : hpRatio > 0.25 ? '#D69E2E' : '#E53E3E';
    ctx.fillStyle = hpColor;
    ctx.fillRect(barX, barY, barW * hpRatio, barH);

    ctx.strokeStyle = '#4A5568';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(barX, barY, barW, barH);
  }

  renderGhost(ctx: CanvasRenderingContext2D, grid: HexGrid, position: HexCoord, valid: boolean): void {
    const center = grid.hexToPixel(position);
    const colors = FACTION_COLORS[this.faction];

    ctx.save();
    ctx.globalAlpha = valid ? 0.6 : 0.3;
    ctx.beginPath();
    ctx.arc(center.x, center.y, 10, 0, Math.PI * 2);
    ctx.fillStyle = valid ? colors.main : '#718096';
    ctx.fill();
    ctx.strokeStyle = valid ? '#F6E05E' : '#E53E3E';
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.globalAlpha = valid ? 0.9 : 0.5;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(this.getIcon(), center.x, center.y);
    ctx.restore();
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      faction: this.faction,
      unitClass: this.unitClass,
      hp: this.hp,
      maxHP: this.maxHP,
      attack: this.attack,
      move: this.move,
      range: this.range,
      position: this.position,
      alive: this.alive
    };
  }

  static fromJSON(data: Record<string, unknown>): Unit {
    const u = new Unit(
      (data.faction as Faction) || 'red',
      (data.unitClass as UnitClass) || 'warrior',
      (data.position as HexCoord) || { q: 0, r: 0 }
    );
    u.id = (data.id as string) || u.id;
    u.hp = (data.hp as number) ?? u.hp;
    u.maxHP = (data.maxHP as number) ?? u.maxHP;
    u.attack = (data.attack as number) ?? u.attack;
    u.move = (data.move as number) ?? u.move;
    u.range = (data.range as number) ?? u.range;
    u.alive = (data.alive as boolean) ?? true;
    Unit.nextId = Math.max(Unit.nextId, parseInt(u.id.split('_')[1] || '0') + 1);
    return u;
  }
}
