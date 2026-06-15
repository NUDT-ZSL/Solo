export interface Color {
  hex: string;
  name: string;
}

interface ColorEntry {
  hex: string;
  name: string;
  keywords: string[];
}

const colorLibrary: ColorEntry[] = [
  { hex: '#FF6B6B', name: '珊瑚红', keywords: ['summer', '夏日', 'beach', '海滩', 'hot', '热', 'sunset', '日落'] },
  { hex: '#4ECDC4', name: '薄荷绿', keywords: ['ocean', '海洋', 'beach', '海滩', 'fresh', '清新', 'cool', '凉爽', 'water', '水'] },
  { hex: '#FFE66D', name: '阳光黄', keywords: ['sun', '太阳', 'summer', '夏日', 'warm', '温暖', 'bright', '明亮', 'lemon', '柠檬'] },
  { hex: '#A8DADC', name: '天空蓝', keywords: ['sky', '天空', 'calm', '平静', 'cloud', '云', 'ocean', '海洋'] },
  { hex: '#F7B267', name: '沙滩橙', keywords: ['sand', '沙', 'beach', '海滩', 'warm', '温暖', 'sunset', '日落'] },
  { hex: '#9B5DE5', name: '蒸汽紫', keywords: ['vaporwave', '蒸汽波', 'retro', '复古', 'synthwave', '电子', 'purple', '紫色', 'neon', '霓虹'] },
  { hex: '#F15BB5', name: '霓虹粉', keywords: ['neon', '霓虹', 'vaporwave', '蒸汽波', 'pink', '粉色', 'retro', '复古'] },
  { hex: '#00BBF9', name: '赛博蓝', keywords: ['cyber', '赛博', 'neon', '霓虹', 'tech', '科技', 'blue', '蓝色'] },
  { hex: '#00F5D4', name: '电光青', keywords: ['neon', '霓虹', 'cyber', '赛博', 'vaporwave', '蒸汽波', 'green', '绿色'] },
  { hex: '#FEE440', name: '复古黄', keywords: ['retro', '复古', '80s', '80年代', 'yellow', '黄色', 'sun', '太阳'] },
  { hex: '#2D6A4F', name: '森林绿', keywords: ['forest', '森林', 'nature', '自然', 'green', '绿色', 'tree', '树'] },
  { hex: '#40916C', name: '草地绿', keywords: ['grass', '草地', 'nature', '自然', 'spring', '春天'] },
  { hex: '#52B788', name: '薄荷青', keywords: ['mint', '薄荷', 'fresh', '清新', 'cool', '凉爽'] },
  { hex: '#74C69D', name: '嫩芽绿', keywords: ['spring', '春天', 'fresh', '清新', 'new', '新生'] },
  { hex: '#B7E4C7', name: '浅草绿', keywords: ['light', '浅', 'fresh', '清新', 'soft', '柔和'] },
  { hex: '#03045E', name: '深海蓝', keywords: ['night', '夜晚', 'ocean', '海洋', 'deep', '深邃', 'dark', '黑暗'] },
  { hex: '#0077B6', name: '海洋蓝', keywords: ['ocean', '海洋', 'blue', '蓝色', 'water', '水'] },
  { hex: '#00B4D8', name: '晴空蓝', keywords: ['sky', '天空', 'summer', '夏日', 'bright', '明亮'] },
  { hex: '#90E0EF', name: '浅水蓝', keywords: ['light', '浅', 'calm', '平静', 'soft', '柔和'] },
  { hex: '#CAF0F8', name: '冰蓝白', keywords: ['ice', '冰', 'cold', '冷', 'white', '白', 'soft', '柔和'] },
  { hex: '#3A0CA3', name: '星空紫', keywords: ['night', '夜晚', 'star', '星星', 'purple', '紫色', 'mystery', '神秘'] },
  { hex: '#7209B7', name: '魔幻紫', keywords: ['magic', '魔法', 'purple', '紫色', 'royal', '皇家'] },
  { hex: '#B5179E', name: '玫紫红', keywords: ['romantic', '浪漫', 'pink', '粉色', 'passion', '热情'] },
  { hex: '#F72585', name: '艳粉红', keywords: ['hot', '热', 'pink', '粉色', 'neon', '霓虹'] },
  { hex: '#FFB703', name: '金秋黄', keywords: ['autumn', '秋天', 'gold', '金色', 'warm', '温暖', 'harvest', '丰收'] },
  { hex: '#FB8500', name: '南瓜橙', keywords: ['autumn', '秋天', 'orange', '橙色', 'warm', '温暖'] },
  { hex: '#BB3E03', name: '铁锈红', keywords: ['autumn', '秋天', 'retro', '复古', 'earth', '大地'] },
  { hex: '#8ECAE6', name: '晨雾蓝', keywords: ['morning', '早晨', 'mist', '雾', 'soft', '柔和'] },
  { hex: '#219EBC', name: '湖水蓝', keywords: ['lake', '湖', 'water', '水', 'calm', '平静'] },
  { hex: '#E63946', name: '火焰红', keywords: ['fire', '火', 'passion', '热情', 'red', '红色', 'hot', '热'] },
  { hex: '#F1FAEE', name: '云朵白', keywords: ['white', '白', 'cloud', '云', 'clean', '干净'] },
  { hex: '#A8DADC', name: '冰川青', keywords: ['ice', '冰', 'cold', '冷', 'cool', '凉爽'] },
  { hex: '#457B9D', name: '石板蓝', keywords: ['stone', '石头', 'calm', '平静', 'business', '商务'] },
  { hex: '#1D3557', name: '午夜蓝', keywords: ['night', '夜晚', 'dark', '黑暗', 'deep', '深邃'] },
  { hex: '#FF006E', name: '热粉红', keywords: ['hot', '热', 'pink', '粉色', 'passion', '热情'] },
  { hex: '#8338EC', name: '电幻紫', keywords: ['neon', '霓虹', 'purple', '紫色', 'vaporwave', '蒸汽波'] },
  { hex: '#3A86FF', name: '电光蓝', keywords: ['neon', '霓虹', 'blue', '蓝色', 'tech', '科技'] },
  { hex: '#FFBE0B', name: '柠檬黄', keywords: ['yellow', '黄色', 'bright', '明亮', 'sun', '太阳'] },
  { hex: '#FB5607', name: '活力橙', keywords: ['orange', '橙色', 'energy', '活力', 'hot', '热'] },
  { hex: '#588157', name: '橄榄绿', keywords: ['olive', '橄榄', 'nature', '自然', 'army', '军事'] },
  { hex: '#A3B18A', name: '苔原绿', keywords: ['moss', '苔藓', 'nature', '自然', 'soft', '柔和'] },
  { hex: '#DAD7CD', name: '米白灰', keywords: ['cream', '奶油', 'beige', '米色', 'soft', '柔和', 'neutral', '中性'] },
  { hex: '#344E41', name: '深林绿', keywords: ['forest', '森林', 'dark', '黑暗', 'deep', '深邃'] },
  { hex: '#FFCDB2', name: '蜜桃粉', keywords: ['peach', '蜜桃', 'soft', '柔和', 'pink', '粉色'] },
  { hex: '#FFB4A2', name: '珊瑚粉', keywords: ['coral', '珊瑚', 'soft', '柔和', 'warm', '温暖'] },
  { hex: '#E5989B', name: '玫瑰棕', keywords: ['rose', '玫瑰', 'brown', '棕色', 'soft', '柔和'] },
  { hex: '#B5838D', name: '暗玫瑰', keywords: ['dark', '暗', 'rose', '玫瑰', 'retro', '复古'] },
  { hex: '#6D6875', name: '紫罗兰灰', keywords: ['purple', '紫色', 'gray', '灰', 'neutral', '中性'] },
  { hex: '#FFAFCC', name: '芭蕾粉', keywords: ['ballet', '芭蕾', 'pink', '粉色', 'soft', '柔和'] },
  { hex: '#BDE0FE', name: '婴儿蓝', keywords: ['baby', '婴儿', 'blue', '蓝色', 'soft', '柔和'] },
  { hex: '#A2D2FF', name: '天空淡蓝', keywords: ['sky', '天空', 'blue', '蓝色', 'light', '淡'] },
];

