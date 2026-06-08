import { create } from "zustand";
import type { Capsule, TimelineItem } from "@/types";

const WARM_COLORS = [
  "#D4A574",
  "#C9956B",
  "#E8C99B",
  "#DDB892",
  "#B08968",
  "#C9B99A",
  "#DEB887",
  "#CDAA7D",
];

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

const MOCK_CAPSULES: Capsule[] = [
  {
    id: "1",
    title: "给十年后的自己",
    content:
      "亲爱的未来的我，希望你依然保持着对世界的好奇心。无论经历了什么，都不要忘记那个在夏夜仰望星空的少年。生活或许不像想象中那样完美，但我相信你一定找到了属于自己的光。",
    images: [],
    audioUrl: null,
    unlockDate: "2025-01-01",
    createdAt: "2024-06-01",
    isPublic: true,
    isLocked: false,
    creatorId: "user1",
    tags: ["自我", "成长"],
  },
  {
    id: "2",
    title: "毕业季的约定",
    content:
      "我们约定好的，十年后再回到这棵银杏树下。那时的我们会是什么样子呢？带着各自的梦想和故事，重新聚首在青春开始的地方。",
    images: [],
    audioUrl: null,
    unlockDate: "2026-06-20",
    createdAt: "2024-06-20",
    isPublic: true,
    isLocked: true,
    creatorId: "user2",
    tags: ["友谊", "校园"],
  },
  {
    id: "3",
    title: "第一次旅行的记忆",
    content:
      "在京都的清水寺，看到了最美的晚霞。枫叶染红了整座山，钟声在暮色中回荡。那一刻，时间仿佛静止了。把这份宁静封存在这里，留给未来的某个傍晚。",
    images: [],
    audioUrl: null,
    unlockDate: "2025-03-15",
    createdAt: "2024-03-15",
    isPublic: true,
    isLocked: false,
    creatorId: "user3",
    tags: ["旅行", "记忆"],
  },
  {
    id: "4",
    title: "致未来的你",
    content:
      "在遇见你之前，我想先把自己变成更好的人。这份胶囊里装着我现在的样子——笨拙、真诚、满怀期待。等到开启的那一天，希望我们都能微笑着回望。",
    images: [],
    audioUrl: null,
    unlockDate: "2027-02-14",
    createdAt: "2025-02-14",
    isPublic: true,
    isLocked: true,
    creatorId: "user4",
    tags: ["爱情", "期待"],
  },
  {
    id: "5",
    title: "奶奶的菜谱",
    content:
      "终于学会了奶奶的红烧肉做法——冰糖要先炒成琥珀色，料酒要沿着锅边倒下去滋啦一声响。味道已经很接近了，但总觉得还差一点什么。也许，差的是那个在厨房里忙碌的身影吧。",
    images: [],
    audioUrl: null,
    unlockDate: "2024-12-25",
    createdAt: "2024-01-01",
    isPublic: true,
    isLocked: false,
    creatorId: "user5",
    tags: ["家人", "味道"],
  },
  {
    id: "6",
    title: "新年的愿望清单",
    content:
      "1. 学会弹一首完整的钢琴曲\n2. 读完书架上那些落灰的书\n3. 去一次极光之旅\n4. 给老朋友们写一封信\n5. 学会好好爱自己",
    images: [],
    audioUrl: null,
    unlockDate: "2026-01-01",
    createdAt: "2025-01-01",
    isPublic: true,
    isLocked: true,
    creatorId: "user1",
    tags: ["愿望", "新年"],
  },
  {
    id: "7",
    title: "雨天的咖啡馆",
    content:
      "窗外是连绵的雨，手边是一杯温热的拿铁。雨水在玻璃上画着抽象画，爵士乐在空气中慵懒地流淌。有些时刻，不需要被赋予意义，它本身就是意义。",
    images: [],
    audioUrl: null,
    unlockDate: "2025-05-20",
    createdAt: "2024-05-20",
    isPublic: true,
    isLocked: false,
    creatorId: "user2",
    tags: ["日常", "宁静"],
  },
  {
    id: "8",
    title: "星空下的告白",
    content:
      "那晚在山顶看到了银河，你指着天边说那颗最亮的星星是你的。我偷偷在心里说，你就是我的星星。这份心意，藏在星光里，等到对的时候再告诉你。",
    images: [],
    audioUrl: null,
    unlockDate: "2028-08-08",
    createdAt: "2025-08-08",
    isPublic: true,
    isLocked: true,
    creatorId: "user3",
    tags: ["爱情", "星空"],
  },
];

