import { Record, RecordType, TrendData, TrendStats, TrendMetric, TimeRange } from './types';
import { dataStore } from './DataStore';

const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

export const RecordService = {
  addRecord: (recordData: Omit<Record, 'id'>): Promise<Record> => {
    return new Promise((resolve) => {
      const newRecord: Record = {
        ...recordData,
        id: generateId(),
      };
      dataStore.addRecord(newRecord);
      resolve(newRecord);
    });
  },

  getRecordsByPetId: (petId: string): Record[] => {
    return dataStore.getRecordsByPetId(petId);
  },

  deleteRecord: (id: string): Promise<void> => {
    return new Promise((resolve) => {
      dataStore.deleteRecord(id);
      resolve();
    });
  },

  getTrendData: (
    petId: string,
    metric: TrendMetric,
    range: TimeRange
  ): { data: TrendData[]; stats: TrendStats } => {
    const records = dataStore.getRecordsByPetId(petId);
    const now = Date.now();
    const startTime = now - range * 24 * 60 * 60 * 1000;

    const filteredRecords = records.filter((r) => r.timestamp >= startTime);

    const dailyData: Map<string, number[]> = new Map();

    filteredRecords.forEach((record) => {
      if (metric === 'weight' && record.type === 'weight' && record.value !== undefined) {
        const date = formatDate(record.timestamp);
        if (!dailyData.has(date)) {
          dailyData.set(date, []);
        }
        dailyData.get(date)!.push(record.value);
      } else if (metric === 'walkDuration' && record.type === 'walk' && record.value !== undefined) {
        const date = formatDate(record.timestamp);
        if (!dailyData.has(date)) {
          dailyData.set(date, []);
        }
        dailyData.get(date)!.push(record.value);
      }
    });

    const data: TrendData[] = [];
    for (let i = range - 1; i >= 0; i--) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000);
      const dateKey = formatDate(date.getTime());
      const values = dailyData.get(dateKey) || [];
      const avgValue = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      data.push({ date: dateKey, value: Number(avgValue.toFixed(2)) });
    }

    const validValues = data.filter((d) => d.value > 0).map((d) => d.value);
    const stats: TrendStats = {
      average: validValues.length > 0 ? Number((validValues.reduce((a, b) => a + b, 0) / validValues.length).toFixed(2)) : 0,
      max: validValues.length > 0 ? Math.max(...validValues) : 0,
      min: validValues.length > 0 ? Math.min(...validValues) : 0,
      total: validValues.length > 0 ? Number(validValues.reduce((a, b) => a + b, 0).toFixed(2)) : 0,
    };

    return { data, stats };
  },

  subscribe: (callback: (records: Record[]) => void): (() => void) => {
    return dataStore.on('recordsChanged', callback as (data?: unknown) => void);
  },
};
