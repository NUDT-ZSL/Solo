async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (e) {
    return null;
  }
}

export async function fetchRecords(): Promise<any[]> {
  const result = await request<any[]>('/api/records');
  return result ?? [];
}

export async function fetchRecord(id: string): Promise<any | null> {
  return await request<any>(`/api/records/${id}`);
}

export async function createRecord(data: any): Promise<any | null> {
  return await request<any>('/api/records', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteRecord(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/records/${id}`, { method: 'DELETE' });
    return res.ok;
  } catch (e) {
    return false;
  }
}

export async function fetchReport(id: string): Promise<any | null> {
  return await request<any>(`/api/reports/${id}`);
}

export async function createReport(data: any): Promise<any | null> {
  return await request<any>('/api/reports', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function searchPlace(
  query: string,
  centerLat?: number,
  centerLng?: number
): Promise<any[]> {
  try {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      limit: '8',
      bounded: '1',
    });
    if (centerLat !== undefined && centerLng !== undefined) {
      const delta = 0.5;
      const viewbox = [
        String(centerLng - delta),
        String(centerLat + delta),
        String(centerLng + delta),
        String(centerLat - delta),
      ].join(',');
      params.set('viewbox', viewbox);
    }
    const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'RideTrack-Pro/1.0',
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}
