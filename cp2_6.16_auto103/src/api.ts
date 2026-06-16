import type { StarData } from './types';

export async function fetchStars(
  ra: number,
  dec: number,
  fieldSize: number
): Promise<StarData[]> {
  const url = `/api/stars?ra=${encodeURIComponent(ra)}&dec=${encodeURIComponent(dec)}&fieldSize=${encodeURIComponent(fieldSize)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`请求失败: ${response.status} ${response.statusText}`);
  }
  return response.json();
}
