import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Course, KnowledgePoint, Relation, User } from './types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');

type DataType = 'courses' | 'knowledgePoints' | 'relations' | 'users';

interface DataFileMap {
  courses: Course[];
  knowledgePoints: KnowledgePoint[];
  relations: Relation[];
  users: User[];
}

function getDataPath(type: DataType): string {
  return path.join(DATA_DIR, `${type}.json`);
}

export function readData<T extends DataType>(type: T): DataFileMap[T] {
  const filePath = getDataPath(type);
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return parsed[type] as DataFileMap[T];
  } catch (err) {
    console.error(`读取 ${type} 数据失败:`, err);
    return (type === 'courses' ? [] : type === 'knowledgePoints' ? [] : type === 'relations' ? [] : []) as DataFileMap[T];
  }
}

export function writeData<T extends DataType>(type: T, data: DataFileMap[T]): void {
  const filePath = getDataPath(type);
  try {
    const wrapper = { [type]: data };
    fs.writeFileSync(filePath, JSON.stringify(wrapper, null, 2), 'utf-8');
  } catch (err) {
    console.error(`写入 ${type} 数据失败:`, err);
    throw err;
  }
}
