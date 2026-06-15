import { EasingType } from '../types';

export function getEasingFunction(type: EasingType): (t: number) => number {
  switch (type) {
    case 'linear':
      return (t: number) => t;
    case 'ease':
      return (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    case 'ease-in':
      return (t: number) => t * t * t;
    case 'ease-out':
      return (t: number) => 1 - Math.pow(1 - t, 3);
    case 'ease-in-out':
      return (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    default:
      return (t: number) => t;
  }
}

export function drawEasingCurve(
  ctx: CanvasRenderingContext2D,
  type: EasingType,
  width: number,
  height: number
) {
  const easing = getEasingFunction(type);
  ctx.clearRect(0, 0, width, height);
  
  ctx.strokeStyle = '#2a2a4a';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const x = (i / 4) * width;
    const y = (i / 4) * height;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  ctx.strokeStyle = '#e94560';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();

  for (let i = 0; i <= 50; i++) {
    const t = i / 50;
    const x = t * width;
    const y = height - easing(t) * height;
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.stroke();
}

export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

export function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
