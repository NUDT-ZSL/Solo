import type { TourCity } from '../types';

export function haversineDistance(
  lat1: number, lng1: number, lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function optimizeRoute(cities: TourCity[]): TourCity[] {
  if (cities.length <= 2) return cities;

  const unvisited = [...cities];
  const result: TourCity[] = [unvisited.shift()!];

  while (unvisited.length > 0) {
    const current = result[result.length - 1];
    let nearestIdx = 0;
    let nearestDist = Infinity;

    unvisited.forEach((c, i) => {
      const d = haversineDistance(current.lat, current.lng, c.lat, c.lng);
      if (d < nearestDist) {
        nearestDist = d;
        nearestIdx = i;
      }
    });

    result.push(unvisited.splice(nearestIdx, 1)[0]);
  }

  return result;
}

export function popularityToColor(popularity: number): string {
  const p = Math.max(0, Math.min(100, popularity));
  const r1 = 34, g1 = 197, b1 = 94;
  const r2 = 239, g2 = 68, b2 = 68;
  const t = p / 100;
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

export function formatDate(date: string): string {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
