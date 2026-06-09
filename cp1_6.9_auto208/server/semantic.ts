import type { EmotionAnalysis, EmotionCategory, ColorPalette, CurveConfig } from '../shared/types.js';

const positiveKeywords: Record<string, number> = {
  '开心': 1.0, '快乐': 1.0, '高兴': 0.9, '喜悦': 0.95, '愉快': 0.85,
  '幸福': 1.0, '满足': 0.8, '兴奋': 0.9, '激动': 0.85, '喜欢': 0.8,
  '爱': 1.0, '热爱': 0.95, '甜蜜': 0.9, '温暖': 0.75, '美好': 0.85,
  '希望': 0.7, '期待': 0.65, '感恩': 0.9, '平静': 0.5, '放松': 0.6,
  '舒适': 0.6, '安心': 0.65, '自由': 0.75, '惊喜': 0.85, '灿烂': 0.8,
  '阳光': 0.7, '明媚': 0.75, '笑': 0.7, '乐': 0.8, '爽': 0.7,
  '棒': 0.8, '赞': 0.85, '好': 0.5, '美': 0.6, '甜': 0.75,
  '浪漫': 0.85, '感动': 0.75, '勇气': 0.6, '力量': 0.55, '活力': 0.7,
  '青春': 0.65, '梦想': 0.6, '热情': 0.8, '朝气': 0.7, '灿烂': 0.8,
};

const negativeKeywords: Record<string, number> = {
  '忧伤': 1.0, '悲伤': 1.0, '难过': 0.9, '伤心': 0.95, '痛苦': 0.95,
  '忧郁': 0.85, '沮丧': 0.85, '失落': 0.8, '孤独': 0.85, '寂寞': 0.85,
  '绝望': 1.0, '焦虑': 0.75, '烦躁': 0.7, '愤怒': 0.9, '生气': 0.85,
  '讨厌': 0.7, '恨': 0.95, '害怕': 0.7, '恐惧': 0.9, '担心': 0.6,
  '忧虑': 0.7, '苦闷': 0.85, '心酸': 0.8, '委屈': 0.75, '疲惫': 0.6,
  '累': 0.55, '困': 0.4, '无聊': 0.5, '空虚': 0.7, '迷茫': 0.65,
  '雨': 0.35, '阴': 0.4, '冷': 0.45, '黑': 0.35, '暗': 0.4,
  '夜': 0.3, '哭': 0.6, '泪': 0.65, '痛': 0.6, '死': 0.85,
  '输': 0.55, '败': 0.6, '失': 0.5, '错': 0.5, '难': 0.4,
  '压力': 0.65, '压抑': 0.75, '沉重': 0.6, '心碎': 0.9, '崩溃': 0.95,
};

const neutralKeywords: Record<string, number> = {
  '平静': 0.7, '安静': 0.75, '宁静': 0.8, '普通': 0.6, '一般': 0.5,
  '还行': 0.5, '平常': 0.6, '日常': 0.5, '简单': 0.45, '平淡': 0.6,
  '思考': 0.5, '回忆': 0.5, '怀念': 0.5, '想念': 0.55, '等待': 0.5,
  '看': 0.3, '听': 0.3, '读': 0.3, '写': 0.3, '走': 0.3,
  '风': 0.25, '云': 0.25, '山': 0.2, '水': 0.25, '天': 0.2,
  '今天': 0.2, '昨天': 0.2, '明天': 0.25, '现在': 0.2, '这里': 0.15,
};

