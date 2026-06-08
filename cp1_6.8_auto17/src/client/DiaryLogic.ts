export interface DiaryResponse {
  id: string;
  content: string;
  createdAt: string;
}

export interface Diary {
  id: string;
  content: string;
  tag: string;
  createdAt: string;
  x: number;
  y: number;
  responses: DiaryResponse[];
  authorId: string;
}

export const TAG_CONFIG: Record<string, { color: string; glow: string; label: string }> = {
  happy: { color: '#FFD700', glow: 'rgba(255,215,0,0.6)', label: '开心' },
  thinking: { color: '#87CEEB', glow: 'rgba(135,206,235,0.6)', label: '沉思' },
  lost: { color: '#9370DB', glow: 'rgba(147,112,219,0.6)', label: '迷茫' },
  calm: { color: '#98FB98', glow: 'rgba(152,251,152,0.6)', label: '平静' },
  sad: { color: '#6495ED', glow: 'rgba(100,149,237,0.6)', label: '忧伤' },
  excited: { color: '#FF6B6B', glow: 'rgba(255,107,107,0.6)', label: '激动' },
  grateful: { color: '#DDA0DD', glow: 'rgba(221,160,221,0.6)', label: '感恩' },
  lonely: { color: '#708090', glow: 'rgba(112,128,144,0.6)', label: '孤独' },
};

export const TAG_LIST = Object.entries(TAG_CONFIG).map(([key, val]) => ({
  key,
  label: val.label,
  color: val.color,
}));

export function getTagColor(tag: string): string {
  return TAG_CONFIG[tag]?.color ?? '#FFFFFF';
}

export function getTagGlow(tag: string): string {
  return TAG_CONFIG[tag]?.glow ?? 'rgba(255,255,255,0.6)';
}

export function getAuthorId(): string {
  let id = localStorage.getItem('star-orbit-author-id');
  if (!id) {
    id = crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2);
    localStorage.setItem('star-orbit-author-id', id);
  }
  return id;
}

export async function fetchAllDiaries(): Promise<Diary[]> {
  const res = await fetch('/api/diaries');
  if (!res.ok) throw new Error('Failed to fetch diaries');
  return res.json();
}

export async function fetchAuthorDiaries(authorId: string): Promise<Diary[]> {
  const res = await fetch(`/api/diaries/author/${authorId}`);
  if (!res.ok) throw new Error('Failed to fetch author diaries');
  return res.json();
}

export async function createDiary(content: string, tag: string): Promise<Diary> {
  const authorId = getAuthorId();
  const x = 0.1 + Math.random() * 0.8;
  const y = 0.1 + Math.random() * 0.8;
  const res = await fetch('/api/diaries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, tag, authorId, x, y }),
  });
  if (!res.ok) throw new Error('Failed to create diary');
  return res.json();
}

export async function respondToDiary(diaryId: string, content: string): Promise<DiaryResponse> {
  const res = await fetch(`/api/diaries/${diaryId}/respond`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error('Failed to respond');
  return res.json();
}

export async function updateDiaryPosition(diaryId: string, x: number, y: number): Promise<Diary> {
  const res = await fetch(`/api/diaries/${diaryId}/position`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ x, y }),
  });
  if (!res.ok) throw new Error('Failed to update position');
  return res.json();
}

export function formatDiaryDate(isoString: string): string {
  const d = new Date(isoString);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${month}月${day}日 ${h}:${m}`;
}

export function truncateContent(content: string, maxLen: number = 12): string {
  if (content.length <= maxLen) return content;
  return content.slice(0, maxLen) + '…';
}

export function computeConstellationLines(diaries: Diary[]): Array<{ from: Diary; to: Diary }> {
  if (diaries.length < 2) return [];
  const sorted = [...diaries].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const lines: Array<{ from: Diary; to: Diary }> = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    lines.push({ from: sorted[i], to: sorted[i + 1] });
  }
  return lines;
}
