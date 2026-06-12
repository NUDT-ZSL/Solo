import { DataPoint, ParsedDataset } from './types';

export const parseJsonData = (jsonString: string): ParsedDataset => {
  try {
    const rawData = JSON.parse(jsonString);
    
    if (!Array.isArray(rawData)) {
      throw new Error('数据格式错误：必须是数组');
    }

    const validatedData: DataPoint[] = rawData.map((item, index) => {
      if (typeof item !== 'object' || item === null) {
        throw new Error(`第${index + 1}项数据格式错误`);
      }

      if (typeof item.date !== 'string') {
        throw new Error(`第${index + 1}项缺少date字段或格式错误`);
      }

      if (typeof item.value !== 'number' || isNaN(item.value)) {
        if (typeof item.value === 'string') {
          const parsed = parseFloat(item.value);
          if (!isNaN(parsed)) {
            item.value = parsed;
          } else {
            throw new Error(`第${index + 1}项value字段必须是数字`);
          }
        } else {
          throw new Error(`第${index + 1}项value字段必须是数字`);
        }
      }

      if (typeof item.category !== 'string') {
        throw new Error(`第${index + 1}项category字段必须是字符串`);
      }

      return {
        date: item.date,
        value: Number(item.value),
        category: item.category,
      };
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
    typeof obj.date === 'string' &&
    typeof obj.value === 'number' &&
    typeof obj.category === 'string'
  );
};
