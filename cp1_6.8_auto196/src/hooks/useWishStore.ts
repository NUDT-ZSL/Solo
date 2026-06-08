import { create } from 'zustand';
import { type Wish, type MoodType, type Particle, ZODIAC_INFO, MOOD_INFO } from '@/WishData';
import { getZodiacByDate, generateHoroscope } from '@/HoroscopeEngine';

interface WishState {
  wishes: Wish[];
  selectedWish: Wish | null;
  showForm: boolean;
  particles: Particle[];
  loading: boolean;
  fetchWishes: () => Promise<void>;
  addWish: (content: string, mood: MoodType) => Promise<void>;
  selectWish: (wish: Wish | null) => void;
  setShowForm: (show: boolean) => void;
  setParticles: (particles: Particle[]) => void;
  likeWish: (id: string) => Promise<void>;
  blessWish: (id: string) => Promise<void>;
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  try {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return await res.json();
  } catch {
    throw new Error('Network error');
  }
}

const MOCK_WISHES: Wish[] = [
  { id: '1', content: '希望新的一年事业顺利，所有努力都能开花结果', mood: 'hopeful', zodiac: 'aries', horoscopeText: '今天的你充满活力，行动力极强，适合开启新计划。', horoscopeLevel: 4, createdAt: new Date(Date.now() - 3600000).toISOString(), likes: 12, blessings: 8 },
  { id: '2', content: '愿家人平安健康，每天都能笑口常开', mood: 'happy', zodiac: 'pisces', horoscopeText: '梦幻与直觉交织，今天的你仿佛能与宇宙对话。', horoscopeLevel: 5, createdAt: new Date(Date.now() - 7200000).toISOString(), likes: 25, blessings: 18 },
  { id: '3', content: '希望下个月的旅行一切顺利，遇到美好的风景和人', mood: 'excited', zodiac: 'sagittarius', horoscopeText: '冒险精神正在召唤你，勇敢踏上新的旅程吧。', horoscopeLevel: 4, createdAt: new Date(Date.now() - 10800000).toISOString(), likes: 9, blessings: 6 },
  { id: '4', content: '深夜里许下心愿，愿世界温柔以待', mood: 'calm', zodiac: 'cancer', horoscopeText: '内心温暖充盈，今天适合与亲近的人共度时光。', horoscopeLevel: 3, createdAt: new Date(Date.now() - 14400000).toISOString(), likes: 17, blessings: 14 },
  { id: '5', content: '希望考试顺利通过，付出的汗水不会白费', mood: 'hopeful', zodiac: 'virgo', horoscopeText: '细节决定成败，你精准的洞察力今天将大放异彩。', horoscopeLevel: 4, createdAt: new Date(Date.now() - 18000000).toISOString(), likes: 8, blessings: 11 },
  { id: '6', content: '想家了，希望远方的父母一切安好', mood: 'sad', zodiac: 'taurus', horoscopeText: '稳扎稳打的一天，脚踏实地的你将收获满满。', horoscopeLevel: 3, createdAt: new Date(Date.now() - 21600000).toISOString(), likes: 31, blessings: 22 },
  { id: '7', content: '愿遇见对的人，从此不再孤单', mood: 'calm', zodiac: 'libra', horoscopeText: '和谐之美环绕着你，今天的你散发着迷人魅力。', horoscopeLevel: 3, createdAt: new Date(Date.now() - 25200000).toISOString(), likes: 20, blessings: 16 },
  { id: '8', content: '生日快到了，许一个最真诚的愿望', mood: 'excited', zodiac: 'leo', horoscopeText: '王者气场全开，你的光芒无法被忽视。', horoscopeLevel: 5, createdAt: new Date(Date.now() - 28800000).toISOString(), likes: 45, blessings: 33 },
  { id: '9', content: '希望创作灵感源源不断，完成心中的作品', mood: 'happy', zodiac: 'aquarius', horoscopeText: '独立思考的你今天将迸发惊人的创造力。', horoscopeLevel: 4, createdAt: new Date(Date.now() - 32400000).toISOString(), likes: 14, blessings: 9 },
  { id: '10', content: '虽然今天有些低落，但明天一定会更好', mood: 'sad', zodiac: 'scorpio', horoscopeText: '深邃的洞察力让你看透事物的本质，信赖直觉。', horoscopeLevel: 5, createdAt: new Date(Date.now() - 36000000).toISOString(), likes: 19, blessings: 15 },
];

let nextId = 100;

export const useWishStore = create<WishState>((set, get) => ({
  wishes: [],
  selectedWish: null,
  showForm: false,
  particles: [],
  loading: false,

  fetchWishes: async () => {
    set({ loading: true });
    try {
      const data = await apiFetch<Wish[]>('/api/wishes');
      set({ wishes: data, loading: false });
    } catch {
      set({ wishes: MOCK_WISHES, loading: false });
    }
  },

  addWish: async (content: string, mood: MoodType) => {
    const zodiac = getZodiacByDate(new Date());
    const horoscope = generateHoroscope(zodiac);
    const newWish: Wish = {
      id: String(nextId++),
      content,
      mood,
      zodiac,
      horoscopeText: horoscope.text,
      horoscopeLevel: horoscope.level,
      createdAt: new Date().toISOString(),
      likes: 0,
      blessings: 0,
    };

    try {
      const saved = await apiFetch<Wish>('/api/wishes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, mood }),
      });
      set((state) => ({ wishes: [saved, ...state.wishes] }));
    } catch {
      set((state) => ({ wishes: [newWish, ...state.wishes] }));
    }
  },

  selectWish: (wish) => set({ selectedWish: wish }),

  setShowForm: (show) => set({ showForm: show }),

  setParticles: (particles) => set({ particles }),

  likeWish: async (id) => {
    try {
      await apiFetch<{ likes: number }>(`/api/wishes/${id}/like`, { method: 'POST' });
    } catch {}
    set((state) => ({
      wishes: state.wishes.map((w) =>
        w.id === id ? { ...w, likes: w.likes + 1 } : w
      ),
      selectedWish:
        state.selectedWish?.id === id
          ? { ...state.selectedWish, likes: state.selectedWish.likes + 1 }
          : state.selectedWish,
    }));
  },

  blessWish: async (id) => {
    try {
      await apiFetch<{ blessings: number }>(`/api/wishes/${id}/bless`, { method: 'POST' });
    } catch {}
    set((state) => ({
      wishes: state.wishes.map((w) =>
        w.id === id ? { ...w, blessings: w.blessings + 1 } : w
      ),
      selectedWish:
        state.selectedWish?.id === id
          ? { ...state.selectedWish, blessings: state.selectedWish.blessings + 1 }
          : state.selectedWish,
    }));
  },
}));
