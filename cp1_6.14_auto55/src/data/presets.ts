import type { Dataset } from '../types';

function generateTemperatureData(): Dataset {
  const data = [];
  const start = new Date('2024-01-01');
  for (let i = 0; i < 365; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const dayOfYear = i;
    const baseTemp = 15 + 15 * Math.sin((dayOfYear - 80) * Math.PI / 182.5);
    const noise = (Math.random() - 0.5) * 6;
    data.push({
      time: date,
      value: Math.round((baseTemp + noise) * 10) / 10,
    });
  }
  return {
    id: 'temperature',
    name: '城市气温',
    shortName: '气温',
    unit: '°C',
    data,
  };
}

function generateStockData(): Dataset {
  const data = [];
  const start = new Date('2024-01-02');
  let price = 100;
  for (let i = 0; i < 250; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i + Math.floor(i / 5) * 2);
    const change = (Math.random() - 0.48) * 4;
    price = Math.max(10, price + change);
    data.push({
      time: date,
      value: Math.round(price * 100) / 100,
    });
  }
  return {
    id: 'stock',
    name: '股票价格',
    shortName: '股票',
    unit: '元',
    data,
  };
}

function generateSalesData(): Dataset {
  const data = [];
  const start = new Date('2024-01-01');
  for (let i = 0; i < 180; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const base = isWeekend ? 180 : 120;
    const trend = i * 0.3;
    const noise = (Math.random() - 0.5) * 50;
    data.push({
      time: date,
      value: Math.round(base + trend + noise),
    });
  }
  return {
    id: 'sales',
    name: '每日销售',
    shortName: '销售',
    unit: '单',
    data,
  };
}

export const presetDatasets: Dataset[] = [
  generateTemperatureData(),
  generateStockData(),
  generateSalesData(),
];
