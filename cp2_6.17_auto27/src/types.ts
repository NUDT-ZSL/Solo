export interface User {
  id: string;
  username: string;
  password: string;
  avatar?: string;
  createdAt: string;
}

export interface Notation {
  id: string;
  name: string;
  position: string;
  string: number;
  finger: string;
  technique: string;
  frequency: number;
  displaySymbol: string;
  upperChar: string;
  lowerChar: string;
  huiPosition: string;
}

export interface ScoreNote {
  id: string;
  notationId: string;
  notation: Notation;
  bar: number;
  position: number;
}

export interface Score {
  id: string;
  userId: string;
  title: string;
  notes: ScoreNote[];
  createdAt: string;
  updatedAt: string;
}

export interface DragItem {
  type: 'notation';
  notation: Notation;
}

export interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}
