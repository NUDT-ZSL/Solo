import type { ParagraphData, HistoryRecord } from './types';

const PARAGRAPHS: string[] = [
  "The quick brown fox jumps over the lazy dog near the riverbank while the sun sets behind the distant mountains painting the sky in vibrant shades of orange and pink",
  "Programming is the art of telling another human what one wants the computer to do through carefully crafted instructions that balance efficiency with clarity and maintainability",
  "Success is not final and failure is not fatal it is the courage to continue that counts when facing the inevitable challenges that life throws our way each and every day",
  "The best way to predict the future is to invent it by taking bold risks embracing change and never losing sight of the dreams that drive us forward relentlessly",
  "In the middle of difficulty lies opportunity waiting for those brave enough to seek it out and transform obstacles into stepping stones toward greater achievements",
  "Life is what happens when you are busy making other plans so remember to cherish every moment and appreciate the small joys that make each day truly special",
  "The only way to do great work is to love what you do and if you have not found it yet keep looking because the journey itself teaches us valuable lessons",
  "Technology is best when it brings people together breaking down barriers of distance and culture to create meaningful connections across the entire global community",
  "Knowledge speaks but wisdom listens carefully observing absorbing and reflecting before responding with thoughtful insight that elevates the conversation to new heights",
  "The greatest glory in living lies not in never falling but in rising every time we fall learning from our mistakes and growing stronger with each challenge overcome",
  "Creativity is intelligence having fun as our minds explore endless possibilities turning abstract ideas into tangible innovations that shape the world around us daily",
  "Be yourself everyone else is already taken because authenticity is the foundation of true happiness and genuine human connection in this ever changing modern world",
  "The purpose of our lives is to be happy by cultivating gratitude nurturing relationships and finding meaning in both the ordinary moments and extraordinary adventures",
  "Time is the most valuable thing a person can spend so invest it wisely in experiences that enrich your soul and create memories that last a lifetime forever",
  "Quality is not an act it is a habit cultivated through consistent effort attention to detail and an unwavering commitment to excellence in everything we pursue"
];

export function getRandomParagraph(): ParagraphData {
  const idx = Math.floor(Math.random() * PARAGRAPHS.length);
  const text = PARAGRAPHS[idx];
  const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
  return { id: idx, text, wordCount };
}

export function getParagraphById(id: number): ParagraphData {
  const text = PARAGRAPHS[id] || PARAGRAPHS[0];
  const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
  return { id, text, wordCount };
}

const HISTORY_KEY = 'typingwave_history_v1';

export function loadHistory(): HistoryRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveHistory(records: HistoryRecord[]): void {
  try {
    const latest = records.slice(0, 20);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(latest));
  } catch {
  }
}

export function addHistoryRecord(record: HistoryRecord): HistoryRecord[] {
  const existing = loadHistory();
  const updated = [record, ...existing].slice(0, 20);
  saveHistory(updated);
  return updated;
}

export function formatDate(ts: number): string {
  const d = new Date(ts);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${mm}/${dd} ${hh}:${min}`;
}

export function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function getWpmColor(wpm: number): string {
  if (wpm < 40) return '#ef4444';
  if (wpm <= 60) return '#facc15';
  return '#22c55e';
}
