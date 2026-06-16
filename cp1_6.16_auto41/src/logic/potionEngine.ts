export interface Material {
  id: string;
  name: string;
  color: { r: number; g: number; b: number };
  maxUses: number;
  description: string;
}

export interface RecipeStep {
  materialId: string;
  materialName: string;
  targetHeat: number;
  order: number;
}

export interface Recipe {
  id: string;
  name: string;
  steps: RecipeStep[];
  targetColor: { r: number; g: number; b: number };
}

export interface PotionState {
  addedMaterials: { materialId: string; materialName: string; heat: number }[];
  currentColor: { r: number; g: number; b: number };
  isFailed: boolean;
  failureReason: string | null;
  isComplete: boolean;
  currentStepIndex: number;
}

export const MATERIALS: Material[] = [
  { id: 'moonstone', name: '月光石', color: { r: 200, g: 220, b: 255 }, maxUses: 3, description: '散发柔和银光的神秘宝石' },
  { id: 'dragonscale', name: '龙鳞粉', color: { r: 255, g: 100, b: 50 }, maxUses: 2, description: '来自远古巨龙的鳞片' },
  { id: 'nightshade', name: '夜影草', color: { r: 50, g: 30, b: 80 }, maxUses: 4, description: '只在月光下生长的黑暗植物' },
  { id: 'phoenixfeather', name: '凤凰羽', color: { r: 255, g: 200, b: 50 }, maxUses: 2, description: '凤凰涅槃后遗留的羽毛' },
  { id: 'starflower', name: '星辰花', color: { r: 150, g: 100, b: 200 }, maxUses: 3, description: '花瓣上闪烁着星光' },
  { id: 'mermaidtear', name: '人鱼泪', color: { r: 100, g: 200, b: 255 }, maxUses: 3, description: '人鱼的眼泪结晶' }
];

const MATERIAL_MAP: Record<string, Material> = MATERIALS.reduce((acc, m) => {
  acc[m.id] = m;
  return acc;
}, {} as Record<string, Material>);

export function getMaterialById(id: string): Material | undefined {
  return MATERIAL_MAP[id];
}

export function getMaterialByName(name: string): Material | undefined {
  return MATERIALS.find(m => m.name === name);
}

