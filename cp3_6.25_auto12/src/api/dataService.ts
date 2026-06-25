import type { Work, StatsResponse } from '../types';

const API_BASE = '/api';

export const fetchWorks = async (): Promise<Work[]> => {
  const response = await fetch(`${API_BASE}/works`);
  if (!response.ok) {
    throw new Error('获取作品列表失败');
  }
  return response.json();
};

export const addWork = async (data: { title: string; image: string; tags: string[] }): Promise<Work> => {
  const response = await fetch(`${API_BASE}/works`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('上传作品失败');
  }
  return response.json();
};

export const logClick = async (workId: string, timestamp: number): Promise<{ success: boolean; clicks: number }> => {
  const response = await fetch(`${API_BASE}/works/${workId}/click`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ timestamp }),
  });
  if (!response.ok) {
    throw new Error('上报点击失败');
  }
  return response.json();
};

export const logDuration = async (workId: string, duration: number, timestamp: number): Promise<{ success: boolean; totalDuration: number }> => {
  const response = await fetch(`${API_BASE}/works/${workId}/duration`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ duration, timestamp }),
  });
  if (!response.ok) {
    throw new Error('上报时长失败');
  }
  return response.json();
};

export const getStats = async (): Promise<StatsResponse> => {
  const response = await fetch(`${API_BASE}/stats`);
  if (!response.ok) {
    throw new Error('获取统计数据失败');
  }
  return response.json();
};