function normalizeText(text: string): string {
  return text.toLowerCase().trim();
}

function extractKeywords(text: string): string[] {
  const normalized = normalizeText(text);
  const tokens = normalized.split(/[\s,，。.!！?？、;；:：\-_]+/).filter(Boolean);
  const tokensWithNgrams: string[] = [...tokens];
  for (let i = 0; i < tokens.length - 1; i++) {
    tokensWithNgrams.push(tokens[i] + tokens[i + 1]);
  }
  if (normalized.length > 2) {
    for (let i = 0; i < normalized.length - 1; i++) {
      tokensWithNgrams.push(normalized.slice(i, i + 2));
    }
  }
  return tokensWithNgrams;
}

function scoreColor(colorEntry: ColorEntry, userKeywords: string[]): number {
  let score = 0;
  for (const userKw of userKeywords) {
    for (const colorKw of colorEntry.keywords) {
      if (userKw === colorKw) {
        score += 10;
      } else if (colorKw.includes(userKw) || userKw.includes(colorKw)) {
        score += 5;
      }
    }
  }
  return score + Math.random() * 0.1;
}

function hsvDistance(hex1: string, hex2: string): number {
  const hsv1 = hexToHsv(hex1);
  const hsv2 = hexToHsv(hex2);
  const dh = Math.min(Math.abs(hsv1.h - hsv2.h), 360 - Math.abs(hsv1.h - hsv2.h)) / 180;
  const ds = Math.abs(hsv1.s - hsv2.s);
  const dv = Math.abs(hsv1.v - hsv2.v);
  return dh + ds * 0.5 + dv * 0.3;
}

