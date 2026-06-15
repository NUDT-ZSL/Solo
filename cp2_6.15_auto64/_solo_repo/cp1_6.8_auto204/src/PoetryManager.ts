import { StrokePoint } from './BrushEngine';

export interface Poem {
  id: string;
  title: string;
  author: string;
  lines: string[];
}

export interface AnimationFrame {
  points: StrokePoint[];
  delay: number;
}

const POEMS: Poem[] = [
  {
    id: 'jing-ye-si',
    title: '静夜思',
    author: '李白',
    lines: ['床前明月光', '疑是地上霜', '举头望明月', '低头思故乡'],
  },
  {
    id: 'chun-xiao',
    title: '春晓',
    author: '孟浩然',
    lines: ['春眠不觉晓', '处处闻啼鸟', '夜来风雨声', '花落知多少'],
  },
  {
    id: 'deng-guan-que-lou',
    title: '登鹳雀楼',
    author: '王之涣',
    lines: ['白日依山尽', '黄河入海流', '欲穷千里目', '更上一层楼'],
  },
  {
    id: 'wang-lu-shan-pu-bu',
    title: '望庐山瀑布',
    author: '李白',
    lines: ['日照香炉生紫烟', '遥看瀑布挂前川', '飞流直下三千尺', '疑是银河落九天'],
  },
  {
    id: 'jiang-xue',
    title: '江雪',
    author: '柳宗元',
    lines: ['千山鸟飞绝', '万径人踪灭', '孤舟蓑笠翁', '独钓寒江雪'],
  },
  {
    id: 'min-nong',
    title: '悯农',
    author: '李绅',
    lines: ['锄禾日当午', '汗滴禾下土', '谁知盘中餐', '粒粒皆辛苦'],
  },
];

function generateCharPath(
  charCode: number,
  startX: number,
  startY: number,
  charWidth: number,
  charHeight: number
): { x: number; y: number }[] {
  const seed = charCode * 2654435761;
  const rand = (i: number) => {
    const v = Math.sin(seed + i * 12345.6789) * 43758.5453;
    return v - Math.floor(v);
  };

  const cx = startX + charWidth / 2;
  const cy = startY + charHeight / 2;
  const strokeCount = 3 + Math.floor(rand(0) * 5);
  const pathPoints: { x: number; y: number }[] = [];

  for (let s = 0; s < strokeCount; s++) {
    const type = Math.floor(rand(s * 10 + 1) * 3);
    const margin = charWidth * 0.15;

    if (type === 0) {
      const sx = startX + margin + rand(s * 10 + 2) * (charWidth - margin * 2);
      const sy = startY + margin + rand(s * 10 + 3) * (charHeight - margin * 2);
      const ex = startX + margin + rand(s * 10 + 4) * (charWidth - margin * 2);
      const ey = startY + margin + rand(s * 10 + 5) * (charHeight - margin * 2);
      const steps = 12;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = sx + (ex - sx) * t + (rand(s * 10 + 6 + i) - 0.5) * 3;
        const y = sy + (ey - sy) * t + (rand(s * 10 + 7 + i) - 0.5) * 3;
        pathPoints.push({ x, y });
      }
    } else if (type === 1) {
      const sx = startX + margin + rand(s * 10 + 2) * (charWidth - margin * 2);
      const sy = startY + margin + rand(s * 10 + 3) * (charHeight * 0.4);
      const my = cy + (rand(s * 10 + 4) - 0.5) * charHeight * 0.3;
      const ey = startY + charHeight * 0.5 + rand(s * 10 + 5) * charHeight * 0.35;
      const steps = 16;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = sx + Math.sin(t * Math.PI * (0.5 + rand(s * 10 + 8))) * charWidth * 0.3;
        const y = sy + (ey - sy) * t;
        pathPoints.push({ x: x + (rand(s * 10 + 9 + i) - 0.5) * 2, y: y + (rand(s * 10 + 10 + i) - 0.5) * 2 });
      }
    } else {
      const radius = charWidth * (0.15 + rand(s * 10 + 2) * 0.2);
      const arcCx = cx + (rand(s * 10 + 3) - 0.5) * charWidth * 0.3;
      const arcCy = cy + (rand(s * 10 + 4) - 0.5) * charHeight * 0.3;
      const startAngle = rand(s * 10 + 5) * Math.PI * 2;
      const arcLen = (0.5 + rand(s * 10 + 6) * 1.2) * Math.PI;
      const steps = 14;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const angle = startAngle + arcLen * t;
        const x = arcCx + Math.cos(angle) * radius + (rand(s * 10 + 7 + i) - 0.5) * 2;
        const y = arcCy + Math.sin(angle) * radius + (rand(s * 10 + 8 + i) - 0.5) * 2;
        pathPoints.push({ x, y });
      }
    }

    pathPoints.push({ x: -1, y: -1 });
  }

  return pathPoints;
}

