export enum CardType {
  LINK = 'link',
  IMAGE = 'image',
  TEXT = 'text',
}

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
