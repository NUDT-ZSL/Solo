import React, { useMemo } from 'react';

interface WordItem {
  text: string;
  size: number;
  color: string;
  x: number;
  y: number;
}

const WORD_CLOUD_COLORS = ['#3b82f6', '#ec4899', '#f59e0b', '#10b981'];

const STOP_WORDS = new Set([
  '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个',
  '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好',
  '自己', '这', '他', '她', '它', '们', '那', '些', '什么', '吗', '吧', '啊', '呢',
  '还', '把', '让', '被', '从', '对', '给', '但', '又', '与', '而', '或', '如果',
  '因为', '所以', '虽然', '但是', '不过', '然后', '之后', '可以', '这个', '那个',
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
  'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
  'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'and', 'but', 'or', 'nor', 'not', 'so', 'yet', 'both', 'either',
  'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'him', 'his',
  'she', 'her', 'it', 'its', 'they', 'them', 'their', 'this', 'that',
  'am', 'if', 'then', 'than', 'no', 'just', 'about', 'up', 'out',
  'all', 'more', 'some', 'any', 'only', 'very', 'too', 'much',
]);

function computeWordCloud(notes: string[]): WordItem[] {
  const freq: Record<string, number> = {};

  notes.forEach((note) => {
    const chineseSegments = note.match(/[\u4e00-\u9fa5]{2,}/g) || [];
    chineseSegments.forEach((seg) => {
      for (let len = 2; len <= Math.min(seg.length, 4); len++) {
        for (let i = 0; i <= seg.length - len; i++) {
          const w = seg.slice(i, i + len);
          if (!STOP_WORDS.has(w)) {
            freq[w] = (freq[w] || 0) + 1;
          }
        }
      }
    });

    const englishWords = note
      .replace(/[\u4e00-\u9fa5]/g, ' ')
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w.toLowerCase()));
    englishWords.forEach((w) => {
      const key = w.toLowerCase();
      freq[key] = (freq[key] || 0) + 1;
    });
  });

  const sorted = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30);

  if (sorted.length === 0) return [];

  const maxFreq = sorted[0][1];
  const minFreq = sorted[sorted.length - 1][1];
  const range = maxFreq - minFreq || 1;

  const containerW = 400;
  const containerH = 400;
  const padding = 20;
  const placed: WordItem[] = [];
  const placedRects: { x: number; y: number; w: number; h: number }[] = [];

  sorted.forEach(([word, count]) => {
    const size = 12 + ((count - minFreq) / range) * 24;
    const color = WORD_CLOUD_COLORS[Math.floor(Math.random() * WORD_CLOUD_COLORS.length)];
    const estW = word.length * size * 0.6 + 8;
    const estH = size + 6;

    let bestX = padding;
    let bestY = padding;
    let found = false;

    for (let attempt = 0; attempt < 200; attempt++) {
      const x = padding + Math.random() * (containerW - estW - padding * 2);
      const y = padding + Math.random() * (containerH - estH - padding * 2);

      const overlap = placedRects.some((r) => {
        return !(x + estW < r.x || x > r.x + r.w || y + estH < r.y || y > r.y + r.h);
      });

      if (!overlap) {
        bestX = x;
        bestY = y;
        found = true;
        break;
      }
    }

    if (!found) {
      bestX = padding + Math.random() * (containerW - estW - padding * 2);
      bestY = padding + Math.random() * (containerH - estH - padding * 2);
    }

    placedRects.push({ x: bestX, y: bestY, w: estW, h: estH });
    placed.push({ text: word, size, color, x: bestX, y: bestY });
  });

  return placed;
}

interface WordCloudProps {
  notes: string[];
}

const WordCloud: React.FC<WordCloudProps> = ({ notes }) => {
  const words = useMemo(() => computeWordCloud(notes), [notes]);

  if (words.length === 0) {
    return (
      <div className="wordcloud-empty">
        暂无笔记数据，记录心情后词语云将自动生成
      </div>
    );
  }

  return (
    <div className="wordcloud-container">
      {words.map((word, i) => (
        <span
          key={i}
          className="wordcloud-word"
          style={{
            left: word.x,
            top: word.y,
            fontSize: word.size,
            color: word.color,
          }}
        >
          {word.text}
        </span>
      ))}
    </div>
  );
};

export default WordCloud;
export { computeWordCloud, WORD_CLOUD_COLORS };