interface CapsuleStore {
  capsules: Capsule[];
  selectedCapsuleId: string | null;
  searchKeyword: string;
  selectedTags: string[];
  isEditorOpen: boolean;
  isDetailOpen: boolean;
  isSearchOpen: boolean;

  setSelectedCapsuleId: (id: string | null) => void;
  setSearchKeyword: (keyword: string) => void;
  setSelectedTags: (tags: string[]) => void;
  setEditorOpen: (open: boolean) => void;
  setDetailOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  addCapsule: (capsule: Omit<Capsule, "id" | "createdAt" | "isLocked">) => void;
  checkUnlockStatus: () => void;
  getTimelineItems: () => TimelineItem[];
  getFilteredTimelineItems: () => TimelineItem[];
  getAllTags: () => string[];
}

export const useCapsuleStore = create<CapsuleStore>((set, get) => ({
  capsules: MOCK_CAPSULES,
  selectedCapsuleId: null,
  searchKeyword: "",
  selectedTags: [],
  isEditorOpen: false,
  isDetailOpen: false,
  isSearchOpen: false,

  setSelectedCapsuleId: (id) => set({ selectedCapsuleId: id }),
  setSearchKeyword: (keyword) => set({ searchKeyword: keyword }),
  setSelectedTags: (tags) => set({ selectedTags: tags }),
  setEditorOpen: (open) => set({ isEditorOpen: open }),
  setDetailOpen: (open) => set({ isDetailOpen: open }),
  setSearchOpen: (open) => set({ isSearchOpen: open }),

  addCapsule: (capsuleData) => {
    const newCapsule: Capsule = {
      ...capsuleData,
      id: generateId(),
      createdAt: new Date().toISOString().split("T")[0],
      isLocked: new Date(capsuleData.unlockDate) > new Date(),
    };
    set((state) => ({ capsules: [...state.capsules, newCapsule] }));
  },

  checkUnlockStatus: () => {
    set((state) => ({
      capsules: state.capsules.map((c) => ({
        ...c,
        isLocked: new Date(c.unlockDate) > new Date(),
      })),
    }));
  },

  getTimelineItems: () => {
    const { capsules } = get();
    return capsules
      .filter((c) => c.isPublic)
      .map((c, i) => ({
        id: c.id,
        title: c.title,
        summary: c.content.substring(0, 60) + (c.content.length > 60 ? "..." : ""),
        unlockDate: c.unlockDate,
        isLocked: c.isLocked,
        tags: c.tags,
        color: WARM_COLORS[i % WARM_COLORS.length],
        createdAt: c.createdAt,
      }));
  },

  getFilteredTimelineItems: () => {
    const { getTimelineItems, searchKeyword, selectedTags } = get();
    let items = getTimelineItems();

    if (searchKeyword) {
      const kw = searchKeyword.toLowerCase();
      items = items.filter(
        (item) =>
          item.title.toLowerCase().includes(kw) ||
          item.summary.toLowerCase().includes(kw) ||
          item.tags.some((t) => t.toLowerCase().includes(kw))
      );
    }

    if (selectedTags.length > 0) {
      items = items.filter((item) =>
        selectedTags.some((tag) => item.tags.includes(tag))
      );
    }

    return items;
  },

  getAllTags: () => {
    const { capsules } = get();
    const tagSet = new Set<string>();
    capsules.forEach((c) => c.tags.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet);
  },
}));
