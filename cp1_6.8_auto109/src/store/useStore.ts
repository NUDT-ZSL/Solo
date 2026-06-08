import { create } from "zustand";
import type { Item, Transaction, ItemStatus } from "@/types";

const MOCK_ITEMS: Item[] = [
  {
    id: "1",
    title: "复古胶片相机",
    description: "保存完好的经典胶片相机，快门声清脆，适合摄影爱好者收藏。附带原装皮套和肩带。",
    price: 380,
    imageUrl: "https://picsum.photos/seed/camera01/400/500",
    category: "电子产品",
    status: "在售",
    sellerId: "user1",
    createdAt: "2025-12-01T10:00:00Z",
  },
  {
    id: "2",
    title: "手作陶瓷花瓶",
    description: "景德镇匠人手工制作，独特冰裂纹釉面，每一件都独一无二。高度约25cm。",
    price: 120,
    imageUrl: "https://picsum.photos/seed/vase02/400/350",
    category: "家居",
    status: "在售",
    sellerId: "user2",
    createdAt: "2025-12-02T14:30:00Z",
  },
  {
    id: "3",
    title: "绝版科幻小说合集",
    description: "阿西莫夫基地系列全七册，初版印刷，书脊微有磨损，内页完好。科幻迷的珍藏。",
    price: 260,
    imageUrl: "https://picsum.photos/seed/books03/400/450",
    category: "书籍",
    status: "在售",
    sellerId: "user1",
    createdAt: "2025-12-03T09:15:00Z",
  },
  {
    id: "4",
    title: " vintage 牛仔外套",
    description: "90年代经典款式，水洗做旧效果自然，尺码M，适合春秋穿着。细节处有时代印记。",
    price: 220,
    imageUrl: "https://picsum.photos/seed/jacket04/400/550",
    category: "服饰",
    status: "在售",
    sellerId: "user3",
    createdAt: "2025-12-04T16:45:00Z",
  },
  {
    id: "5",
    title: "机械键盘 Cherry 红轴",
    description: "Cherry MX Board 2.0，红轴手感丝滑，87键紧凑布局，适合打字和轻度游戏。",
    price: 350,
    imageUrl: "https://picsum.photos/seed/keyboard05/400/300",
    category: "电子产品",
    status: "在售",
    sellerId: "user2",
    createdAt: "2025-12-05T11:20:00Z",
  },
  {
    id: "6",
    title: "瑜伽垫加厚款",
    description: "TPE环保材质，厚度8mm，双面防滑纹理，附带收纳带。仅使用过两次。",
    price: 68,
    imageUrl: "https://picsum.photos/seed/yoga06/400/400",
    category: "运动",
    status: "在售",
    sellerId: "user1",
    createdAt: "2025-12-06T08:00:00Z",
  },
  {
    id: "7",
    title: "黑胶唱片机",
    description: "Audio-technica AT-LP60X，全自动皮带驱动，内置唱放，即插即用。附赠三张爵士唱片。",
    price: 580,
    imageUrl: "https://picsum.photos/seed/vinyl07/400/380",
    category: "电子产品",
    status: "已售出",
    sellerId: "user3",
    createdAt: "2025-11-20T13:00:00Z",
    soldAt: "2025-11-25T10:30:00Z",
  },
  {
    id: "8",
    title: "日式手绘茶杯套装",
    description: "五只不同图案的日式茶杯，手绘和风花卉，容量约150ml，带木质收纳盒。",
    price: 168,
    imageUrl: "https://picsum.photos/seed/teacup08/400/420",
    category: "家居",
    status: "在售",
    sellerId: "user2",
    createdAt: "2025-12-07T15:30:00Z",
  },
  {
    id: "9",
    title: "公路自行车头盔",
    description: "Giro Synthe MIPS，碳纤维纹理涂装，通风散热极佳，尺码M/L。几乎全新。",
    price: 450,
    imageUrl: "https://picsum.photos/seed/helmet09/400/360",
    category: "运动",
    status: "交易中",
    sellerId: "user1",
    createdAt: "2025-12-08T10:00:00Z",
  },
  {
    id: "10",
    title: "水彩颜料套装",
    description: "温莎牛顿歌文24色固彩，含调色盘和画笔，适合入门到进阶。部分颜色已使用约三分之一。",
    price: 95,
    imageUrl: "https://picsum.photos/seed/paint10/400/350",
    category: "其他",
    status: "在售",
    sellerId: "user3",
    createdAt: "2025-12-09T09:45:00Z",
  },
];

