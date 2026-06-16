import { SkillData, SKILL_LABELS } from '../types';

export function drawRadarChart(
  ctx: CanvasRenderingContext2D,
  skills: SkillData,
  size: number = 280
) {
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = 80;
  const sides = 6;
  const angleStep = (Math.PI * 2) / sides;
  const startAngle = -Math.PI / 2;

  ctx.clearRect(0, 0, size, size);

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
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < sides; i++) {
    const angle = startAngle + i * angleStep;
    const labelRadius = radius + 24;
    const x = centerX + labelRadius * Math.cos(angle);
    let y = centerY + labelRadius * Math.sin(angle);

    if (i === 0) {
      ctx.textBaseline = 'bottom';
      y -= 4;
    } else if (i === 3) {
      ctx.textBaseline = 'top';
      y += 4;
    } else if (i === 1 || i === 2) {
      ctx.textAlign = 'left';
      x += 8;
    } else if (i === 4 || i === 5) {
      ctx.textAlign = 'right';
      x -= 8;
    }

    ctx.fillText(SKILL_LABELS[i].label, x, y);
  }
  ctx.restore();
}
