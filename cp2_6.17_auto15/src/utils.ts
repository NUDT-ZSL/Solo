import dayjs from 'dayjs';
import type { PlantDetail, RecognitionResult, FavoriteItem } from './types';

export function cosineSimilarity(v1: number[], v2: number[]): number {
  if (v1.length !== v2.length) return 0;
  let dot = 0;
  let n1 = 0;
  let n2 = 0;
  for (let i = 0; i < v1.length; i++) {
    dot += v1[i] * v2[i];
    n1 += v1[i] * v1[i];
    n2 += v2[i] * v2[i];
  }
  const denom = Math.sqrt(n1) * Math.sqrt(n2);
  return denom === 0 ? 0 : dot / denom;
}

export function generateRandomVector(length: number): number[] {
  const vec: number[] = [];
  for (let i = 0; i < length; i++) {
    vec.push(Math.random());
  }
  const sum = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  return vec.map((v) => v / sum);
}

export async function recognizeLeaf(
  imageDataUrl: string,
  plants: PlantDetail[]
): Promise<RecognitionResult> {
  return new Promise((resolve) => {
    const delay = 800 + Math.random() * 1200;
    setTimeout(() => {
      const inputVector = generateRandomVector(8);
      const results = plants.map((plant) => ({
        plant,
        similarity: cosineSimilarity(inputVector, plant.featureVector),
      }));
      results.sort((a, b) => b.similarity - a.similarity);
      const best = results[0];
      const confidence = Math.max(0.8, Math.min(0.98, best.similarity + 0.1));
      resolve({
        plant: best.plant,
        confidence,
      });
    }, delay);
  });
}

const FAVORITES_KEY = 'tree_recognition_favorites';
const VIEWED_KEY = 'tree_recognition_viewed';

export function getFavorites(): FavoriteItem[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as FavoriteItem[];
  } catch {
    return [];
  }
}

export function saveFavorites(items: FavoriteItem[]): void {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(items));
}

export function addFavorite(plantId: string): FavoriteItem[] {
  const favorites = getFavorites();
  if (!favorites.some((f) => f.plantId === plantId)) {
    favorites.unshift({
      plantId,
      addedAt: new Date().toISOString(),
    });
    saveFavorites(favorites);
  }
  return favorites;
}

export function removeFavorite(plantId: string): FavoriteItem[] {
  const favorites = getFavorites().filter((f) => f.plantId !== plantId);
  saveFavorites(favorites);
  return favorites;
}

export function isFavorite(plantId: string): boolean {
  return getFavorites().some((f) => f.plantId === plantId);
}

export function getViewedPlantIdsThisWeek(): Set<string> {
  try {
    const raw = localStorage.getItem(VIEWED_KEY);
    if (!raw) return new Set();
    const data = JSON.parse(raw) as Record<string, string[]>;
    const weekKey = dayjs().startOf('week').toISOString();
    return new Set(data[weekKey] || []);
  } catch {
    return new Set();
  }
}

export function markPlantViewed(plantId: string): void {
  try {
    const raw = localStorage.getItem(VIEWED_KEY);
    const data: Record<string, string[]> = raw ? JSON.parse(raw) : {};
    const weekKey = dayjs().startOf('week').toISOString();
    if (!data[weekKey]) data[weekKey] = [];
    if (!data[weekKey].includes(plantId)) {
      data[weekKey].push(plantId);
    }
    localStorage.setItem(VIEWED_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export function formatDate(iso: string): string {
  return dayjs(iso).format('YYYY-MM-DD');
}

export function dataUrlToFile(dataUrl: string, filename: string): File {
  const arr = dataUrl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}
