export interface Point {
  x: number;
  y: number;
}

export interface SmoothedPath {
  d: string;
}

export interface ArrowResult {
  line: string;
  head: string;
}

export interface WrappedText {
  lines: string[];
  lineHeight: number;
}

export function smoothPath(points: Point[]): SmoothedPath {
  if (points.length < 2) {
    if (points.length === 1) {
      return { d: `M ${points[0].x} ${points[0].y} L ${points[0].x + 0.1} ${points[0].y}` };
    }
    return { d: '' };
  }

  let d = `M ${points[0].x} ${points[0].y}`;

  if (points.length === 2) {
    d += ` L ${points[1].x} ${points[1].y}`;
    return { d };
  }

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    const cp1x = prev.x + (curr.x - prev.x) * 0.5;
    const cp1y = prev.y + (curr.y - prev.y) * 0.5;
    const cp2x = curr.x + (next.x - curr.x) * 0.25;
    const cp2y = curr.y + (next.y - curr.y) * 0.25;

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
  }

  const last = points[points.length - 1];
  const secondLast = points[points.length - 2];
  d += ` C ${secondLast.x + (last.x - secondLast.x) * 0.5} ${secondLast.y + (last.y - secondLast.y) * 0.5}, ${last.x} ${last.y}, ${last.x} ${last.y}`;

  return { d };
}

export function calculateArrowHead(from: Point, to: Point, headLength: number = 12): ArrowResult {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const angle = Math.atan2(dy, dx);

  const line = `M ${from.x} ${from.y} L ${to.x} ${to.y}`;

  const leftX = to.x - headLength * Math.cos(angle - Math.PI / 6);
  const leftY = to.y - headLength * Math.sin(angle - Math.PI / 6);
  const rightX = to.x - headLength * Math.cos(angle + Math.PI / 6);
  const rightY = to.y - headLength * Math.sin(angle + Math.PI / 6);

  const head = `M ${leftX} ${leftY} L ${to.x} ${to.y} L ${rightX} ${rightY}`;

  return { line, head };
}

export function wrapText(text: string, maxWidth: number, fontSize: number = 13, maxLines: number = 3): WrappedText {
  const charWidth = fontSize * 0.6;
  const maxCharsPerLine = Math.floor(maxWidth / charWidth);
  const lineHeight = fontSize * 1.4;

  const words = text.split('');
  const lines: string[] = [];
  let currentLine = '';

  for (const char of words) {
    if (currentLine.length + 1 > maxCharsPerLine) {
      lines.push(currentLine);
      currentLine = char;
      if (lines.length >= maxLines) {
        lines[lines.length - 1] = lines[lines.length - 1].slice(0, -1) + '…';
        break;
      }
    } else {
      currentLine += char;
    }
  }

  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }

  return { lines, lineHeight };
}

export function springPhysics(
  current: number,
  target: number,
  velocity: number,
  stiffness: number = 300,
  damping: number = 20,
  dt: number = 0.016
): { position: number; velocity: number; settled: boolean } {
  const displacement = current - target;
  const springForce = -stiffness * displacement;
  const dampingForce = -damping * velocity;
  const acceleration = springForce + dampingForce;
  const newVelocity = velocity + acceleration * dt;
  const newPosition = current + newVelocity * dt;

  const settled = Math.abs(newPosition - target) < 0.5 && Math.abs(newVelocity) < 0.5;

  return {
    position: settled ? target : newPosition,
    velocity: settled ? 0 : newVelocity,
    settled,
  };
}

export function hashUuidToColor(uuid: string): string {
  let hash = 0;
  for (let i = 0; i < uuid.length; i++) {
    const ch = uuid.charCodeAt(i);
    hash = ((hash << 5) - hash) + ch;
    hash = hash & hash;
  }
  hash = Math.abs(hash);

  const palette = ['#3498DB', '#E74C3C', '#2ECC71', '#F1C40F', '#9B59B6', '#1ABC9C', '#E67E22', '#34495E'];
  return palette[hash % palette.length];
}

const adjectives = ['灵动的', '智慧的', '创意的', '闪耀的', '快速的', '优雅的', '勇敢的', '温暖的', '神秘的', '酷炫的', '深邃的', '敏捷的'];
const nouns = ['画师', '设计师', '思考者', '梦想家', '创造者', '探险家', '建筑师', '工程师', '艺术家', '观测者', '策划师', '领航员'];

export function generateNickname(uuid: string): string {
  let hash = 0;
  for (let i = 0; i < uuid.length; i++) {
    hash = ((hash << 5) - hash) + uuid.charCodeAt(i);
    hash = hash & hash;
  }
  hash = Math.abs(hash);
  const adj = adjectives[hash % adjectives.length];
  const noun = nouns[Math.floor(hash / adjectives.length) % nouns.length];
  return `${adj}${noun}`;
}

export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);

  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return Math.hypot(p.x - projX, p.y - projY);
}
