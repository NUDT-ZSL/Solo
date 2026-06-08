import { create } from 'zustand';
import type { BubbleData } from '@/utils/OceanScene';
import {
  getCollectedPoems,
  saveCollectedPoem,
  removeCollectedPoem,
  type CollectedPoem,
} from '@/utils/IslandStorage';

const SAMPLE_POEMS: Omit<BubbleData, 'color'>[] = [
  { id: '1', title: '晚风', content: '晚风轻轻吹过田野\n稻穗低头私语\n夕阳把最后一抹橘红\n藏进远山的口袋', createdAt: Date.now() - 86400000 },
  { id: '2', title: '雨后', content: '雨停了\n蜗牛开始旅行\n叶片上的水珠\n是天空遗落的信', createdAt: Date.now() - 172800000 },
  { id: '3', title: '月光', content: '月光落在窗台上\n像一封未拆的信\n安静地\n等一个人来读', createdAt: Date.now() - 259200000 },
  { id: '4', title: '秋叶', content: '一片叶子旋转着\n落入溪水\n它要去远方\n替我看看大海', createdAt: Date.now() - 345600000 },
  { id: '5', title: '晨雾', content: '雾气从山谷升起\n像大地在呼吸\n我站在这白色里\n什么也看不见\n却什么都懂了', createdAt: Date.now() - 432000000 },
  { id: '6', title: '星河', content: '夜深了\n星星倒映在湖面\n鱼儿游过\n碎了一河银河', createdAt: Date.now() - 518400000 },
  { id: '7', title: '老巷', content: '青石板上的苔藓\n记着谁的脚印\n巷口的猫\n还在等那个夏天', createdAt: Date.now() - 604800000 },
  { id: '8', title: '雪夜', content: '雪花落进院子\n盖住了旧时光\n炉火旁的茶\n还温着', createdAt: Date.now() - 691200000 },
];

function createBubbleData(poem: Omit<BubbleData, 'color'>): BubbleData {
  return { ...poem, color: '' };
}

interface OceanStore {
  poems: BubbleData[];
  collectedPoems: CollectedPoem[];
  writeModalOpen: boolean;
  poemCardData: BubbleData | null;
  setWriteModalOpen: (open: boolean) => void;
  setPoemCardData: (data: BubbleData | null) => void;
  addPoem: (content: string, title?: string) => void;
  collectPoem: (id: string) => void;
  releasePoem: (id: string) => void;
  refreshOcean: () => void;
  loadCollected: () => void;
}

export const useOceanStore = create<OceanStore>((set, get) => ({
  poems: SAMPLE_POEMS.map(createBubbleData),
  collectedPoems: [],
  writeModalOpen: false,
  poemCardData: null,

  setWriteModalOpen: (open) => set({ writeModalOpen: open }),
  setPoemCardData: (data) => set({ poemCardData: data }),

  addPoem: (content, title) => {
    const poemTitle = title || content.slice(0, 6).replace(/\n/g, ' ');
    const newPoem: BubbleData = {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
      content,
      title: poemTitle,
      createdAt: Date.now(),
      color: '',
    };
    set((state) => ({ poems: [...state.poems, newPoem] }));
  },

  collectPoem: (id) => {
    const poem = get().poems.find(p => p.id === id);
    if (!poem) return;
    const collected = saveCollectedPoem(poem);
    set((state) => ({
      collectedPoems: [...state.collectedPoems, collected],
      poemCardData: null,
    }));
  },

  releasePoem: (id) => {
    removeCollectedPoem(id);
    const poem = get().collectedPoems.find(p => p.id === id);
    set((state) => ({
      collectedPoems: state.collectedPoems.filter(p => p.id !== id),
      poems: poem ? [...state.poems, { ...poem, color: '' }] : state.poems,
    }));
  },

  refreshOcean: () => {
    set({ poems: SAMPLE_POEMS.map(createBubbleData) });
  },

  loadCollected: () => {
    set({ collectedPoems: getCollectedPoems() });
  },
}));
