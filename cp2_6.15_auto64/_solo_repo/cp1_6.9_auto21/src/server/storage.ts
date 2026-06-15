import type { CardData } from './types';

export class MemoryStorage {
  private store: Map<string, CardData> = new Map();

  save(card: CardData): void {
    this.store.set(card.id, card);
  }

  findById(id: string): CardData | undefined {
    return this.store.get(id);
  }

  findAll(limit = 20): CardData[] {
    const all = Array.from(this.store.values());
    return all
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }

  count(): number {
    return this.store.size;
  }

  delete(id: string): boolean {
    return this.store.delete(id);
  }

  clear(): void {
    this.store.clear();
  }
}

export const storage = new MemoryStorage();
