export interface User {
  id: string;
  name: string;
  color: string;
  cursorPosition?: { index: number; length: number } | null;
}

export interface Version {
  version_number: number;
  saved_by: string;
  saved_at: number;
  content?: string;
}

export interface Comment {
  id: number;
  author: string;
  authorColor: string;
  content: string;
  createdAt: number;
}

export interface CursorPosition {
  index: number;
  length: number;
}
