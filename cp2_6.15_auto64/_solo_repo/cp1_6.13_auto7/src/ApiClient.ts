export interface PlanetSummary {
  id: string;
  name: string;
  type: string;
  mass: string;
  radius: number;
  color: string;
  orbitRadius: number;
  orbitSpeed: number;
  hasRings: boolean;
  parentPlanet?: string;
}

export interface PlanetDetail extends PlanetSummary {
  description: string;
  orbitPeriod: string;
  avgTemperature: string;
  gravity: string;
  dayLength: string;
  moons: number;
  discoveredBy: string;
  discoveryDate: string;
}

const TIMEOUT_MS = 5000;

async function request<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return (await response.json()) as T;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('请求超时，请稍后重试');
    }
    throw error;
  }
}

export const ApiClient = {
  async getAllPlanets(): Promise<PlanetSummary[]> {
    return request<PlanetSummary[]>('/api/planets');
  },

  async getPlanetById(id: string): Promise<PlanetDetail> {
    return request<PlanetDetail>(`/api/planets/${id}`);
  },
};
