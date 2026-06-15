import { plantDatabase } from './plantDatabase';
import type { IdentifyResult, PlantData } from '../src/types';

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[，。！？、；：""''（）\[\]【】]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 0);
}

function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  if (s1 === s2) return 100;
  if (s1.includes(s2) || s2.includes(s1)) return 85;
  
  const tokens1 = tokenize(s1);
  const tokens2 = tokenize(s2);
  
  if (tokens1.length === 0 || tokens2.length === 0) return 0;
  
  let matches = 0;
  for (const t1 of tokens1) {
    for (const t2 of tokens2) {
      if (t1 === t2 || t1.includes(t2) || t2.includes(t1)) {
        matches++;
        break;
      }
    }
  }
  
  return Math.round((matches / Math.max(tokens1.length, tokens2.length)) * 60);
}

function calculateConfidence(plant: PlantData, input: string): number {
  const lowerInput = input.toLowerCase().trim();
  if (!lowerInput) return 0;

  let score = 0;
  let weights = { name: 0, scientificName: 0, keywords: 0, description: 0 };

  const nameSim = calculateSimilarity(plant.name, lowerInput);
  if (nameSim > 0) {
    weights.name = 0.40;
    score += nameSim * weights.name;
  }

  const sciSim = calculateSimilarity(plant.scientificName, lowerInput);
  if (sciSim > 0) {
    weights.scientificName = 0.25;
    score += sciSim * weights.scientificName;
  }

  const inputTokens = tokenize(lowerInput);
  let keywordMatches = 0;
  for (const keyword of plant.keywords) {
    const kw = keyword.toLowerCase();
    for (const token of inputTokens) {
      if (token === kw || token.includes(kw) || kw.includes(token)) {
        keywordMatches++;
        break;
      }
    }
  }
  if (keywordMatches > 0) {
    weights.keywords = 0.25;
    const kwScore = Math.min(100, keywordMatches * 25);
    score += kwScore * weights.keywords;
  }

  const descTokens = tokenize(plant.description);
  let descMatches = 0;
  for (const it of inputTokens) {
    for (const dt of descTokens) {
      if (it === dt || it.includes(dt) || dt.includes(it)) {
        descMatches++;
        break;
      }
    }
  }
  if (descMatches > 0) {
    weights.description = 0.10;
    const descScore = Math.min(100, descMatches * 20);
    score += descScore * weights.description;
  }

  const totalWeight = weights.name + weights.scientificName + weights.keywords + weights.description;
  if (totalWeight > 0) {
    score = score / totalWeight * 100;
  }

  const randomFactor = (Math.random() - 0.5) * 8;
  score = Math.max(0, Math.min(98, score + randomFactor));

  return Math.round(score);
}

function calculateImageConfidence(filename: string, plant: PlantData): number {
  const lowerFilename = filename.toLowerCase();
  let baseConfidence = 65;

  for (const keyword of plant.keywords) {
    if (lowerFilename.includes(keyword.toLowerCase())) {
      baseConfidence += 10;
    }
  }

  if (lowerFilename.includes(plant.id.toLowerCase())) {
    baseConfidence += 20;
  }

  if (lowerFilename.includes(plant.name.toLowerCase())) {
    baseConfidence += 15;
  }

  const randomFactor = (Math.random() - 0.5) * 12;
  return Math.max(60, Math.min(98, baseConfidence + randomFactor));
}

export function identifyByDescription(description: string): IdentifyResult[] {
  const results: { plant: PlantData; confidence: number }[] = [];
  const lowerDesc = description.toLowerCase().trim();

  if (!lowerDesc) {
    const shuffled = [...plantDatabase].sort(() => Math.random() - 0.5);
    for (let i = 0; i < 3; i++) {
      results.push({
        plant: shuffled[i],
        confidence: Math.round(60 + Math.random() * 15),
      });
    }
  } else {
    for (const plant of plantDatabase) {
      const confidence = calculateConfidence(plant, description);
      if (confidence >= 30) {
        results.push({ plant, confidence });
      }
    }

    if (results.length === 0) {
      const shuffled = [...plantDatabase].sort(() => Math.random() - 0.5);
      for (let i = 0; i < 3; i++) {
        results.push({
          plant: shuffled[i],
          confidence: Math.round(45 + Math.random() * 20),
        });
      }
    }
  }

  results.sort((a, b) => b.confidence - a.confidence);

  const resultCount = Math.min(results.length, Math.max(2, Math.min(5, Math.ceil(results.length / 10) + 2)));

  return results.slice(0, resultCount).map(({ plant, confidence }) => ({
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

export function identifyByImage(filename: string, description?: string): IdentifyResult[] {
  const results: { plant: PlantData; confidence: number }[] = [];

  for (const plant of plantDatabase) {
    let confidence = calculateImageConfidence(filename, plant);
    
    if (description && description.trim()) {
      const descConfidence = calculateConfidence(plant, description);
      confidence = Math.round(confidence * 0.7 + descConfidence * 0.3);
    }
    
    if (confidence >= 40) {
      results.push({ plant, confidence });
    }
  }

  if (results.length === 0) {
    const shuffled = [...plantDatabase].sort(() => Math.random() - 0.5);
    for (let i = 0; i < 3; i++) {
      results.push({
        plant: shuffled[i],
        confidence: Math.round(55 + Math.random() * 20),
      });
    }
  }

  results.sort((a, b) => b.confidence - a.confidence);

  const resultCount = Math.min(results.length, Math.max(2, Math.min(5, Math.ceil(results.length / 10) + 2)));

  return results.slice(0, resultCount).map(({ plant, confidence }) => ({
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
