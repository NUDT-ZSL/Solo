import { SkillData, SKILL_LABELS } from '../types';

export function drawRadarChart(
  ctx: CanvasRenderingContext2D,
  skills: SkillData,
  canvasWidth: number,
  canvasHeight: number
) {
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;

  ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
  const labelWidths = SKILL_LABELS.map(s => ctx.measureText(s.label).width);
  const maxLabelWidth = Math.max(...labelWidths);
  const labelPadding = maxLabelWidth / 2 + 16;

  const horizontalPadding = labelPadding + 20;
  const verticalPadding = 30 + 20;
  const maxRadiusX = centerX - horizontalPadding;
  const maxRadiusY = centerY - verticalPadding;
  const maxRadius = Math.min(maxRadiusX, maxRadiusY);
  const radius = Math.max(Math.min(maxRadius, 80), 50);

  const sides = 6;
  const angleStep = (Math.PI * 2) / sides;
  const startAngle = -Math.PI / 2;

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  ctx.save();
  for (let level = 5; level >= 1; level--) {
    const r = (radius * level) / 5;
    ctx.beginPath();
    for (let i = 0; i <= sides; i++) {
      const angle = startAngle + i * angleStep;
      const x = centerX + r * Math.cos(angle);
      const y = centerY + r * Math.sin(angle);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.fillStyle = level === 5 ? '#f1f5f9' : '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  for (let i = 0; i < sides; i++) {
    const angle = startAngle + i * angleStep;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(x, y);
    ctx.stroke();
  }
  ctx.restore();

  const skillValues = SKILL_LABELS.map(({ key }) => skills[key] / 100);

  ctx.save();
  ctx.beginPath();
  for (let i = 0; i <= sides; i++) {
    const idx = i % sides;
    const angle = startAngle + idx * angleStep;
    const r = radius * skillValues[idx];
    const x = centerX + r * Math.cos(angle);
    const y = centerY + r * Math.sin(angle);
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(99, 102, 241, 0.2)';
  ctx.fill();
  ctx.strokeStyle = '#6366f1';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  for (let i = 0; i < sides; i++) {
    const angle = startAngle + i * angleStep;
    const r = radius * skillValues[i];
    const x = centerX + r * Math.cos(angle);
    const y = centerY + r * Math.sin(angle);
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ef4444';
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.fillStyle = '#64748b';
  ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';

  const labelRadius = radius + 12;

  for (let i = 0; i < sides; i++) {
    const angle = startAngle + i * angleStep;
    const x = centerX + labelRadius * Math.cos(angle);
    const y = centerY + labelRadius * Math.sin(angle);
    const label = SKILL_LABELS[i].label;

    let textAlign: CanvasTextAlign = 'center';
    let textBaseline: CanvasTextBaseline = 'middle';

    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    if (Math.abs(cos) < 0.2) {
      textAlign = 'center';
      textBaseline = sin < 0 ? 'bottom' : 'top';
    } else if (cos > 0.2) {
      textAlign = 'left';
    } else if (cos < -0.2) {
      textAlign = 'right';
    }

    ctx.textAlign = textAlign;
    ctx.textBaseline = textBaseline;

    let drawX = x;
    let drawY = y;

    if (textAlign === 'left') {
      drawX = x + 8;
    } else if (textAlign === 'right') {
      drawX = x - 8;
    }

    if (textBaseline === 'top') {
      drawY = y + 6;
    } else if (textBaseline === 'bottom') {
      drawY = y - 6;
    }

    drawX = Math.max(8, Math.min(canvasWidth - 8, drawX));
    drawY = Math.max(14, Math.min(canvasHeight - 4, drawY));

    ctx.fillText(label, drawX, drawY);
  }
  ctx.restore();
}
