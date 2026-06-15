import type { Sculpture, CaptureRequest, CaptureResponse, FeaturedSnapshot } from '@/types';

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  return (await res.json()) as T;
}

export const api = {
  getSculptures: () => request<Sculpture[]>('/sculptures'),

  captureView: (payload: CaptureRequest) =>
    request<CaptureResponse>('/capture', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  getFeatured: () => request<FeaturedSnapshot[]>('/featured'),

  recordClick: (snapshotId: string) =>
    request<{ id: string; clickCount: number }>(`/featured/${snapshotId}/click`, {
      method: 'POST'
    })
};

export function encodeViewParams(params: {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  zoom: number;
  sculptureId?: string;
}): string {
  const p = params.position;
  const t = params.target;
  const search = new URLSearchParams();
  search.set('pos', `${p.x.toFixed(3)},${p.y.toFixed(3)},${p.z.toFixed(3)}`);
  search.set('target', `${t.x.toFixed(3)},${t.y.toFixed(3)},${t.z.toFixed(3)}`);
  search.set('zoom', params.zoom.toFixed(3));
  if (params.sculptureId) search.set('sid', params.sculptureId);
  return search.toString();
}

export function decodeViewParams(searchStr: string): {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  zoom: number;
  sculptureId?: string;
} | null {
  try {
    const params = new URLSearchParams(searchStr);
    const posStr = params.get('pos');
    const targetStr = params.get('target');
    const zoomStr = params.get('zoom');
    if (!posStr || !targetStr || !zoomStr) return null;
    const [px, py, pz] = posStr.split(',').map(parseFloat);
    const [tx, ty, tz] = targetStr.split(',').map(parseFloat);
    const zoom = parseFloat(zoomStr);
    if ([px, py, pz, tx, ty, tz, zoom].some(isNaN)) return null;
    const result: any = {
      position: { x: px, y: py, z: pz },
      target: { x: tx, y: ty, z: tz },
      zoom
    };
    const sid = params.get('sid');
    if (sid) result.sculptureId = sid;
    return result;
  } catch {
    return null;
  }
}
