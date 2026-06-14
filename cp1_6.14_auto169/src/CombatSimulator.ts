import type {
  Building,
  CombatEvent,
  CombatResult,
  Unit,
} from './types';
import { BARRACKS_UPGRADE_COST } from './types';
import { eventBus } from './eventBus';
import { MapEngine } from './MapEngine';

export class CombatSimulator {
  constructor(private mapEngine: MapEngine) {}

  calculateDamage(
    attacker: { attack: number },
    defender: { defense: number }
  ): number {
    const base = attacker.attack;
    const mitigated = Math.max(1, base - defender.defense);
    const variance = Math.random() * 0.4 + 0.8;
    return Math.max(1, Math.floor(mitigated * variance));
  }

  resolveCombat(event: CombatEvent): CombatResult {
    const attacker = this.resolveEntity(event.attackerId, event.attackerType);
    const defender = this.resolveEntity(event.defenderId, event.defenderType);

    if (!attacker || !defender) {
      return {
        attackerHp: attacker ? ('hp' in attacker ? attacker.hp : 0) : 0,
        defenderHp: defender ? ('hp' in defender ? defender.hp : 0) : 0,
        attackerDestroyed: !attacker,
        defenderDestroyed: !defender,
        territoryChanged: false,
        newOwner: null,
      };
    }

    const attackerHpBefore = (attacker as Unit | Building).hp;
    const defenderHpBefore = (defender as Unit | Building).hp;

    const dmgToDefender = this.calculateDamage(attacker, defender);
    (defender as Unit | Building).hp -= dmgToDefender;

    const dmgToAttacker = this.calculateDamage(defender, attacker);
    (attacker as Unit | Building).hp -= dmgToAttacker;

    const attackerDestroyed = (attacker as Unit | Building).hp <= 0;
    const defenderDestroyed = (defender as Unit | Building).hp <= 0;
    let territoryChanged = false;
    let newOwner: string | null = null;

    if (defenderDestroyed) {
      if (event.defenderType === 'unit') {
        this.mapEngine.removeUnit(event.defenderId);
        eventBus.emit('log:add', {
          message: `单位被消灭`,
          type: 'battle',
        });
      } else if (event.defenderType === 'building') {
        const b = defender as Building;
        const pos = this.mapEngine.getBuildingPosition(event.defenderId);
        if (b.owner !== 'neutral' && pos) {
          this.mapEngine.removeBuilding(pos.x, pos.y);
          eventBus.emit('log:add', {
            message: `(${pos.x},${pos.y})处建筑被摧毁`,
            type: 'battle',
          });
          if (event.attackerType === 'unit') {
            const attackerUnit = attacker as Unit;
            this.mapEngine.setCellOwner(pos.x, pos.y, attackerUnit.owner);
            territoryChanged = true;
            newOwner = attackerUnit.owner;
          }
        }
      }
    }

    if (attackerDestroyed) {
      if (event.attackerType === 'unit') {
        this.mapEngine.removeUnit(event.attackerId);
      }
    }

    eventBus.emit('combat:result', {
      attackerHp: (attacker as Unit | Building).hp,
      defenderHp: (defender as Unit | Building).hp,
      attackerDestroyed,
      defenderDestroyed,
      territoryChanged,
      newOwner: newOwner as CombatResult['newOwner'],
      x: event.x,
      y: event.y,
    });

    void attackerHpBefore;
    void defenderHpBefore;

    return {
      attackerHp: (attacker as Unit | Building).hp,
      defenderHp: (defender as Unit | Building).hp,
      attackerDestroyed,
      defenderDestroyed,
      territoryChanged,
      newOwner: newOwner as CombatResult['newOwner'],
    };
  }

  private resolveEntity(id: string, type: 'unit' | 'building'): { attack: number; defense: number; hp: number } | null {
    if (type === 'unit') {
      return this.mapEngine.getUnitById(id) as Unit | null;
    }
    return this.mapEngine.getBuildingById(id) as Building | null;
  }

  resolveAllCombatEvents(events: CombatEvent[]): void {
    for (const ev of events) {
      this.resolveCombat(ev);
    }
  }

  canUpgrade(building: Building): boolean {
    return building.type === 'barracks' && building.level < 2;
  }

  getUpgradeCost(_building: Building): number {
    return BARRACKS_UPGRADE_COST;
  }

  upgradeBuilding(
    building: Building,
    availableResources: number,
    x: number,
    y: number
  ): { success: boolean; cost: number; message?: string } {
    const cost = this.getUpgradeCost(building);
    if (!this.canUpgrade(building)) {
      return { success: false, cost: 0, message: '无法升级该建筑' };
    }
    if (availableResources < cost) {
      return { success: false, cost: 0, message: `资源不足（需要${cost}）` };
    }
    const result = this.mapEngine.upgradeBarracks(x, y);
    if (!result.ok) {
      return { success: false, cost: 0, message: result.reason };
    }
    return { success: true, cost, message: '升级成功！兵营生产间隔缩短至6秒' };
  }
}
