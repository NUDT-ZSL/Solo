import { PartOption, ColorOption, OutfitState } from './types';

export const HAIR_PARTS: PartOption[] = [
  { id: 'hair-short', name: '短发', type: 'hair' },
  { id: 'hair-long', name: '长发', type: 'hair' },
  { id: 'hair-curly', name: '卷发', type: 'hair' },
  { id: 'hair-ponytail', name: '马尾', type: 'hair' },
];

export const TOP_PARTS: PartOption[] = [
  { id: 'top-tshirt', name: 'T恤', type: 'top' },
  { id: 'top-shirt', name: '衬衫', type: 'top' },
  { id: 'top-dress', name: '连衣裙', type: 'top' },
  { id: 'top-sweater', name: '毛衣', type: 'top' },
];

export const BOTTOM_PARTS: PartOption[] = [
  { id: 'bottom-jeans', name: '牛仔裤', type: 'bottom' },
  { id: 'bottom-skirt', name: '短裙', type: 'bottom' },
  { id: 'bottom-shorts', name: '短裤', type: 'bottom' },
];

export const SHOES_PARTS: PartOption[] = [
  { id: 'shoes-sneakers', name: '运动鞋', type: 'shoes' },
  { id: 'shoes-heels', name: '高跟鞋', type: 'shoes' },
  { id: 'shoes-boots', name: '靴子', type: 'shoes' },
];

export const ACCESSORY_PARTS: PartOption[] = [
  { id: 'acc-necklace', name: '项链', type: 'accessory' },
  { id: 'acc-hat', name: '帽子', type: 'accessory' },
  { id: 'acc-none', name: '无', type: 'accessory' },
];

export const COLORS: ColorOption[] = [
  { id: 'color-red', name: '红色', hex: '#e74c3c' },
  { id: 'color-blue', name: '蓝色', hex: '#3498db' },
  { id: 'color-green', name: '绿色', hex: '#27ae60' },
  { id: 'color-yellow', name: '黄色', hex: '#f1c40f' },
  { id: 'color-purple', name: '紫色', hex: '#9b59b6' },
  { id: 'color-white', name: '白色', hex: '#ecf0f1' },
  { id: 'color-black', name: '黑色', hex: '#2c3e50' },
  { id: 'color-gold', name: '金色', hex: '#f39c12' },
];

export const BODY_TYPES = ['normal', 'slim', 'athletic'];

export const DEFAULT_OUTFIT: OutfitState = {
  bodyType: 'normal',
  hair: { partId: 'hair-short', colorId: 'color-black' },
  top: { partId: 'top-tshirt', colorId: 'color-blue' },
  bottom: { partId: 'bottom-jeans', colorId: 'color-blue' },
  shoes: { partId: 'shoes-sneakers', colorId: 'color-white' },
  accessory: { partId: 'acc-none', colorId: 'color-gold' },
};

export const getColorHex = (colorId: string): string => {
  const color = COLORS.find(c => c.id === colorId);
  return color ? color.hex : '#888888';
};

export const getPartsByType = (type: PartType): PartOption[] => {
  switch (type) {
    case 'hair': return HAIR_PARTS;
    case 'top': return TOP_PARTS;
    case 'bottom': return BOTTOM_PARTS;
    case 'shoes': return SHOES_PARTS;
    case 'accessory': return ACCESSORY_PARTS;
  }
};
