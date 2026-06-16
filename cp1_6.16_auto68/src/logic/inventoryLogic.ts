import type { Material, Pattern, PatternMaterial, ProduceResult } from '../types';

export const checkInventory = (
  materials: Material[],
  requiredMaterials: PatternMaterial[]
): { sufficient: boolean; missingIds: string[] } => {
  const missingIds: string[] = [];
  const materialMap = new Map(materials.map((m) => [m.id, m]));

  for (const req of requiredMaterials) {
    const material = materialMap.get(req.materialId);
    if (!material || material.quantity < req.quantity) {
      missingIds.push(req.materialId);
    }
  }

  return {
    sufficient: missingIds.length === 0,
    missingIds,
  };
};

export const deductInventory = (
  materials: Material[],
  requiredMaterials: PatternMaterial[]
): Material[] => {
  const materialMap = new Map(materials.map((m) => [m.id, { ...m }]));

  for (const req of requiredMaterials) {
    const material = materialMap.get(req.materialId);
    if (material && material.quantity >= req.quantity) {
      material.quantity -= req.quantity;
    }
  }

  return Array.from(materialMap.values());
};

export const calculateCost = (
  materials: Material[],
  requiredMaterials: PatternMaterial[]
): number => {
  const materialMap = new Map(materials.map((m) => [m.id, m]));
  let totalCost = 0;

  for (const req of requiredMaterials) {
    const material = materialMap.get(req.materialId);
    if (material) {
      totalCost += material.price * req.quantity;
    }
  }

  return Math.round(totalCost * 100) / 100;
};

export const findPatternsByMaterial = (
  patterns: Pattern[],
  materialId: string
): Pattern[] => {
  return patterns.filter((pattern) =>
    pattern.materials.some((m) => m.materialId === materialId)
  );
};

export const processProduction = (
  materials: Material[],
  pattern: Pattern
): { result: ProduceResult; updatedMaterials: Material[] } => {
  const { sufficient, missingIds } = checkInventory(materials, pattern.materials);

  if (!sufficient) {
    return {
      result: {
        success: false,
        missingMaterials: missingIds,
        totalCost: 0,
      },
      updatedMaterials: materials,
    };
  }

  const totalCost = calculateCost(materials, pattern.materials);
  const updatedMaterials = deductInventory(materials, pattern.materials);

  return {
    result: {
      success: true,
      missingMaterials: [],
      totalCost,
    },
    updatedMaterials,
  };
};

export const filterMaterials = (
  materials: Material[],
  searchKeyword: string,
  colorFilter: string
): Material[] => {
  return materials.filter((material) => {
    const matchesSearch =
      searchKeyword === '' ||
      material.name.toLowerCase().includes(searchKeyword.toLowerCase());
    const matchesColor = colorFilter === '' || material.color === colorFilter;
    return matchesSearch && matchesColor;
  });
};

export const filterPatterns = (
  patterns: Pattern[],
  searchKeyword: string,
  typeFilter: string
): Pattern[] => {
  return patterns.filter((pattern) => {
    const matchesSearch =
      searchKeyword === '' ||
      pattern.name.toLowerCase().includes(searchKeyword.toLowerCase());
    const matchesType = typeFilter === '' || pattern.productType === typeFilter;
    return matchesSearch && matchesType;
  });
};

export const formatCurrency = (amount: number): string => {
  return `¥${amount.toFixed(2)}`;
};
