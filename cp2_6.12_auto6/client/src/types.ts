export type Priority = 'high' | 'medium' | 'low';
export type CardStatus = 'todo' | 'in-progress' | 'done';

export interface Card {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: CardStatus;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  creatorColor: string;
  order: number;
}

export interface User {
  id: string;
  name: string;
  color: string;
}

export type ColumnId = CardStatus;

export interface Column {
  id: ColumnId;
  title: string;
  cards: Card[];
}
