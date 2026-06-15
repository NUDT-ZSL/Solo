import axios from 'axios';
import type { Expression, Parameters, ViewState } from './GraphEngine';

export interface HistoryItem {
  id: string;
  name: string;
  tags: string[];
  expressions: Expression[];
  parameters: Parameters;
  viewState: ViewState;
  thumbnail: string;
  createdAt: number;
  serverId?: string;
  shareCode?: string;
}

const STORAGE_KEY = 'math_visualizer_history';
const SAVED_KEY = 'math_visualizer_saved';
const MAX_HISTORY = 30;

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function shortCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let c = '';
  for (let i = 0; i < 6; i++) c += chars.charAt(Math.floor(Math.random() * chars.length));
  return c;
}

export class HistoryManager {
  private history: HistoryItem[] = [];
  private saved: HistoryItem[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  private loadFromStorage(): void {
    try {
      const h = localStorage.getItem(STORAGE_KEY);
      if (h) this.history = JSON.parse(h);
      const s = localStorage.getItem(SAVED_KEY);
      if (s) this.saved = JSON.parse(s);
    } catch {
      this.history = [];
      this.saved = [];
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.history));
      localStorage.setItem(SAVED_KEY, JSON.stringify(this.saved));
    } catch (e) {
      console.warn('Storage full, clearing old history');
      this.history = this.history.slice(0, 10);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.history));
    }
  }

  public getHistory(): HistoryItem[] {
    return [...this.history].sort((a, b) => b.createdAt - a.createdAt);
  }

  public getSaved(): HistoryItem[] {
    return [...this.saved].sort((a, b) => b.createdAt - a.createdAt);
  }

  public addHistory(item: Omit<HistoryItem, 'id' | 'createdAt'>): HistoryItem {
    const full: HistoryItem = {
      ...item,
      id: generateId(),
      createdAt: Date.now(),
    };
    this.history.unshift(full);
    if (this.history.length > MAX_HISTORY) this.history = this.history.slice(0, MAX_HISTORY);
    this.saveToStorage();
    this.notify();
    return full;
  }

  public deleteHistory(id: string): void {
    this.history = this.history.filter((h) => h.id !== id);
    this.saveToStorage();
    this.notify();
  }

  public clearHistory(): void {
    this.history = [];
    this.saveToStorage();
    this.notify();
  }

  public async saveToServer(item: HistoryItem, name: string, tags: string[]): Promise<{ id: string; graph: HistoryItem }> {
    const payload = {
      name,
      tags,
      expressions: item.expressions,
      parameters: item.parameters,
      mode: item.viewState.mode,
      thumbnail: item.thumbnail,
      viewState: item.viewState,
    };
    try {
      const res = await axios.post('/api/graphs', payload);
      if (res.data.success) {
        const idx = this.saved.findIndex((s) => s.id === item.id);
        const savedItem: HistoryItem = { ...item, name, tags, serverId: res.data.id };
        if (idx >= 0) this.saved[idx] = savedItem;
        else this.saved.push(savedItem);
        this.saveToStorage();
        this.notify();
        return { id: res.data.id, graph: savedItem };
      }
    } catch (e) {
      console.warn('Server save failed, using local storage only');
    }
    const localItem: HistoryItem = { ...item, name, tags };
    this.saved.push(localItem);
    this.saveToStorage();
    this.notify();
    return { id: localItem.id, graph: localItem };
  }

  public async loadFromServer(id: string): Promise<HistoryItem | null> {
    try {
      const res = await axios.get(`/api/graphs/${id}`);
      if (res.data.success) {
        const g = res.data.graph;
        const item: HistoryItem = {
          id: g.id || generateId(),
          name: g.name || '已加载图形',
          tags: g.tags || [],
          expressions: g.expressions,
          parameters: g.parameters || {},
          viewState: g.viewState,
          thumbnail: g.thumbnail || '',
          createdAt: g.createdAt || Date.now(),
          serverId: g.id,
        };
        return item;
      }
    } catch (e) {
      console.warn('Load from server failed', e);
    }
    return null;
  }

  public async generateShareLink(item: HistoryItem): Promise<string> {
    if (item.shareCode) {
      return `${window.location.origin}/s/${item.shareCode}`;
    }
    try {
      if (item.serverId) {
        const res = await axios.post('/api/share', { graphId: item.serverId });
        if (res.data.success) {
          item.shareCode = res.data.code;
          const idx = this.saved.findIndex((s) => s.id === item.id);
          if (idx >= 0) this.saved[idx].shareCode = res.data.code;
          this.saveToStorage();
          return res.data.shortUrl;
        }
      }
    } catch {
      // fallback to local
    }
    const code = shortCode();
    item.shareCode = code;
    localStorage.setItem(`share_${code}`, JSON.stringify(item));
    return `${window.location.origin}/s/${code}`;
  }

  public async loadShare(code: string): Promise<HistoryItem | null> {
    try {
      const res = await axios.get(`/api/share/${code}`);
      if (res.data.success) {
        const g = res.data.graph;
        return {
          id: g.id || generateId(),
          name: g.name || '分享的图形',
          tags: g.tags || [],
          expressions: g.expressions,
          parameters: g.parameters || {},
          viewState: g.viewState,
          thumbnail: g.thumbnail || '',
          createdAt: Date.now(),
          shareCode: code,
        };
      }
    } catch {
      // fallback to local
    }
    const raw = localStorage.getItem(`share_${code}`);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
    return null;
  }

  public deleteSaved(id: string): void {
    this.saved = this.saved.filter((s) => s.id !== id);
    this.saveToStorage();
    this.notify();
  }
}

export const historyManager = new HistoryManager();
