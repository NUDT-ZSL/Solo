export interface CoffeeBean {
  id: number;
  name: string;
  origin: string;
  description: string;
  color: string;
}

export interface Flavor {
  id: number;
  name: string;
  emoji: string;
  gradient: [string, string];
}

export interface Combination {
  beanId: number;
  flavorId: number;
  score: number;
  aroma: string;
}

export async function getBeans(): Promise<CoffeeBean[]> {
  const response = await fetch('/api/beans');
  if (!response.ok) {
    throw new Error('Failed to fetch beans');
  }
  return response.json();
}

export async function getFlavors(): Promise<Flavor[]> {
  const response = await fetch('/api/flavors');
  if (!response.ok) {
    throw new Error('Failed to fetch flavors');
  }
  return response.json();
}

export async function getCombination(beanId: number, flavorId: number): Promise<Combination> {
  const response = await fetch(`/api/combinations?beanId=${beanId}&flavorId=${flavorId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch combination');
  }
  return response.json();
}
