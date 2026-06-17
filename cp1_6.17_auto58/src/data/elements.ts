import type { ElementLibrary, ElementItem } from '../types';

export const ELEMENT_LIBRARY: ElementLibrary = {
  primaryColor: [
    { id: 'pc-1', category: 'primaryColor', name: '深海蓝', value: '#1976D2' },
    { id: 'pc-2', category: 'primaryColor', name: '森林绿', value: '#388E3C' },
    { id: 'pc-3', category: 'primaryColor', name: '珊瑚红', value: '#E53935' },
    { id: 'pc-4', category: 'primaryColor', name: '薰衣紫', value: '#8E24AA' },
    { id: 'pc-5', category: 'primaryColor', name: '琥珀橙', value: '#FF8F00' },
    { id: 'pc-6', category: 'primaryColor', name: '青碧色', value: '#00ACC1' },
    { id: 'pc-7', category: 'primaryColor', name: '玫瑰粉', value: '#EC407A' },
  ],
  secondaryColor: [
    { id: 'sc-1', category: 'secondaryColor', name: '浅灰', value: '#F5F5F5' },
    { id: 'sc-2', category: 'secondaryColor', name: '米白', value: '#FAFAFA' },
    { id: 'sc-3', category: 'secondaryColor', name: '淡蓝', value: '#E3F2FD' },
    { id: 'sc-4', category: 'secondaryColor', name: '薄荷绿', value: '#E8F5E9' },
    { id: 'sc-5', category: 'secondaryColor', name: '柠檬黄', value: '#FFFDE7' },
    { id: 'sc-6', category: 'secondaryColor', name: '淡紫', value: '#F3E5F5' },
    { id: 'sc-7', category: 'secondaryColor', name: '深灰', value: '#424242' },
    { id: 'sc-8', category: 'secondaryColor', name: '炭黑', value: '#212121' },
  ],
  font: [
    { id: 'ft-1', category: 'font', name: '无衬线体', value: 'system-ui, sans-serif' },
    { id: 'ft-2', category: 'font', name: '衬线体', value: 'Georgia, serif' },
    { id: 'ft-3', category: 'font', name: '等宽体', value: 'Menlo, monospace' },
    { id: 'ft-4', category: 'font', name: '手写体', value: 'cursive' },
    { id: 'ft-5', category: 'font', name: '黑体', value: '"Microsoft YaHei", sans-serif' },
    { id: 'ft-6', category: 'font', name: '宋体', value: 'SimSun, serif' },
  ],
  layout: [
    { id: 'ly-1', category: 'layout', name: '居中对称', value: 'centered' },
    { id: 'ly-2', category: 'layout', name: '左栏导航', value: 'sidebar-left' },
    { id: 'ly-3', category: 'layout', name: '网格布局', value: 'grid' },
    { id: 'ly-4', category: 'layout', name: '瀑布流', value: 'masonry' },
    { id: 'ly-5', category: 'layout', name: '卡片式', value: 'cards' },
    { id: 'ly-6', category: 'layout', name: '分屏式', value: 'split' },
    { id: 'ly-7', category: 'layout', name: '时间线', value: 'timeline' },
  ],
  pattern: [
    { id: 'pt-1', category: 'pattern', name: '圆点', value: 'dots' },
    { id: 'pt-2', category: 'pattern', name: '条纹', value: 'stripes' },
    { id: 'pt-3', category: 'pattern', name: '格子', value: 'grid' },
    { id: 'pt-4', category: 'pattern', name: '波浪', value: 'waves' },
    { id: 'pt-5', category: 'pattern', name: '几何', value: 'geometric' },
    { id: 'pt-6', category: 'pattern', name: '渐变', value: 'gradient' },
    { id: 'pt-7', category: 'pattern', name: '噪点', value: 'noise' },
    { id: 'pt-8', category: 'pattern', name: '大理石', value: 'marble' },
  ],
  iconStyle: [
    { id: 'ic-1', category: 'iconStyle', name: '线性图标', value: 'outline' },
    { id: 'ic-2', category: 'iconStyle', name: '填充图标', value: 'filled' },
    { id: 'ic-3', category: 'iconStyle', name: '双色图标', value: 'duotone' },
    { id: 'ic-4', category: 'iconStyle', name: '手绘风', value: 'hand-drawn' },
    { id: 'ic-5', category: 'iconStyle', name: '3D风格', value: '3d' },
    { id: 'ic-6', category: 'iconStyle', name: '渐变图标', value: 'gradient' },
  ],
};

export function getElementById(id: string): ElementItem | undefined {
  for (const category of Object.values(ELEMENT_LIBRARY)) {
    const found = category.find((el: ElementItem) => el.id === id);
    if (found) return found;
  }
  return undefined;
}

export function buildElementMap(): Map<string, ElementItem> {
  const map = new Map<string, ElementItem>();
  for (const category of Object.values(ELEMENT_LIBRARY)) {
    for (const element of category) {
      map.set(element.id, element);
    }
  }
  return map;
}
