export interface Hall {
  id: string;
  name: string;
  width: number;
  height: number;
  depth: number;
  wallColor: string;
  floorTexture: string;
  connections: { targetHallId: string; direction: string; corridorLength: number }[];
  artworks: Artwork[];
}

export interface Artwork {
  id: string;
  hallId: string;
  title: string;
  artist: string;
  year: number;
  description: string;
  imageUrl: string;
  wall: string;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
}

export async function fetchHalls(): Promise<Hall[]> {
  const res = await fetch('/api/halls');
  if (!res.ok) throw new Error(`Failed to fetch halls: ${res.status}`);
  return res.json();
}

export async function fetchHall(id: string): Promise<Hall> {
  const res = await fetch(`/api/halls/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch hall: ${res.status}`);
  return res.json();
}

export async function createHall(data: Omit<Hall, 'id' | 'artworks'>): Promise<Hall> {
  const res = await fetch('/api/halls', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to create hall: ${res.status}`);
  return res.json();
}

export async function updateHall(id: string, data: Partial<Hall>): Promise<Hall> {
  const res = await fetch(`/api/halls/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to update hall: ${res.status}`);
  return res.json();
}

export async function deleteHall(id: string): Promise<void> {
  const res = await fetch(`/api/halls/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Failed to delete hall: ${res.status}`);
}

export async function addArtwork(hallId: string, data: FormData): Promise<Artwork> {
  const res = await fetch(`/api/halls/${hallId}/artworks`, {
    method: 'POST',
    body: data,
  });
  if (!res.ok) throw new Error(`Failed to add artwork: ${res.status}`);
  return res.json();
}

export async function deleteArtwork(hallId: string, artworkId: string): Promise<void> {
  const res = await fetch(`/api/halls/${hallId}/artworks/${artworkId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Failed to delete artwork: ${res.status}`);
}