function rgbToLab(r: number, g: number, b: number): { L: number; a: number; b_b: number } {
  let rn = r / 255;
  let gn = g / 255;
  let bn = b / 255;

  rn = rn > 0.04045 ? Math.pow((rn + 0.055) / 1.055, 2.4) : rn / 12.92;
  gn = gn > 0.04045 ? Math.pow((gn + 0.055) / 1.055, 2.4) : gn / 12.92;
  bn = bn > 0.04045 ? Math.pow((bn + 0.055) / 1.055, 2.4) : bn / 12.92;

  let x = rn * 0.4124 + gn * 0.3576 + bn * 0.1805;
  let y = rn * 0.2126 + gn * 0.7152 + bn * 0.0722;
  let z = rn * 0.0193 + gn * 0.1192 + bn * 0.9505;

  const xn = 0.95047;
  const yn = 1.00000;
  const zn = 1.08883;

  x /= xn;
  y /= yn;
  z /= zn;

  const epsilon = 0.008856;
  const kappa = 903.3;

  const fx = x > epsilon ? Math.pow(x, 1 / 3) : (kappa * x + 16) / 116;
  const fy = y > epsilon ? Math.pow(y, 1 / 3) : (kappa * y + 16) / 116;
  const fz = z > epsilon ? Math.pow(z, 1 / 3) : (kappa * z + 16) / 116;

  const L = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const b_b = 200 * (fy - fz);

  return { L, a, b_b };
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

function rad2deg(rad: number): number {
  return rad * (180 / Math.PI);
}

export function deltaE2000(
  color1: { r: number; g: number; b: number },
  color2: { r: number; g: number; b: number }
): number {
  const lab1 = rgbToLab(color1.r, color1.g, color1.b);
  const lab2 = rgbToLab(color2.r, color2.g, color2.b);

  const L1 = lab1.L;
  const a1 = lab1.a;
  const b1 = lab1.b_b;
  const L2 = lab2.L;
  const a2 = lab2.a;
  const b2 = lab2.b_b;

  const kL = 1;
  const kC = 1;
  const kH = 1;

  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const Cb = (C1 + C2) / 2;

  const G = 0.5 * (1 - Math.sqrt(Math.pow(Cb, 7) / (Math.pow(Cb, 7) + Math.pow(25, 7))));

  const a1_prime = a1 * (1 + G);
  const a2_prime = a2 * (1 + G);

  const C1_prime = Math.sqrt(a1_prime * a1_prime + b1 * b1);
  const C2_prime = Math.sqrt(a2_prime * a2_prime + b2 * b2);

  const h1_prime = b1 === 0 && a1_prime === 0 ? 0 : rad2deg(Math.atan2(b1, a1_prime));
  const h2_prime = b2 === 0 && a2_prime === 0 ? 0 : rad2deg(Math.atan2(b2, a2_prime));

  const dL_prime = L2 - L1;
  const dC_prime = C2_prime - C1_prime;

  const dh_prime = Math.abs(C1_prime * C2_prime) === 0 ? 0 : (
    Math.abs(h2_prime - h1_prime) <= 180
      ? h2_prime - h1_prime
      : h2_prime - h1_prime > 180
        ? h2_prime - h1_prime - 360
        : h2_prime - h1_prime + 360
  );

  const dH_prime = 2 * Math.sqrt(C1_prime * C2_prime) * Math.sin(deg2rad(dh_prime / 2));

  const Lb_prime = (L1 + L2) / 2;
  const Cb_prime = (C1_prime + C2_prime) / 2;

  const hb_prime = Math.abs(C1_prime * C2_prime) === 0
    ? h1_prime + h2_prime
    : (
      Math.abs(h1_prime - h2_prime) <= 180
        ? (h1_prime + h2_prime) / 2
        : (h1_prime + h2_prime + 360) / 2
    );

  const T = 1
    - 0.17 * Math.cos(deg2rad(hb_prime - 30))
    + 0.24 * Math.cos(deg2rad(2 * hb_prime))
    + 0.32 * Math.cos(deg2rad(3 * hb_prime + 6))
    - 0.20 * Math.cos(deg2rad(4 * hb_prime - 63));

  const SL = 1 + (0.015 * Math.pow(Lb_prime - 50, 2)) / Math.sqrt(20 + Math.pow(Lb_prime - 50, 2));
  const SC = 1 + 0.045 * Cb_prime;
  const SH = 1 + 0.015 * Cb_prime * T;

  const dTheta = 30 * Math.exp(-Math.pow((hb_prime - 275) / 25, 2));
  const RC = 2 * Math.sqrt(Math.pow(Cb_prime, 7) / (Math.pow(Cb_prime, 7) + Math.pow(25, 7)));
  const RT = -RC * Math.sin(deg2rad(2 * dTheta));

  const dE = Math.sqrt(
    Math.pow(dL_prime / (kL * SL), 2) +
    Math.pow(dC_prime / (kC * SC), 2) +
    Math.pow(dH_prime / (kH * SH), 2) +
    RT * (dC_prime / (kC * SC)) * (dH_prime / (kH * SH))
  );

  return dE;
}

export function mixColors(
  colors: { r: number; g: number; b: number }[]
): { r: number; g: number; b: number } {
  if (colors.length === 0) {
    return { r: 50, g: 50, b: 60 };
  }

  let r = 0, g = 0, b = 0;
  for (const c of colors) {
    r += c.r;
    g += c.g;
    b += c.b;
  }

  return {
    r: Math.round(r / colors.length),
    g: Math.round(g / colors.length),
    b: Math.round(b / colors.length)
  };
}

export function createInitialPotionState(): PotionState {
  return {
    addedMaterials: [],
    currentColor: { r: 50, g: 50, b: 60 },
    isFailed: false,
    failureReason: null,
    isComplete: false,
    currentStepIndex: 0
  };
}

export function validateAndAddMaterial(
  state: PotionState,
  recipe: Recipe,
  materialId: string,
  currentHeat: number
): PotionState {
  if (state.isFailed || state.isComplete) {
    return state;
  }

  const material = getMaterialById(materialId);
  if (!material) {
    return {
      ...state,
      isFailed: true,
      failureReason: '未知材料'
    };
  }

  const currentStep = recipe.steps[state.currentStepIndex];
  if (!currentStep) {
    return {
      ...state,
      isFailed: true,
      failureReason: '配方已完成，无需继续添加'
    };
  }

  const materialCount = state.addedMaterials.filter(m => m.materialId === materialId).length;
  if (materialCount >= material.maxUses) {
    return {
      ...state,
      isFailed: true,
      failureReason: `${material.name} 使用次数超限`,
      currentColor: { r: 128, g: 128, b: 128 }
    };
  }

  if (currentStep.materialId !== materialId) {
    return {
      ...state,
      isFailed: true,
      failureReason: `配方第 ${state.currentStepIndex + 1} 步需要 ${getMaterialById(currentStep.materialId)?.name || currentStep.materialName}，但投入了 ${material.name}`,
      currentColor: { r: 128, g: 128, b: 128 }
    };
  }

  const newAddedMaterials = [
    ...state.addedMaterials,
    { materialId, materialName: material.name, heat: currentHeat }
  ];

  const materialColors = newAddedMaterials.map(m => {
    const mat = getMaterialById(m.materialId);
    return mat ? mat.color : { r: 128, g: 128, b: 128 };
  });

  const newColor = mixColors(materialColors);
  const newStepIndex = state.currentStepIndex + 1;
  const isComplete = newStepIndex >= recipe.steps.length;

  return {
    ...state,
    addedMaterials: newAddedMaterials,
    currentColor: newColor,
    currentStepIndex: newStepIndex,
    isComplete
  };
}

export function isRecipeSuccessful(
  state: PotionState,
  recipe: Recipe
): boolean {
  if (!state.isComplete || state.isFailed) {
    return false;
  }

  const deltaE = deltaE2000(state.currentColor, recipe.targetColor);
  return deltaE < 10;
}

export function getMaterialUsageCount(
  state: PotionState,
  materialId: string
): number {
  return state.addedMaterials.filter(m => m.materialId === materialId).length;
}

const RECIPE_NAMES = [
  '治愈之光药剂',
  '火焰抗性药水',
  '隐身药水',
  '力量增强药剂',
  '智慧之泉',
  '迅捷之风',
  '夜视药剂',
  '寒冰护盾药水'
];

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function generateRandomRecipe(): Recipe {
  const stepCount = Math.random() < 0.5 ? 3 : 4;
  const availableMaterials = [...MATERIALS];
  const shuffledMaterials = shuffle(availableMaterials);
  const selectedMaterials = shuffledMaterials.slice(0, stepCount);

  const steps: RecipeStep[] = selectedMaterials.map((material, index) => ({
    materialId: material.id,
    materialName: material.name,
    targetHeat: Math.floor(Math.random() * 8) + 2,
    order: index
  }));

  const targetColors = selectedMaterials.map(m => m.color);
  const targetColor = mixColors(targetColors);

  const recipeName = RECIPE_NAMES[Math.floor(Math.random() * RECIPE_NAMES.length)];

  return {
    id: `recipe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: recipeName,
    steps,
    targetColor
  };
}

export function getStepProgress(
  state: PotionState,
  recipe: Recipe
): { current: number; total: number; percentage: number } {
  return {
    current: state.currentStepIndex,
    total: recipe.steps.length,
    percentage: (state.currentStepIndex / recipe.steps.length) * 100
  };
}