const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: "tx1",
    itemId: "7",
    itemTitle: "黑胶唱片机",
    itemImageUrl: "https://picsum.photos/seed/vinyl07/400/380",
    buyerId: "user1",
    sellerId: "user3",
    price: 580,
    status: "已售出",
    createdAt: "2025-11-25T10:30:00Z",
  },
];

interface StoreState {
  items: Item[];
  transactions: Transaction[];
  searchQuery: string;
  selectedCategory: string;
  isPublishModalOpen: boolean;
  isSuccessModalOpen: boolean;
  purchasedItem: Item | null;
  goldenGlowId: string | null;

  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string) => void;
  addItem: (item: Omit<Item, "id" | "status" | "sellerId" | "createdAt">) => void;
  purchaseItem: (itemId: string) => void;
  setPublishModalOpen: (open: boolean) => void;
  setSuccessModalOpen: (open: boolean) => void;
  setGoldenGlowId: (id: string | null) => void;
  getFilteredItems: () => Item[];
  getUserItems: (userId: string) => Item[];
  getUserTransactions: (userId: string) => Transaction[];
}

const CURRENT_USER_ID = "user1";

export const useStore = create<StoreState>((set, get) => ({
  items: MOCK_ITEMS,
  transactions: MOCK_TRANSACTIONS,
  searchQuery: "",
  selectedCategory: "全部",
  isPublishModalOpen: false,
  isSuccessModalOpen: false,
  purchasedItem: null,
  goldenGlowId: null,

  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedCategory: (category) => set({ selectedCategory: category }),

  addItem: (itemData) => {
    const newItem: Item = {
      ...itemData,
      id: Date.now().toString(),
      status: "在售" as ItemStatus,
      sellerId: CURRENT_USER_ID,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ items: [newItem, ...state.items] }));
  },

  purchaseItem: (itemId) => {
    const state = get();
    const item = state.items.find((i) => i.id === itemId);
    if (!item || item.status !== "在售") return;

    set((state) => ({
      items: state.items.map((i) =>
        i.id === itemId
          ? { ...i, status: "已售出" as ItemStatus, soldAt: new Date().toISOString() }
          : i
      ),
      transactions: [
        {
          id: `tx${Date.now()}`,
          itemId: item.id,
          itemTitle: item.title,
          itemImageUrl: item.imageUrl,
          buyerId: CURRENT_USER_ID,
          sellerId: item.sellerId,
          price: item.price,
          status: "已售出" as ItemStatus,
          createdAt: new Date().toISOString(),
        },
        ...state.transactions,
      ],
      purchasedItem: { ...item, status: "已售出" as ItemStatus, soldAt: new Date().toISOString() },
      goldenGlowId: itemId,
    }));

    setTimeout(() => {
      set({ goldenGlowId: null, isSuccessModalOpen: true });
    }, 800);
  },

  setPublishModalOpen: (open) => set({ isPublishModalOpen: open }),
  setSuccessModalOpen: (open) => set({ isSuccessModalOpen: open, purchasedItem: open ? get().purchasedItem : null }),
  setGoldenGlowId: (id) => set({ goldenGlowId: id }),

  getFilteredItems: () => {
    const { items, searchQuery, selectedCategory } = get();
    return items.filter((item) => {
      const matchesSearch =
        !searchQuery ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === "全部" || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  },

  getUserItems: (userId) => {
    return get().items.filter((item) => item.sellerId === userId);
  },

  getUserTransactions: (userId) => {
    return get().transactions.filter(
      (tx) => tx.buyerId === userId || tx.sellerId === userId
    );
  },
}));
