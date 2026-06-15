import type { Rubbing, Stroke, ScoreResult } from '../../types';

const API_BASE = '/api';

export async function fetchRubbings(): Promise<Rubbing[]> {
  const res = await fetch(`${API_BASE}/rubbings`);
  if (!res.ok) throw new Error('获取碑帖列表失败');
  return res.json();
}

export async function uploadRubbing(file: File): Promise<Rubbing> {
  const formData = new FormData();
  formData.append('image', file);

  const res = await fetch(`${API_BASE}/rubbings`, {
    method: 'POST',
    body: formData
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '上传失败' }));
    throw new Error(err.error || '上传失败');
  }

  return res.json();
}

export async function calculateScore(
  userStrokes: Stroke[],
  referenceStrokes?: Stroke[],
  width = 800,
  height = 600
): Promise<ScoreResult> {
  const res = await fetch(`${API_BASE}/score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userStrokes, referenceStrokes, width, height })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '评分失败' }));
    throw new Error(err.error || '评分失败');
  }

  return res.json();
}

export async function saveStrokes(strokes: Stroke[], rubbingId?: string): Promise<{ id: string; saved: boolean }> {
  const res = await fetch(`${API_BASE}/strokes/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ strokes, rubbingId })
  });

  if (!res.ok) throw new Error('保存失败');
  return res.json();
}
