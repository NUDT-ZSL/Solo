import { v4 as uuidv4 } from 'uuid';

export interface Point {
  x: number;
  y: number;
}

export interface DrawAction {
  id: string;
  userId: string;
  type: 'draw';
  points: Point[];
  color: string;
  lineWidth: number;
  isEraser: boolean;
  timestamp: number;
}

export interface User {
  id: string;
  name: string;
  color: string;
  joinedAt: number;
}

const USER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F8B500', '#FF8C42', '#6C5CE7', '#00B894', '#E17055',
  '#0984E3', '#A29BFE', '#55EFC4', '#FAB1A0', '#74B9FF',
];

const ADJECTIVES = ['创意的', '灵动的', '温柔的', '勇敢的', '自由的', '梦幻的', '阳光的', '静谧的', '活泼的', '优雅的'];
const NOUNS = ['画家', '诗人', '艺术家', '创造者', '旅人', '梦想家', '小画家', '调色师', '光影师', '绘梦者'];

function generateUserName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 1000);
  return `${adj}${noun}${num}`;
}

function getRandomColor(usedColors: string[]): string {
  const available = USER_COLORS.filter(c => !usedColors.includes(c));
  if (available.length === 0) {
    const h = Math.floor(Math.random() * 360);
    return `hsl(${h}, 70%, 60%)`;
  }
  return available[Math.floor(Math.random() * available.length)];
}

class Store {
  private users: Map<string, User> = new Map();
  private actions: DrawAction[] = [];
  private maxUsers = 20;

  addUser(): { user: User; success: boolean; message?: string } {
    if (this.users.size >= this.maxUsers) {
      return { user: {} as User, success: false, message: '房间已满，最多支持20位用户同时在线' };
    }
    const usedColors = Array.from(this.users.values()).map(u => u.color);
    const user: User = {
      id: uuidv4(),
      name: generateUserName(),
      color: getRandomColor(usedColors),
      joinedAt: Date.now(),
    };
    this.users.set(user.id, user);
    return { user, success: true };
  }

  removeUser(userId: string): void {
    this.users.delete(userId);
  }

  getUser(userId: string): User | undefined {
    return this.users.get(userId);
  }

  getUsers(): User[] {
    return Array.from(this.users.values());
  }

  updateUserName(userId: string, name: string): User | undefined {
    const user = this.users.get(userId);
    if (user) {
      user.name = name.substring(0, 20);
      return user;
    }
    return undefined;
  }

  addAction(action: Omit<DrawAction, 'id' | 'timestamp'> & { id?: string; timestamp?: number }): DrawAction | null {
    const user = this.users.get(action.userId);
    if (!user) return null;

    if (action.points.length === 0) return null;

    const validAction: DrawAction = {
      id: action.id || uuidv4(),
      userId: action.userId,
      type: 'draw',
      points: action.points.map(p => ({
        x: Math.max(0, Math.min(10000, p.x)),
        y: Math.max(0, Math.min(10000, p.y)),
      })),
      color: action.isEraser ? '#FFFFFF' : action.color,
      lineWidth: Math.max(1, Math.min(100, action.lineWidth)),
      isEraser: action.isEraser,
      timestamp: action.timestamp || Date.now(),
    };

    this.actions.push(validAction);
    return validAction;
  }

  getActions(since?: number): DrawAction[] {
    if (since === undefined) return [...this.actions];
    return this.actions.filter(a => a.timestamp >= since);
  }

  getActionsForReplay(): { actions: DrawAction[]; startTime: number; endTime: number } {
    if (this.actions.length === 0) {
      return { actions: [], startTime: 0, endTime: 0 };
    }
    return {
      actions: [...this.actions],
      startTime: this.actions[0].timestamp,
      endTime: this.actions[this.actions.length - 1].timestamp,
    };
  }

  clearCanvas(requesterId: string): boolean {
    if (!this.users.has(requesterId)) return false;
    this.actions = [];
    return true;
  }
}

export const store = new Store();
