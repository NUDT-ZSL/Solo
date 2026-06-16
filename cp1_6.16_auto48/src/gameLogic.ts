export interface Material {
  id: string;
  name: string;
  color: string;
  rgb: [number, number, number];
  icon: string;
  description: string;
}

export interface Recipe {
  id: string;
  name: string;
  materials: string[];
  minQuality: number;
  description: string;
  idealHeat: number;
  idealRatio: Record<string, number>;
}

export interface BrewingState {
  addedMaterials: { materialId: string; amount: number }[];
  currentHeat: number;
  stirCount: number;
}

export interface FinishedPotion {
  id: string;
  name: string;
  color: string;
  quality: number;
  materials: string[];
  timestamp: number;
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('').toUpperCase();
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : [0, 0, 0];
}

export function generateRecipe(templates: Recipe[], materials: Material[]): Recipe {
  const template = templates[Math.floor(Math.random() * templates.length)];
  const idealHeat = 3 + Math.floor(Math.random() * 5);
  const idealRatio: Record<string, number> = {};
  
  template.materials.forEach(matId => {
    idealRatio[matId] = 0.5 + Math.random() * 1.5;
  });
  
  const total = Object.values(idealRatio).reduce((a, b) => a + b, 0);
  Object.keys(idealRatio).forEach(key => {
    idealRatio[key] = Math.round((idealRatio[key] / total) * 100) / 100;
  });

  return {
    ...template,
    idealHeat,
    idealRatio
  };
}

export function calcQuality(
  state: BrewingState,
  recipe: Recipe,
  materials: Material[]
): { score: number; stars: number; feedback: string } {
  let totalScore = 100;
  const feedback: string[] = [];

  const requiredMaterials = recipe.materials;
  const addedMaterialIds = state.addedMaterials.map(m => m.materialId);
  
  const missingMaterials = requiredMaterials.filter(id => !addedMaterialIds.includes(id));
  if (missingMaterials.length > 0) {
    totalScore -= missingMaterials.length * 25;
    const names = missingMaterials.map(id => 
      materials.find(m => m.id === id)?.name || id
    ).join('、');
    feedback.push(`缺少材料：${names}`);
  }

  const extraMaterials = addedMaterialIds.filter(id => !requiredMaterials.includes(id));
  if (extraMaterials.length > 0) {
    totalScore -= extraMaterials.length * 15;
    const names = extraMaterials.map(id => 
      materials.find(m => m.id === id)?.name || id
    ).join('、');
    feedback.push(`多余材料：${names}`);
  }

  const totalAmount = state.addedMaterials.reduce((sum, m) => sum + m.amount, 0);
  if (totalAmount > 0) {
    requiredMaterials.forEach(matId => {
      const added = state.addedMaterials.find(m => m.materialId === matId);
      const actualRatio = added ? added.amount / totalAmount : 0;
      const idealRatio = recipe.idealRatio[matId] || (1 / requiredMaterials.length);
      const ratioDiff = Math.abs(actualRatio - idealRatio);
      
      if (ratioDiff > 0.1) {
        totalScore -= Math.min(20, ratioDiff * 100);
        const matName = materials.find(m => m.id === matId)?.name || matId;
        feedback.push(`${matName}比例偏差${Math.round(ratioDiff * 100)}%`);
      }
    });
  } else {
    totalScore -= 50;
    feedback.push('未添加任何材料');
  }

  const heatDiff = Math.abs(state.currentHeat - recipe.idealHeat);
  if (heatDiff > 1) {
    totalScore -= heatDiff * 8;
    feedback.push(`火候偏差${heatDiff}级`);
  } else if (heatDiff === 0) {
    totalScore += 10;
  }

  if (state.stirCount < 5 && totalAmount > 0) {
    totalScore -= (5 - state.stirCount) * 3;
    feedback.push('搅拌不足');
  } else if (state.stirCount > 15) {
    totalScore -= Math.min(15, (state.stirCount - 15) * 2);
    feedback.push('搅拌过度');
  } else if (state.stirCount >= 8 && state.stirCount <= 12) {
    totalScore += 5;
  }

  totalScore = Math.max(0, Math.min(100, totalScore));
  
  let stars = 0;
  if (totalScore >= 90) stars = 5;
  else if (totalScore >= 75) stars = 4;
  else if (totalScore >= 60) stars = 3;
  else if (totalScore >= 40) stars = 2;
  else if (totalScore >= 20) stars = 1;

  if (feedback.length === 0 && stars >= 4) {
    feedback.push('完美酿造！');
  } else if (feedback.length === 0) {
    feedback.push('酿造完成');
  }

  return {
    score: totalScore,
    stars,
    feedback: feedback.join('；')
  };
}

export function mixColor(
  addedMaterials: { materialId: string; amount: number }[],
  materials: Material[]
): string {
  if (addedMaterials.length === 0) {
    return '#2C3E50';
  }

  const totalAmount = addedMaterials.reduce((sum, m) => sum + m.amount, 0);
  if (totalAmount === 0) {
    return '#2C3E50';
  }

  let r = 0, g = 0, b = 0;
  
  addedMaterials.forEach(({ materialId, amount }) => {
    const material = materials.find(m => m.id === materialId);
    if (material) {
      const weight = amount / totalAmount;
      r += material.rgb[0] * weight;
      g += material.rgb[1] * weight;
      b += material.rgb[2] * weight;
    }
  });

  return rgbToHex(r, g, b);
}

export function mixColorWithHeat(
  addedMaterials: { materialId: string; amount: number }[],
  heat: number,
  materials: Material[]
): string {
  const baseColor = mixColor(addedMaterials, materials);
  const [r, g, b] = hexToRgb(baseColor);
  
  const heatFactor = heat / 10;
  const heatR = Math.round(r * (1 + heatFactor * 0.3));
  const heatG = Math.round(g * (1 + heatFactor * 0.1));
  const heatB = Math.round(b * (1 - heatFactor * 0.2));

  return rgbToHex(heatR, heatG, heatB);
}

export function getBubbleSpeed(heat: number): number {
  const minSpeed = 2000;
  const maxSpeed = 500;
  return minSpeed - (heat / 10) * (minSpeed - maxSpeed);
}

export function isPerfectBlend(quality: number): boolean {
  return quality >= 90;
}
