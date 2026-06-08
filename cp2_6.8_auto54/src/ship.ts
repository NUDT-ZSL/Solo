export type ResourceType = 'power' | 'oxygen' | 'fuel';
export type SubsystemType = 'life' | 'engine' | 'weapon';

export interface Allocation {
  power: number;
  oxygen: number;
  fuel: number;
}

export interface ShipState {
  resources: {
    power: number;
    oxygen: number;
    fuel: number;
  };
  subsystems: {
    life: number;
    engine: number;
    weapon: number;
  };
  allocation: Allocation;
}

const MAX_RESOURCE = 200;
const MAX_SUBSYSTEM = 100;
const BASE_CONSUMPTION_PER_SEC = { power: 1.2, oxygen: 1.0, fuel: 0.8 };
const REPAIR_RATE_PER_SEC = 1.5;
const DEGRADATION_RATE_PER_SEC = 0.8;

export class Ship {
  public state: ShipState;

  constructor() {
    this.state = {
      resources: {
        power: MAX_RESOURCE,
        oxygen: MAX_RESOURCE,
        fuel: MAX_RESOURCE
      },
      subsystems: {
        life: MAX_SUBSYSTEM,
        engine: MAX_SUBSYSTEM,
        weapon: MAX_SUBSYSTEM
      },
      allocation: {
        power: 34,
        oxygen: 33,
        fuel: 33
      }
    };
  }

  public setAllocation(resource: ResourceType, value: number): void {
    value = Math.max(0, Math.min(100, value));
    const others: ResourceType[] = (['power', 'oxygen', 'fuel'] as ResourceType[]).filter(r => r !== resource);
    const remaining = 100 - value;
    const otherTotal = this.state.allocation[others[0]] + this.state.allocation[others[1]];

    if (otherTotal <= 0) {
      this.state.allocation[others[0]] = remaining / 2;
      this.state.allocation[others[1]] = remaining / 2;
    } else {
      const ratio = this.state.allocation[others[0]] / otherTotal;
      this.state.allocation[others[0]] = remaining * ratio;
      this.state.allocation[others[1]] = remaining * (1 - ratio);
    }
    this.state.allocation[resource] = value;
  }

  public applyAllocation(dt: number): void {
    const { allocation, resources, subsystems } = this.state;

    (['power', 'oxygen', 'fuel'] as ResourceType[]).forEach(r => {
      const consumption = BASE_CONSUMPTION_PER_SEC[r] * (allocation[r] / 100) * dt;
      resources[r] = Math.max(0, resources[r] - consumption);
    });

    const resourceFactor = Math.min(
      resources.power / MAX_RESOURCE,
      resources.oxygen / MAX_RESOURCE,
      resources.fuel / MAX_RESOURCE
    );

    (['life', 'engine', 'weapon'] as SubsystemType[]).forEach((s, i) => {
      const resourceKeys: ResourceType[] = ['oxygen', 'fuel', 'power'];
      const allocKey = resourceKeys[i];
      const allocRatio = allocation[allocKey] / 100;

      if (resourceFactor > 0.1 && allocRatio > 0.1) {
        const effectiveRepair = REPAIR_RATE_PER_SEC * allocRatio * resourceFactor * dt;
        subsystems[s] = Math.min(MAX_SUBSYSTEM, subsystems[s] + effectiveRepair);
      } else {
        const degradation = DEGRADATION_RATE_PER_SEC * (1 - allocRatio) * (1 - resourceFactor) * dt;
        subsystems[s] = Math.max(0, subsystems[s] - degradation);
      }
    });
  }

  public damageSubsystem(subsystem: SubsystemType, amount: number): void {
    this.state.subsystems[subsystem] = Math.max(0, this.state.subsystems[subsystem] - amount);
  }

  public isAllSystemsDead(): boolean {
    const { subsystems } = this.state;
    return subsystems.life <= 0 && subsystems.engine <= 0 && subsystems.weapon <= 0;
  }
}
