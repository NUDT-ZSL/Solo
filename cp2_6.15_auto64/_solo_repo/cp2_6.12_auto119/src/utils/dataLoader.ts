import { csvParse } from 'd3';

export type DataRecord = { [key: string]: string | number };

export type FieldInfo = {
  name: string;
  type: 'string' | 'number';
};

export function parseCSV(text: string): DataRecord[] {
  try {
    const rows = csvParse(text);
    return rows.map((row) => {
      const record: DataRecord = {};
      Object.entries(row).forEach(([key, value]) => {
        if (value === undefined || value === null) {
          record[key] = '';
        } else {
          const num = Number(value);
          record[key] = isNaN(num) ? String(value) : num;
        }
      });
      return record;
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    throw new Error(`CSV解析失败: ${message}`);
  }
}

export function parseJSON(text: string): DataRecord[] {
  try {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) {
      throw new Error('JSON数据必须是数组格式');
    }
    return parsed.map((item) => {
      if (typeof item !== 'object' || item === null) {
        throw new Error('JSON数组元素必须是对象');
      }
      const record: DataRecord = {};
      Object.entries(item).forEach(([key, value]) => {
        if (typeof value === 'number') {
          record[key] = value;
        } else if (value === null || value === undefined) {
          record[key] = '';
        } else {
          const num = Number(value);
          record[key] = isNaN(num) ? String(value) : num;
        }
      });
      return record;
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    throw new Error(`JSON解析失败: ${message}`);
  }
}

export async function loadFromFile(
  file: File
): Promise<{ records: DataRecord[]; fields: FieldInfo[] }> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension !== 'csv' && extension !== 'json') {
    throw new Error('不支持的文件格式，仅支持 .csv 和 .json 文件');
  }

  try {
    const text = await file.text();

    if (!text.trim()) {
      throw new Error('文件内容为空');
    }

    let records: DataRecord[];
    if (extension === 'csv') {
      records = parseCSV(text);
    } else {
      records = parseJSON(text);
    }

    const fields = extractFields(records);
    return { records, fields };
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    throw new Error(`文件加载失败: ${message}`);
  }
}

export function extractFields(records: DataRecord[]): FieldInfo[] {
  if (records.length === 0) {
    return [];
  }

  const fieldNames = new Set<string>();
  records.forEach((record) => {
    Object.keys(record).forEach((key) => fieldNames.add(key));
  });

  return Array.from(fieldNames).map((name) => {
    let isNumber = true;
    let hasValue = false;

    for (const record of records) {
      const value = record[name];
      if (value !== undefined && value !== null && value !== '') {
        hasValue = true;
        if (typeof value !== 'number') {
          const num = Number(value);
          if (isNaN(num)) {
            isNumber = false;
            break;
          }
        }
      }
    }

    return {
      name,
      type: isNumber && hasValue ? 'number' : 'string',
    };
  });
}

export function validateData(
  records: DataRecord[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!Array.isArray(records)) {
    return { valid: false, errors: ['数据必须是数组格式'] };
  }

  if (records.length === 0) {
    errors.push('数据为空');
    return { valid: errors.length === 0, errors };
  }

  const fieldNames = new Set<string>();
  records.forEach((record, index) => {
    if (typeof record !== 'object' || record === null) {
      errors.push(`第 ${index + 1} 条记录不是有效的对象`);
      return;
    }
    Object.keys(record).forEach((key) => fieldNames.add(key));
  });

  fieldNames.forEach((fieldName) => {
    let hasEmpty = false;
    records.forEach((record) => {
      const value = record[fieldName];
      if (value === undefined || value === null || value === '') {
        hasEmpty = true;
      }
    });
    if (hasEmpty) {
      errors.push(`字段 "${fieldName}" 存在空值`);
    }
  });

  return { valid: errors.length === 0, errors };
}
