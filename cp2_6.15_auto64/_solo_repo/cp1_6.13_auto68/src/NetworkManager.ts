// =============================================================================
// 网络模块 NetworkManager - Socket.IO 客户端封装
//
// 【职责】封装与后端 Socket.IO 服务器的所有通信细节
//
// 【与其他模块的数据流向】
//
//   ┌──────────────────┐     输入流 (S->C)           ┌──────────────────┐
//   │  server/index.ts  │ ─────────────────────────▶ │ NetworkManager   │
//   │  (Socket.IO 服务) │    socket.on(...)          │ (本模块)         │
//   └──────────────────┘                             └────────┬─────────┘
//                                                            │
//                                                            ▼ 回调事件
//                                                 ┌──────────────────┐
//                                                 │   GameCore.ts    │
//                                                 │ (3D 场景/游戏逻辑)│
//                                                 └────────┬─────────┘
//                                                            │
//   ┌──────────────────┐     输出流 (C->S)                   │ 函数调用
//   │  server/index.ts  │ ◀──────────────────────────────────┘
//   │  (Socket.IO 服务) │    socket.emit(...)
//   └──────────────────┘
//
// 【Socket.IO 事件协议清单】
//
//  方向 | 事件名              | 载荷类型                     | 触发时机
//  -----|---------------------|------------------------------|----------------------------
//  C->S | room:create         | CreateRoomPayload            | 用户点击"创建房间"
//  C->S | room:join           | JoinRoomPayload              | 用户输入房间码加入
//  C->S | player:move         | PlayerMovePayload            | 每 ~50ms 上报本地预测位置
//  C->S | coin:collect        | CoinCollectPayload           | 玩家碰撞到金币时
//  C->S | trap:trigger        | TrapTriggerPayload           | 玩家踏入陷阱时
//  C->S | game:restart        | (empty)                      | 游戏结束后点击"再来一局"
//  C->S | room:leave          | (empty)                      | 点击"返回大厅"
//  S->C | game:state          | GameStateBroadcast           | 新玩家加入时 / 重启后
//  S->C | player:join         | PlayerJoinBroadcast          | 有新玩家加入同房间
//  S->C | player:leave        | PlayerLeaveBroadcast         | 有玩家断开
//  S->C | player:move         | PlayerMoveBroadcast          | 其他玩家移动(含velocity)
//  S->C | coin:collect        | CoinCollectBroadcast         | 金币被人收集
//  S->C | coin:respawn        | CoinRespawnBroadcast         | 金币 5 秒后重生
//  S->C | trap:trigger        | TrapTriggerBroadcast         | 有人踏入陷阱(定身 2s)
//  S->C | game:start          | GameStartBroadcast           | 游戏正式开始
//  S->C | game:end            | GameEndBroadcast             | 游戏结束，带最终排行榜
//  S->C | leaderboard:update  | LeaderboardBroadcast         | 每秒同步剩余时间和排行榜
// =============================================================================

import { io, Socket } from 'socket.io-client';
import {
  Vec3, GameState, LeaderboardEntry,
  CreateRoomPayload, CreateRoomResponse,
  JoinRoomPayload, JoinRoomResponse,
  PlayerMovePayload, PlayerMoveBroadcast,
  CoinCollectPayload, CoinCollectBroadcast, CoinRespawnBroadcast,
  TrapTriggerPayload, TrapTriggerBroadcast,
  GameStartBroadcast, GameEndBroadcast,
  PlayerJoinBroadcast, PlayerLeaveBroadcast,
  LeaderboardBroadcast, GameStateBroadcast,
} from './shared/types';

// 回调函数签名 - GameCore 通过这些回调将事件注入到 3D 世界
export interface NetworkCallbacks {
  // 收到完整游戏状态（加入房间 / 重启后）
  onGameState: (state: GameState, serverTs: number) => void;
  // 有玩家加入
  onPlayerJoin: (evt: PlayerJoinBroadcast) => void;
  // 有玩家离开
  onPlayerLeave: (playerId: string) => void;
  // 其他玩家移动（用于三次贝塞尔插值）
  onPlayerMove: (evt: PlayerMoveBroadcast) => void;
  // 金币被收集
  onCoinCollect: (evt: CoinCollectBroadcast) => void;
  // 金币重生
  onCoinRespawn: (evt: CoinRespawnBroadcast) => void;
  // 玩家触发陷阱
  onTrapTrigger: (evt: TrapTriggerBroadcast) => void;
  // 游戏开始
  onGameStart: (evt: GameStartBroadcast) => void;
  // 游戏结束
  onGameEnd: (leaderboard: LeaderboardEntry[]) => void;
  // 每秒排行榜 + 剩余时间更新
  onLeaderboardUpdate: (leaderboard: LeaderboardEntry[], remainingSec: number) => void;
  // 错误信息
  onError: (msg: string) => void;
}

export class NetworkManager {
  private socket: Socket | null = null;
  private callbacks: NetworkCallbacks;
  private moveBuffer: Vec3 | null = null;
  private lastMoveEmitTs = 0;
  private static readonly MOVE_EMIT_INTERVAL = 50; // 50ms ~ 20Hz 上报频率

  // 调试模式 - 模拟网络延迟（用于性能验证）
  private simulatedLatencyMs = 0;

  constructor(callbacks: NetworkCallbacks) {
    this.callbacks = callbacks;
  }

  // =====================================================================
  // 连接 / 断开
  // =====================================================================

