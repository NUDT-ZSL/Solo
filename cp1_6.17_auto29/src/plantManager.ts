export type PlantSpecies =
  | '绿萝'
  | '龟背竹'
  | '琴叶榕'
  | '虎尾兰'
  | '多肉'
  | '吊兰'
  | '常春藤'
  | '芦荟'
  | '富贵竹'
  | '发财树'
  | '茉莉花'
  | '月季';

export type PlantCategory = '多肉' | '绿植' | '开花植物';

export type LightZone =
  | '东向窗台'
  | '西晒阳台'
  | '南向窗台'
  | '北向窗台'
  | '背光角落'
  | '室内明亮处';

export type PotMaterial = '陶土' | '塑料' | '釉面';

export type MoisturePreference = '干燥' | '中等' | '湿润';

export interface Plant {
  id: string;
  name: string;
  species: PlantSpecies;
  location: LightZone;
  potMaterial: PotMaterial;
  moisturePreference: MoisturePreference;
  createdAt: string;
  wateringFrequency: number;
  lightLevel: number;
}

export const SPECIES_LIST: PlantSpecies[] = [
  '绿萝', '龟背竹', '琴叶榕', '虎尾兰', '多肉', '吊兰',
  '常春藤', '芦荟', '富贵竹', '发财树', '茉莉花', '月季',
];

export const LIGHT_ZONES: LightZone[] = [
  '东向窗台', '西晒阳台', '南向窗台', '北向窗台', '背光角落', '室内明亮处',
];

export const POT_MATERIALS: PotMaterial[] = ['陶土', '塑料', '釉面'];

export const MOISTURE_PREFERENCES: MoisturePreference[] = ['干燥', '中等', '湿润'];

const SPECIES_CATEGORY_MAP: Record<PlantSpecies, PlantCategory> = {
  '多肉': '多肉',
  '芦荟': '多肉',
  '虎尾兰': '多肉',
  '绿萝': '绿植',
  '龟背竹': '绿植',
  '琴叶榕': '绿植',
  '吊兰': '绿植',
  '常春藤': '绿植',
  '富贵竹': '绿植',
  '发财树': '绿植',
  '茉莉花': '开花植物',
  '月季': '开花植物',
};

const SPECIES_BASE_WATERING: Record<PlantSpecies, number> = {
  '绿萝': 4,
  '龟背竹': 5,
  '琴叶榕': 5,
  '虎尾兰': 8,
  '多肉': 9,
  '吊兰': 4,
  '常春藤': 4,
  '芦荟': 8,
  '富贵竹': 3,
  '发财树': 7,
  '茉莉花': 3,
  '月季': 3,
};

const MOISTURE_ADJUST: Record<MoisturePreference, number> = {
  '干燥': 3,
  '中等': 0,
  '湿润': -2,
};

const LIGHT_LEVEL_MAP: Record<LightZone, number> = {
  '东向窗台': 300,
  '西晒阳台': 500,
  '南向窗台': 800,
  '北向窗台': 150,
  '背光角落': 50,
  '室内明亮处': 400,
};

const CATEGORY_COLOR_MAP: Record<PlantCategory, string> = {
  '多肉': '#E67E22',
  '绿植': '#27AE60',
  '开花植物': '#E91E63',
};

export function getSpeciesCategory(species: PlantSpecies): PlantCategory {
  return SPECIES_CATEGORY_MAP[species];
}

export function getCategoryColor(species: PlantSpecies): string {
  return CATEGORY_COLOR_MAP[getSpeciesCategory(species)];
}

export function generateWateringFrequency(
  species: PlantSpecies,
  location: LightZone,
  moisturePreference: MoisturePreference
): number {
  const base = SPECIES_BASE_WATERING[species];
  const moistureAdj = MOISTURE_ADJUST[moisturePreference];
  const lightAdj = LIGHT_LEVEL_MAP[location] > 400 ? -1 : LIGHT_LEVEL_MAP[location] < 200 ? 1 : 0;
  const freq = base + moistureAdj + lightAdj;
  return Math.max(2, Math.min(14, freq));
}

export function mapLightLevel(location: LightZone): number {
  return LIGHT_LEVEL_MAP[location];
}

export function validatePlant(data: Partial<Plant>): string[] {
  const errors: string[] = [];
  if (!data.name || data.name.trim() === '') errors.push('请输入植物名称');
  if (!data.species) errors.push('请选择品种');
  if (!data.location) errors.push('请选择摆放位置');
  if (!data.potMaterial) errors.push('请选择盆器材质');
  if (!data.moisturePreference) errors.push('请选择土壤湿度偏好');
  return errors;
}

export function createPlant(
  name: string,
  species: PlantSpecies,
  location: LightZone,
  potMaterial: PotMaterial,
  moisturePreference: MoisturePreference
): Plant {
  return {
    id: `plant_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim(),
    species,
    location,
    potMaterial,
    moisturePreference,
    createdAt: new Date().toISOString(),
    wateringFrequency: generateWateringFrequency(species, location, moisturePreference),
    lightLevel: mapLightLevel(location),
  };
}