function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  const s = max === 0 ? 0 : (max - min) / max;
  const v = max;
  if (max !== min) {
    if (max === r) h = ((g - b) / (max - min) + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / (max - min) + 2) * 60;
    else h = ((r - g) / (max - min) + 4) * 60;
  }
  return { h, s, v };
}

export function generatePalette(text: string, lockedColors: Color[] = []): Color[] {
  const normalized = normalizeText(text);
  if (!normalized) {
    return getFallbackPalette(lockedColors);
  }
  const userKeywords = extractKeywords(text);
  const scored = colorLibrary.map((c) => ({
    entry: c,
    score: scoreColor(c, userKeywords),
  }));
  scored.sort((a, b) => b.score - a.score);

  const result: Color[] = [];
  const lockedSet = new Set(lockedColors.map((c) => c.hex.toUpperCase()));

  let i = 0;
  while (result.length < 5 && i < scored.length) {
    const candidate = scored[i].entry;
    if (lockedSet.has(candidate.hex.toUpperCase())) {
      i++;
      continue;
    }
    const isDiverse = result.every((existing) => hsvDistance(existing.hex, candidate.hex) > 0.15);
    if (isDiverse || result.length === 0) {
      result.push({ hex: candidate.hex, name: candidate.name });
    }
    i++;
  }

  while (result.length < 5) {
    const fallback = colorLibrary[Math.floor(Math.random() * colorLibrary.length)];
    if (!result.some((c) => c.hex === fallback.hex) && !lockedSet.has(fallback.hex.toUpperCase())) {
      result.push({ hex: fallback.hex, name: fallback.name });
    }
  }

  return result;
}

function getFallbackPalette(lockedColors: Color[]): Color[] {
  const defaults: Color[] = [
    { hex: '#3A86FF', name: '电光蓝' },
    { hex: '#8338EC', name: '电幻紫' },
    { hex: '#FF006E', name: '热粉红' },
    { hex: '#FB5607', name: '活力橙' },
    { hex: '#FFBE0B', name: '柠檬黄' },
  ];
  const result: Color[] = [];
  const lockedSet = new Set(lockedColors.map((c) => c.hex.toUpperCase()));
  for (const c of defaults) {
    if (!lockedSet.has(c.hex.toUpperCase())) {
      result.push(c);
    }
  }
  while (result.length < 5) {
    const fallback = colorLibrary[Math.floor(Math.random() * colorLibrary.length)];
    if (!result.some((c) => c.hex === fallback.hex) && !lockedSet.has(fallback.hex.toUpperCase())) {
      result.push({ hex: fallback.hex, name: fallback.name });
    }
  }
  return result;
}

export function isValidHex(hex: string): boolean {
  return /^#([0-9A-F]{3}){1,2}$/i.test(hex);
}
