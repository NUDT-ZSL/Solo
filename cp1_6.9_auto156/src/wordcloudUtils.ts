export interface WordBlock {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  rotation: number;
  color: string;
  opacity: number;
  fontFamily: string;
  frequency: number;
}

export interface WordCloudState {
  words: WordBlock[];
  colorSchemeIndex: number;
}

export interface ColorScheme {
  name: string;
  start: string;
  end: string;
  colors: string[];
}

export const COLOR_SCHEMES: ColorScheme[] = [
  {
    name: '日落暖光',
    start: '#FF6B35',
    end: '#F7C59F',
    colors: ['#FF6B35', '#FF8C5A', '#FFA878', '#FFBE94', '#F7C59F'],
  },
  {
    name: '深海冷光',
    start: '#1A3A5C',
    end: '#4A8B80',
    colors: ['#1A3A5C', '#2A5470', '#3A6E80', '#45A29E', '#4A8B80'],
  },
  {
    name: '春日花语',
    start: '#FFD1DC',
    end: '#A8E6CF',
    colors: ['#FFD1DC', '#FFB6C1', '#FFC8DD', '#B5EAD7', '#A8E6CF'],
  },
  {
    name: '午夜霓虹',
    start: '#0B0C10',
    end: '#45A29E',
    colors: ['#0B0C10', '#1F2833', '#2B3A42', '#374A52', '#45A29E'],
  },
  {
    name: '复古木刻',
    start: '#8B5E3C',
    end: '#D4A57A',
    colors: ['#8B5E3C', '#A67C52', '#C19A6B', '#D4A57A', '#E8C39E'],
  },
  {
    name: '水墨丹青',
    start: '#1A1A2E',
    end: '#16213E',
    colors: ['#1A1A2E', '#0F3460', '#16213E', '#2A3F54', '#3D5A80'],
  },
];

export const FONT_OPTIONS = ['宋体', '黑体', '楷体', 'Arial', 'Helvetica'];

export const CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 800;
export const MAX_FONT_SIZE = 72;
export const MIN_FONT_SIZE = 32;
export const WORD_SPACING = 10;
export const MAX_WORDS = 100;

const STOP_WORDS_CN = new Set([
  '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一',
  '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有',
  '看', '好', '自己', '这', '那', '他', '她', '它', '们', '这个', '那个',
  '什么', '怎么', '为什么', '因为', '所以', '如果', '但是', '而且', '或者',
  '虽然', '可以', '可能', '应该', '需要', '已经', '正在', '将', '能',
  '其', '及', '与', '之', '于', '等', '被', '把', '让', '对', '从', '向',
]);

const STOP_WORDS_EN = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'am', 'are', 'was', 'were', 'be',
  'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
  'would', 'should', 'could', 'may', 'might', 'can', 'shall', 'it', 'its',
  'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they',
  'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'our', 'their',
  'what', 'which', 'who', 'whom', 'when', 'where', 'why', 'how', 'not',
  'no', 'nor', 'so', 'than', 'too', 'very', 'just', 'also', 'then', 'now',
]);

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function tokenize(text: string): string[] {
  const tokens: string[] = [];
  const cleanText = text.toLowerCase();

  const cnRegex = /[\u4e00-\u9fa5]/g;
  const cnMatches = cleanText.match(cnRegex);
  if (cnMatches) {
    for (let i = 0; i < cnMatches.length - 1; i++) {
      const bigram = cnMatches[i] + cnMatches[i + 1];
      if (!STOP_WORDS_CN.has(bigram)) {
        tokens.push(bigram);
      }
    }
    for (const char of cnMatches) {
      if (!STOP_WORDS_CN.has(char)) {
        tokens.push(char);
      }
    }
  }

  const enRegex = /[a-zA-Z]+/g;
  const enMatches = cleanText.match(enRegex);
  if (enMatches) {
    for (const word of enMatches) {
      if (word.length > 1 && !STOP_WORDS_EN.has(word)) {
        tokens.push(word);
      }
    }
  }

  return tokens;
}

export function extractKeywords(text: string, maxWords: number = MAX_WORDS): Array<{ text: string; frequency: number }> {
  const tokens = tokenize(text);
  const freqMap = new Map<string, number>();

  for (const token of tokens) {
    freqMap.set(token, (freqMap.get(token) || 0) + 1);
  }

  const sorted = Array.from(freqMap.entries())
    .map(([text, frequency]) => ({ text, frequency }))
    .sort((a, b) => b.frequency - a.frequency);

  return sorted.slice(0, maxWords);
}