export function analyzeEmotion(text: string): EmotionAnalysis {
  let positiveScore = 0;
  let negativeScore = 0;
  let neutralScore = 0;
  const matchedKeywords: string[] = [];

  const normalizedText = text.toLowerCase();

  for (const [keyword, weight] of Object.entries(positiveKeywords)) {
    if (normalizedText.includes(keyword)) {
      positiveScore += weight;
      matchedKeywords.push(keyword);
    }
  }

  for (const [keyword, weight] of Object.entries(negativeKeywords)) {
    if (normalizedText.includes(keyword)) {
      negativeScore += weight;
      matchedKeywords.push(keyword);
    }
  }

  for (const [keyword, weight] of Object.entries(neutralKeywords)) {
    if (normalizedText.includes(keyword)) {
      neutralScore += weight;
      if (!matchedKeywords.includes(keyword)) {
        matchedKeywords.push(keyword);
      }
    }
  }

  const textLengthBoost = Math.min(text.length / 20, 1.5);
  positiveScore *= textLengthBoost;
  negativeScore *= textLengthBoost;
  neutralScore *= textLengthBoost;

  let category: EmotionCategory;
  let score: number;

  const threshold = 0.8;

  if (positiveScore > negativeScore * threshold && positiveScore > neutralScore) {
    category = 'positive';
    score = Math.min(positiveScore / (positiveScore + negativeScore + neutralScore + 0.01), 1);
  } else if (negativeScore > positiveScore * threshold && negativeScore > neutralScore) {
    category = 'negative';
    score = Math.min(negativeScore / (positiveScore + negativeScore + neutralScore + 0.01), 1);
  } else {
    category = 'neutral';
    const total = positiveScore + negativeScore + neutralScore;
    score = total > 0 ? Math.min(neutralScore / (total + 0.01) + 0.3, 1) : 0.6;
  }

  if (matchedKeywords.length === 0) {
    const charScore = text.length;
    if (charScore < 5) {
      category = 'neutral';
      score = 0.5;
    }
  }

  return {
    category,
    score: Math.max(0.15, Math.min(score, 0.98)),
    keywords: matchedKeywords.slice(0, 5),
  };
}

export function mapEmotionToPalette(emotion: EmotionAnalysis): ColorPalette {
  const { category, score } = emotion;
  const intensity = score;

  if (category === 'positive') {
    const warmBase = [
      { r: 255, g: 180, b: 80 },
      { r: 255, g: 210, b: 100 },
      { r: 255, g: 240, b: 160 },
      { r: 255, g: 255, b: 210 },
    ];
    const warmIntense = [
      { r: 255, g: 130, b: 40 },
      { r: 255, g: 180, b: 60 },
      { r: 255, g: 220, b: 120 },
      { r: 255, g: 250, b: 180 },
    ];

    const colors = interpolatePalette(warmBase, warmIntense, intensity);
    return {
      gradient: [
        { color: rgbToHex(colors[0]), position: 0 },
        { color: rgbToHex(colors[1]), position: 0.35 },
        { color: rgbToHex(colors[2]), position: 0.7 },
        { color: rgbToHex(colors[3]), position: 1 },
      ],
      glowColor: rgbToHex(colors[1]),
      primaryColor: rgbToHex(colors[0]),
    };
  } else if (category === 'negative') {
    const coolBase = [
      { r: 90, g: 110, b: 200 },
      { r: 120, g: 100, b: 200 },
      { r: 80, g: 90, b: 180 },
      { r: 40, g: 50, b: 120 },
    ];
    const coolIntense = [
      { r: 60, g: 80, b: 190 },
      { r: 110, g: 70, b: 200 },
      { r: 70, g: 50, b: 160 },
      { r: 25, g: 25, b: 90 },
    ];

    const colors = interpolatePalette(coolBase, coolIntense, intensity);
    return {
      gradient: [
        { color: rgbToHex(colors[0]), position: 0 },
        { color: rgbToHex(colors[1]), position: 0.35 },
        { color: rgbToHex(colors[2]), position: 0.7 },
        { color: rgbToHex(colors[3]), position: 1 },
      ],
      glowColor: rgbToHex(colors[1]),
      primaryColor: rgbToHex(colors[0]),
    };
  } else {
    const neutralBase = [
      { r: 110, g: 170, b: 170 },
      { r: 140, g: 190, b: 180 },
      { r: 170, g: 190, b: 200 },
      { r: 200, g: 205, b: 210 },
    ];
    const neutralIntense = [
      { r: 80, g: 160, b: 160 },
      { r: 120, g: 200, b: 190 },
      { r: 150, g: 190, b: 200 },
      { r: 180, g: 185, b: 195 },
    ];

    const colors = interpolatePalette(neutralBase, neutralIntense, intensity);
    return {
      gradient: [
        { color: rgbToHex(colors[0]), position: 0 },
        { color: rgbToHex(colors[1]), position: 0.35 },
        { color: rgbToHex(colors[2]), position: 0.7 },
        { color: rgbToHex(colors[3]), position: 1 },
      ],
      glowColor: rgbToHex(colors[1]),
      primaryColor: rgbToHex(colors[0]),
    };
  }
}

