import type { CardData, GenerateCardRequest } from '../types';
import { storage } from '../storage';

export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}${random}`;
}

export class CardService {
  generateCard(request: GenerateCardRequest): CardData {
    const id = generateId();
    const card: CardData = {
      id,
      poem: request.poem,
      themeId: request.themeId,
      audioBase64: request.audioBase64,
      audioMimeType: request.audioMimeType,
      thumbnailDataUrl: request.thumbnailDataUrl,
      createdAt: Date.now(),
    };
    storage.save(card);
    return card;
  }

  getCardById(id: string): CardData | undefined {
    return storage.findById(id);
  }

  getAllCards(limit = 20): CardData[] {
    return storage.findAll(limit);
  }

  getTotalCount(): number {
    return storage.count();
  }

  deleteCard(id: string): boolean {
    return storage.delete(id);
  }
}

export const cardService = new CardService();
