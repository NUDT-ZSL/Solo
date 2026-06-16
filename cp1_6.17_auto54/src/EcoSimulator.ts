export interface SpeciesState {
  algae: number;
  daphnia: number;
  snail: number;
}

export interface ResourceState {
  nutrients: number;
  dissolvedOxygen: number;
}

export interface EnvironmentParams {
  lightIntensity: number;
  waterExchangeRate: number;
  feedingAmount: number;
  cleaningFrequency: number;
}

export interface WarningEvent {
  id: string;
  type: 'oxygen' | 'nutrients' | 'algae' | 'daphnia' | 'snail';
  message: string;
  suggestion: string;
  timestamp: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: number;
}

export interface SimHistoryItem {
  species: SpeciesState;
  resources: ResourceState;
  timeStep: number;
}

export const WARNING_THRESHOLDS = {
  dissolvedOxygen: { danger: 2, warning: 4 },
  nutrients: { danger: 1, warning: 3 },
};

export const GREEN_ZONE = {
  dissolvedOxygen: { min: 5, max: 12 },
  nutrients: { min: 3, max: 10 },
};

const INITIAL_SPECIES: SpeciesState = {
  algae: 50,
  daphnia: 20,
  snail: 8,
};

const INITIAL_RESOURCES: ResourceState = {
  nutrients: 8,
  dissolvedOxygen: 8,
};

const SPECIES_CONFIG = {
  algae: {
    baseGrowthRate: 0.15,
    metabolicRate: 0.02,
    oxygenProductionRate: 0.08,
    nutrientConsumptionRate: 0.05,
    carryingCapacityBase: 200,
  },
  daphnia: {
    baseGrowthRate: 0.08,
    metabolicRate: 0.04,
    oxygenConsumptionRate: 0.03,
    nutrientProductionRate: 0.02,
    algaeConsumptionRate: 0.15,
    carryingCapacityBase: 80,
  },
  snail: {
    baseGrowthRate: 0.04,
    metabolicRate: 0.03,
    oxygenConsumptionRate: 0.02,
    nutrientProductionRate: 0.03,
    algaeConsumptionRate: 0.08,
    carryingCapacityBase: 30,
  },
};

export class EcoSimulator {
  private species: SpeciesState;
  private resources: ResourceState;
  private environment: EnvironmentParams;
  private history: SimHistoryItem[] = [];
  private warnings: WarningEvent[] = [];
  private achievements: Achievement[] = [];
  private timeStep: number = 0;
  private steadyStateCounter: number = 0;
  private maxHistoryLength: number = 50;
  private listeners: Set<() => void> = new Set();
  private warningIds: Set<string> = new Set();

  private achievementDefs: Omit<Achievement, 'unlockedAt'>[] = [
    {
      id: 'eco-master',
      name: '生态大师',
      description: '连续10个时间步长维持生态系统稳态',
      icon: 'master',
    },
    {
      id: 'first-day',
      name: '初次尝试',
      description: '完成第一个时间步长',
      icon: 'first',
    },
    {
      id: 'survivor',
      name: '生命顽强',
      description: '所有物种存活超过30个时间步长',
      icon: 'survivor',
    },
  ];

  constructor() {
    this.species = { ...INITIAL_SPECIES };
    this.resources = { ...INITIAL_RESOURCES };
    this.environment = {
      lightIntensity: 50,
      waterExchangeRate: 30,
      feedingAmount: 20,
      cleaningFrequency: 1,
    };
    this.pushHistory();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((l) => l());
  }

  getSpecies(): SpeciesState {
    return { ...this.species };
  }

  getResources(): ResourceState {
    return { ...this.resources };
  }

  getEnvironment(): EnvironmentParams {
    return { ...this.environment };
  }

  getHistory(): SimHistoryItem[] {
    return [...this.history];
  }

  getWarnings(): WarningEvent[] {
    return [...this.warnings];
  }

  getAchievements(): Achievement[] {
    return [...this.achievements];
  }

  getTimeStep(): number {
    return this.timeStep;
  }

  setEnvironment(params: Partial<EnvironmentParams>): void {
    this.environment = { ...this.environment, ...params };
    this.notifyListeners();
  }

