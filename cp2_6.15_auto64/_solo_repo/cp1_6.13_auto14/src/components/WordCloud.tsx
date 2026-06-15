import { useEffect, useRef } from 'react';

interface WordFrequency {
  word: string;
  count: number;
}

interface WordCloudProps {
  words: WordFrequency[];
  width?: number;
  height?: number;
}

const WORD_CLOUD_COLORS_HIGH = [
  '#f43f5e', '#ec4899', '#f59e0b', '#eab308',
  '#a855f7',
];

const WORD_CLOUD_COLORS_MID = [
  '#3b82f6', '#06b6d4', '#14b8a6', '#22c55e',
  '#84cc16',
];

interface PlacedWord {
  word: string;
  x: number;
  y: number;
  fontSize: number;
  rotation: number;
  color: string;
  width: number;
  height: number;
}

function chineseSegment(text: string): string[] {
  const result: string[] = [];
  const commonSingle = new Set(['的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '这', '那', '啊', '吗', '呢', '吧', '与', '及', '但', '而', '或', '跟', '把', '被', '让', '给', '对', '为', '以', '从', '自', '向', '往', '于', '至', '之', '其', '此', '如', '因', '所', '则', '可', '能', '应', '该', '将', '已', '曾', '被', '能', '会', '可', '应', '当', '该']);
  const stopWords = new Set([...commonSingle, ' ', '　', ',', '.', '!', '?', '，', '。', '！', '？', '、', '；', '：', '“', '”', '‘', '’', '（', '）', '(', ')', '[', ']', '{', '}', '<', '>', '《', '》']);

  const chinesePattern = /[\u4e00-\u9fa5]+/g;
  const englishPattern = /[a-zA-Z]+/g;

  const chineseMatches = text.match(chinesePattern) || [];
  const englishMatches = text.match(englishPattern) || [];

  englishMatches.forEach((w) => {
    const lower = w.toLowerCase();
    if (lower.length >= 2 && !stopWords.has(lower)) {
      result.push(lower);
    }
  });

  chineseMatches.forEach((chunk) => {
    const bigrams: string[] = [];
    for (let i = 0; i < chunk.length - 1; i++) {
      bigrams.push(chunk.substring(i, i + 2));
    }
    const trigrams: string[] = [];
    for (let i = 0; i < chunk.length - 2; i++) {
      trigrams.push(chunk.substring(i, i + 3));
    }
    [...trigrams, ...bigrams].forEach((w) => {
      if (!stopWords.has(w) && !Array.from(w).every((ch) => commonSingle.has(ch))) {
        result.push(w);
      }
    });
    if (chunk.length <= 2) {
      Array.from(chunk).forEach((ch) => {
        if (!commonSingle.has(ch) && !stopWords.has(ch)) {
          result.push(ch);
        }
      });
    }
  });

  return result;
}

export function segmentAndCount(comments: string[]): WordFrequency[] {
  const freq = new Map<string, number>();
  comments.forEach((text) => {
    const words = chineseSegment(text);
    words.forEach((w) => {
      freq.set(w, (freq.get(w) || 0) + 1);
    });
  });
  return Array.from(freq.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 60);
}

function rectsOverlap(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }, padding = 2): boolean {
  return !(a.x + a.w + padding < b.x || b.x + b.w + padding < a.x || a.y + a.h + padding < b.y || b.y + b.h + padding < a.y);
}

function rotatedRect(x: number, y: number, w: number, h: number, angle: number): { x: number; y: number; w: number; h: number } {
  if (angle === 0) return { x, y, w, h };
  const rad = (angle * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const newW = w * cos + h * sin;
  const newH = w * sin + h * cos;
  return { x: x + (w - newW) / 2, y: y + (h - newH) / 2, w: newW, h: newH };
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

function pickColorByFrequency(ratio: number, index: number): string {
  let palette: string[];
  if (ratio > 0.7) {
    palette = WORD_CLOUD_COLORS_HIGH;
  } else if (ratio > 0.3) {
    palette = [...WORD_CLOUD_COLORS_HIGH, ...WORD_CLOUD_COLORS_MID];
  } else {
    palette = WORD_CLOUD_COLORS_MID;
  }
  return palette[Math.abs(seededRandom(index * 7 + 3) * palette.length) | 0 % palette.length];
}

export default function WordCloud({ words, width = 500, height = 400 }: WordCloudProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    if (words.length === 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('暂无评论数据', width / 2, height / 2);
      return;
    }

    const sorted = [...words].sort((a, b) => b.count - a.count);
    const maxCount = sorted[0]?.count || 1;
    const minCount = sorted[sorted.length - 1]?.count || 1;
    const maxFont = 48;
    const minFont = 14;

    const placed: PlacedWord[] = [];
    const placedRects: { x: number; y: number; w: number; h: number }[] = [];

    const centerX = width / 2;
    const centerY = height / 2;

    sorted.forEach((item, idx) => {
      const ratio = maxCount === minCount ? 1 : (item.count - minCount) / (maxCount - minCount);
      const fontSize = Math.round(minFont + (maxFont - minFont) * ratio);

      const rotSeed = seededRandom(idx * 13 + item.word.charCodeAt(0) * 7 + item.count * 3);
      const rotation = Math.round((rotSeed * 61) - 30);

      const color = pickColorByFrequency(ratio, idx);

      ctx.font = `bold ${fontSize}px sans-serif`;
      const textMetrics = ctx.measureText(item.word);
      const wordWidth = textMetrics.width;
      const wordHeight = fontSize * 1.2;

      let placedWord: PlacedWord | null = null;
      let attempts = 0;
      const maxAttempts = 800;

      while (attempts < maxAttempts && !placedWord) {
        attempts++;
        let px: number, py: number;

        if (attempts < 60) {
          const angle = (attempts * 0.4) + (rotSeed * 6.28);
          const radius = attempts * 1.8;
          px = centerX + Math.cos(angle) * radius;
          py = centerY + Math.sin(angle) * radius;
        } else {
          px = seededRandom(attempts * 31 + idx * 17) * (width - wordWidth - 20) + 10;
          py = seededRandom(attempts * 47 + idx * 23) * (height - wordHeight - 20) + 10;
        }

        const drawX = px - wordWidth / 2;
        const drawY = py - wordHeight / 2;

        const testRect = rotatedRect(drawX, drawY, wordWidth, wordHeight, rotation);

        if (testRect.x < 0 || testRect.x + testRect.w > width || testRect.y < 0 || testRect.y + testRect.h > height) {
          continue;
        }

        let overlap = false;
        for (const r of placedRects) {
          if (rectsOverlap(testRect, r, 3)) {
            overlap = true;
            break;
          }
        }

        if (!overlap) {
          placedWord = { word: item.word, x: drawX, y: drawY, fontSize, rotation, color, width: wordWidth, height: wordHeight };
          placedRects.push(testRect);
        }
      }

      if (placedWord) {
        placed.push(placedWord);
      }
    });

    placed.forEach((pw) => {
      ctx.save();
      const rad = (pw.rotation * Math.PI) / 180;
      const cx = pw.x + pw.width / 2;
      const cy = pw.y + pw.height / 2;
      ctx.translate(cx, cy);
      ctx.rotate(rad);

      ctx.shadowColor = pw.color + '66';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 2;

      ctx.fillStyle = pw.color;
      ctx.font = `bold ${pw.fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pw.word, 0, 0);

      ctx.restore();
    });
  }, [words, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
    />
  );
}