function interpolatePalette(
  base: Array<{ r: number; g: number; b: number }>,
  intense: Array<{ r: number; g: number; b: number }>,
  t: number
): Array<{ r: number; g: number; b: number }> {
  return base.map((c, i) => ({
    r: Math.round(c.r + (intense[i].r - c.r) * t),
    g: Math.round(c.g + (intense[i].g - c.g) * t),
    b: Math.round(c.b + (intense[i].b - c.b) * t),
  }));
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function generateCurves(emotion: EmotionAnalysis, canvasWidth = 800, canvasHeight = 600): CurveConfig[] {
  const { category, score } = emotion;
  const minCurves = 30;
  const maxCurves = 120;

  let curveCount: number;
  if (category === 'positive') {
    curveCount = Math.round(minCurves + (maxCurves - minCurves) * (0.5 + score * 0.5));
  } else if (category === 'negative') {
    curveCount = Math.round(minCurves + (maxCurves - minCurves) * (0.3 + score * 0.4));
  } else {
    curveCount = Math.round(minCurves + (maxCurves - minCurves) * 0.5);
  }

  curveCount = Math.max(minCurves, Math.min(maxCurves, curveCount));

  const curves: CurveConfig[] = [];
  const w = canvasWidth;
  const h = canvasHeight;

  const amplitudeRange = category === 'positive'
    ? [30, 120 + score * 80]
    : category === 'negative'
    ? [15, 50 + score * 40]
    : [25, 90];

  const speedRange = category === 'positive'
    ? [0.003, 0.01 + score * 0.015]
    : category === 'negative'
    ? [0.001, 0.004 + score * 0.004]
    : [0.002, 0.008];

  const lineWidthRange = category === 'positive'
    ? [1.2, 2.8 + score * 1.5]
    : category === 'negative'
    ? [0.6, 1.5 + score * 0.8]
    : [0.9, 2.2];

  const lengthRange = category === 'positive'
    ? [w * 0.35, w * 0.9 + score * w * 0.3]
    : category === 'negative'
    ? [w * 0.2, w * 0.55 + score * w * 0.25]
    : [w * 0.28, w * 0.75];

  const rotationRange = category === 'positive'
    ? [-0.008, 0.008]
    : category === 'negative'
    ? [-0.002, 0.002]
    : [-0.005, 0.005];

  for (let i = 0; i < curveCount; i++) {
    const startX = Math.random() * w * 1.2 - w * 0.1;
    const startY = Math.random() * h * 1.2 - h * 0.1;

    curves.push({
      startX,
      startY,
      amplitude: amplitudeRange[0] + Math.random() * (amplitudeRange[1] - amplitudeRange[0]),
      frequency: 0.003 + Math.random() * 0.01,
      phase: Math.random() * Math.PI * 2,
      speed: speedRange[0] + Math.random() * (speedRange[1] - speedRange[0]),
      rotationSpeed: rotationRange[0] + Math.random() * (rotationRange[1] - rotationRange[0]),
      length: lengthRange[0] + Math.random() * (lengthRange[1] - lengthRange[0]),
      lineWidth: lineWidthRange[0] + Math.random() * (lineWidthRange[1] - lineWidthRange[0]),
      colorOffset: Math.random(),
    });
  }

  return curves;
}

export function generateShortId(length = 6): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
