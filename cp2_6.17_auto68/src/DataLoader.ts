import { PlanetData } from './types';

let cachedData: PlanetData[] | null = null;

export async function loadPlanetData(): Promise<PlanetData[]> {
  if (cachedData) return cachedData;

  const response = await fetch('/api/orbits');
  if (!response.ok) {
    throw new Error(`Failed to fetch planet data: ${response.statusText}`);
  }
  cachedData = await response.json();
  return cachedData!;
}

export function getCachedData(): PlanetData[] | null {
  return cachedData;
}
