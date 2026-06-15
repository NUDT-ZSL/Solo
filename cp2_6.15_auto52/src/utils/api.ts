import type { GalleryLayout, LayoutElement, Artwork, Invitation } from '@/types';

const API_BASE = '/api';

export const api = {
  async getLayout(): Promise<GalleryLayout> {
    const response = await fetch(`${API_BASE}/layout`);
    if (!response.ok) throw new Error('Failed to fetch layout');
    return response.json();
  },

  async updateLayout(id: string, elements: LayoutElement[]): Promise<GalleryLayout> {
    const response = await fetch(`${API_BASE}/layout/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ elements }),
    });
    if (!response.ok) throw new Error('Failed to update layout');
    return response.json();
  },

  async getArtworks(): Promise<Artwork[]> {
    const response = await fetch(`${API_BASE}/artwork`);
    if (!response.ok) throw new Error('Failed to fetch artworks');
    return response.json();
  },

  async uploadArtwork(
    file: File,
    name: string,
    description: string,
    tags: string[],
    onProgress?: (progress: number) => void
  ): Promise<Artwork> {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', name);
      formData.append('description', description);
      formData.append('tags', JSON.stringify(tags));

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const progress = Math.round((e.loaded / e.total) * 100);
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.open('POST', `${API_BASE}/artwork/upload`);
      xhr.send(formData);
    });
  },

  async sendInvite(email: string): Promise<{ success: boolean; invitation: Invitation }> {
    const response = await fetch(`${API_BASE}/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!response.ok) throw new Error('Failed to send invite');
    return response.json();
  },
};
