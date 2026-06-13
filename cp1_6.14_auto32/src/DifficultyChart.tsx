import { useEffect, useRef } from 'react';
import { LevelElement } from './types';

interface DifficultyChartProps {
  elements: LevelElement[];
  jumpRecord?: number[];
  width?: number;
  height?: number;
}

interface DifficultyDataPoint {
  segmentIndex: number;
  obstacleDensity: number;
  jumpCount: number;
  compositeScore: number;
}

export function calculateDifficultyData(
  elements: LevelElement[],
  jumpRecord: number[] = []
): DifficultyDataPoint[] {
  const levelWidth = elements.length > 0
    ? Math.max(...elements.map(e => e.x + e.width)) + 200
    : 1000;

  const segmentsCount = Math.max(1, Math.ceil(levelWidth / 100));
  const data: DifficultyDataPoint[] = [];

  for (let i = 0; i < segmentsCount; i++) {
    const segmentStart = i * 100;
    const segmentEnd = segmentStart + 100;

    let obstacleDensity = 0;
    for (const elem of elements) {
      if (elem.type === 'collectible' || elem.type === 'goal') continue;
      const overlap = Math.min(elem.x + elem.width, segmentEnd) - Math.max(elem.x, segmentStart);
      if (overlap > 0) {
        if (elem.type === 'spike') {
          obstacleDensity += 3;
        } else if (elem.type === 'obstacle') {
          obstacleDensity += 2;
        } else if (elem.type === 'platform') {
          if (i > 0) {
            const prevSegment = data[i - 1];
            const hasPlatformPrev = prevSegment && prevSegment.obstacleDensity > 0.5;
            if (!hasPlatformPrev) {
              obstacleDensity += 0.5;
            }
          }
        }
      }
    }
    obstacleDensity = Math.min(obstacleDensity, 10);

    const jumpCount = Math.min(jumpRecord[i] || 0, 5);

    const compositeScore = Math.min(
      obstacleDensity * 0.6 + jumpCount * 1.5,
      10
    );

    data.push({
      segmentIndex: i,
      obstacleDensity,
      jumpCount,
      compositeScore,
    });
  }

  return data;
}

export default function DifficultyChart({
  elements,
  jumpRecord = [],
  width = 260,
  height = 200,
}: DifficultyChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const padding = { top: 24, right: 12, bottom: 24, left: 32 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const data = calculateDifficultyData(elements, jumpRecord);
    const maxScore = Math.max(10, ...data.map(d => d.compositeScore));

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('高', padding.left - 4, padding.top + 4);
    ctx.fillText('中', padding.left - 4, padding.top + chartHeight / 2 + 4);
    ctx.fillText('低', padding.left - 4, padding.top + chartHeight);

    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillText('起点', padding.left + 6, height - 6);
    if (data.length > 1) {
      ctx.fillText('终点', width - padding.right - 6, height - 6);
    }
    ctx.fillText('关卡距离', width / 2, height - 6);

    if (data.length === 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('暂无数据', width / 2, height / 2);
      return;
    }

    const getX = (index: number) => {
      if (data.length === 1) return padding.left + chartWidth / 2;
      return padding.left + (chartWidth / (data.length - 1)) * index;
    };
    const getY = (score: number) => {
      return padding.top + chartHeight - (chartHeight * score) / maxScore;
    };

    const gradientFill = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
    gradientFill.addColorStop(0, 'rgba(167, 139, 250, 0.35)');
    gradientFill.addColorStop(0.5, 'rgba(167, 139, 250, 0.2)');
    gradientFill.addColorStop(1, 'rgba(59, 130, 246, 0.05)');

    const gradientStroke = ctx.createLinearGradient(padding.left, 0, width - padding.right, 0);
    gradientStroke.addColorStop(0, '#3b82f6');
    gradientStroke.addColorStop(1, '#a78bfa');

    ctx.beginPath();
    ctx.moveTo(getX(0), getY(0));

    for (let i = 0; i < data.length; i++) {
      const x = getX(i);
      const y = getY(data[i].compositeScore);

      if (i === 0) {
        ctx.lineTo(x, y);
      } else {
        const prevX = getX(i - 1);
        const prevY = getY(data[i - 1].compositeScore);
        const cpX = (prevX + x) / 2;
        ctx.bezierCurveTo(cpX, prevY, cpX, y, x, y);
      }
    }

    ctx.lineTo(getX(data.length - 1), getY(0));
    ctx.lineTo(getX(0), getY(0));
    ctx.closePath();
    ctx.fillStyle = gradientFill;
    ctx.fill();

    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
      const x = getX(i);
      const y = getY(data[i].compositeScore);

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        const prevX = getX(i - 1);
        const prevY = getY(data[i - 1].compositeScore);
        const cpX = (prevX + x) / 2;
        ctx.bezierCurveTo(cpX, prevY, cpX, y, x, y);
      }
    }
    ctx.strokeStyle = gradientStroke;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();

    for (let i = 0; i < data.length; i++) {
      if (data[i].compositeScore > 0) {
        const x = getX(i);
        const y = getY(data[i].compositeScore);
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = data[i].compositeScore > 7 ? '#ff4444' : '#ffffff';
        ctx.fill();
      }
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('难度曲线', padding.left, 14);
  }, [elements, jumpRecord, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        borderRadius: '8px',
        background: '#0f0f1a',
      }}
    />
  );
}
