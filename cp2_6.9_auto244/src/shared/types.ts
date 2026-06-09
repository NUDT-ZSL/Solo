export interface Player {
  id: string;
  nickname: string;
  isAdmin: boolean;
}

export interface Item {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export interface Clue {
  id: string;
  area: AreaType;
  title: string;
  content: string;
  mediaType: 'text' | 'image' | 'audio';
  mediaData?: string;
  position: { x: number; y: number };
  discovered: boolean;
  linkedItemId?: string;
}

export interface Recipe {
  inputs: string[];
  output: Item;
  progressIncrement: number;
}

export type AreaType = 'foyer' | 'tomb' | 'treasure';

export type GameStatus = 'waiting' | 'playing' | 'won' | 'lost';

export interface RoomState {
  roomId: string;
  players: Player[];
  status: GameStatus;
  items: Item[];
  clues: Clue[];
  progress: number;
  totalProgress: number;
  currentArea: AreaType;
  timeLeft: number;
  startedAt: number | null;
  messages: ChatMessage[];
  unlockedAreas: AreaType[];
}

export interface ChatMessage {
  id: string;
  playerId: string;
  nickname: string;
  content: string;
  timestamp: number;
}

export const AREAS: { id: AreaType; name: string; description: string }[] = [
  {
    id: 'foyer',
    name: '前厅',
    description: '风沙弥漫的古老入口，石壁上刻满了神秘的象形文字，空气中弥漫着千年的尘埃气息...'
  },
  {
    id: 'tomb',
    name: '墓室',
    description: '昏暗的墓室中央摆放着石棺，四周墙壁绘有壁画，烛火摇曳间似有阴影在晃动...'
  },
  {
    id: 'treasure',
    name: '藏宝阁',
    description: '金光闪闪的宝藏堆积如山，出口的石门就在前方，但似乎还需要解开最后的机关...'
  }
];