export function getPoems(): Poem[] {
  return POEMS;
}

export function getPoemById(id: string): Poem | undefined {
  return POEMS.find((p) => p.id === id);
}

export function generatePoetryAnimation(
  poem: Poem,
  canvasWidth: number,
  canvasHeight: number
): AnimationFrame[] {
  const frames: AnimationFrame[] = [];
  const text = poem.lines.join('');
  const totalChars = text.length;
  const lines = poem.lines.length;
  const charsPerLine = Math.ceil(totalChars / lines);

  const padding = Math.min(canvasWidth, canvasHeight) * 0.1;
  const availW = canvasWidth - padding * 2;
  const availH = canvasHeight - padding * 2;
  const charW = Math.min(availW / charsPerLine, availH / lines) * 0.75;
  const charH = charW * 1.2;

  const gridW = charsPerLine * charW;
  const gridH = lines * charH;
  const offsetX = (canvasWidth - gridW) / 2;
  const offsetY = (canvasHeight - gridH) / 2;

  let charIdx = 0;
  for (let lineIdx = 0; lineIdx < lines; lineIdx++) {
    const line = poem.lines[lineIdx];
    for (let ci = 0; ci < line.length; ci++) {
      const char = line[ci];
      const x = offsetX + ci * charW;
      const y = offsetY + lineIdx * charH;
      const path = generateCharPath(char.charCodeAt(0), x, y, charW, charH);

      let strokePoints: StrokePoint[] = [];
      let prevX = 0, prevY = 0;
      let pointIdx = 0;

      for (const pt of path) {
        if (pt.x === -1 && pt.y === -1) {
          if (strokePoints.length > 0) {
            frames.push({
              points: strokePoints,
              delay: charIdx * 350 + pointIdx * 16,
            });
            strokePoints = [];
          }
          continue;
        }

        const dx = pt.x - prevX;
        const dy = pt.y - prevY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const speed = dist / 16;
        const widthFactor = Math.max(0.2, 1 - speed * 0.02);
        const baseW = charW * 0.12;

        const isStart = strokePoints.length === 0;
        const isEnd = pointIdx > 0 && pointIdx === path.length - 1;
        let w = baseW * widthFactor;
        if (isStart) w = baseW * 0.4;
        else if (isEnd) w = baseW * 0.15;
        else w = baseW * widthFactor;

        const opacity = isStart ? 0.6 : isEnd ? 0.5 : 0.85;

        const point: StrokePoint = {
          x: pt.x,
          y: pt.y,
          width: w,
          opacity,
          age: 0,
          maxAge: 15000,
          diffusionRadius: 0,
          diffusionRate: 0.15 + Math.random() * 0.1,
          inkDensity: opacity,
        };

        strokePoints.push(point);
        prevX = pt.x;
        prevY = pt.y;
        pointIdx++;
      }

      if (strokePoints.length > 0) {
        frames.push({
          points: strokePoints,
          delay: charIdx * 350 + pointIdx * 16,
        });
      }

      charIdx++;
    }
  }

  return frames;
}
