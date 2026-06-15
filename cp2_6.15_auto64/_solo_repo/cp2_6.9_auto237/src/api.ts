import type { Point, Comment } from './types';

const API_BASE = '/api';

export async function getPoints(): Promise<Point[]> {
  const res = await fetch(`${API_BASE}/points`);
  if (!res.ok) throw new Error('获取点位失败');
  return res.json();
}

export async function createPoint(point: Omit<Point, 'id' | 'createdAt' | 'likes' | 'plays'>): Promise<Point> {
  const res = await fetch(`${API_BASE}/points`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(point)
  });
  if (!res.ok) throw new Error('创建点位失败');
  return res.json();
}

export async function uploadAudio(file: File): Promise<{ url: string; duration: number }> {
  const formData = new FormData();
  formData.append('audio', file);
  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) throw new Error('音频上传失败');
  return res.json();
}

export async function likePoint(pointId: string): Promise<{ likes: number }> {
  const res = await fetch(`${API_BASE}/points/${pointId}/like`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('点赞失败');
  return res.json();
}

export async function incrementPlay(pointId: string): Promise<void> {
  await fetch(`${API_BASE}/points/${pointId}/play`, { method: 'POST' });
}

export async function getComments(pointId: string): Promise<Comment[]> {
  const res = await fetch(`${API_BASE}/points/${pointId}/comments`);
  if (!res.ok) throw new Error('获取评论失败');
  return res.json();
}

export async function createComment(comment: Omit<Comment, 'id' | 'createdAt' | 'likes' | 'likedBy'>): Promise<Comment> {
  const res = await fetch(`${API_BASE}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(comment)
  });
  if (!res.ok) throw new Error('评论失败');
  return res.json();
}

export async function likeComment(commentId: string, username: string): Promise<{ likes: number; liked: boolean }> {
  const res = await fetch(`${API_BASE}/comments/${commentId}/like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username })
  });
  if (!res.ok) throw new Error('点赞失败');
  return res.json();
}
