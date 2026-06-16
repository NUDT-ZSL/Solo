export type Emotion = 'happy' | 'sad' | 'angry' | 'calm' | 'anxious';

export interface ControlState {
  emotion: Emotion;
  speed: number;
  hueOffset: number;
  complexity: number;
}

export interface PresetConfig extends ControlState {
  color: string;
}

export interface SavedArtwork {
  id: string;
  thumbnail: string;
  emotion: Emotion;
  emotionLabel: string;
  speed: number;
  hueOffset: number;
  complexity: number;
  createdAt: string;
}

export type SaveArtworkRequest = Omit<SavedArtwork, 'id' | 'createdAt'>;

export async function fetchPresets(): Promise<PresetConfig[]> {
  const response = await fetch('/api/presets');
  if (!response.ok) {
    throw new Error('Failed to fetch presets');
  }
  return response.json();
}

export async function saveArtwork(data: SaveArtworkRequest): Promise<SavedArtwork> {
  const response = await fetch('/api/save', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to save artwork');
  }
  return response.json();
}

export async function fetchGallery(): Promise<SavedArtwork[]> {
  const response = await fetch('/api/gallery');
  if (!response.ok) {
    throw new Error('Failed to fetch gallery');
  }
  return response.json();
}
