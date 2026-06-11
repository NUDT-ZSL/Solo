export interface Card {
  id: string;
  title: string;
  content: string;
  group: string;
  likes: number;
  likedBy: string[];
  createdAt: string;
}

export interface Comment {
  id: string;
  cardId: string;
  username: string;
  avatar: string;
  content: string;
  createdAt: string;
}

const BASE = '/api';

export async function fetchCards(): Promise<Card[]> {
  const res = await fetch(`${BASE}/cards`);
  if (!res.ok) throw new Error('Failed to fetch cards');
  return res.json();
}

export async function fetchCard(id: string): Promise<Card> {
  const res = await fetch(`${BASE}/cards/${id}`);
  if (!res.ok) throw new Error('Failed to fetch card');
  return res.json();
}

export async function createCard(data: { title: string; content: string; group: string }): Promise<Card> {
  const res = await fetch(`${BASE}/cards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create card');
  return res.json();
}

export async function toggleLike(cardId: string, userId: string): Promise<Card> {
  const res = await fetch(`${BASE}/cards/${cardId}/like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) throw new Error('Failed to toggle like');
  return res.json();
}

export async function fetchComments(cardId: string): Promise<Comment[]> {
  const res = await fetch(`${BASE}/cards/${cardId}/comments`);
  if (!res.ok) throw new Error('Failed to fetch comments');
  return res.json();
}

export async function createComment(cardId: string, data: { username: string; content: string }): Promise<Comment> {
  const res = await fetch(`${BASE}/cards/${cardId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create comment');
  return res.json();
}
