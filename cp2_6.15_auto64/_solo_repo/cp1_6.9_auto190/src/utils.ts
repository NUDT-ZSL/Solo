import type { Card, CityOption, EmotionType } from './types';

const API_BASE = '/api';

export async function fetchCities(): Promise<CityOption[]> {
  const res = await fetch(`${API_BASE}/cities`);
  if (!res.ok) throw new Error('获取城市列表失败');
  return res.json();
}

export async function fetchCards(): Promise<Card[]> {
  const res = await fetch(`${API_BASE}/cards`);
  if (!res.ok) throw new Error('获取卡片列表失败');
  return res.json();
}

export async function createCard(
  formData: FormData
): Promise<Card> {
  const res = await fetch(`${API_BASE}/cards`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) throw new Error('创建卡片失败');
  return res.json();
}

export async function updateCard(
  id: string,
  data: Partial<Card>
): Promise<Card> {
  const res = await fetch(`${API_BASE}/cards/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('更新卡片失败');
  return res.json();
}

export async function reorderCards(orderedIds: string[]): Promise<void> {
  const res = await fetch(`${API_BASE}/cards/reorder`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderedIds })
  });
  if (!res.ok) throw new Error('排序失败');
}

export async function deleteCard(id: string): Promise<Card> {
  const res = await fetch(`${API_BASE}/cards/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('删除卡片失败');
  const data = await res.json();
  return data.card;
}

export async function restoreCard(id: string): Promise<Card> {
  const res = await fetch(`${API_BASE}/cards/${id}/restore`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('恢复卡片失败');
  return res.json();
}

export function extractDominantColor(imageSrc: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve('#4ECDC4');
          return;
        }

        const size = 50;
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);

        const imageData = ctx.getImageData(0, 0, size, size).data;
        const colorMap = new Map<string, number>();

        for (let i = 0; i < imageData.length; i += 4) {
          const r = Math.round(imageData[i] / 32) * 32;
          const g = Math.round(imageData[i + 1] / 32) * 32;
          const b = Math.round(imageData[i + 2] / 32) * 32;
          const a = imageData[i + 3];

          if (a < 128) continue;

          const key = `${r},${g},${b}`;
          colorMap.set(key, (colorMap.get(key) || 0) + 1);
        }

        let maxCount = 0;
        let dominantKey = '78,205,196';
        colorMap.forEach((count, key) => {
          if (count > maxCount) {
            maxCount = count;
            dominantKey = key;
          }
        });

        const [r, g, b] = dominantKey.split(',').map(Number);
        const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
        resolve(hex);
      } catch {
        resolve('#4ECDC4');
      }
    };
    img.onerror = () => resolve('#4ECDC4');
    img.src = imageSrc;
  });
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function validateImageFile(file: File): string | null {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  if (!validTypes.includes(file.type)) {
    return '仅支持 JPG 和 PNG 格式的图片';
  }
  if (file.size > 5 * 1024 * 1024) {
    return '图片大小不能超过 5MB';
  }
  return null;
}

export function getEmotionColor(emotion: EmotionType): string {
  const colors: Record<EmotionType, string> = {
    '惊喜': '#FF6B35',
    '宁静': '#4ECDC4',
    '怀念': '#9B59B6',
    '冒险': '#E74C3C',
    '浪漫': '#FF69B4',
    '激动': '#F39C12'
  };
  return colors[emotion] || '#4ECDC4';
}
