export type Emotion = 'positive' | 'calm' | 'sad';

export interface PoemData {
  id?: string;
  title: string;
  author: string;
  background?: string;
  lines: string[];
  emotion: Emotion;
  isCustom: boolean;
}

export interface GenerateCardRequest {
  poem: PoemData;
  themeId: string;
  audioBase64: string | null;
  audioMimeType: string;
  thumbnailDataUrl?: string;
}

export interface CardData extends GenerateCardRequest {
  id: string;
  createdAt: number;
}

export interface GenerateCardResponse {
  success: boolean;
  cardId: string;
  shareUrl: string;
}

export interface GetCardResponse {
  success: boolean;
  card: CardData | null;
}

export interface GetCardsResponse {
  success: boolean;
  cards: CardData[];
  total: number;
}

export interface DeleteCardResponse {
  success: boolean;
  message: string;
}
