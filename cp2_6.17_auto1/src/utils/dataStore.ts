import type { Photo } from '@/types';

const STORAGE_KEY = 'sky_album_photos';

export function loadPhotos(): Photo[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load photos from localStorage:', e);
  }
  return [];
}

export function savePhotos(photos: Photo[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(photos));
  } catch (e) {
    console.error('Failed to save photos to localStorage:', e);
  }
}

export function addPhoto(photo: Photo): void {
  const photos = loadPhotos();
  photos.push(photo);
  savePhotos(photos);
}

export function updatePhoto(id: string, updates: Partial<Photo>): void {
  const photos = loadPhotos();
  const index = photos.findIndex(p => p.id === id);
  if (index !== -1) {
    photos[index] = { ...photos[index], ...updates };
    savePhotos(photos);
  }
}

export function deletePhoto(id: string): void {
  const photos = loadPhotos();
  const filtered = photos.filter(p => p.id !== id);
  savePhotos(filtered);
}

export function batchAddTags(photoIds: string[], tag: string): void {
  const photos = loadPhotos();
  const updated = photos.map(photo => {
    if (photoIds.includes(photo.id) && !photo.tags.includes(tag)) {
      const newTags = [...photo.tags];
      if (newTags.length < 10) {
        newTags.push(tag);
      }
      return { ...photo, tags: newTags };
    }
    return photo;
  });
  savePhotos(updated);
}

export function addTagToPhoto(photoId: string, tag: string): void {
  const photos = loadPhotos();
  const index = photos.findIndex(p => p.id === photoId);
  if (index !== -1 && !photos[index].tags.includes(tag) && photos[index].tags.length < 10) {
    photos[index].tags.push(tag);
    savePhotos(photos);
  }
}

export function removeTagFromPhoto(photoId: string, tag: string): void {
  const photos = loadPhotos();
  const index = photos.findIndex(p => p.id === photoId);
  if (index !== -1) {
    photos[index].tags = photos[index].tags.filter(t => t !== tag);
    savePhotos(photos);
  }
}