  step(): void {
    this.timeStep++;

    const env = this.environment;
    const lightFactor = env.lightIntensity / 100;
    const exchangeFactor = env.waterExchangeRate / 100;
    const feedingFactor = env.feedingAmount / 100;
    const cleaningFactor = env.cleaningFrequency / 5;

    const algaeConfig = SPECIES_CONFIG.algae;
    const daphniaConfig = SPECIES_CONFIG.daphnia;
    const snailConfig = SPECIES_CONFIG.snail;

    const oxygenFromPlants = algaeConfig.oxygenProductionRate * this.species.algae * lightFactor;
    const oxygenConsumption =
      daphniaConfig.oxygenConsumptionRate * this.species.daphnia +
      snailConfig.oxygenConsumptionRate * this.species.snail +
      algaeConfig.metabolicRate * this.species.algae * 0.1;

    const oxygenFromExchange = exchangeFactor * 3;
    const oxygenDecay = 0.01;

    let dOxygen =
      oxygenFromPlants - oxygenConsumption + oxygenFromExchange - oxygenDecay * this.resources.dissolvedOxygen;

    const nutrientFromFeeding = feedingFactor * 2;
    const nutrientFromWaste =
      daphniaConfig.nutrientProductionRate * this.species.daphnia +
      snailConfig.nutrientProductionRate * this.species.snail;
    const nutrientConsumption = algaeConfig.nutrientConsumptionRate * this.species.algae;
    const nutrientRemoval = cleaningFactor * 1.5 + exchangeFactor * 0.8;
    const nutrientDecay = 0.005;

    let dNutrients =
      nutrientFromFeeding + nutrientFromWaste - nutrientConsumption - nutrientRemoval - nutrientDecay * this.resources.nutrients;

    const algaeCarryingCapacity =
      algaeConfig.carryingCapacityBase *
      Math.min(1, this.resources.nutrients / 5) *
      Math.min(1, 0.3 + lightFactor * 0.7);

    const algaeGrowthRate =
      algaeConfig.baseGrowthRate *
      Math.min(1, this.resources.nutrients / 4) *
      Math.min(1, 0.2 + lightFactor * 0.8);
    const algaeMortality = algaeConfig.metabolicRate * (1 - Math.min(1, this.resources.dissolvedOxygen / 6) * 0.5);

    const dAlgaeLogistic =
      algaeGrowthRate * this.species.algae * (1 - this.species.algae / Math.max(1, algaeCarryingCapacity));
    const algaeEaten =
      daphniaConfig.algaeConsumptionRate * this.species.daphnia +
      snailConfig.algaeConsumptionRate * this.species.snail;
    let dAlgae = dAlgaeLogistic - algaeEaten - algaeMortality * this.species.algae;

    const daphniaFoodFactor = Math.min(1, this.species.algae / 30);
    const daphniaOxygenFactor = Math.min(1, this.resources.dissolvedOxygen / 4);
    const daphniaCarryingCapacity = daphniaConfig.carryingCapacityBase * daphniaFoodFactor;
    const daphniaGrowthRate = daphniaConfig.baseGrowthRate * daphniaFoodFactor * daphniaOxygenFactor;
    const daphniaMortality = daphniaConfig.metabolicRate * (1 - daphniaOxygenFactor * 0.6);

    let dDaphnia =
      daphniaGrowthRate * this.species.daphnia * (1 - this.species.daphnia / Math.max(1, daphniaCarryingCapacity)) -
      daphniaMortality * this.species.daphnia;

    const snailFoodFactor = Math.min(1, this.species.algae / 20);
    const snailOxygenFactor = Math.min(1, this.resources.dissolvedOxygen / 3);
    const snailCarryingCapacity = snailConfig.carryingCapacityBase * snailFoodFactor;
    const snailGrowthRate = snailConfig.baseGrowthRate * snailFoodFactor * snailOxygenFactor;
    const snailMortality = snailConfig.metabolicRate * (1 - snailOxygenFactor * 0.5);

    let dSnail =
      snailGrowthRate * this.species.snail * (1 - this.species.snail / Math.max(1, snailCarryingCapacity)) -
      snailMortality * this.species.snail;

    this.species.algae = Math.max(0, this.species.algae + dAlgae);
    this.species.daphnia = Math.max(0, this.species.daphnia + dDaphnia);
    this.species.snail = Math.max(0, this.species.snail + dSnail);

    this.resources.dissolvedOxygen = Math.max(0, Math.min(20, this.resources.dissolvedOxygen + dOxygen));
    this.resources.nutrients = Math.max(0, Math.min(20, this.resources.nutrients + dNutrients));

    this.checkWarnings();
    this.checkSteadyState();
    this.checkAchievements();
    this.pushHistory();
    this.notifyListeners();
  }

  private pushHistory(): void {
    this.history.push({
      species: { ...this.species },
      resources: { ...this.resources },
      timeStep: this.timeStep,
    });
    if (this.history.length > this.maxHistoryLength) {
      this.history.shift();
    }
  }

