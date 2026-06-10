import type { FilmRoll, Photo } from './types';

const BASE = '/api';

export async function getRolls(): Promise<FilmRoll[]> {
  const res = await fetch(`${BASE}/filmrolls`);
  if (!res.ok) throw new Error('Failed to fetch film rolls');
  return res.json();
}

export async function getRoll(id: string): Promise<FilmRoll> {
  const res = await fetch(`${BASE}/filmrolls/${id}`);
  if (!res.ok) throw new Error('Failed to fetch film roll');
  return res.json();
}

export async function getRollByShareLink(link: string): Promise<FilmRoll> {
  const res = await fetch(`${BASE}/filmrolls/share/${link}`);
  if (!res.ok) throw new Error('Failed to fetch film roll by share link');
  return res.json();
}

export async function createRoll(title: string): Promise<FilmRoll> {
  const res = await fetch(`${BASE}/filmrolls`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error('Failed to create film roll');
  return res.json();
}

export async function uploadPhotos(id: string, files: File[]): Promise<Photo[]> {
  const formData = new FormData();
  files.forEach(file => formData.append('photos', file));
  const res = await fetch(`${BASE}/filmrolls/${id}/photos`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Failed to upload photos');
  return res.json();
}

export async function updateRoll(
  id: string,
  data: Partial<{ title: string; photos: Photo[] }>
): Promise<FilmRoll> {
  const res = await fetch(`${BASE}/filmrolls/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update film roll');
  return res.json();
}

export async function deletePhoto(id: string, photoId: string): Promise<void> {
  const res = await fetch(`${BASE}/filmrolls/${id}/photos/${photoId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete photo');
}
