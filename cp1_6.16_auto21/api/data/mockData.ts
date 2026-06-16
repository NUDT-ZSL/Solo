import { v4 as uuidv4 } from 'uuid';
import type { CoffeeBean, RoastBatch } from '../../src/types';
import { BeanManager } from '../../src/beans/BeanManager';

const today = new Date();
const formatDate = (d: Date) => d.toISOString().split('T')[0];
const addDays = (d: Date, days: number) => {
  const newDate = new Date(d);
  newDate.setDate(newDate.getDate() + days);
  return newDate;
};

export const initialBeans: CoffeeBean[] = [
  {
    id: uuidv4(),
    name: '埃塞俄比亚 耶加雪菲',
    origin: '埃塞俄比亚',
    processMethod: '水洗处理',
    flavorNotes: ['柑橘', '茉莉', '蜂蜜'],
    stockKg: 25.5,
    altitude: '1800-2000m',
    variety: 'Heirloom',
  },
  {
    id: uuidv4(),
    name: '哥伦比亚 慧兰',
    origin: '哥伦比亚',
    processMethod: '水洗处理',
    flavorNotes: ['焦糖', '坚果', '巧克力'],
    stockKg: 8.2,
    altitude: '1700-1900m',
    variety: 'Castillo',
  },
  {
    id: uuidv4(),
    name: '危地马拉 安提瓜',
    origin: '危地马拉',
    processMethod: '日晒处理',
    flavorNotes: ['莓果', '红糖', '香料'],
    stockKg: 15.0,
    altitude: '1500-1700m',
    variety: 'Bourbon',
  },
  {
    id: uuidv4(),
    name: '肯尼亚 AA',
    origin: '肯尼亚',
    processMethod: '水洗处理',
    flavorNotes: ['黑醋栗', '番茄', '明亮酸质'],
    stockKg: 5.5,
    altitude: '1900-2100m',
    variety: 'SL28, SL34',
  },
  {
    id: uuidv4(),
    name: '巴西 喜拉多',
    origin: '巴西',
    processMethod: '半日晒处理',
    flavorNotes: ['坚果', '牛奶巧克力', '低酸'],
    stockKg: 32.0,
    altitude: '1000-1200m',
    variety: 'Catuai',
  },
  {
    id: uuidv4(),
    name: '印尼 曼特宁',
    origin: '印度尼西亚',
    processMethod: '湿刨处理',
    flavorNotes: ['草本', '雪松', '黑巧克力'],
    stockKg: 12.8,
    altitude: '1100-1300m',
    variety: 'Typica',
  },
];

function generateMockBatches(beans: CoffeeBean[]): RoastBatch[] {
  const batches: RoastBatch[] = [];
  const roastLevels = ['light', 'medium', 'dark'] as const;

  for (let i = 0; i < 25; i++) {
    const bean = beans[i % beans.length];
    const roastDate = formatDate(addDays(today, -i * 3 - Math.floor(Math.random() * 3)));
    const level = roastLevels[Math.floor(Math.random() * 3)];
    const inputTemp = Math.floor(Math.random() * 60) + 180;
    const outputTemp = Math.floor(Math.random() * 40) + 100;
    const duration = Math.floor(Math.random() * 300) + 600;
    const score = BeanManager.calculateRoastScore(inputTemp, outputTemp, level, duration);

    batches.push({
      id: uuidv4(),
      beanId: bean.id,
      beanName: bean.name,
      roastDate,
      roastLevel: level,
      flavorNotes: `烘焙批次 #${i + 1} - ${bean.flavorNotes.join(', ')}`,
      inputTemp,
      outputTemp,
      roastDuration: duration,
      score,
      createdAt: new Date().toISOString(),
    });
  }

  return batches.sort((a, b) =>
    new Date(b.roastDate).getTime() - new Date(a.roastDate).getTime()
  );
}

export let mockBeans = [...initialBeans];
export let mockBatches = generateMockBatches(initialBeans);

export function addBatch(batch: Omit<RoastBatch, 'id' | 'createdAt'>): RoastBatch {
  const newBatch: RoastBatch = {
    ...batch,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
  };
  mockBatches.unshift(newBatch);
  return newBatch;
}

export function updateBeanStock(beanId: string, amount: number): void {
  mockBeans = mockBeans.map(bean =>
    bean.id === beanId
      ? { ...bean, stockKg: Math.max(0, bean.stockKg - amount) }
      : bean
  );
}
