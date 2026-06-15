// =============================================================================
// 共享类型定义 - 前后端通用
// 用于定义网络事件的载荷结构、玩家状态、游戏状态等
// 数据流向：server/index.ts <-> NetworkManager.ts <-> GameCore.ts
// =============================================================================

export type Vec3 = { x: number; y: number; z: number };

export const RABBIT_COLORS = [
  '#ff6b6b', // 珊瑚红
  '#4ecdc4', // 青蓝
  '#ffe66d', // 柠檬黄
  '#a78bfa', // 淡紫
  '#f97316', // 橙色
] as const;

export type RabbitColor = typeof RABBIT_COLORS[number];

export interface PlayerState {
  id: string;
  name: string;
  color: RabbitColor;
  position: Vec3;
  score: number;
  deaths: number;
  isRooted: boolean;
  rootedUntil: number;
  lastUpdate: number;
}

export interface CoinState {
  id: string;
  position: Vec3;
  collected: boolean;
  respawnAt: number;
}

export interface TrapState {
  id: string;
  position: Vec3;
  size: Vec3;
}

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  name: string;
  color: RabbitColor;
  score: number;
  deaths: number;
}

export interface GameState {
  roomCode: string;
  phase: 'waiting' | 'playing' | 'ended';
  startTime: number;
  durationSec: number;
  remainingSec: number;
  players: Record<string, PlayerState>;
  coins: CoinState[];
  traps: TrapState[];
  leaderboard: LeaderboardEntry[];
}

// =============================================================================
// Socket.IO 事件协议定义
// 方向: C->S = 客户端发服务器, S->C = 服务器广播给客户端
// =============================================================================

// C->S: 创建房间
export interface CreateRoomPayload { name: string; }
export interface CreateRoomResponse { roomCode: string; playerId: string; }

// C->S: 加入房间
export interface JoinRoomPayload { roomCode: string; name: string; }
export interface JoinRoomResponse {
  success: boolean;
  gameState?: GameState;
  playerId?: string;
  error?: string;
}

// C->S: 玩家位置更新 (NetworkManager -> Server)
// 触发: GameCore 中键盘输入驱动本地预测，每 ~50ms 上报一次
export interface PlayerMovePayload {
  position: Vec3;
  timestamp: number;
}

// C->S: 玩家拾取金币
export interface CoinCollectPayload { coinId: string; timestamp: number; }

// C->S: 玩家触发陷阱
export interface TrapTriggerPayload { trapId: string; timestamp: number; }

// C->S: 玩家重新开始
export interface RestartGamePayload { /* empty */ }

// C->S: 玩家返回大厅
export interface LeaveRoomPayload { /* empty */ }

// S->C: 游戏状态完整快照 (玩家加入时 / 定期)
export interface GameStateBroadcast {
  state: GameState;
  serverTimestamp: number;
}

// S->C: 玩家位置差异更新 (其他玩家的位置插值)
export interface PlayerMoveBroadcast {
  playerId: string;
  position: Vec3;
  timestamp: number;
  velocity: Vec3; // 用于三次贝塞尔曲线的控制点估算
}

// S->C: 金币被收集
export interface CoinCollectBroadcast {
  coinId: string;
  playerId: string;
  scoreGain: number;
  respawnPosition: Vec3;
  respawnAt: number;
}

// S->C: 金币重新生成
export interface CoinRespawnBroadcast {
  coinId: string;
  position: Vec3;
}

// S->C: 玩家触发陷阱
export interface TrapTriggerBroadcast {
  playerId: string;
  rootedUntil: number;
  deaths: number;
}

// S->C: 游戏开始
export interface GameStartBroadcast {
  startTime: number;
  durationSec: number;
}

// S->C: 游戏结束
export interface GameEndBroadcast {
  leaderboard: LeaderboardEntry[];
}

// S->C: 玩家加入房间
export interface PlayerJoinBroadcast {
  player: PlayerState;
}

// S->C: 玩家离开房间
export interface PlayerLeaveBroadcast {
  playerId: string;
}

// S->C: 排行榜更新
export interface LeaderboardBroadcast {
  leaderboard: LeaderboardEntry[];
  remainingSec: number;
}
