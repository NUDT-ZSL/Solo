export interface Entity {
  id: string;
  name: string;
  type: 'character' | 'location' | 'event';
  count: number;
  firstChapter: number;
  color?: string;
  x?: number;
  y?: number;
}

export interface Relation {
  id: string;
  sourceId: string;
  targetId: string;
  cooccurrence: number;
}

export interface ChapterEvent {
  id: string;
  chapter: number;
  chapterTitle: string;
  summary: string;
  relatedEntities: string[];
}

export interface Book {
  id: string;
  title: string;
  format: string;
  createdAt: string;
}

export interface UploadResponse {
  bookId: string;
  entities: Entity[];
  relations: Relation[];
  timeline: ChapterEvent[];
}

export type EntityType = 'character' | 'location' | 'event';
