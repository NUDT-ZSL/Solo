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
    baseGrowthRate: 0.12,
    metabolicRate: 0.015,
    oxygenProductionRate: 0.06,
    nutrientConsumptionPerCapita: 0.04,
    carryingCapacityBase: 200,
  },
  daphnia: {
    baseGrowthRate: 0.07,
    metabolicRate: 0.03,
    oxygenConsumptionPerCapita: 0.025,
    nutrientProductionPerCapita: 0.015,
    algaeConsumptionPerCapita: 0.12,
    growthEfficiency: 0.4,
    carryingCapacityBase: 80,
  },
  snail: {
    baseGrowthRate: 0.035,
    metabolicRate: 0.025,
    oxygenConsumptionPerCapita: 0.018,
    nutrientProductionPerCapita: 0.025,
    algaeConsumptionPerCapita: 0.06,
    daphniaConsumptionPerCapita: 0.04,
    growthEfficiency: 0.3,
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
  private lastStepDurationMs: number = 0;

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

  getLastStepDuration(): number {
    return this.lastStepDurationMs;
  }

  setEnvironment(params: Partial<EnvironmentParams>): void {
    this.environment = { ...this.environment, ...params };
    this.notifyListeners();
  }

  step(): void {
    const startTime = performance.now();
    this.timeStep++;

    const env = this.environment;
    const lightFactor = env.lightIntensity / 100;
    const exchangeFactor = env.waterExchangeRate / 100;
    const feedingFactor = env.feedingAmount / 100;
    const cleaningFactor = env.cleaningFrequency / 5;

    const algaeConfig = SPECIES_CONFIG.algae;
    const daphniaConfig = SPECIES_CONFIG.daphnia;
    const snailConfig = SPECIES_CONFIG.snail;

    const prevAlgae = this.species.algae;
    const prevDaphnia = this.species.daphnia;
    const prevSnail = this.species.snail;
    const prevNutrients = this.resources.nutrients;
    const prevOxygen = this.resources.dissolvedOxygen;

    // ========== 第一步：基于当前资源量计算捕食/消耗量 ==========
    // 绿藻消耗养分（与绿藻种群数量成正比）
    const nutrientConsumedByAlgae = algaeConfig.nutrientConsumptionPerCapita * prevAlgae *
      Math.min(1, prevNutrients / 5);

    // 水蚤捕食绿藻（与水蚤种群数量成正比，受绿藻数量制约）
    const algaeEatenByDaphnia = daphniaConfig.algaeConsumptionPerCapita * prevDaphnia *
      Math.min(1, prevAlgae / (prevDaphnia * 2 + 1));

    // 蜗牛捕食绿藻和水蚤（与蜗牛种群数量成正比）
    const algaeEatenBySnail = snailConfig.algaeConsumptionPerCapita * prevSnail *
      Math.min(1, prevAlgae / (prevSnail * 3 + 1));
    const daphniaEatenBySnail = snailConfig.daphniaConsumptionPerCapita * prevSnail *
      Math.min(1, prevDaphnia / (prevSnail * 2 + 1));

    const totalAlgaeEaten = algaeEatenByDaphnia + algaeEatenBySnail;

    // ========== 第二步：基于资源计算各物种增长率 ==========
    // 绿藻：养分 + 光照 -> 增长率
    const nutrientFactor = Math.min(1, prevNutrients / 4);
    const algaeGrowthRate = algaeConfig.baseGrowthRate * nutrientFactor *
      Math.min(1, 0.2 + lightFactor * 0.8);
    const algaeCarryingCapacity = algaeConfig.carryingCapacityBase *
      nutrientFactor * Math.min(1, 0.3 + lightFactor * 0.7);
    const algaeOxygenFactor = Math.min(1, prevOxygen / 6);
    const algaeMortality = algaeConfig.metabolicRate * (1 - algaeOxygenFactor * 0.5);

    // 逻辑斯蒂增长 - 被捕食 - 自然死亡
    const dAlgaeLogistic = algaeGrowthRate * prevAlgae *
      (1 - prevAlgae / Math.max(1, algaeCarryingCapacity));
    const dAlgae = dAlgaeLogistic - totalAlgaeEaten - algaeMortality * prevAlgae -
      nutrientConsumedByAlgae * 0.1;

    // 水蚤：捕食绿藻获得能量 -> 增长率
    const daphniaFoodEnergy = algaeEatenByDaphnia * daphniaConfig.growthEfficiency;
    const daphniaFoodFactor = Math.min(1, prevAlgae / 30);
    const daphniaOxygenFactor = Math.min(1, prevOxygen / 4);
    const daphniaGrowthRate = daphniaConfig.baseGrowthRate * daphniaFoodFactor * daphniaOxygenFactor;
    const daphniaCarryingCapacity = daphniaConfig.carryingCapacityBase * daphniaFoodFactor;
    const daphniaMortality = daphniaConfig.metabolicRate * (1 - daphniaOxygenFactor * 0.6);

    const dDaphniaLogistic = daphniaGrowthRate * prevDaphnia *
      (1 - prevDaphnia / Math.max(1, daphniaCarryingCapacity));
    const dDaphnia = dDaphniaLogistic + daphniaFoodEnergy - daphniaMortality * prevDaphnia -
      daphniaEatenBySnail;

    // 蜗牛：捕食绿藻和水蚤获得能量 -> 增长率
    const snailFoodEnergy = (algaeEatenBySnail + daphniaEatenBySnail * 1.5) * snailConfig.growthEfficiency;
    const snailFoodFactor = Math.min(1, (prevAlgae + prevDaphnia) / 25);
    const snailOxygenFactor = Math.min(1, prevOxygen / 3);
    const snailGrowthRate = snailConfig.baseGrowthRate * snailFoodFactor * snailOxygenFactor;
    const snailCarryingCapacity = snailConfig.carryingCapacityBase * snailFoodFactor;
    const snailMortality = snailConfig.metabolicRate * (1 - snailOxygenFactor * 0.5);

    const dSnailLogistic = snailGrowthRate * prevSnail *
      (1 - prevSnail / Math.max(1, snailCarryingCapacity));
    const dSnail = dSnailLogistic + snailFoodEnergy - snailMortality * prevSnail;

    // ========== 第三步：计算资源变化（与种群数量成正比） ==========
    // 溶氧：绿藻光合作用产生（与种群数量、光照成正比）- 所有生物呼吸消耗
    const oxygenFromPlants = algaeConfig.oxygenProductionRate * prevAlgae * lightFactor;
    const oxygenConsumedByDaphnia = daphniaConfig.oxygenConsumptionPerCapita * prevDaphnia;
    const oxygenConsumedBySnail = snailConfig.oxygenConsumptionPerCapita * prevSnail;
    const oxygenConsumedByAlgae = algaeConfig.metabolicRate * prevAlgae * 0.1;
    const totalOxygenConsumption = oxygenConsumedByDaphnia + oxygenConsumedBySnail + oxygenConsumedByAlgae;

    const oxygenFromExchange = exchangeFactor * 3;
    const oxygenDecay = 0.01 * prevOxygen;
    const dOxygen = oxygenFromPlants - totalOxygenConsumption + oxygenFromExchange - oxygenDecay;

    // 养分：投喂 + 生物代谢废物（与种群数量成正比）- 绿藻消耗 - 清洁/换水移除
    const nutrientFromFeeding = feedingFactor * 2;
    const nutrientFromDaphniaWaste = daphniaConfig.nutrientProductionPerCapita * prevDaphnia;
    const nutrientFromSnailWaste = snailConfig.nutrientProductionPerCapita * prevSnail;
    const totalNutrientFromWaste = nutrientFromDaphniaWaste + nutrientFromSnailWaste;

    const nutrientRemoval = cleaningFactor * 1.5 + exchangeFactor * 0.8;
    const nutrientDecay = 0.005 * prevNutrients;
    const dNutrients = nutrientFromFeeding + totalNutrientFromWaste - nutrientConsumedByAlgae -
      nutrientRemoval - nutrientDecay;

    // ========== 第四步：更新种群和资源 ==========
    this.species.algae = Math.max(0, prevAlgae + dAlgae);
    this.species.daphnia = Math.max(0, prevDaphnia + dDaphnia);
    this.species.snail = Math.max(0, prevSnail + dSnail);

    this.resources.dissolvedOxygen = Math.max(0, Math.min(20, prevOxygen + dOxygen));
    this.resources.nutrients = Math.max(0, Math.min(20, prevNutrients + dNutrients));

    this.checkWarnings();
    this.checkSteadyState();
    this.checkAchievements();
    this.pushHistory();
    this.lastStepDurationMs = performance.now() - startTime;
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
    const SLIDING_WINDOW = 10;
    const STEADY_THRESHOLD = 0.05;
    const REQUIRED_CONSECUTIVE_STEPS = 10;

    if (this.history.length < SLIDING_WINDOW + 1) {
      this.steadyStateCounter = 0;
      return;
    }

    const current = this.history[this.history.length - 1];
    const windowData = this.history.slice(-SLIDING_WINDOW - 1, -1);

    let allStable = true;

    for (const key of ['algae', 'daphnia', 'snail'] as const) {
      const currentValue = current.species[key];

      const windowValues = windowData.map((h) => h.species[key]);
      const slidingAvg = windowValues.reduce((sum, v) => sum + v, 0) / windowValues.length;

      if (slidingAvg <= 0.01) {
        if (currentValue <= 0.01) {
          continue;
        } else {
          allStable = false;
          break;
        }
      }

      const fluctuation = Math.abs(currentValue - slidingAvg) / slidingAvg;

      if (fluctuation > STEADY_THRESHOLD) {
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

    this.steadyStateCounter = Math.min(this.steadyStateCounter, REQUIRED_CONSECUTIVE_STEPS);
  }

  isSteadyState(): boolean {
    return this.steadyStateCounter >= 1;
  }

  getSteadyStateCounter(): number {
    return this.steadyStateCounter;
  }

  getFluctuationInfo(): {
    algae: { current: number; avg: number; fluctuation: number };
    daphnia: { current: number; avg: number; fluctuation: number };
    snail: { current: number; avg: number; fluctuation: number };
  } | null {
    const SLIDING_WINDOW = 10;
    if (this.history.length < SLIDING_WINDOW + 1) return null;

    const current = this.history[this.history.length - 1];
    const windowData = this.history.slice(-SLIDING_WINDOW - 1, -1);
    const result: any = {};

    for (const key of ['algae', 'daphnia', 'snail'] as const) {
      const currentValue = current.species[key];
      const windowValues = windowData.map((h) => h.species[key]);
      const slidingAvg = windowValues.reduce((sum, v) => sum + v, 0) / windowValues.length;
      const fluctuation = slidingAvg > 0.01 ? Math.abs(currentValue - slidingAvg) / slidingAvg : 0;
      result[key] = { current: currentValue, avg: slidingAvg, fluctuation };
    }

    return result;
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
