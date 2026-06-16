import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');

export interface User {
  id: string;
  nickname: string;
  avatarUrl: string;
  building: string;
  creditScore: number;
  createdAt: string;
}

export type TaskType = 'express' | 'pet' | 'groupbuy' | 'other';
export type TaskStatus = 'active' | 'in-progress' | 'completed' | 'cancelled';

export interface Task {
  id: string;
  type: TaskType;
  title: string;
  description: string;
  expectedTime: string;
  rewardPoints: number;
  publisherId: string;
  acceptorId: string | null;
  status: TaskStatus;
  createdAt: string;
  completedAt: string | null;
}

export interface Transaction {
  id: string;
  userId: string;
  taskId: string;
  pointsChange: number;
  reason: string;
  createdAt: string;
}

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function ensureFile<T>(fileName: string, initialValue: T): void {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(initialValue, null, 2), 'utf-8');
  }
}

export function initData(): void {
  ensureFile('users.json', [] as User[]);
  ensureFile('tasks.json', [] as Task[]);
  ensureFile('transactions.json', [] as Transaction[]);
}

export function readUsers(): User[] {
  initData();
  const filePath = path.join(DATA_DIR, 'users.json');
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as User[];
}

export function writeUsers(users: User[]): void {
  initData();
  const filePath = path.join(DATA_DIR, 'users.json');
  fs.writeFileSync(filePath, JSON.stringify(users, null, 2), 'utf-8');
}

export function readTasks(): Task[] {
  initData();
  const filePath = path.join(DATA_DIR, 'tasks.json');
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Task[];
}

export function writeTasks(tasks: Task[]): void {
  initData();
  const filePath = path.join(DATA_DIR, 'tasks.json');
  fs.writeFileSync(filePath, JSON.stringify(tasks, null, 2), 'utf-8');
}

export function readTransactions(): Transaction[] {
  initData();
  const filePath = path.join(DATA_DIR, 'transactions.json');
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Transaction[];
}

export function writeTransactions(transactions: Transaction[]): void {
  initData();
  const filePath = path.join(DATA_DIR, 'transactions.json');
  fs.writeFileSync(filePath, JSON.stringify(transactions, null, 2), 'utf-8');
}
