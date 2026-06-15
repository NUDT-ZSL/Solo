import Datastore from '@seald-io/nedb';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = path.resolve(__dirname, '../../../data');

export interface Member {
  _id?: string;
  goalId: string;
  userId: string;
  name: string;
  avatar: string;
  joinedAt: number;
}

export interface Task {
  _id?: string;
  goalId: string;
  parentId: string | null;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  userId: string | null;
  assigneeName?: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  deadline?: number;
  timeSpent: number;
  likes: string[];
  attachments: string[];
  order: number;
}

export interface Goal {
  _id?: string;
  title: string;
  description: string;
  createdAt: number;
  createdBy: string;
  inviteCode: string;
  color: string;
}

export const goalsDB = new Datastore<Goal>({
  filename: path.join(dbDir, 'goals.db'),
  autoload: true,
});

export const tasksDB = new Datastore<Task>({
  filename: path.join(dbDir, 'tasks.db'),
  autoload: true,
});

export const membersDB = new Datastore<Member>({
  filename: path.join(dbDir, 'members.db'),
  autoload: true,
});

export const usersDB = new Datastore<{ _id?: string; name: string; avatar: string }>({
  filename: path.join(dbDir, 'users.db'),
  autoload: true,
});

export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
