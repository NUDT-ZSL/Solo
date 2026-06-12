import type { Chapter } from '../types';

function formatVTTTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  const pad = (n: number, len = 2) => String(n).padStart(len, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(ms, 3)}`;
}

function formatTimeSimple(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function chaptersToVTT(chapters: Chapter[], duration = 0): string {
  const sorted = [...chapters].sort((a, b) => a.time - b.time);
  const lines: string[] = ['WEBVTT', ''];
  sorted.forEach((ch, idx) => {
    const start = ch.time;
    const next = sorted[idx + 1];
    const end = next ? next.time : (duration > 0 ? duration : start + 1);
    lines.push(`${idx + 1}`);
    lines.push(`${formatVTTTime(start)} --> ${formatVTTTime(end)}`);
    lines.push(`${formatTimeSimple(start)} ${ch.title}`);
    lines.push('');
  });
  return lines.join('\n');
}

export function chaptersToJSON(chapters: Chapter[]): string {
  const sorted = [...chapters].sort((a, b) => a.time - b.time);
  return JSON.stringify(sorted, null, 2);
}

export function downloadTextFile(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
