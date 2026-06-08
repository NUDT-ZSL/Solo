export interface Card {
  id: string;
  title: string;
  content: string;
  position: number;
  createdAt: number;
}

export interface ListColumn {
  id: string;
  title: string;
  cards: Card[];
}

export interface Board {
  id: string;
  lists: ListColumn[];
}

export type ActionType = 'ADD_LIST' | 'ADD_CARD' | 'MOVE_CARD' | 'ROLLBACK';

export interface Action {
  type: ActionType;
  timestamp: number;
  nickname: string;
  payload: any;
  description: string;
}

export interface User {
  id: string;
  nickname: string;
  color: string;
}

export type MessageType =
  | 'CREATE_BOARD'
  | 'JOIN_BOARD'
  | 'JOINED'
  | 'USER_JOINED'
  | 'USER_LEFT'
  | 'ADD_LIST'
  | 'ADD_CARD'
  | 'MOVE_CARD'
  | 'STATE_UPDATED'
  | 'ROLLBACK'
  | 'ROLLBACKED'
  | 'ERROR';

export interface WSMessage {
  type: MessageType;
  payload?: any;
}
