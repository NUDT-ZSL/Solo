import axios from 'axios';
import type { TravelNode } from '../types';

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: {
        lat,
        lon: lng,
        format: 'json',
        'accept-language': 'zh',
      },
      headers: {
        'User-Agent': 'TravelogueCanvas/1.0',
      },
    });
    return res.data?.display_name || '未知地点';
  } catch {
    return '未知地点';
  }
}

export function generateBezierPath(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
  segments: number = 40
): { lat: number; lng: number }[] {
  const midLat = (start.lat + end.lat) / 2;
  const midLng = (start.lng + end.lng) / 2;
  const dx = end.lng - start.lng;
  const dy = end.lat - start.lat;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const offset = dist * 0.25;

  const perpX = -dy / (dist || 1);
  const perpY = dx / (dist || 1);
  const ctrlLat = midLat + perpY * offset;
  const ctrlLng = midLng + perpX * offset;

  const points: { lat: number; lng: number }[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const lat =
      (1 - t) * (1 - t) * start.lat + 2 * (1 - t) * t * ctrlLat + t * t * end.lat;
    const lng =
      (1 - t) * (1 - t) * start.lng + 2 * (1 - t) * t * ctrlLng + t * t * end.lng;
    points.push({ lat, lng });
  }
  return points;
}

export function calculateBounds(
  nodes: TravelNode[]
): { minLat: number; maxLat: number; minLng: number; maxLng: number } | null {
  if (nodes.length === 0) return null;
  let minLat = Infinity,
    maxLat = -Infinity,
    minLng = Infinity,
    maxLng = -Infinity;
  for (const n of nodes) {
    if (n.lat < minLat) minLat = n.lat;
    if (n.lat > maxLat) maxLat = n.lat;
    if (n.lng < minLng) minLng = n.lng;
    if (n.lng > maxLng) maxLng = n.lng;
  }
  return { minLat, maxLat, minLng, maxLng };
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export const EMOJI_PRESETS = [
  '🍜',
  '🏔️',
  '👫',
  '🌅',
  '🎭',
  '🎒',
  '🏖️',
  '🏙️',
  '🏕️',
  '🎡',
  '🚂',
  '📸',
  '🍷',
  '🎵',
  '⛵',
];