export function interpolateColor(colors: string[], t: number): string {
  if (colors.length === 0) return '#000000';
  if (colors.length === 1) return colors[0];

  const scaled = t * (colors.length - 1);
  const index = Math.min(Math.floor(scaled), colors.length - 2);
  const localT = scaled - index;

  const c1 = hexToRgb(colors[index]);
  const c2 = hexToRgb(colors[index + 1]);

  const r = Math.round(c1.r + (c2.r - c1.r) * localT);
  const g = Math.round(c1.g + (c2.g - c1.g) * localT);
  const b = Math.round(c1.b + (c2.b - c1.b) * localT);

  return `rgb(${r},${g},${b})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

function measureText(ctx: CanvasRenderingContext2D, text: string, fontSize: number, fontFamily: string, rotation: number): { width: number; height: number } {
  ctx.save();
  ctx.font = `${fontSize}px "${fontFamily}"`;
  const metrics = ctx.measureText(text);
  const baseWidth = metrics.width;
  const baseHeight = fontSize;
  ctx.restore();

  const rad = (rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const width = baseWidth * cos + baseHeight * sin;
  const height = baseWidth * sin + baseHeight * cos;

  return { width, height };
}

function rectsOverlap(
  x1: number, y1: number, w1: number, h1: number,
  x2: number, y2: number, w2: number, h2: number,
  spacing: number = WORD_SPACING
): boolean {
  return !(
    x1 + w1 / 2 + spacing < x2 - w2 / 2 ||
    x1 - w1 / 2 - spacing > x2 + w2 / 2 ||
    y1 + h1 / 2 + spacing < y2 - h2 / 2 ||
    y1 - h1 / 2 - spacing > y2 + h2 / 2
  );
}

export interface LayoutResult {
  x: number;
  y: number;
  rotation: number;
}

export function spiralLayout(
  keywords: Array<{ text: string; frequency: number }>,
  colorSchemeIndex: number,
  canvasWidth: number = CANVAS_WIDTH,
  canvasHeight: number = CANVAS_HEIGHT
): WordBlock[] {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const words: WordBlock[] = [];
  const colorScheme = COLOR_SCHEMES[colorSchemeIndex];
  const maxFreq = keywords.length > 0 ? keywords[0].frequency : 1;
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;

  const placedRects: Array<{ x: number; y: number; w: number; h: number }> = [];

  keywords.forEach((kw, index) => {
    const freqRatio = kw.frequency / maxFreq;
    const fontSize = Math.round(MIN_FONT_SIZE + (MAX_FONT_SIZE - MIN_FONT_SIZE) * freqRatio);
    const fontFamily = FONT_OPTIONS[index % FONT_OPTIONS.length];
    const colorRatio = keywords.length > 1 ? index / (keywords.length - 1) : 0;
    const color = interpolateColor(colorScheme.colors, colorRatio);

    const rotations = [0, 90, -90, 45, -45];
    let placed = false;
    let result: LayoutResult = { x: centerX, y: centerY, rotation: 0 };
    let size = { width: 100, height: fontSize };

    for (const rot of rotations) {
      size = measureText(ctx, kw.text, fontSize, fontFamily, rot);

      let angle = 0;
      let radius = 0;
      const step = 2;
      const angleStep = 0.2;
      const maxRadius = Math.sqrt(canvasWidth * canvasWidth + canvasHeight * canvasHeight) / 2;

      while (radius < maxRadius && !placed) {
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);

        let overlaps = false;
        for (const rect of placedRects) {
          if (rectsOverlap(x, y, size.width, size.height, rect.x, rect.y, rect.w, rect.h)) {
            overlaps = true;
            break;
          }
        }

        if (!overlaps &&
            x - size.width / 2 > 0 && x + size.width / 2 < canvasWidth &&
            y - size.height / 2 > 0 && y + size.height / 2 < canvasHeight) {
          result = { x, y, rotation: rot };
          placed = true;
          break;
        }

        angle += angleStep;
        if (angle >= Math.PI * 2) {
          angle = 0;
          radius += step;
        }
      }

      if (placed) break;
    }

    if (!placed) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 50 + Math.random() * 200;
      result = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        rotation: 0,
      };
    }

    placedRects.push({ x: result.x, y: result.y, w: size.width, h: size.height });

    words.push({
      id: generateId(),
      text: kw.text,
      x: result.x,
      y: result.y,
      fontSize,
      rotation: result.rotation,
      color,
      opacity: 1,
      fontFamily,
      frequency: kw.frequency,
    });
  });

  return words;
}
