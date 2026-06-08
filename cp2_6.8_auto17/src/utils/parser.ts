import { ParseResult, OutfitState, PartType } from '../types';
import {
  HAIR_PARTS, TOP_PARTS, BOTTOM_PARTS, SHOES_PARTS, ACCESSORY_PARTS, COLORS
} from '../data';

const colorKeywords: Record<string, string> = {
  '红色': 'color-red', '红': 'color-red',
  '蓝色': 'color-blue', '蓝': 'color-blue',
  '绿色': 'color-green', '绿': 'color-green',
  '黄色': 'color-yellow', '黄': 'color-yellow',
  '紫色': 'color-purple', '紫': 'color-purple',
  '白色': 'color-white', '白': 'color-white',
  '黑色': 'color-black', '黑': 'color-black',
  '金色': 'color-gold', '金': 'color-gold',
};

const partKeywords: Record<string, { type: PartType; partId: string }> = {
  '短发': { type: 'hair', partId: 'hair-short' },
  '长发': { type: 'hair', partId: 'hair-long' },
  '卷发': { type: 'hair', partId: 'hair-curly' },
  '马尾': { type: 'hair', partId: 'hair-ponytail' },
  '马尾辫': { type: 'hair', partId: 'hair-ponytail' },
  'T恤': { type: 'top', partId: 'top-tshirt' },
  't恤': { type: 'top', partId: 'top-tshirt' },
  'T恤衫': { type: 'top', partId: 'top-tshirt' },
  '衬衫': { type: 'top', partId: 'top-shirt' },
  '衬衣': { type: 'top', partId: 'top-shirt' },
  '连衣裙': { type: 'top', partId: 'top-dress' },
  '裙子': { type: 'top', partId: 'top-dress' },
  '毛衣': { type: 'top', partId: 'top-sweater' },
  '针织衫': { type: 'top', partId: 'top-sweater' },
  '牛仔裤': { type: 'bottom', partId: 'bottom-jeans' },
  '裤子': { type: 'bottom', partId: 'bottom-jeans' },
  '短裙': { type: 'bottom', partId: 'bottom-skirt' },
  '半裙': { type: 'bottom', partId: 'bottom-skirt' },
  '短裤': { type: 'bottom', partId: 'bottom-shorts' },
  '运动鞋': { type: 'shoes', partId: 'shoes-sneakers' },
  '球鞋': { type: 'shoes', partId: 'shoes-sneakers' },
  '休闲鞋': { type: 'shoes', partId: 'shoes-sneakers' },
  '高跟鞋': { type: 'shoes', partId: 'shoes-heels' },
  '跟鞋': { type: 'shoes', partId: 'shoes-heels' },
  '靴子': { type: 'shoes', partId: 'shoes-boots' },
  '长靴': { type: 'shoes', partId: 'shoes-boots' },
  '项链': { type: 'accessory', partId: 'acc-necklace' },
  '帽子': { type: 'accessory', partId: 'acc-hat' },
  '礼帽': { type: 'accessory', partId: 'acc-hat' },
};

const partTypeHints: Record<PartType, string[]> = {
  hair: ['头发', '发', '发型'],
  top: ['上衣', '衣服', '衣'],
  bottom: ['下装', '裤', '裙'],
  shoes: ['鞋'],
  accessory: ['配饰', '饰品', '首饰', '装饰'],
};

