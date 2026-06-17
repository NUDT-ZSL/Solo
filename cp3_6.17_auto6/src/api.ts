import type { VideoMeta, Marker } from './types';

const BASE = '/api';

export function uploadVideo(
  file: File,
  duration: number,
  onProgress?: (pct: number) => void
): Promise<VideoMeta> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append('file', file);
    form.append('duration', String(duration));
    xhr.open('POST', `${BASE}/videos/upload`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const res = JSON.parse(xhr.responseText);
        resolve(res.video);
      } else {
        let msg = '上传失败';
        try {
          msg = JSON.parse(xhr.responseText).error || msg;
        } catch {
          /* ignore */
        }
        reject(new Error(msg));
      }
    };
    xhr.onerror = () => reject(new Error('网络错误'));
    xhr.send(form);
  });
}

export async function fetchVideos(): Promise<VideoMeta[]> {
  const res = await fetch(`${BASE}/videos`);
  const data = await res.json();
  return data.videos;
}

export async function deleteVideo(id: string): Promise<void> {
  await fetch(`${BASE}/videos/${id}`, { method: 'DELETE' });
}

export async function fetchMarkers(): Promise<Marker[]> {
  const res = await fetch(`${BASE}/markers`);
  const data = await res.json();
  return data.markers;
}

export async function createMarker(
  marker: Omit<Marker, 'id' | 'order'>
): Promise<Marker> {
  const res = await fetch(`${BASE}/markers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(marker),
  });
  const data = await res.json();
  return data.marker;
}

export async function updateMarker(
  id: string,
  patch: Partial<Marker>
): Promise<Marker> {
  const res = await fetch(`${BASE}/markers/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  const data = await res.json();
  return data.marker;
}

export async function reorderMarkers(orderedIds: string[]): Promise<void> {
  await fetch(`${BASE}/markers/reorder`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderedIds }),
  });
}

export async function deleteMarker(id: string): Promise<void> {
  await fetch(`${BASE}/markers/${id}`, { method: 'DELETE' });
}
