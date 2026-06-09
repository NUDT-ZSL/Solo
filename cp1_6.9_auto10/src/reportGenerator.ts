export interface ReportSentence {
  id: string;
  index: number;
  text: string;
  score: number;
  color: string;
  charCount: number;
  keywords: string[];
}

export function generateReport(sentences: ReportSentence[]): HTMLCanvasElement {
  const width = 1920;
  const height = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
  bgGradient.addColorStop(0, '#1E1E2E');
  bgGradient.addColorStop(1, '#2A2A40');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#E2E8F0';
  ctx.font = 'bold 48px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('情绪色谱报告', 80, 90);

  ctx.font = '24px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#94A3B8';
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  ctx.fillText(`生成时间: ${dateStr}  |  共 ${sentences.length} 个句子`, 80, 140);

  drawLegend(ctx, width - 380, 60);

  const chartX = 80;
  const chartY = 200;
  const chartWidth = width - 160;
  const chartHeight = height - chartY - 120;

  if (sentences.length === 0) {
    ctx.fillStyle = '#64748B';
    ctx.font = '28px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('暂无数据，请先输入文本内容', width / 2, height / 2);
    return canvas;
  }

  const maxBars = Math.min(sentences.length, 40);
  const displaySentences = sentences.slice(0, maxBars);
  const barGap = 16;
  const barHeight = (chartHeight - barGap * (displaySentences.length - 1)) / displaySentences.length;
  const zeroLineX = chartX + chartWidth * 0.5;

  ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(zeroLineX, chartY - 20);
  ctx.lineTo(zeroLineX, chartY + chartHeight + 20);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#22C55E';
  ctx.font = 'bold 20px system-ui';
  ctx.textAlign = 'right';
  ctx.fillText('积极 +1', zeroLineX - 20, chartY - 40);

  ctx.fillStyle = '#EF4444';
  ctx.textAlign = 'left';
  ctx.fillText('消极 -1', zeroLineX + 20, chartY - 40);

  ctx.fillStyle = '#9CA3AF';
  ctx.textAlign = 'center';
  ctx.fillText('中性 0', zeroLineX, chartY - 40);

  displaySentences.forEach((s, i) => {
    const y = chartY + i * (barHeight + barGap);
    const absScore = Math.abs(s.score);
    const barLength = (chartWidth * 0.5 - 40) * absScore;

    let barX: number;
    if (s.score >= 0) {
      barX = zeroLineX;
    } else {
      barX = zeroLineX - barLength;
    }

    const glowColor = s.color.replace(/[\d.]+\)$/, `${parseFloat(s.color.match(/[\d.]+(?=\))$/)?.[0] || '0.6') + 0.2})`);
    ctx.shadowColor = s.color;
    ctx.shadowBlur = 12;

    const grad = ctx.createLinearGradient(barX, y, s.score >= 0 ? barX + barLength : barX, y + barHeight);
    grad.addColorStop(0, s.color);
    grad.addColorStop(1, adjustColorLightness(s.color, 0.25));
    ctx.fillStyle = grad;

    const radius = Math.min(8, barHeight / 2);
    roundRect(ctx, barX, y, Math.max(4, barLength), barHeight, radius);
    ctx.fill();

    ctx.shadowBlur = 0;

    ctx.fillStyle = '#E2E8F0';
    ctx.font = `${Math.min(16, barHeight * 0.55)}px system-ui, -apple-system, sans-serif`;
    ctx.textBaseline = 'middle';

    const idxText = `#${s.index + 1}`;
    if (s.score >= 0) {
      ctx.textAlign = 'right';
      ctx.fillText(idxText, barX - 10, y + barHeight / 2);
    } else {
      ctx.textAlign = 'left';
      ctx.fillText(idxText, barX + barLength + 10, y + barHeight / 2);
    }

    const preview = s.text.length > 18 ? s.text.substring(0, 18) + '…' : s.text;
    ctx.fillStyle = '#CBD5E1';
    ctx.font = `${Math.min(14, barHeight * 0.5)}px system-ui`;
    if (s.score >= 0) {
      ctx.textAlign = 'left';
      ctx.fillText(preview, barX + 8, y + barHeight / 2);
    } else {
      ctx.textAlign = 'right';
      ctx.fillText(preview, barX + barLength - 8, y + barHeight / 2);
    }

    if (s.keywords.length > 0 && barHeight > 24) {
      ctx.font = `bold ${Math.min(12, barHeight * 0.4)}px system-ui`;
      ctx.fillStyle = s.color;
      const kwText = s.keywords.slice(0, 3).join(' · ');
      const endX = s.score >= 0 ? barX + barLength + 10 : barX - 10;
      ctx.textAlign = s.score >= 0 ? 'left' : 'right';
      if (s.score >= 0 && barLength > 200) {
        ctx.fillText(kwText, barX + barLength + 10, y + barHeight / 2);
      } else if (s.score < 0 && barLength > 200) {
        ctx.fillText(kwText, barX - 10, y + barHeight / 2);
      }
    }
  });

  drawScoreSummary(ctx, sentences, chartX, height - 60);

  return canvas;
}

