import { create } from 'zustand';
import {
  Theme,
  ThemeColors,
  HistorySnapshot,
  ShareableTheme,
} from './types';
import { normalizeHex } from '@/utils/contrastCheck';

const STORAGE_KEY = 'colorlab.themes.v1';
const ACTIVE_KEY = 'colorlab.activeId.v1';
const HISTORY_PREFIX = 'colorlab.history.v1.';
const MAX_HISTORY = 10;

const DEFAULT_COLORS: ThemeColors = {
  primary: '#6366f1',
  secondary: '#8b5cf6',
  background: '#ffffff',
  text: '#1f2937',
  accent: '#ec4899',
};

const uid = (): string =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const createDefaultTheme = (name = '默认主题'): Theme => ({
  id: uid(),
  name,
  colors: { ...DEFAULT_COLORS },
  comments: '',
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

const loadThemes = (): Theme[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Theme[];
  } catch {
    /* empty */
  }
  const t = createDefaultTheme();
  localStorage.setItem(STORAGE_KEY, JSON.stringify([t]));
  return [t];
};

const loadActiveId = (fallback: string): string => {
  try {
    const raw = localStorage.getItem(ACTIVE_KEY);
    if (raw) return raw;
  } catch {
    /* empty */
  }
  return fallback;
};

const loadHistory = (themeId: string): HistorySnapshot[] => {
  try {
    const raw = localStorage.getItem(HISTORY_PREFIX + themeId);
    if (raw) return JSON.parse(raw) as HistorySnapshot[];
  } catch {
    /* empty */
  }
  return [];
};

const saveHistory = (themeId: string, list: HistorySnapshot[]) => {
  try {
    localStorage.setItem(HISTORY_PREFIX + themeId, JSON.stringify(list));
  } catch {
    /* empty */
  }
};

const b64EncodeUnicode = (str: string): string => {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
};

const b64DecodeUnicode = (str: string): string | null => {
  try {
    const pad = str.replace(/-/g, '+').replace(/_/g, '/');
    const padded = pad + '='.repeat((4 - (pad.length % 4)) % 4);
    const bin = atob(padded);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
};

export interface ThemeStore {
  themes: Theme[];
  activeThemeId: string | null;
  history: HistorySnapshot[];
  toast: string | null;

  setToast: (msg: string | null) => void;

  createTheme: () => void;
  renameTheme: (id: string, name: string) => void;
  deleteTheme: (id: string) => void;
  setActiveTheme: (id: string) => void;
  updateColor: (key: keyof ThemeColors, value: string) => void;
  updateComments: (text: string) => void;
  saveSnapshot: (label?: string) => void;
  restoreSnapshot: (snapshotId: string) => void;

  generateShareLink: () => string;
  loadFromHash: () => Theme | null;
  importSharedTheme: (shared: ShareableTheme) => void;

  getActiveTheme: () => Theme | undefined;
}

const persistThemes = (themes: Theme[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(themes));
  } catch {
    /* empty */
  }
};

export const useThemeStore = create<ThemeStore>((set, get) => ({
  themes: loadThemes(),
  activeThemeId: null,
  history: [],
  toast: null,

  setToast: (msg) => {
    set({ toast: msg });
    if (msg) {
      setTimeout(() => {
        if (get().toast === msg) set({ toast: null });
      }, 2400);
    }
  },

  createTheme: () => {
    const t = createDefaultTheme(`主题 ${get().themes.length + 1}`);
    const themes = [...get().themes, t];
    persistThemes(themes);
    localStorage.setItem(ACTIVE_KEY, t.id);
    set({ themes, activeThemeId: t.id, history: [] });
  },

  renameTheme: (id, name) => {
    const themes = get().themes.map((t) =>
      t.id === id ? { ...t, name: name.trim() || t.name, updatedAt: Date.now() } : t
    );
    persistThemes(themes);
    set({ themes });
  },

  deleteTheme: (id) => {
    const list = get().themes.filter((t) => t.id !== id);
    if (list.length === 0) {
      const t = createDefaultTheme('默认主题');
      persistThemes([t]);
      localStorage.setItem(ACTIVE_KEY, t.id);
      set({ themes: [t], activeThemeId: t.id, history: [] });
    } else {
      persistThemes(list);
      const nextId = get().activeThemeId === id ? list[0].id : get().activeThemeId;
      if (nextId) localStorage.setItem(ACTIVE_KEY, nextId);
      set({
        themes: list,
        activeThemeId: nextId ?? list[0].id,
        history: nextId ? loadHistory(nextId) : [],
      });
    }
    try {
      localStorage.removeItem(HISTORY_PREFIX + id);
    } catch {
      /* empty */
    }
  },

  setActiveTheme: (id) => {
    localStorage.setItem(ACTIVE_KEY, id);
    set({ activeThemeId: id, history: loadHistory(id) });
  },

  updateColor: (key, value) => {
    const normalized = normalizeHex(value);
    const id = get().activeThemeId;
    if (!id) return;
    const themes = get().themes.map((t) =>
      t.id === id
        ? {
            ...t,
            colors: { ...t.colors, [key]: normalized },
            updatedAt: Date.now(),
          }
        : t
    );
    persistThemes(themes);
    set({ themes });
  },

  updateComments: (text) => {
    const id = get().activeThemeId;
    if (!id) return;
    const themes = get().themes.map((t) =>
      t.id === id ? { ...t, comments: text, updatedAt: Date.now() } : t
    );
    persistThemes(themes);
    set({ themes });
  },

  saveSnapshot: (label) => {
    const id = get().activeThemeId;
    const theme = get().getActiveTheme();
    if (!id || !theme) return;
    // 使用 structuredClone 深拷贝，避免后续修改污染历史版本
    const clonedColors =
      typeof structuredClone === 'function'
        ? structuredClone(theme.colors)
        : JSON.parse(JSON.stringify(theme.colors));
    const snap: HistorySnapshot = {
      id: uid(),
      themeId: id,
      colors: clonedColors,
      timestamp: Date.now(),
      label,
    };
    const next = [snap, ...get().history].slice(0, MAX_HISTORY);
    // 存 localStorage 时也做一次深拷贝序列化
    saveHistory(id, JSON.parse(JSON.stringify(next)));
    set({ history: next });
    get().setToast('✓ 版本快照已保存');
  },

  restoreSnapshot: (snapshotId) => {
    const snap = get().history.find((s) => s.id === snapshotId);
    const id = get().activeThemeId;
    if (!snap || !id) return;
    const themes = get().themes.map((t) =>
      t.id === id
        ? { ...t, colors: { ...snap.colors }, updatedAt: Date.now() }
        : t
    );
    persistThemes(themes);
    set({ themes });
    get().setToast('✓ 已恢复到所选版本');
  },

  generateShareLink: () => {
    const theme = get().getActiveTheme();
    if (!theme) return window.location.origin + window.location.pathname;
    const payload: ShareableTheme = {
      name: theme.name,
      colors: theme.colors,
      comments: theme.comments,
      exportedAt: Date.now(),
    };
    const encoded = b64EncodeUnicode(JSON.stringify(payload));
    const base =
      window.location.origin + window.location.pathname;
    return `${base}#t=${encoded}`;
  },

  loadFromHash: () => {
    const hash = window.location.hash;
    const match = hash.match(/#t=([^&]+)/);
    if (!match) return null;
    const decoded = b64DecodeUnicode(match[1]);
    if (!decoded) return null;
    try {
      const data = JSON.parse(decoded) as ShareableTheme;
      if (!data || !data.colors) return null;
      return {
        id: uid(),
        name: data.name || '共享主题',
        colors: data.colors,
        comments: data.comments || '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    } catch {
      return null;
    }
  },

  importSharedTheme: (shared) => {
    const theme: Theme = {
      id: uid(),
      name: shared.name || '共享主题',
      colors: shared.colors,
      comments: shared.comments || '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const themes = [...get().themes, theme];
    persistThemes(themes);
    localStorage.setItem(ACTIVE_KEY, theme.id);
    set({ themes, activeThemeId: theme.id, history: [] });
    get().setToast('✓ 已加载共享主题');
  },

  getActiveTheme: () => {
    const id = get().activeThemeId;
    return get().themes.find((t) => t.id === id);
  },
}));

export const initFromStorage = () => {
  const state = useThemeStore.getState();
  const themes = state.themes;
  if (themes.length === 0) return;
  const storedActive = loadActiveId(themes[0].id);
  const activeId =
    themes.find((t) => t.id === storedActive)?.id ?? themes[0].id;
  const history = loadHistory(activeId);
  useThemeStore.setState({ activeThemeId: activeId, history });
};
