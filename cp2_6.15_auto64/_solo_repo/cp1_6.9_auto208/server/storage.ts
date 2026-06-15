import type { ArtRecord, ArtSaveRequest } from '../shared/types.js';
import { generateShortId } from './semantic.js';

class ArtStorage {
  private store: Map<string, ArtRecord> = new Map();
  private readonly MAX_RECORDS = 100;

  save(request: ArtSaveRequest): { id: string; shortUrl: string; record: ArtRecord } {
    let id = generateShortId(6);
    while (this.store.has(id)) {
      id = generateShortId(6);
    }

    const record: ArtRecord = {
      id,
      text: request.text,
      emotion: request.emotion,
      palette: request.palette,
      curves: request.curves,
      thumbnail: request.thumbnail,
      createdAt: Date.now(),
    };

    this.store.set(id, record);

    if (this.store.size > this.MAX_RECORDS) {
      const oldestKey = Array.from(this.store.entries())
        .sort((a, b) => a[1].createdAt - b[1].createdAt)[0][0];
      this.store.delete(oldestKey);
    }

    return {
      id,
      shortUrl: `/art/${id}`,
      record,
    };
  }

  getById(id: string): ArtRecord | null {
    return this.store.get(id) || null;
  }

  getRecent(limit = 10): ArtRecord[] {
    return Array.from(this.store.values())
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }
}

export const artStorage = new ArtStorage();
