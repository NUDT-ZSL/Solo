export interface ClimateRecord {
  lat: number;
  lon: number;
  value: number;
}

export interface ClimateData {
  records: ClimateRecord[];
}

export type ClimateVariable = 'temperature' | 'pressure' | 'precipitation';

const dataCache = new Map<string, ClimateData>();

export async function loadClimateData(
  variable: ClimateVariable,
  month: number
): Promise<ClimateData> {
  const cacheKey = `${variable}_${month}`;
  
  if (dataCache.has(cacheKey)) {
    return dataCache.get(cacheKey)!;
  }
  
  try {
    const response = await fetch(`/api/data/${variable}/${month}`);
    if (!response.ok) {
      throw new Error(`Failed to load data: ${response.status}`);
    }
    const data: ClimateData = await response.json();
    dataCache.set(cacheKey, data);
    return data;
  } catch (error) {
    console.error('Error loading climate data:', error);
    throw error;
  }
}

export async function preloadAllData(variable: ClimateVariable): Promise<void> {
  const promises: Promise<ClimateData>[] = [];
  for (let month = 1; month <= 12; month++) {
    promises.push(loadClimateData(variable, month));
  }
  await Promise.all(promises);
}

export function getValueRange(variable: ClimateVariable): { min: number; max: number } {
  switch (variable) {
    case 'temperature':
      return { min: -40, max: 40 };
    case 'pressure':
      return { min: 980, max: 1040 };
    case 'precipitation':
      return { min: 0, max: 500 };
    default:
      return { min: 0, max: 100 };
  }
}