  connect(url = 'http://localhost:3001'): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(url, { transports: ['websocket', 'polling'] });
        this.socket.on('connect', () => {
          console.log('[net] connected, socket.id=', this.socket?.id);
          this.bindEvents();
          resolve();
        });
        this.socket.on('connect_error', (err) => {
          console.error('[net] connect_error', err.message);
          reject(err);
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // =====================================================================
  // 公共 API：创建/加入房间
  // =====================================================================

  createRoom(name: string): Promise<CreateRoomResponse> {
    return new Promise((resolve, reject) => {
      if (!this.socket) return reject(new Error('未连接'));
      const payload: CreateRoomPayload = { name };
      this.socket.emit('room:create', payload, (resp: CreateRoomResponse) => {
        console.log('[net] room created:', resp.roomCode);
        resolve(resp);
      });
    });
  }

  joinRoom(roomCode: string, name: string): Promise<JoinRoomResponse> {
    return new Promise((resolve, reject) => {
      if (!this.socket) return reject(new Error('未连接'));
      const payload: JoinRoomPayload = { roomCode, name };
      this.socket.emit('room:join', payload, (resp: JoinRoomResponse) => {
        if (!resp.success) {
          reject(new Error(resp.error || '加入失败'));
        } else {
          resolve(resp);
        }
      });
    });
  }

  leaveRoom() {
    this.socket?.emit('room:leave');
  }

  restartGame() {
    this.socket?.emit('game:restart');
  }

  // =====================================================================
  // 公共 API：GameCore 上报事件
  // =====================================================================

  // 本地玩家位置上报 - 每 50ms 聚合一次，避免发送过于频繁
  broadcastMove(position: Vec3) {
    if (!this.socket) return;
    this.moveBuffer = { ...position };
    const now = performance.now();
    if (now - this.lastMoveEmitTs >= NetworkManager.MOVE_EMIT_INTERVAL) {
      this.flushMove();
    }
  }

  // 每帧由 GameCore 调用，检查是否需要上报
  tick() {
    const now = performance.now();
    if (this.moveBuffer && now - this.lastMoveEmitTs >= NetworkManager.MOVE_EMIT_INTERVAL) {
      this.flushMove();
    }
  }

  private flushMove() {
    if (!this.socket || !this.moveBuffer) return;
    const payload: PlayerMovePayload = {
      position: this.moveBuffer,
      timestamp: Date.now(),
    };
    const emit = () => this.socket!.emit('player:move', payload);
    this.simulateLatency(emit);
    this.lastMoveEmitTs = performance.now();
    this.moveBuffer = null;
  }

  // 通知服务器：拾取了金币
  notifyCoinCollect(coinId: string) {
    if (!this.socket) return;
    const payload: CoinCollectPayload = { coinId, timestamp: Date.now() };
    this.simulateLatency(() => this.socket!.emit('coin:collect', payload));
  }

  // 通知服务器：触发陷阱
  notifyTrapTrigger(trapId: string) {
    if (!this.socket) return;
    const payload: TrapTriggerPayload = { trapId, timestamp: Date.now() };
    this.simulateLatency(() => this.socket!.emit('trap:trigger', payload));
  }

  // =====================================================================
  // 调试：模拟网络延迟（用于性能验证）
  // =====================================================================

  setSimulatedLatency(ms: number) {
    this.simulatedLatencyMs = Math.max(0, ms);
    console.log(`[net] 模拟延迟设置为 ${this.simulatedLatencyMs}ms`);
  }

  private simulateLatency(fn: () => void) {
    if (this.simulatedLatencyMs > 0) {
      setTimeout(fn, this.simulatedLatencyMs);
    } else {
      fn();
    }
  }

  // =====================================================================
  // 绑定 S->C 事件
  // =====================================================================

  private bindEvents() {
    if (!this.socket) return;

    this.socket.on('game:state', (msg: GameStateBroadcast) => {
      this.simulateLatency(() =>
        this.callbacks.onGameState(msg.state, msg.serverTimestamp)
      );
    });

    this.socket.on('player:join', (msg: PlayerJoinBroadcast) => {
      this.simulateLatency(() => this.callbacks.onPlayerJoin(msg));
    });

    this.socket.on('player:leave', (msg: PlayerLeaveBroadcast) => {
      this.simulateLatency(() => this.callbacks.onPlayerLeave(msg.playerId));
    });

    // 关键：其他玩家位置广播，携带 velocity 用于三次贝塞尔插值
    this.socket.on('player:move', (msg: PlayerMoveBroadcast) => {
      this.simulateLatency(() => this.callbacks.onPlayerMove(msg));
    });

    this.socket.on('coin:collect', (msg: CoinCollectBroadcast) => {
      this.simulateLatency(() => this.callbacks.onCoinCollect(msg));
    });

    this.socket.on('coin:respawn', (msg: CoinRespawnBroadcast) => {
      this.simulateLatency(() => this.callbacks.onCoinRespawn(msg));
    });

    this.socket.on('trap:trigger', (msg: TrapTriggerBroadcast) => {
      this.simulateLatency(() => this.callbacks.onTrapTrigger(msg));
    });

    this.socket.on('game:start', (msg: GameStartBroadcast) => {
      this.simulateLatency(() => this.callbacks.onGameStart(msg));
    });

    this.socket.on('game:end', (msg: GameEndBroadcast) => {
      this.simulateLatency(() => this.callbacks.onGameEnd(msg.leaderboard));
    });

    this.socket.on('leaderboard:update', (msg: LeaderboardBroadcast) => {
      this.simulateLatency(() =>
        this.callbacks.onLeaderboardUpdate(msg.leaderboard, msg.remainingSec)
      );
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('[net] 断开连接：', reason);
    });
  }
}
