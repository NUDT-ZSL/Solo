import { DataPoint, ParsedDataset } from './types';

const formatDateValue = (dateValue: unknown, index: number): string => {
  if (typeof dateValue === 'string') {
    return dateValue;
  }
  if (typeof dateValue === 'number') {
    try {
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        if (date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() === 0) {
          if (date.getDate() === 1) {
            return `${year}-${month}`;
          }
          return `${year}-${month}-${day}`;
        }
        return date.toISOString();
      }
    } catch {
      // 继续抛出错误
    }
    throw new Error(`第${index + 1}项date字段的时间戳格式无效`);
  }
  if (dateValue instanceof Date) {
    if (!isNaN(dateValue.getTime())) {
      const year = dateValue.getFullYear();
      const month = String(dateValue.getMonth() + 1).padStart(2, '0');
      const day = String(dateValue.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    throw new Error(`第${index + 1}项date字段的Date对象无效`);
  }
  throw new Error(`第${index + 1}项date字段类型不支持，需要字符串、数字时间戳或Date对象`);
};

const parseValueField = (value: unknown, index: number): number => {
  if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const cleanedValue = value.replace(/,/g, '');
    const parsed = parseFloat(cleanedValue);
    if (!isNaN(parsed) && isFinite(parsed)) {
      return parsed;
    }
    throw new Error(`第${index + 1}项value字段格式错误，支持数字或带千分位的字符串（如"1,234.56"）`);
  }
  throw new Error(`第${index + 1}项value字段必须是数字或带千分位的字符串`);
};

export const parseJsonData = (jsonString: string): ParsedDataset => {
  try {
    const rawData = JSON.parse(jsonString);
    
    if (!Array.isArray(rawData)) {
      throw new Error('数据格式错误：必须是数组');
    }

    if (rawData.length === 0) {
      return {
        data: [],
        categories: [],
        dateRange: { start: '', end: '' },
        valueRange: { min: 0, max: 0 },
      };
    }

    const validatedData: DataPoint[] = rawData.map((item, index) => {
      if (typeof item !== 'object' || item === null) {
        throw new Error(`第${index + 1}项数据格式错误`);
      }

      const obj = item as Record<string, unknown>;

      if (obj.date === undefined || obj.date === null) {
        throw new Error(`第${index + 1}项缺少date字段`);
      }
      const date = formatDateValue(obj.date, index);

      if (obj.value === undefined || obj.value === null) {
        throw new Error(`第${index + 1}项缺少value字段`);
      }
      const value = parseValueField(obj.value, index);

      let category = '';
      if (typeof obj.category === 'string') {
        category = obj.category;
      } else if (typeof obj.category === 'number') {
        category = String(obj.category);
      } else {
        throw new Error(`第${index + 1}项category字段必须是字符串`);
      }

      return { date, value, category };
    });

    const categories = [...new Set(validatedData.map(d => d.category))];
    
    const sortedDates = [...validatedData.map(d => d.date)].sort();
    const values = validatedData.map(d => d.value);

    return {
      data: validatedData,
      categories,
      dateRange: {
        start: sortedDates[0] || '',
        end: sortedDates[sortedDates.length - 1] || '',
      },
      valueRange: {
        min: Math.min(...values, 0),
        max: Math.max(...values, 0),
      },
    };
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('JSON格式错误，请检查文件内容');
    }
    throw error;
  }
};

export const validateDataPoint = (item: unknown): item is DataPoint => {
  if (typeof item !== 'object' || item === null) return false;
  const obj = item as Record<string, unknown>;
  return (
    (typeof obj.date === 'string' || typeof obj.date === 'number' || obj.date instanceof Date) &&
    (typeof obj.value === 'number' || typeof obj.value === 'string') &&
    (typeof obj.category === 'string' || typeof obj.category === 'number')
  );
};
