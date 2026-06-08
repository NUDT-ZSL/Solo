import { create } from 'zustand';
import { type EmotionType, type PoemType, generatePoem } from './PoemEngine';

interface PoemStore {
  selectedImagery: string[];
  selectedEmotion: EmotionType;
  poemType: PoemType;
  currentPoem: string[];
  favorites: string[][];
  isGenerating: boolean;
  toastMessage: string;
  toastVisible: boolean;

  toggleImagery: (word: string) => void;
  setEmotion: (emotion: EmotionType) => void;
  setPoemType: (type: PoemType) => void;
  generate: () => void;
  addFavorite: () => void;
  sharePoem: () => void;
  showToast: (msg: string) => void;
}

const STORAGE_KEY = 'fengyin_favorites';

function loadFavorites(): string[][] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveFavorites(favs: string[][]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favs));
  } catch {
    // ignore
  }
}

export const usePoemStore = create<PoemStore>((set, get) => ({
  selectedImagery: [],
  selectedEmotion: '离别',
  poemType: 'five',
  currentPoem: [],
  favorites: loadFavorites(),
  isGenerating: false,
  toastMessage: '',
  toastVisible: false,

  toggleImagery: (word: string) => {
    set(state => {
      const exists = state.selectedImagery.includes(word);
      const next = exists
        ? state.selectedImagery.filter(w => w !== word)
        : [...state.selectedImagery, word];
      return { selectedImagery: next };
    });
  },

  setEmotion: (emotion: EmotionType) => set({ selectedEmotion: emotion }),

  setPoemType: (type: PoemType) => set({ poemType: type }),

  generate: () => {
    const { selectedImagery, selectedEmotion, poemType } = get();
    set({ isGenerating: true, currentPoem: [] });

    setTimeout(() => {
      const poem = generatePoem(selectedImagery, selectedEmotion, poemType);
      set({ currentPoem: poem, isGenerating: false });
    }, 300);
  },

  addFavorite: () => {
    const { currentPoem, favorites } = get();
    if (currentPoem.length === 0) return;
    const exists = favorites.some(f => f.join('') === currentPoem.join(''));
    if (exists) {
      get().showToast('此诗已在收藏中');
      return;
    }
    const next = [...favorites, currentPoem];
    set({ favorites: next });
    saveFavorites(next);
    get().showToast('已收藏');
  },

  sharePoem: () => {
    const { currentPoem } = get();
    if (currentPoem.length === 0) return;
    const text = currentPoem.join('\n');
    navigator.clipboard.writeText(text).then(
      () => get().showToast('已复制到剪贴板'),
      () => get().showToast('复制失败，请手动复制')
    );
  },

  showToast: (msg: string) => {
    set({ toastMessage: msg, toastVisible: true });
    setTimeout(() => {
      set({ toastVisible: false });
    }, 2000);
  },
}));
