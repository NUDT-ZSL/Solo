import React, { useEffect, useRef } from 'react';
import { DiaryEntry, EmotionTendency } from '../shared/types';

interface JournalProps {
  diary: DiaryEntry;
  isActive?: boolean;
  isThumbnail?: boolean;
  onToggleFavorite?: (id: string) => void;
}

const TENDENCY_COLORS: Record<EmotionTendency, { from: string; to: string }> = {
  positive: { from: '#FFB347', to: '#FFDAB9' },
  neutral: { from: '#B0C4DE', to: '#FFF8DC' },
  negative: { from: '#9B72AA', to: '#E8D5E0' },
};

const KEYWORD_BORDER_COLORS: Record<string, string> = {
  '快乐': '#FFDD44',
  '喜悦': '#FFDD44',
  '幸福': '#FFB347',
  '开心': '#FFDD44',
  '兴奋': '#FF7043',
  '激动': '#FF7043',
  '惊喜': '#FF6B9D',
  '平静': '#81C784',
  '安静': '#81C784',
  '安宁': '#81C784',
  '忧伤': '#6A859C',
  '难过': '#6A859C',
  '悲伤': '#5C6BC0',
  '回忆': '#CE93D8',
  '怀念': '#CE93D8',
  '思念': '#BA68C8',
};

function getBorderColor(keywords: string[]): string {
  for (const kw of keywords) {
    if (KEYWORD_BORDER_COLORS[kw]) {
      return KEYWORD_BORDER_COLORS[kw];
    }
  }
  return '#A1887F';
}

function drawHandDrawnBorder(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const drawWobblyLine = (
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.max(20, Math.floor(dist / 8));

    ctx.beginPath();
    ctx.moveTo(x1, y1);

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      let px = x1 + dx * t;
      let py = y1 + dy * t;

      if (i % 3 === 0) {
        px += (Math.random() - 0.5) * 2;
        py += (Math.random() - 0.5) * 2;
      }

      ctx.lineWidth = 2 + Math.random() * 2;
      ctx.lineTo(px, py);
    }
    ctx.stroke();
  };

  const pad = 20;
  drawWobblyLine(x + pad, y + pad, x + w - pad, y + pad);
  drawWobblyLine(x + w - pad, y + pad, x + w - pad, y + h - pad);
  drawWobblyLine(x + w - pad, y + h - pad, x + pad, y + h - pad);
  drawWobblyLine(x + pad, y + h - pad, x + pad, y + pad);

  ctx.fillStyle = color;
  const drawCornerDot = (cx: number, cy: number) => {
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fill();
  };
  drawCornerDot(x + pad, y + pad);
  drawCornerDot(x + w - pad, y + pad);
  drawCornerDot(x + pad, y + h - pad);
  drawCornerDot(x + w - pad, y + h - pad);

  const imageData = ctx.getImageData(x + pad - 2, y + pad - 2, w - pad * 2 + 4, h - pad * 2 + 4);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    if (Math.random() < 0.02) {
      if (
        (i / 4 % (w - pad * 2 + 4) < 10) ||
        (i / 4 % (w - pad * 2 + 4) > (w - pad * 2 + 4) - 10) ||
        (i / 4 / (w - pad * 2 + 4) < 0.02) ||
        (i / 4 / (w - pad * 2 + 4) > 0.98)
      ) {
        data[i + 3] = Math.min(255, data[i + 3] + 30);
      }
    }
  }
  ctx.putImageData(imageData, x + pad - 2, y + pad - 2);

  ctx.restore();
}

function drawGradientBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  tendency: EmotionTendency
) {
  const colors = TENDENCY_COLORS[tendency];
  const gradient = ctx.createLinearGradient(0, 0, w, h);
  gradient.addColorStop(0, colors.from);
  gradient.addColorStop(1, colors.to);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  for (let i = 0; i < 200; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`;
    ctx.beginPath();
    ctx.arc(Math.random() * w, Math.random() * h, Math.random() * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  const chars = text.split('');
  let line = '';
  let currentY = y;

  for (let n = 0; n < chars.length; n++) {
    const testLine = line + chars[n];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      const words = line.split('');
      let drawX = x;
      for (let i = 0; i < words.length; i++) {
        const charJitter = (Math.random() - 0.5) * 1;
        ctx.fillText(words[i], drawX + charJitter, currentY + (Math.random() - 0.5) * 0.8);
        drawX += ctx.measureText(words[i]).width + (Math.random() - 0.5) * 2;
      }
      line = chars[n];
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }

  if (line) {
    const words = line.split('');
    let drawX = x;
    for (let i = 0; i < words.length; i++) {
      const charJitter = (Math.random() - 0.5) * 1;
      ctx.fillText(words[i], drawX + charJitter, currentY + (Math.random() - 0.5) * 0.8);
      drawX += ctx.measureText(words[i]).width + (Math.random() - 0.5) * 2;
    }
    currentY += lineHeight;
  }

  return currentY;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

const Journal: React.FC<JournalProps> = ({ diary, isActive = true, isThumbnail = false, onToggleFavorite }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const startTime = performance.now();

    const W = 800;
    const H = 600;
    canvas.width = W;
    canvas.height = H;

    const scale = isThumbnail ? 0.5 : 1;
    canvas.style.width = `${W * scale}px`;
    canvas.style.height = `${H * scale}px`;

    drawGradientBackground(ctx, W, H, diary.tendency);

    drawHandDrawnBorder(ctx, 0, 0, W, H, getBorderColor(diary.keywords));

    ctx.fillStyle = '#3E2723';
    ctx.font = 'bold 26px "Caveat", cursive';
    ctx.textBaseline = 'top';
    const titleY = 50;
    const titleMetrics = ctx.measureText(diary.title);
    ctx.fillText(diary.title, (W - titleMetrics.width) / 2, titleY);

    ctx.fillStyle = '#8D6E63';
    ctx.font = '14px "Roboto Mono", monospace';
    const dateStr = formatDate(diary.date);
    const dateMetrics = ctx.measureText(dateStr);
    ctx.fillText(dateStr, (W - dateMetrics.width) / 2, titleY + 38);

    ctx.fillStyle = '#5D4037';
    ctx.font = '18px "Dancing Script", cursive';
    ctx.textBaseline = 'alphabetic';
    const contentStartY = 130;
    const contentPadding = 60;
    const lineHeight = 32;
    wrapText(ctx, diary.content, contentPadding, contentStartY, W - contentPadding * 2, lineHeight);

    const tagY = H - 65;
    let tagX = W - 60;
    ctx.textBaseline = 'middle';
    for (let i = diary.keywords.length - 1; i >= 0; i--) {
      const kw = diary.keywords[i];
      const color = getBorderColor([kw]);
      ctx.font = 'bold 16px "Poppins", sans-serif';
      const kwMetrics = ctx.measureText(kw);
      const kwWidth = kwMetrics.width + 24;
      const kwHeight = 28;
      tagX -= kwWidth + 8;

      ctx.fillStyle = color + '80';
      ctx.beginPath();
      ctx.roundRect(tagX, tagY - kwHeight / 2, kwWidth, kwHeight, 14);
      ctx.fill();

      ctx.fillStyle = '#3E2723';
      ctx.fillText(kw, tagX + 12, tagY);
    }

    const tagLabel = '标签：' + diary.tags.join(' · ');
    ctx.font = '13px "Roboto Mono", monospace';
    ctx.fillStyle = '#795548';
    ctx.fillText(tagLabel, 60, tagY);

    const endTime = performance.now();
    if (endTime - startTime > 30) {
      console.warn(`Canvas绘制耗时: ${(endTime - startTime).toFixed(2)}ms`);
    }
  }, [diary, isThumbnail]);

  const tendencyLabel: Record<EmotionTendency, string> = {
    positive: '☀️ 积极',
    neutral: '☁️ 中性',
    negative: '🌧️ 消极',
  };

  return (
    <div className={`journal-wrapper ${isActive ? 'active' : ''} ${isThumbnail ? 'thumbnail' : ''}`}>
      <div className="journal-pin" onClick={() => onToggleFavorite?.(diary.id)} title="点击收藏">
        <div className={`pin-inner ${diary.favorite ? 'favorited' : ''}`} />
      </div>
      <div className="journal-tendency-badge">{tendencyLabel[diary.tendency]}</div>
      <canvas ref={canvasRef} className="journal-canvas" />
    </div>
  );
};

export default Journal;
