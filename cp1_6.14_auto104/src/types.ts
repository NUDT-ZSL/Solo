export enum CardType {
  LINK = 'link',
  IMAGE = 'image',
  TEXT = 'text',
}

export const CARD_TYPE_CONFIG: Record<CardType, { color: string; icon: string; label: string }> = {
  [CardType.LINK]: {
    color: '#3498db',
    icon: '🔗',
    label: '链接',
  },
  [CardType.IMAGE]: {
    color: '#e67e22',
    icon: '🖼️',
    label: '图片',
  },
  [CardType.TEXT]: {
    color: '#2ecc71',
    icon: '📝',
    label: '文本',
  },
};

export interface Card {
  id: string;
  type: CardType;
  title?: string;
  description?: string;
  url?: string;
  imageUrl?: string;
  content?: string;
  likes: number;
  liked: boolean;
  folderId?: string;
  order: number;
  createdAt: number;
}

export interface Folder {
  id: string;
  name: string;
  cardCount: number;
}
