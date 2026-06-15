export interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  knowledgeBaseId: string;
  name: string;
  order: number;
  createdAt: string;
}

export interface Document {
  id: string;
  categoryId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  content: string;
  versionNumber: number;
  createdAt: string;
}

export interface Annotation {
  id: string;
  documentId: string;
  paragraphIndex: number;
  content: string;
  userId: string;
  createdAt: string;
  isRead: boolean;
  parentId: string | null;
  replies: Annotation[];
}

export interface SearchResult {
  documentId: string;
  title: string;
  content: string;
  matchType: 'title' | 'content';
  score: number;
  highlights: { start: number; end: number }[];
}
