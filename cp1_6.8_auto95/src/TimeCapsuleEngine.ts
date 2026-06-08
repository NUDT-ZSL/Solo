import { Letter, EmotionType, LetterStatus } from './types';

const API_BASE = '/api';

export class TimeCapsuleEngine {
  private static instance: TimeCapsuleEngine;
  private token: string | null = null;

  private constructor() {
    this.token = localStorage.getItem('time_capsule_token');
  }

  static getInstance(): TimeCapsuleEngine {
    if (!TimeCapsuleEngine.instance) {
      TimeCapsuleEngine.instance = new TimeCapsuleEngine();
    }
    return TimeCapsuleEngine.instance;
  }

  getToken(): string | null {
    return this.token;
  }

  setToken(token: string): void {
    this.token = token;
    localStorage.setItem('time_capsule_token', token);
  }

  clearToken(): void {
    this.token = null;
    localStorage.removeItem('time_capsule_token');
  }

  async createLetter(
    title: string,
    content: string,
    emotion: EmotionType,
    deliverAt: string,
    email: string = ''
  ): Promise<{ id: string; owner_token: string; message: string; deliver_at: string }> {
    const response = await fetch(`${API_BASE}/letters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        content,
        emotion,
        deliver_at: deliverAt,
        email,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || '创建信件失败');
    }

    const data = await response.json();
    this.setToken(data.owner_token);
    return data;
  }

  async fetchLetters(token?: string): Promise<Letter[]> {
    const useToken = token || this.token;
    if (!useToken) {
      throw new Error('请提供访问令牌');
    }

    const response = await fetch(`${API_BASE}/letters/${useToken}`);
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || '获取信件失败');
    }

    const data = await response.json();
    return data.letters;
  }

  async openLetter(letterId: string, token?: string): Promise<Letter> {
    const useToken = token || this.token;
    if (!useToken) {
      throw new Error('请提供访问令牌');
    }

    const response = await fetch(`${API_BASE}/letters/${letterId}/open`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: useToken }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || '打开信件失败');
    }

    return response.json();
  }

  isLetterReadable(letter: Letter): boolean {
    return letter.status === 'delivered' || letter.status === 'opened';
  }

  isLetterSealed(letter: Letter): boolean {
    return letter.status === 'sealed';
  }

  getDaysRemaining(deliverAt: string): number {
    const deliver = new Date(deliverAt);
    const now = new Date();
    const diff = deliver.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  formatDate(isoString: string): string {
    const d = new Date(isoString);
    return d.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  validateDeliverDate(deliverAt: string): { valid: boolean; message: string } {
    const deliver = new Date(deliverAt);
    const now = new Date();
    const minDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    const maxDate = new Date(now.getTime() + 3650 * 24 * 60 * 60 * 1000);

    if (deliver < minDate) {
      return { valid: false, message: '投递日期至少为1年后' };
    }
    if (deliver > maxDate) {
      return { valid: false, message: '投递日期最多为10年后' };
    }
    return { valid: true, message: '' };
  }

  generateDefaultDeliverDate(): string {
    const now = new Date();
    const future = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    return future.toISOString().split('T')[0];
  }
}
