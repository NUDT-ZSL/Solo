export interface CursorPosition {
  line: number;
  column: number;
  selectionStart?: number;
  selectionEnd?: number;
}

export interface User {
  id: string;
  name: string;
  color: string;
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
  description: string;
  characterTags: string[];
  order: number;
  expanded?: boolean;
}

export interface Annotation {
  id: string;
  chapterId: string;
  start: number;
  end: number;
  text: string;
  author: string;
  color: string;
  type: 'comment' | 'highlight';
  commentText?: string;
}

export interface Character {
  id: string;
  name: string;
  bio: string;
  tags: string[];
}

export interface Project {
  id: string;
  title: string;
  type: 'novel' | 'script';
  chapters: Chapter[];
  characters: Character[];
  annotations: Annotation[];
  users: User[];
}

export interface ConflictItem {
  start: number;
  end: number;
  characters: [string, string];
  reason: string;
}

export interface SentenceSentiment {
  index: number;
  value: number;
  text: string;
}

export interface GraphNode {
  id: string;
  name: string;
  frequency: number;
  tags: string[];
  bio?: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  strength: number;
}

export interface CharacterGraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}
