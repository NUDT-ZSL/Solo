export interface Artwork {
  id: string;
  title: string;
  dataUrl: string;
  thumbnailUrl: string;
  likes: number;
  liked: boolean;
  createdAt: number;
}

const STORAGE_KEY = 'graffiti_gallery';
const THUMBNAIL_SIZE = 150;
const THUMBNAIL_TIMEOUT = 200;

interface GalleryStorage {
  version: number;
  artworks: Artwork[];
}

function generateThumbnail(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Thumbnail generation timed out'));
    }, THUMBNAIL_TIMEOUT);

    const img = new Image();
    img.onload = () => {
      clearTimeout(timeoutId);
      const canvas = document.createElement('canvas');
      canvas.width = THUMBNAIL_SIZE;
      canvas.height = THUMBNAIL_SIZE;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.fillStyle = '#2C2C2C';
      ctx.fillRect(0, 0, THUMBNAIL_SIZE, THUMBNAIL_SIZE);

      const scale = Math.min(THUMBNAIL_SIZE / img.width, THUMBNAIL_SIZE / img.height);
      const x = (THUMBNAIL_SIZE - img.width * scale) / 2;
      const y = (THUMBNAIL_SIZE - img.height * scale) / 2;
      
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
      resolve(canvas.toDataURL('image/png', 0.8));
    };
    img.onerror = () => {
      clearTimeout(timeoutId);
      reject(new Error('Failed to load image'));
    };
    img.src = dataUrl;
  });
}

export class GalleryManager {
  private artworks: Artwork[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data: GalleryStorage = JSON.parse(stored);
        if (data.version === 1 && Array.isArray(data.artworks)) {
          this.artworks = data.artworks;
        }
      }
    } catch (e) {
      console.error('Failed to load gallery from storage:', e);
      this.artworks = [];
    }
  }

  private saveToStorage(): void {
    try {
      const data: GalleryStorage = {
        version: 1,
        artworks: this.artworks,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save gallery to storage:', e);
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(callback => callback());
  }

  subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  async saveArtwork(dataUrl: string, title: string): Promise<Artwork> {
    const id = Date.now().toString();
    const createdAt = Date.now();
    
    let thumbnailUrl = dataUrl;
    try {
      thumbnailUrl = await generateThumbnail(dataUrl);
    } catch (e) {
      console.warn('Using full image as thumbnail:', e);
    }

    const artwork: Artwork = {
      id,
      title,
      dataUrl,
      thumbnailUrl,
      likes: 0,
      liked: false,
      createdAt,
    };

    this.artworks.unshift(artwork);
    this.saveToStorage();
    this.notifyListeners();
    
    return artwork;
  }

  loadGallery(): Artwork[] {
    return [...this.artworks];
  }

  searchArtworks(keyword: string): Artwork[] {
    if (!keyword.trim()) {
      return [...this.artworks];
    }
    
    const lowerKeyword = keyword.toLowerCase();
    return this.artworks.filter(artwork => 
      artwork.title.toLowerCase().includes(lowerKeyword)
    );
  }

  toggleLike(artworkId: string): Artwork | null {
    const artwork = this.artworks.find(a => a.id === artworkId);
    if (!artwork || artwork.liked) return null;

    artwork.liked = true;
    artwork.likes += 1;
    this.saveToStorage();
    this.notifyListeners();
    
    return { ...artwork };
  }

  getArtwork(artworkId: string): Artwork | null {
    const artwork = this.artworks.find(a => a.id === artworkId);
    return artwork ? { ...artwork } : null;
  }

  deleteArtwork(artworkId: string): boolean {
    const index = this.artworks.findIndex(a => a.id === artworkId);
    if (index === -1) return false;

    this.artworks.splice(index, 1);
    this.saveToStorage();
    this.notifyListeners();
    return true;
  }
}
