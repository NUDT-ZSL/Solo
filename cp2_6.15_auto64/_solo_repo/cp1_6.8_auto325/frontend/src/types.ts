export interface Resonation {
  id: string;
  emoji: string;
  description: string;
  author_id: string;
  created_at: string;
}

export interface ScentBottle {
  id: string;
  emoji: string;
  description: string;
  scent_type: string;
  author_id: string;
  resonate_count: number;
  resonations: Resonation[];
  created_at: string;
  is_hot?: boolean;
}

export interface UserStats {
  total_published: number;
  total_resonated: number;
  scent_type_distribution: Record<string, number>;
}

export const SCENT_TYPES = [
  "花香", "果香", "草木", "美食", "雨后",
  "烟熏", "木质", "书卷", "泥土", "海洋", "其他",
] as const;

export const EMOJI_OPTIONS = [
  "🌸", "🌿", "🍋", "🍞", "🌧️", "💨", "🪵", "📖",
  "🌍", "🌊", "🕯️", "☕", "🧴", "🍃", "🌺", "🍎",
  "🍯", "🍂", "🔥", "💨",
];

export const SCENT_COLORS: Record<string, string> = {
  "花香": "#F9A8D4",
  "果香": "#FDE68A",
  "草木": "#86EFAC",
  "美食": "#FDBA74",
  "雨后": "#93C5FD",
  "烟熏": "#D4D4D8",
  "木质": "#D4A574",
  "书卷": "#C4B5A0",
  "泥土": "#B4A48C",
  "海洋": "#7DD3FC",
  "其他": "#E5E7EB",
};
