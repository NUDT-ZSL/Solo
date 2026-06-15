export type GrowthStage = 'germination' | 'seedling' | 'growing' | 'mature' | 'flowering';

export interface PlantState {
  height: number;
  leafCount: number;
  stemColor: string;
  leafColor: string;
  stage: GrowthStage;
  isWilting: boolean;
  wiltProgress: number;
  flowerCount: number;
  stemThickness: number;
}

export interface EnvironmentParams {
  lightIntensity: number;
  nutrientConcentration: number;
  gravityMode: 'zero' | 'earth';
}

const STAGE_THRESHOLDS = {
  germination: 0.5,
  seedling: 1.2,
  growing: 2.5,
  mature: 3.5,
  flowering: 4.0
};

const STAGE_LEAF_COUNTS = {
  germination: 0,
  seedling: 2,
  growing: 6,
  mature: 8,
  flowering: 8
};

const NORMAL_STEM_COLOR = { r: 0x4a / 255, g: 0xde / 255, b: 0x80 / 255 };
const NORMAL_LEAF_COLOR = { r: 0x22 / 255, g: 0xc5 / 255, b: 0x5e / 255 };
const WILT_COLOR = { r: 0x92 / 255, g: 0x40 / 255, b: 0x0e / 255 };

export class PlantEngine {
  private state: PlantState;
  private envParams: EnvironmentParams;
  private targetHeight: number;
  private isRecovering: boolean;
  private recoveryProgress: number;

  constructor() {
    this.state = {
      height: 0.3,
      leafCount: 0,
      stemColor: '#4ade80',
      leafColor: '#22c55e',
      stage: 'germination',
      isWilting: false,
      wiltProgress: 0,
      flowerCount: 0,
      stemThickness: 0.05
    };
    this.envParams = {
      lightIntensity: 500,
      nutrientConcentration: 0.5,
      gravityMode: 'zero'
    };
    this.targetHeight = 0.3;
    this.isRecovering = false;
    this.recoveryProgress = 0;
  }

  setEnvironmentParams(params: Partial<EnvironmentParams>): void {
    this.envParams = { ...this.envParams, ...params };
  }

  getEnvironmentParams(): EnvironmentParams {
    return { ...this.envParams };
  }

  getState(): PlantState {
    return { ...this.state };
  }

  setState(state: Partial<PlantState>): void {
    this.state = { ...this.state, ...state };
    this.targetHeight = this.state.height;
  }

  update(deltaTime: number): void {
    const { lightIntensity, nutrientConcentration } = this.envParams;
    
    const isWiltingCondition = lightIntensity < 200 && nutrientConcentration < 0.3;
    
    if (isWiltingCondition) {
      this.state.isWilting = true;
      this.isRecovering = false;
      this.wiltProgress = Math.min(1, this.state.wiltProgress + deltaTime * 0.3);
      this.state.height = Math.max(0.1, this.state.height - deltaTime * 0.001);
    } else {
      if (this.state.isWilting) {
        this.isRecovering = true;
        this.recoveryProgress = 0;
        this.state.isWilting = false;
      }
      
      if (this.isRecovering) {
        this.recoveryProgress += deltaTime * 0.5;
        this.state.wiltProgress = Math.max(0, this.state.wiltProgress - deltaTime * 0.15);
        if (this.state.wiltProgress <= 0 && this.recoveryProgress > 2) {
          this.isRecovering = false;
        }
      }
      
      const growthRate = this.calculateGrowthRate();
      const actualGrowthRate = this.isRecovering ? growthRate * 0.5 : growthRate;
      this.targetHeight = Math.min(STAGE_THRESHOLDS.flowering, this.targetHeight + actualGrowthRate * deltaTime);
      this.state.height += (this.targetHeight - this.state.height) * Math.min(1, deltaTime * 2);
    }
    
    this.updateStage();
    this.updateColors();
    this.updateLeafCount();
    this.updateFlowerCount();
    this.updateStemThickness();
  }

