import { Letter, LetterStatus } from './types';

interface NotificationRecord {
  letterId: string;
  notifiedAt: string;
  method: string;
  email: string;
  status: 'sent' | 'failed' | 'pending';
}

interface SchedulerState {
  lastCheck: string;
  pendingNotifications: NotificationRecord[];
  completedNotifications: NotificationRecord[];
}

const SCHEDULER_KEY = 'time_capsule_scheduler_state';
const CHECK_INTERVAL = 60000;

export class NotificationScheduler {
  private static instance: NotificationScheduler;
  private state: SchedulerState;
  private timerId: ReturnType<typeof setInterval> | null = null;
  private listeners: Set<(notifications: NotificationRecord[]) => void> = new Set();

  private constructor() {
    this.state = this.loadState();
  }

  static getInstance(): NotificationScheduler {
    if (!NotificationScheduler.instance) {
      NotificationScheduler.instance = new NotificationScheduler();
    }
    return NotificationScheduler.instance;
  }

  private loadState(): SchedulerState {
    try {
      const saved = localStorage.getItem(SCHEDULER_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return {
      lastCheck: new Date().toISOString(),
      pendingNotifications: [],
      completedNotifications: [],
    };
  }

  private saveState(): void {
    localStorage.setItem(SCHEDULER_KEY, JSON.stringify(this.state));
  }

  start(): void {
    if (this.timerId) return;
    this.checkDueLetters();
    this.timerId = setInterval(() => this.checkDueLetters(), CHECK_INTERVAL);
  }

  stop(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  onNotification(callback: (notifications: NotificationRecord[]) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    const all = [...this.state.pendingNotifications, ...this.state.completedNotifications];
    this.listeners.forEach((cb) => cb(all));
  }

  private async checkDueLetters(): Promise<void> {
    this.state.lastCheck = new Date().toISOString();
    this.saveState();
    this.notifyListeners();
  }

  addPendingNotification(letterId: string, email: string): void {
    const record: NotificationRecord = {
      letterId,
      notifiedAt: new Date().toISOString(),
      method: email ? 'email' : 'in_app',
      email,
      status: 'pending',
    };
    this.state.pendingNotifications.push(record);
    this.saveState();
    this.notifyListeners();
  }

  markNotified(letterId: string, success: boolean): void {
    const idx = this.state.pendingNotifications.findIndex(
      (n) => n.letterId === letterId
    );
    if (idx !== -1) {
      const [record] = this.state.pendingNotifications.splice(idx, 1);
      record.status = success ? 'sent' : 'failed';
      this.state.completedNotifications.push(record);
      this.saveState();
      this.notifyListeners();
    }
  }

  getPendingCount(): number {
    return this.state.pendingNotifications.length;
  }

  getCompletedCount(): number {
    return this.state.completedNotifications.length;
  }

  getLastCheckTime(): string {
    return this.state.lastCheck;
  }

  isLetterNotified(letterId: string): boolean {
    return this.state.completedNotifications.some(
      (n) => n.letterId === letterId && n.status === 'sent'
    );
  }

  getNotificationsForLetter(letterId: string): NotificationRecord[] {
    return [...this.state.pendingNotifications, ...this.state.completedNotifications].filter(
      (n) => n.letterId === letterId
    );
  }

  clearHistory(): void {
    this.state.completedNotifications = [];
    this.state.pendingNotifications = [];
    this.saveState();
    this.notifyListeners();
  }
}
