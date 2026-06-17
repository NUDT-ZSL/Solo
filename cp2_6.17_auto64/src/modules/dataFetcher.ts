export interface TrafficDataPoint {
  intersectionId: string;
  x: number;
  y: number;
  hour: number;
  vehicleCount: number;
  avgSpeed: number;
  congestionIndex: number;
  region: 'east' | 'south' | 'west' | 'north' | 'center';
  directions: {
    east: number;
    south: number;
    west: number;
    north: number;
  };
}

let cache: TrafficDataPoint[] | null = null;

export async function fetchTrafficData(): Promise<TrafficDataPoint[]> {
  if (cache !== null) {
    return cache;
  }

  const response = await fetch('/api/traffic');
  const data: TrafficDataPoint[] = await response.json();
  cache = data;
  return data;
}

export function clearCache(): void {
  cache = null;
}