function drawLegend(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = '#94A3B8';
  ctx.font = 'bold 18px system-ui';
  ctx.textAlign = 'left';
  ctx.fillText('情绪色谱图例', x, y);

  const gradient = ctx.createLinearGradient(x, y + 20, x + 280, y + 20);
  gradient.addColorStop(0, '#8B5CF6');
  gradient.addColorStop(0.25, '#4A90D9');
  gradient.addColorStop(0.5, '#9CA3AF');
  gradient.addColorStop(0.75, '#F97316');
  gradient.addColorStop(1, '#EF4444');

  ctx.fillStyle = gradient;
  roundRect(ctx, x, y + 25, 280, 18, 9);
  ctx.fill();

  ctx.font = '13px system-ui';
  ctx.fillStyle = '#CBD5E1';
  ctx.textAlign = 'left';
  ctx.fillText('-1 (极消极)', x, y + 65);
  ctx.textAlign = 'center';
  ctx.fillText('0 (中性)', x + 140, y + 65);
  ctx.textAlign = 'right';
  ctx.fillText('+1 (极积极)', x + 280, y + 65);
}

function drawScoreSummary(ctx: CanvasRenderingContext2D, sentences: ReportSentence[], x: number, y: number): void {
  const total = sentences.length;
  if (total === 0) return;

  let pos = 0, neg = 0, neu = 0;
  let sumScore = 0;
  sentences.forEach((s) => {
    sumScore += s.score;
    if (s.score > 0.1) pos++;
    else if (s.score < -0.1) neg++;
    else neu++;
  });
  const avg = sumScore / total;
  const posPct = Math.round((pos / total) * 100);
  const negPct = Math.round((neg / total) * 100);
  const neuPct = Math.round((neu / total) * 100);

  ctx.font = 'bold 20px system-ui';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#E2E8F0';
  ctx.fillText(`整体情绪: ${avg >= 0.1 ? '偏积极 😊' : avg <= -0.1 ? '偏消极 😔' : '相对中性 😐'}  (${avg >= 0 ? '+' : ''}${avg.toFixed(3)})`, x, y);

  ctx.font = '16px system-ui';
  ctx.fillStyle = '#EF4444';
  ctx.fillText(`消极 ${neg}句 (${negPct}%)`, x + 580, y);
  ctx.fillStyle = '#9CA3AF';
  ctx.fillText(`中性 ${neu}句 (${neuPct}%)`, x + 780, y);
  ctx.fillStyle = '#22C55E';
  ctx.fillText(`积极 ${pos}句 (${posPct}%)`, x + 980, y);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function adjustColorLightness(hslColor: string, amount: number): string {
  const match = hslColor.match(/hsl\((\d+),\s*([\d.]+)%,\s*([\d.]+)%(?:,\s*([\d.]+))?\)/);
  if (!match) return hslColor;
  const h = parseInt(match[1]);
  const s = parseFloat(match[2]);
  let l = parseFloat(match[3]);
  l = Math.min(100, Math.max(0, l + amount * 100));
  const alpha = match[4] ? parseFloat(match[4]) : 1;
  return `hsl(${h}, ${s}%, ${l}%, ${alpha})`;
}

export function downloadReport(canvas: HTMLCanvasElement, filename?: string): void {
  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  const name = filename || `情绪色谱报告_${Date.now()}.png`;
  link.download = name;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
