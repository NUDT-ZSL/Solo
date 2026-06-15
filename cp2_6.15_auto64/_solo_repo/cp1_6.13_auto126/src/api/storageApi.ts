export interface SavedSoundscape {
  _id: string;
  name: string;
  spheres: any[];
  globalSettings: any;
  createdAt: string;
}

const API_BASE = '/api/soundscapes';

export async function saveSoundscape(
  name: string,
  spheres: any[],
  globalSettings: any
): Promise<SavedSoundscape> {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, spheres, globalSettings }),
  });
  if (!res.ok) throw new Error('Failed to save soundscape');
  return res.json();
}

export async function loadSoundscapes(): Promise<SavedSoundscape[]> {
  const res = await fetch(API_BASE);
  if (!res.ok) throw new Error('Failed to load soundscapes');
  return res.json();
}

export async function loadSoundscapeById(id: string): Promise<SavedSoundscape> {
  const res = await fetch(`${API_BASE}/${id}`);
  if (!res.ok) throw new Error('Failed to load soundscape');
  return res.json();
}

export async function deleteSoundscape(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete soundscape');
}
