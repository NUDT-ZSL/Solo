export interface DataSource {
  id: string;
  name: string;
  type: 'stock' | 'traffic' | 'sensor' | 'progress' | 'revenue' | 'users';
  value: number;
  unit: string;
  history: number[];
  refreshInterval: number;
  maxValue?: number;
  chartType?: 'line' | 'ring';
}

const typeConfigs: Record<DataSource['type'], { min: number; max: number; volatility: number; unit: string; maxValue?: number; chartType: 'line' | 'ring' }> = {
  stock: { min: 50, max: 500, volatility: 5, unit: '¥', chartType: 'line' },
  traffic: { min: 1000, max: 50000, volatility: 1000, unit: '次/分', chartType: 'line' },
  sensor: { min: 20, max: 80, volatility: 2, unit: '°C', chartType: 'line' },
  progress: { min: 0, max: 100, volatility: 2, unit: '%', maxValue: 100, chartType: 'ring' },
  revenue: { min: 10000, max: 100000, volatility: 2000, unit: '元', chartType: 'line' },
  users: { min: 100, max: 5000, volatility: 200, unit: '人', chartType: 'line' }
};

function generateRandomValue(type: DataSource['type'], currentValue: number): number {
  const config = typeConfigs[type];
  const change = (Math.random() - 0.5) * 2 * config.volatility;
  let newValue = currentValue + change;
  newValue = Math.max(config.min, Math.min(config.max, newValue));
  return Math.round(newValue * 100) / 100;
}

export function fetchDataSource(_id: string, _name: string, type: DataSource['type'], currentValue: number): Promise<number> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const newValue = generateRandomValue(type, currentValue);
      resolve(newValue);
    }, 50 + Math.random() * 100);
  });
}

export function createInitialDataSource(id: string, name: string, type: DataSource['type'], refreshInterval: number = 2): DataSource {
  const config = typeConfigs[type];
  const initialValue = config.min + Math.random() * (config.max - config.min);
  const roundedValue = Math.round(initialValue * 100) / 100;
  const history: number[] = [];
  
  let tempValue = roundedValue;
  for (let i = 0; i < 20; i++) {
    tempValue = generateRandomValue(type, tempValue);
    history.push(tempValue);
  }
  
  return {
    id,
    name,
    type,
    value: history[history.length - 1],
    unit: config.unit,
    history,
    refreshInterval,
    maxValue: config.maxValue,
    chartType: config.chartType
  };
}

export function generateId(): string {
  return 'ds_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}