export function parseDescription(text: string): ParseResult {
  const startTime = performance.now();
  const normalized = text.trim().toLowerCase();

  if (!normalized) {
    return { success: false, message: '请输入描述内容', partialUpdates: {} };
  }

  type IndexedColor = { colorId: string; index: number };
  const colorMatches: IndexedColor[] = [];
  const seenColorIds = new Set<string>();
  for (const keyword of Object.keys(colorKeywords)) {
    const colorId = colorKeywords[keyword];
    if (seenColorIds.has(colorId)) continue;
    const idx = normalized.indexOf(keyword);
    if (idx !== -1) {
      colorMatches.push({ colorId, index: idx });
      seenColorIds.add(colorId);
    }
  }
  colorMatches.sort((a, b) => a.index - b.index);
  const foundColors = colorMatches.map(c => c.colorId);

  type IndexedPart = { type: PartType; partId: string; index: number };
  const partMatches: IndexedPart[] = [];
  const seenPartTypes = new Set<PartType>();
  for (const keyword of Object.keys(partKeywords)) {
    const part = partKeywords[keyword];
    if (seenPartTypes.has(part.type)) continue;
    const idx = normalized.indexOf(keyword);
    if (idx !== -1) {
      partMatches.push({ type: part.type, partId: part.partId, index: idx });
      seenPartTypes.add(part.type);
    }
  }
  partMatches.sort((a, b) => a.index - b.index);
  const foundParts = partMatches.map(p => ({ type: p.type, partId: p.partId }));

  const partialUpdates: Partial<OutfitState> = {};
  const matchedParts = new Set<PartType>();

  foundParts.forEach((part, index) => {
    if (matchedParts.has(part.type)) return;
    matchedParts.add(part.type);
    const colorId = foundColors[index] || foundColors[0] || null;
    partialUpdates[part.type] = {
      partId: part.partId,
      colorId: colorId || (part.type === 'hair' ? 'color-black' : part.type === 'shoes' ? 'color-white' : 'color-blue'),
    };
  });

  if (foundParts.length === 0 && foundColors.length > 0) {
    for (const type of Object.keys(partTypeHints) as PartType[]) {
      const hints = partTypeHints[type];
      const hasHint = hints.some(h => normalized.includes(h));
      if (hasHint && !partialUpdates[type]) {
        let defaultPart: string;
        switch (type) {
          case 'hair': defaultPart = 'hair-short'; break;
          case 'top': defaultPart = 'top-tshirt'; break;
          case 'bottom': defaultPart = 'bottom-jeans'; break;
          case 'shoes': defaultPart = 'shoes-sneakers'; break;
          case 'accessory': defaultPart = 'acc-necklace'; break;
        }
        partialUpdates[type] = { partId: defaultPart, colorId: foundColors[0] };
      }
    }
  }

  const elapsed = performance.now() - startTime;
  if (elapsed > 5) {
    console.warn(`Parse took ${elapsed.toFixed(1)}ms, target < 5ms`);
  }

  if (Object.keys(partialUpdates).length === 0) {
    return {
      success: false,
      message: '未找到匹配项，请尝试使用更具体的描述，如"红色短发、蓝色T恤"',
      partialUpdates: {},
    };
  }

  const matchedNames = Object.keys(partialUpdates).map(type => {
    const update = partialUpdates[type as keyof OutfitState] as { partId: string; colorId: string };
    const color = COLORS.find(c => c.id === update.colorId)?.name || '';
    let partName = '';
    switch (type) {
      case 'hair': partName = HAIR_PARTS.find(p => p.id === update.partId)?.name || ''; break;
      case 'top': partName = TOP_PARTS.find(p => p.id === update.partId)?.name || ''; break;
      case 'bottom': partName = BOTTOM_PARTS.find(p => p.id === update.partId)?.name || ''; break;
      case 'shoes': partName = SHOES_PARTS.find(p => p.id === update.partId)?.name || ''; break;
      case 'accessory': partName = ACCESSORY_PARTS.find(p => p.id === update.partId)?.name || ''; break;
    }
    return `${color}${partName}`;
  }).filter(Boolean).join('、');

  return {
    success: true,
    message: `已匹配：${matchedNames}`,
    partialUpdates,
  };
}

export function outfitToDescription(outfit: OutfitState): string {
  const parts: string[] = [];

  const hairColor = COLORS.find(c => c.id === outfit.hair.colorId)?.name || '';
  const hairName = HAIR_PARTS.find(p => p.id === outfit.hair.partId)?.name || '';
  if (hairName && hairColor) parts.push(`${hairColor}${hairName}`);

  const topColor = COLORS.find(c => c.id === outfit.top.colorId)?.name || '';
  const topName = TOP_PARTS.find(p => p.id === outfit.top.partId)?.name || '';
  if (topName && topColor) parts.push(`${topColor}${topName}`);

  const bottomColor = COLORS.find(c => c.id === outfit.bottom.colorId)?.name || '';
  const bottomName = BOTTOM_PARTS.find(p => p.id === outfit.bottom.partId)?.name || '';
  if (bottomName && bottomColor) parts.push(`${bottomColor}${bottomName}`);

  const shoesColor = COLORS.find(c => c.id === outfit.shoes.colorId)?.name || '';
  const shoesName = SHOES_PARTS.find(p => p.id === outfit.shoes.partId)?.name || '';
  if (shoesName && shoesColor) parts.push(`${shoesColor}${shoesName}`);

  if (outfit.accessory.partId !== 'acc-none') {
    const accColor = COLORS.find(c => c.id === outfit.accessory.colorId)?.name || '';
    const accName = ACCESSORY_PARTS.find(p => p.id === outfit.accessory.partId)?.name || '';
    if (accName && accColor) parts.push(`${accColor}${accName}`);
  }

  return parts.join('、');
}
