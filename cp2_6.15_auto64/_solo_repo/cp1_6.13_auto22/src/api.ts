import type { Level, LevelSummary, LevelElement } from './types';

const API_BASE = '/api/levels';

export async function listLevels(): Promise<LevelSummary[]> {
  const response = await fetch(API_BASE);
  if (!response.ok) {
    throw new Error('获取关卡列表失败');
  }
  return response.json();
}

export async function loadLevel(id: string): Promise<{ elements: LevelElement[]; name: string }> {
  const response = await fetch(`${API_BASE}/${id}`);
  if (!response.ok) {
    throw new Error('加载关卡失败');
  }
  return response.json();
}

export async function saveLevel(name: string, elements: LevelElement[], existingId?: string): Promise<Level> {
  const body = { name, elements };
  const url = existingId ? `${API_BASE}/${existingId}` : API_BASE;
  const method = existingId ? 'PUT' : 'POST';

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: '保存失败' }));
    throw new Error(errorData.error || '保存关卡失败');
  }
  return response.json();
}

export async function deleteLevel(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('删除关卡失败');
  }
}
