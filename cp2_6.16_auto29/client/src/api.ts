import type { Book, ChapterListItem, ChapterDetail, Annotation, Comment } from './types';

const BASE = '/api';

export async function getBooks(): Promise<Book[]> {
  const res = await fetch(`${BASE}/books`);
  return res.json();
}

export async function getChapters(bookId: string): Promise<ChapterListItem[]> {
  const res = await fetch(`${BASE}/chapters/${bookId}`);
  return res.json();
}

export async function getChapter(id: string): Promise<ChapterDetail> {
  const res = await fetch(`${BASE}/chapter/${id}`);
  return res.json();
}

export async function claimChapter(chapterId: string, userId: string, userName: string) {
  const res = await fetch(`${BASE}/claim-chapter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chapterId, userId, userName }),
  });
  return res.json();
}

export async function addAnnotation(data: {
  chapterId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  selectedText: string;
  startOffset: number;
  endOffset: number;
  highlightColor: string;
  body: string;
}): Promise<Annotation> {
  const res = await fetch(`${BASE}/annotations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function likeAnnotation(annotationId: string, userId: string) {
  const res = await fetch(`${BASE}/annotations/like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ annotationId, userId }),
  });
  return res.json();
}

export async function getComments(annotationId: string): Promise<Comment[]> {
  const res = await fetch(`${BASE}/comments/${annotationId}`);
  return res.json();
}

export async function addComment(data: {
  annotationId: string;
  parentId?: string | null;
  userId: string;
  userName: string;
  userAvatar?: string;
  body: string;
}): Promise<Comment> {
  const res = await fetch(`${BASE}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}
