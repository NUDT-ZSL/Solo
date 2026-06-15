import { plantDatabase } from './plantDatabase';
import type { IdentifyResult, PlantData } from '../src/types';

function calculateConfidence(plant: PlantData, input: string): number {
  const lowerInput = input.toLowerCase();
  let score = 0;
  const maxScore = 100;

  if (plant.name.toLowerCase().includes(lowerInput)) {
    score += 50;
  }

  if (plant.scientificName.toLowerCase().includes(lowerInput)) {
    score += 30;
  }

  for (const keyword of plant.keywords) {
    if (lowerInput.includes(keyword.toLowerCase())) {
      score += 15;
    }
  }

  if (plant.description.toLowerCase().includes(lowerInput)) {
    score += 10;
  }

  return Math.min(score, maxScore);
}

function randomConfidence(base: number): number {
  const variation = Math.floor(Math.random() * 20) - 10;
  return Math.max(60, Math.min(98, base + variation));
}

export function identifyByDescription(description: string): IdentifyResult[] {
  const results: { plant: PlantData; confidence: number }[] = [];

  for (const plant of plantDatabase) {
    const confidence = calculateConfidence(plant, description);
    if (confidence > 0) {
      results.push({ plant, confidence });
    }
  }

  if (results.length === 0) {
    const shuffled = [...plantDatabase].sort(() => Math.random() - 0.5);
    for (let i = 0; i < 3; i++) {
      results.push({
        plant: shuffled[i],
        confidence: randomConfidence(70),
      });
    }
  }

  results.sort((a, b) => b.confidence - a.confidence);

  return results.slice(0, 3).map(({ plant, confidence }) => ({
    id: plant.id,
    name: plant.name,
    scientificName: plant.scientificName,
    confidence: Math.round(confidence),
    image: plant.image,
    description: plant.description,
    light: plant.light,
    water: plant.water,
    temperature: plant.temperature,
    soil: plant.soil,
  }));
}

export function identifyByImage(filename: string): IdentifyResult[] {
  const results: { plant: PlantData; confidence: number }[] = [];

  for (const plant of plantDatabase) {
    if (filename.toLowerCase().includes(plant.id.toLowerCase())) {
      results.push({
        plant,
        confidence: randomConfidence(90),
      });
    }
  }

  if (results.length === 0) {
    const shuffled = [...plantDatabase].sort(() => Math.random() - 0.5);
    for (let i = 0; i < 3; i++) {
      results.push({
        plant: shuffled[i],
        confidence: randomConfidence(75),
      });
    }
  }

  results.sort((a, b) => b.confidence - a.confidence);

  return results.slice(0, 3).map(({ plant, confidence }) => ({
    id: plant.id,
    name: plant.name,
    scientificName: plant.scientificName,
    confidence: Math.round(confidence),
    image: plant.image,
    description: plant.description,
    light: plant.light,
    water: plant.water,
    temperature: plant.temperature,
    soil: plant.soil,
  }));
}

export function getPlantById(id: string): PlantData | undefined {
  return plantDatabase.find(p => p.id === id);
}

export default {
  identifyByDescription,
  identifyByImage,
  getPlantById,
};
