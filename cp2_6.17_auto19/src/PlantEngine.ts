import {
  Genes,
  Plant,
  EnvironmentThreat,
  MutationDeltas,
  LineageNode,
  GENE_MIN,
  GENE_MAX,
  THREAT_THRESHOLD,
  MUTATION_STD,
  THREAT_DURATION,
  ThreatType,
} from './types';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function gaussianRandom(std: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z * std;
}

export function createInitialGenes(): Genes {
  return {
    rootStrength: 80,
    stemToughness: 80,
    leafArea: 80,
    flowerColor: Math.floor(Math.random() * 256),
  };
}

export function applyMutation(genes: Genes): { genes: Genes; deltas: MutationDeltas } {
  const deltas: MutationDeltas = {
    rootStrength: 0,
    stemToughness: 0,
    leafArea: 0,
    flowerColor: 0,
  };
  const newGenes: Genes = { ...genes };

  (Object.keys(newGenes) as (keyof Genes)[]).forEach((key) => {
    const mean = newGenes[key];
    const mutation = gaussianRandom(MUTATION_STD) * mean;
    deltas[key] = mutation;
    newGenes[key] = clamp(Math.round(newGenes[key] + mutation), GENE_MIN, GENE_MAX);
  });

  return { genes: newGenes, deltas };
}

export function crossBreed(
  parent1: Plant,
  parent2: Plant,
  currentCycle: number,
  nextX: number,
  nextY: number
): Plant {
  const p1g = parent1.genes;
  const p2g = parent2.genes;

  const avgGenes: Genes = {
    rootStrength: Math.round((p1g.rootStrength + p2g.rootStrength) / 2),
    stemToughness: Math.round((p1g.stemToughness + p2g.stemToughness) / 2),
    leafArea: Math.round((p1g.leafArea + p2g.leafArea) / 2),
    flowerColor: Math.round((p1g.flowerColor + p2g.flowerColor) / 2),
  };

  const { genes: finalGenes, deltas } = applyMutation(avgGenes);

  return {
    id: `plant-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    genes: finalGenes,
    generation: Math.max(parent1.generation, parent2.generation) + 1,
    growthProgress: 0,
    x: nextX,
    y: nextY,
    parentId1: parent1.id,
    parentId2: parent2.id,
    hybridCycle: currentCycle,
    mutationDeltas: deltas,
    isSelected: false,
    health: 100,
    grayLevel: 0,
  };
}

export function createSeedPlant(x: number, y: number): Plant {
  return {
    id: `seed-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    genes: createInitialGenes(),
    generation: 0,
    growthProgress: 0,
    x,
    y,
    parentId1: null,
    parentId2: null,
    hybridCycle: null,
    mutationDeltas: null,
    isSelected: false,
    health: 100,
    grayLevel: 0,
  };
}

export function growPlant(plant: Plant, dt: number, speedMultiplier: number): Plant {
  const growthRate = 0.0002 * speedMultiplier;
  const slowedRate = growthRate * (plant.health / 100);
  const newProgress = clamp(plant.growthProgress + slowedRate * dt, 0, 1);
  return { ...plant, growthProgress: newProgress };
}

export function checkThreatEffects(
  plant: Plant,
  threat: EnvironmentThreat | null,
  dt: number
): { health: number; grayLevel: number; growthSlowdown: number } {
  if (!threat) {
    const targetHealth = clamp(plant.health + dt * 0.005, 0, 100);
    const targetGray = clamp(plant.grayLevel - dt * 0.001, 0, 1);
    return { health: targetHealth, grayLevel: targetGray, growthSlowdown: 1 };
  }

  let damageMultiplier = 1;
  let damagePerMs = 0.001;

  switch (threat.type) {
    case 'DROUGHT':
      if (plant.genes.rootStrength < THREAT_THRESHOLD) damageMultiplier = 2;
      damagePerMs = 0.002 * damageMultiplier * threat.intensity;
      break;
    case 'PEST':
      if (plant.genes.stemToughness < THREAT_THRESHOLD) damageMultiplier = 2;
      damagePerMs = 0.0025 * damageMultiplier * threat.intensity;
      break;
    case 'WIND':
      if (plant.genes.stemToughness < THREAT_THRESHOLD) damageMultiplier = 2;
      damagePerMs = 0.0015 * damageMultiplier * threat.intensity;
      break;
    case 'FROST':
      if (plant.genes.leafArea < THREAT_THRESHOLD) damageMultiplier = 2;
      damagePerMs = 0.0018 * damageMultiplier * threat.intensity;
      break;
  }

  const newHealth = clamp(plant.health - damagePerMs * dt, 0, 100);
  const healthRatio = newHealth / 100;
  const targetGray = 1 - healthRatio * 0.8;
  const slowdown = 0.2 + healthRatio * 0.8;

  return {
    health: newHealth,
    grayLevel: clamp(targetGray, 0, 1),
    growthSlowdown: slowdown,
  };
}

export function generateRandomThreat(currentTime: number): EnvironmentThreat | null {
  if (Math.random() > 0.6) return null;
  const types: ThreatType[] = ['DROUGHT', 'PEST', 'WIND', 'FROST'];
  const type = types[Math.floor(Math.random() * types.length)];
  return {
    type,
    startTime: currentTime,
    duration: THREAT_DURATION,
    intensity: 0.7 + Math.random() * 0.6,
  };
}

export function isThreatActive(threat: EnvironmentThreat | null, currentTime: number): EnvironmentThreat | null {
  if (!threat) return null;
  if (currentTime - threat.startTime >= threat.duration) return null;
  return threat;
}

export function buildLineageTree(plants: Plant[]): LineageNode[] {
  const plantMap = new Map<string, LineageNode>();
  const roots: LineageNode[] = [];

  const sorted = [...plants].sort((a, b) => a.generation - b.generation);

  sorted.forEach((plant) => {
    const node: LineageNode = {
      plantId: plant.id,
      genes: { ...plant.genes },
      generation: plant.generation,
      hybridCycle: plant.hybridCycle,
      mutationDeltas: plant.mutationDeltas,
      children: [],
    };
    plantMap.set(plant.id, node);

    if (plant.parentId1 && plant.parentId2) {
      const p1 = plantMap.get(plant.parentId1);
      const p2 = plantMap.get(plant.parentId2);
      if (p1) p1.children.push(node);
      if (p2 && p1 !== p2) p2.children.push(node);
      if (!p1 && !p2) roots.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

export function checkAchievement(plants: Plant[]): boolean {
  return plants.some((plant) => {
    const attrs = [
      plant.genes.rootStrength,
      plant.genes.stemToughness,
      plant.genes.leafArea,
    ];
    const overCount = attrs.filter((v) => v > 70).length;
    return overCount >= 3;
  });
}