  private calculateGrowthRate(): number {
    const { lightIntensity, nutrientConcentration, gravityMode } = this.envParams;

    const lightFactor = Math.min(1, lightIntensity / 1000);
    const nutrientFactor = nutrientConcentration;

    const gravityFactor: number = gravityMode === 'zero' ? 0 : 1;

    const nutrientDiffusionCoeff = 1 + (1 - gravityFactor) * 0.3;
    const adjustedNutrient = Math.min(1, nutrientFactor * nutrientDiffusionCoeff);

    const baseHeight = 0.02;
    const growthIncrement =
      (lightFactor * 0.4 + adjustedNutrient * 0.4) *
      (1 + (1 - gravityFactor) * 0.2);
    const effectiveGrowthRate = baseHeight + growthIncrement;

    const baseRate = 0.18;
    return baseRate * effectiveGrowthRate;
  }

  private updateStage(): void {
    const { height } = this.state;
    
    if (height >= STAGE_THRESHOLDS.mature) {
      this.state.stage = 'flowering';
    } else if (height >= STAGE_THRESHOLDS.growing) {
      this.state.stage = 'mature';
    } else if (height >= STAGE_THRESHOLDS.seedling) {
      this.state.stage = 'growing';
    } else if (height >= STAGE_THRESHOLDS.germination) {
      this.state.stage = 'seedling';
    } else {
      this.state.stage = 'germination';
    }
  }

  private updateColors(): void {
    const wiltFactor = this.state.wiltProgress;
    
    const stemR = Math.round((NORMAL_STEM_COLOR.r * (1 - wiltFactor) + WILT_COLOR.r * wiltFactor) * 255);
    const stemG = Math.round((NORMAL_STEM_COLOR.g * (1 - wiltFactor) + WILT_COLOR.g * wiltFactor) * 255);
    const stemB = Math.round((NORMAL_STEM_COLOR.b * (1 - wiltFactor) + WILT_COLOR.b * wiltFactor) * 255);
    this.state.stemColor = `#${stemR.toString(16).padStart(2, '0')}${stemG.toString(16).padStart(2, '0')}${stemB.toString(16).padStart(2, '0')}`;
    
    const leafR = Math.round((NORMAL_LEAF_COLOR.r * (1 - wiltFactor) + WILT_COLOR.r * wiltFactor) * 255);
    const leafG = Math.round((NORMAL_LEAF_COLOR.g * (1 - wiltFactor) + WILT_COLOR.g * wiltFactor) * 255);
    const leafB = Math.round((NORMAL_LEAF_COLOR.b * (1 - wiltFactor) + WILT_COLOR.b * wiltFactor) * 255);
    this.state.leafColor = `#${leafR.toString(16).padStart(2, '0')}${leafG.toString(16).padStart(2, '0')}${leafB.toString(16).padStart(2, '0')}`;
  }

  private updateLeafCount(): void {
    const targetLeafCount = STAGE_LEAF_COUNTS[this.state.stage];
    
    if (this.state.isWilting && this.state.wiltProgress > 0.3) {
      const wiltLeafReduction = Math.floor((this.state.wiltProgress - 0.3) / 0.7 * targetLeafCount);
      this.state.leafCount = Math.max(0, targetLeafCount - wiltLeafReduction);
    } else {
      this.state.leafCount = targetLeafCount;
    }
  }

  private updateFlowerCount(): void {
    if (this.state.stage === 'flowering' && !this.state.isWilting) {
      this.state.flowerCount = 3;
    } else {
      this.state.flowerCount = 0;
    }
  }

  private updateStemThickness(): void {
    const baseThickness = 0.05;
    const maxThickness = 0.12;
    const heightFactor = Math.min(1, this.state.height / STAGE_THRESHOLDS.flowering);
    this.state.stemThickness = baseThickness + (maxThickness - baseThickness) * heightFactor;
  }

  getStageName(stage: GrowthStage): string {
    const names: Record<GrowthStage, string> = {
      germination: '萌发期',
      seedling: '幼苗期',
      growing: '成长期',
      mature: '成熟期',
      flowering: '开花期'
    };
    return names[stage];
  }

  reset(): void {
    this.state = {
      height: 0.3,
      leafCount: 0,
      stemColor: '#4ade80',
      leafColor: '#22c55e',
      stage: 'germination',
      isWilting: false,
      wiltProgress: 0,
      flowerCount: 0,
      stemThickness: 0.05
    };
    this.targetHeight = 0.3;
    this.isRecovering = false;
    this.recoveryProgress = 0;
  }
}
