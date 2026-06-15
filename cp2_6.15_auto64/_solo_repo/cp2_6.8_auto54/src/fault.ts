import type { Allocation, SubsystemType } from './ship';

export type FaultType = 'pipe_leak' | 'energy_overload' | 'circuit_short';

export interface FaultStep {
  description: string;
  check: (allocation: Allocation) => boolean;
  completed: boolean;
}

export interface Fault {
  id: string;
  type: FaultType;
  name: string;
  description: string;
  targetSubsystem: SubsystemType;
  steps: FaultStep[];
  currentStep: number;
  timeRemaining: number;
  totalTime: number;
  appearTime: number;
  closing: boolean;
  closeStartTime: number;
}

const FAULT_TEMPLATES: Array<{
  type: FaultType;
  name: string;
  description: string;
  targetSubsystem: SubsystemType;
  generateSteps: () => FaultStep[];
}> = [
  {
    type: 'pipe_leak',
    name: '管道泄漏',
    description: '氧气管道出现裂缝，需要调整资源分配进行紧急修复！',
    targetSubsystem: 'life',
    generateSteps: () => {
      const steps: FaultStep[] = [
        {
          description: '将氧气分配至40%以上',
          check: (a) => a.oxygen >= 40,
          completed: false
        }
      ];
      if (Math.random() > 0.5) {
        steps.push({
          description: '将电力分配至30%以上',
          check: (a) => a.power >= 30,
          completed: false
        });
      }
      return steps;
    }
  },
  {
    type: 'energy_overload',
    name: '能源过载',
    description: '引擎反应堆超载，需要重新分配能源以稳定输出！',
    targetSubsystem: 'engine',
    generateSteps: () => {
      const steps: FaultStep[] = [
        {
          description: '将燃料分配至50%以上',
          check: (a) => a.fuel >= 50,
          completed: false
        },
        {
          description: '将电力控制在60%以下',
          check: (a) => a.power <= 60,
          completed: false
        }
      ];
      if (Math.random() > 0.6) {
        steps.push({
          description: '将氧气分配至20%以上',
          check: (a) => a.oxygen >= 20,
          completed: false
        });
      }
      return steps;
    }
  },
  {
    type: 'circuit_short',
    name: '电路短路',
    description: '武器系统电路短路，需要紧急调整电力分配！',
    targetSubsystem: 'weapon',
    generateSteps: () => {
      const steps: FaultStep[] = [
        {
          description: '将电力分配至60%以上',
          check: (a) => a.power >= 60,
          completed: false
        }
      ];
      if (Math.random() > 0.4) {
        steps.push({
          description: '将燃料控制在40%以下',
          check: (a) => a.fuel <= 40,
          completed: false
        });
      }
      return steps;
    }
  }
];

export class FaultSystem {
  public faults: Fault[] = [];
  private nextFaultTime: number;
  private elapsed: number = 0;
  private currentTime: number = 0;
  private faultIdCounter: number = 0;

  constructor() {
    this.nextFaultTime = this.randomBetween(10, 20);
  }

  public update(dt: number, allocation: Allocation, currentTime: number): {
    resolved: Fault[];
    failed: Fault[];
  } {
    this.currentTime = currentTime;
    this.elapsed += dt;
    const resolved: Fault[] = [];
    const failed: Fault[] = [];

    if (this.faults.length < 2 && this.elapsed >= this.nextFaultTime) {
      this.generateFault();
      this.elapsed = 0;
      this.nextFaultTime = this.randomBetween(10, 20);
    }

    for (let i = this.faults.length - 1; i >= 0; i--) {
      const fault = this.faults[i];

      if (fault.closing) {
        if (currentTime - fault.closeStartTime > 0.2) {
          this.faults.splice(i, 1);
        }
        continue;
      }

      fault.timeRemaining -= dt;

      if (fault.currentStep < fault.steps.length) {
        const step = fault.steps[fault.currentStep];
        if (!step.completed && step.check(allocation)) {
          step.completed = true;
          fault.currentStep++;
        }
      }

      if (fault.currentStep >= fault.steps.length) {
        fault.closing = true;
        fault.closeStartTime = currentTime;
        resolved.push(fault);
        continue;
      }

      if (fault.timeRemaining <= 0) {
        fault.closing = true;
        fault.closeStartTime = currentTime;
        failed.push(fault);
      }
    }

    return { resolved, failed };
  }

  private generateFault(): void {
    const template = FAULT_TEMPLATES[Math.floor(Math.random() * FAULT_TEMPLATES.length)];
    const fault: Fault = {
      id: `fault_${++this.faultIdCounter}`,
      type: template.type,
      name: template.name,
      description: template.description,
      targetSubsystem: template.targetSubsystem,
      steps: template.generateSteps(),
      currentStep: 0,
      timeRemaining: 15,
      totalTime: 15,
      appearTime: this.currentTime,
      closing: false,
      closeStartTime: 0
    };
    this.faults.push(fault);
  }

  private randomBetween(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }
}
