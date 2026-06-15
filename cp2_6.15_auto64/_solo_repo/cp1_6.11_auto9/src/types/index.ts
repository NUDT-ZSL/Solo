export type EmotionTag =
  | '宁静'
  | '喧闹'
  | '忧郁'
  | '欢快'
  | '神秘'
  | '温暖'
  | '清新'
  | '怀旧'
  | '浪漫'
  | '震撼';

export const TAG_COLORS: Record<EmotionTag, string> = {
  宁静: '#6ECB63',
  喧闹: '#FF6B6B',
  忧郁: '#5C6BC0',
  欢快: '#FFD54F',
  神秘: '#AB47BC',
  温暖: '#FF8A65',
  清新: '#26A69A',
  怀旧: '#8D6E63',
  浪漫: '#EC407A',
  震撼: '#FF7043',
};

export const ALL_TAGS: EmotionTag[] = [
  '宁静',
  '喧闹',
  '忧郁',
  '欢快',
  '神秘',
  '温暖',
  '清新',
  '怀旧',
  '浪漫',
  '震撼',
];

export interface Comment {
  id: string;
  userId: string;
  username: string;
  content: string;
  createdAt: string;
}

export interface MarkerData {
  id: string;
  userId: string;
  lng: number;
  lat: number;
  title: string;
  note: string;
  tag: EmotionTag;
  audioUrl: string;
  imageUrl: string;
  isPublic: boolean;
  likes: number;
  likesToday: number;
  comments: Comment[];
  playCount: number;
  createdAt: string;
  expiresAt: string;
}

export interface FavoriteData {
  markerId: string;
  userId: string;
  note: string;
  createdAt: string;
  marker: MarkerData | null;
}

export interface UserData {
  id: string;
  username: string;
  avatar: string;
}
