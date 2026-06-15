export enum GrowthStage {
  Seed = 0,
  Sprout = 1,
  Seedling = 2,
  Mature = 3,
  Flowering = 4,
}

export enum FlowerShape {
  Symmetric = "symmetric",
  Spiral = "spiral",
}

export type GrowthAction = "water" | "nutrient" | "light";

export interface PlantState {
  id: string;
  name: string;
  stage: GrowthStage;
  water: number;
  nutrient: number;
  light: number;
  energy: number;
  lastInteraction: number;
  flowerColor: string | null;
  flowerShape: FlowerShape | null;
  growthPath: GrowthAction[];
}

export interface ActionResponse {
  plant: PlantState;
  evolved: boolean;
  newStage?: GrowthStage;
}

export interface DecayResponse {
  plant: PlantState;
  isWithering: boolean;
}

export const STAGE_THRESHOLDS: Record<GrowthStage, number> = {
  [GrowthStage.Seed]: 0,
  [GrowthStage.Sprout]: 30,
  [GrowthStage.Seedling]: 80,
  [GrowthStage.Mature]: 150,
  [GrowthStage.Flowering]: 250,
};

export const STAGE_NAMES: Record<GrowthStage, string> = {
  [GrowthStage.Seed]: "种子",
  [GrowthStage.Sprout]: "嫩芽",
  [GrowthStage.Seedling]: "小苗",
  [GrowthStage.Mature]: "成熟",
  [GrowthStage.Flowering]: "开花",
};

export const ACTION_EFFECTS: Record<
  GrowthAction,
  { attr: "water" | "nutrient" | "light"; delta: number; energyCost: number }
> = {
  water: { attr: "water", delta: 15, energyCost: 5 },
  nutrient: { attr: "nutrient", delta: 15, energyCost: 5 },
  light: { attr: "light", delta: 15, energyCost: 5 },
};