  private checkWarnings(): void {
    const newWarnings: WarningEvent[] = [];
    const newWarningIds = new Set<string>();

    if (this.resources.dissolvedOxygen < WARNING_THRESHOLDS.dissolvedOxygen.danger) {
      const w: WarningEvent = {
        id: 'oxygen-danger',
        type: 'oxygen',
        message: '溶氧量严重不足！',
        suggestion: '增加水交换率，减少生物数量',
        timestamp: this.timeStep,
      };
      newWarnings.push(w);
      newWarningIds.add(w.id);
    } else if (this.resources.dissolvedOxygen < WARNING_THRESHOLDS.dissolvedOxygen.warning) {
      const w: WarningEvent = {
        id: 'oxygen-warning',
        type: 'oxygen',
        message: '溶氧量偏低',
        suggestion: '适当增加光照或水交换率',
        timestamp: this.timeStep,
      };
      newWarnings.push(w);
      newWarningIds.add(w.id);
    }

    if (this.resources.nutrients < WARNING_THRESHOLDS.nutrients.danger) {
      const w: WarningEvent = {
        id: 'nutrients-danger',
        type: 'nutrients',
        message: '养分严重匮乏！',
        suggestion: '增加投喂量，减少清洁频率',
        timestamp: this.timeStep,
      };
      newWarnings.push(w);
      newWarningIds.add(w.id);
    } else if (this.resources.nutrients < WARNING_THRESHOLDS.nutrients.warning) {
      const w: WarningEvent = {
        id: 'nutrients-warning',
        type: 'nutrients',
        message: '养分偏低',
        suggestion: '适当增加投喂量',
        timestamp: this.timeStep,
      };
      newWarnings.push(w);
      newWarningIds.add(w.id);
    }

    if (this.species.algae <= 1 && this.timeStep > 5) {
      const w: WarningEvent = {
        id: 'algae-extinction',
        type: 'algae',
        message: '绿藻濒临灭绝！',
        suggestion: '增加养分和光照，减少草食动物',
        timestamp: this.timeStep,
      };
      newWarnings.push(w);
      newWarningIds.add(w.id);
    }

    if (this.species.daphnia <= 1 && this.timeStep > 5) {
      const w: WarningEvent = {
        id: 'daphnia-extinction',
        type: 'daphnia',
        message: '水蚤濒临灭绝！',
        suggestion: '增加绿藻数量，保证溶氧充足',
        timestamp: this.timeStep,
      };
      newWarnings.push(w);
      newWarningIds.add(w.id);
    }

    this.warnings = newWarnings;
    this.warningIds = newWarningIds;
  }

  hasActiveWarning(): boolean {
    return this.warnings.length > 0;
  }

  hasDangerWarning(): boolean {
    return this.warnings.some((w) => w.id.includes('danger') || w.id.includes('extinction'));
  }

  private checkSteadyState(): void {
    if (this.history.length < 10) {
      this.steadyStateCounter = 0;
      return;
    }

    const recent = this.history.slice(-10);
    let allStable = true;

    for (const key of ['algae', 'daphnia', 'snail'] as const) {
      const values = recent.map((h) => h.species[key]);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const avg = (min + max) / 2;
      if (avg > 0 && (max - min) / avg > 0.05) {
        allStable = false;
        break;
      }
    }

    if (
      this.resources.dissolvedOxygen < GREEN_ZONE.dissolvedOxygen.min ||
      this.resources.dissolvedOxygen > GREEN_ZONE.dissolvedOxygen.max ||
      this.resources.nutrients < GREEN_ZONE.nutrients.min ||
      this.resources.nutrients > GREEN_ZONE.nutrients.max
    ) {
      allStable = false;
    }

    if (allStable) {
      this.steadyStateCounter++;
    } else {
      this.steadyStateCounter = 0;
    }
  }

  isSteadyState(): boolean {
    return this.steadyStateCounter >= 1;
  }

  getSteadyStateCounter(): number {
    return this.steadyStateCounter;
  }

  private checkAchievements(): void {
    if (this.timeStep === 1) {
      this.unlockAchievement('first-day');
    }

    if (this.timeStep >= 30 && this.species.algae > 0 && this.species.daphnia > 0 && this.species.snail > 0) {
      this.unlockAchievement('survivor');
    }

    if (this.steadyStateCounter >= 10) {
      this.unlockAchievement('eco-master');
    }
  }

  private unlockAchievement(id: string): void {
    if (this.achievements.some((a) => a.id === id)) return;
    const def = this.achievementDefs.find((a) => a.id === id);
    if (def) {
      this.achievements.push({
        ...def,
        unlockedAt: this.timeStep,
      });
    }
  }

  reset(): void {
    this.species = { ...INITIAL_SPECIES };
    this.resources = { ...INITIAL_RESOURCES };
    this.timeStep = 0;
    this.steadyStateCounter = 0;
    this.history = [];
    this.warnings = [];
    this.warningIds.clear();
    this.pushHistory();
    this.notifyListeners();
  }
}

export const ecoSimulator = new EcoSimulator();
