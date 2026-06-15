// =============================================================================
// 服务端入口 - Express + Socket.IO
//
// 数据流向总览：
//   客户端(NetworkManager)
//         │
//         │  [HTTP/WS on :3001]
//         ▼
//   本模块 (server/index.ts)
//         │
//         ├── rooms Map<roomCode, Room>  // 内存房间状态
//         │     └── 每个 Room 包含: players, coins, traps, phase, timers
//         │
//         └── Socket.IO 广播 (to(roomCode))
//               ├── player:move       -> 其他玩家位置更新
//               ├── coin:collect      -> 金币拾取
//               ├── coin:respawn      -> 金币重生
//               ├── trap:trigger      -> 陷阱触发
//               ├── leaderboard:update -> 排行榜
//               ├── game:start / game:end
//               └── player:join / player:leave
// =============================================================================

import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import {
  GameState, PlayerState, CoinState, TrapState, LeaderboardEntry, Vec3,
  RABBIT_COLORS, RabbitColor,
  CreateRoomPayload, CreateRoomResponse,
  JoinRoomPayload, JoinRoomResponse,
  PlayerMovePayload, PlayerMoveBroadcast,
  CoinCollectPayload, CoinCollectBroadcast, CoinRespawnBroadcast,
  TrapTriggerPayload, TrapTriggerBroadcast,
  GameStartBroadcast, GameEndBroadcast,
  PlayerJoinBroadcast, PlayerLeaveBroadcast,
  LeaderboardBroadcast, GameStateBroadcast,
} from '../src/shared/types';

const PORT = 3001;
const GAME_DURATION_SEC = 90;
const MAX_PLAYERS = 4;
const COIN_TOTAL = 20;
const TRAP_TOTAL = 5;
const MAZE_SIZE = 30; // 迷宫尺寸（正方形，单位：3D场景单位）

// =====================================================================
// 房间内存状态
// =====================================================================
interface Room {
  code: string;
  phase: 'waiting' | 'playing' | 'ended';
  startTime: number;
  durationSec: number;
  endTimer?: NodeJS.Timeout;
  tickTimer?: NodeJS.Timeout;
  players: Map<string, PlayerState>;   // socket.id -> PlayerState
  coins: CoinState[];
  traps: TrapState[];
}

const rooms: Map<string, Room> = new Map();

// =====================================================================
// 工具函数
// =====================================================================

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  do {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
  } while (rooms.has(code));
  return code;
}

function randomPositionInMaze(y = 0.5): Vec3 {
  // 在迷宫范围内随机一个位置，避开正中心（出生点重叠防护不足，简单起见接受重叠）
  const half = MAZE_SIZE / 2 - 2;
  return {
    x: (Math.random() * 2 - 1) * half,
    y,
    z: (Math.random() * 2 - 1) * half,
  };
}

function dist2D(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

function pickUnusedColor(room: Room): RabbitColor {
  const used = new Set([...room.players.values()].map(p => p.color));
  const available = RABBIT_COLORS.filter(c => !used.has(c));
  return available.length > 0
    ? available[Math.floor(Math.random() * available.length)]
    : RABBIT_COLORS[Math.floor(Math.random() * RABBIT_COLORS.length)];
}

function computeLeaderboard(room: Room): LeaderboardEntry[] {
  const arr = [...room.players.values()].map(p => ({
    playerId: p.id,
    name: p.name,
    color: p.color,
    score: p.score,
    deaths: p.deaths,
  }));
  arr.sort((a, b) => (b.score - a.score) || (a.deaths - b.deaths));
  return arr.map((e, i) => ({ ...e, rank: i + 1 }));
}

function buildGameState(room: Room): GameState {
  const players: Record<string, PlayerState> = {};
  room.players.forEach((p, id) => { players[id] = p; });
  const remaining = room.phase === 'playing'
    ? Math.max(0, Math.ceil((room.startTime + room.durationSec * 1000 - Date.now()) / 1000))
    : room.durationSec;
  return {
    roomCode: room.code,
    phase: room.phase,
    startTime: room.startTime,
    durationSec: room.durationSec,
    remainingSec: remaining,
    players,
    coins: room.coins,
    traps: room.traps,
    leaderboard: computeLeaderboard(room),
  };
}

// =====================================================================
// 生成金币和陷阱
// =====================================================================

function generateCoins(): CoinState[] {
  const coins: CoinState[] = [];
  for (let i = 0; i < COIN_TOTAL; i++) {
    coins.push({
      id: uuidv4(),
      position: randomPositionInMaze(0.8),
      collected: false,
      respawnAt: 0,
    });
  }
  return coins;
}

function generateTraps(): TrapState[] {
  const traps: TrapState[] = [];
  for (let i = 0; i < TRAP_TOTAL; i++) {
    traps.push({
      id: uuidv4(),
      position: randomPositionInMaze(0.05),
      size: { x: 2, y: 0.1, z: 2 },
    });
  }
  return traps;
}

// =====================================================================
// 创建房间
// =====================================================================

function createRoom(): Room {
  const room: Room = {
    code: generateRoomCode(),
    phase: 'waiting',
    startTime: 0,
    durationSec: GAME_DURATION_SEC,
    players: new Map(),
    coins: generateCoins(),
    traps: generateTraps(),
  };
  rooms.set(room.code, room);
  return room;
}

// =====================================================================
// 游戏开始 / 结束逻辑
// =====================================================================

function tryStartGame(room: Room, io: Server) {
  if (room.phase !== 'waiting') return;
  if (room.players.size < 2) return; // 至少2人开始
  room.phase = 'playing';
  room.startTime = Date.now();
  room.durationSec = GAME_DURATION_SEC;

  const startMsg: GameStartBroadcast = {
    startTime: room.startTime,
    durationSec: room.durationSec,
  };
  io.to(room.code).emit('game:start', startMsg);

  // 定时器：每秒广播排行榜 + 剩余时间
  room.tickTimer = setInterval(() => {
    const remaining = Math.max(0, Math.ceil(
      (room.startTime + room.durationSec * 1000 - Date.now()) / 1000
    ));
    const lbMsg: LeaderboardBroadcast = {
      leaderboard: computeLeaderboard(room),
      remainingSec: remaining,
    };
    io.to(room.code).emit('leaderboard:update', lbMsg);

    if (remaining <= 0) endGame(room, io);
    else {
      // 所有金币收集完也可以提前结束，但题目未强制
      const allCollected = room.coins.every(c => c.collected);
      if (allCollected) endGame(room, io);
    }
  }, 1000);

  // 主计时器兜底
  room.endTimer = setTimeout(() => endGame(room, io), GAME_DURATION_SEC * 1000 + 2000);
}

function endGame(room: Room, io: Server) {
  if (room.phase !== 'playing') return;
  room.phase = 'ended';
  if (room.tickTimer) { clearInterval(room.tickTimer); room.tickTimer = undefined; }
  if (room.endTimer) { clearTimeout(room.endTimer); room.endTimer = undefined; }

  const msg: GameEndBroadcast = { leaderboard: computeLeaderboard(room) };
  io.to(room.code).emit('game:end', msg);
}

function resetRoomForRestart(room: Room) {
  room.phase = 'waiting';
  room.startTime = 0;
  room.coins = generateCoins();
  room.traps = generateTraps();
  // 重置玩家分数
  room.players.forEach((p) => {
    p.score = 0;
    p.deaths = 0;
    p.isRooted = false;
    p.rootedUntil = 0;
    p.position = randomPositionInMaze(0.5);
  });
}

// =====================================================================
// Socket 处理函数
// =====================================================================

function setupSocket(socket: Socket, io: Server) {
  let currentRoomCode: string | null = null;

  // --- C->S: 创建房间 -----------------------------------------------
  // NetworkManager.createRoom() -> socket.emit('room:create')
  socket.on('room:create', (payload: CreateRoomPayload, cb: (r: CreateRoomResponse) => void) => {
    const room = createRoom();
    const color = pickUnusedColor(room);
    const player: PlayerState = {
      id: socket.id,
      name: payload.name || '匿名兔子',
      color,
      position: randomPositionInMaze(0.5),
      score: 0,
      deaths: 0,
      isRooted: false,
      rootedUntil: 0,
      lastUpdate: Date.now(),
    };
    room.players.set(socket.id, player);
    socket.join(room.code);
    currentRoomCode = room.code;
    cb({ roomCode: room.code, playerId: socket.id });
  });

  // --- C->S: 加入房间 -----------------------------------------------
  socket.on('room:join', (payload: JoinRoomPayload, cb: (r: JoinRoomResponse) => void) => {
    const room = rooms.get(payload.roomCode.toUpperCase());
    if (!room) { cb({ success: false, error: '房间不存在' }); return; }
    if (room.players.size >= MAX_PLAYERS) { cb({ success: false, error: '房间已满' }); return; }

    const color = pickUnusedColor(room);
    const player: PlayerState = {
      id: socket.id,
      name: payload.name || '匿名兔子',
      color,
      position: randomPositionInMaze(0.5),
      score: 0,
      deaths: 0,
      isRooted: false,
      rootedUntil: 0,
      lastUpdate: Date.now(),
    };
    room.players.set(socket.id, player);
    socket.join(room.code);
    currentRoomCode = room.code;

    cb({ success: true, gameState: buildGameState(room), playerId: socket.id });

    // 广播给其他人：有玩家加入
    const joinMsg: PlayerJoinBroadcast = { player };
    socket.to(room.code).emit('player:join', joinMsg);

    // 尝试自动开始
    tryStartGame(room, io);
  });

  // --- C->S: 位置更新 (每 ~50ms 上报) --------------------------------
  // GameCore 键盘输入 -> 本地预测位置 -> NetworkManager.broadcastMove()
  // -> socket.emit('player:move')
  socket.on('player:move', (payload: PlayerMovePayload) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;
    const player = room.players.get(socket.id);
    if (!player) return;
    if (player.isRooted && Date.now() < player.rootedUntil) return; // 被定身，忽略

    // 简单本地速度估算：用当前位置与上次位置计算
    const prev = player.position;
    const dt = Math.max(1, Date.now() - player.lastUpdate) / 1000;
    const velocity: Vec3 = {
      x: (payload.position.x - prev.x) / dt,
      y: (payload.position.y - prev.y) / dt,
      z: (payload.position.z - prev.z) / dt,
    };

    player.position = { ...payload.position };
    player.lastUpdate = Date.now();

    // 广播给其他玩家（附带速度用于三次贝塞尔曲线控制点）
    const moveMsg: PlayerMoveBroadcast = {
      playerId: socket.id,
      position: { ...player.position },
      timestamp: Date.now(),
      velocity,
    };
    socket.to(currentRoomCode).emit('player:move', moveMsg);
  });

  // --- C->S: 拾取金币 -----------------------------------------------
  // GameCore 碰撞检测 -> NetworkManager.notifyCoinCollect()
  // -> socket.emit('coin:collect')
  socket.on('coin:collect', (payload: CoinCollectPayload) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;
    const player = room.players.get(socket.id);
    if (!player) return;

    const coin = room.coins.find(c => c.id === payload.coinId);
    if (!coin || coin.collected) return;

    // 距离验证：避免作弊（简单校验）
    if (dist2D(player.position, coin.position) > 1.5) return;

    coin.collected = true;
    const scoreGain = 10;
    player.score += scoreGain;
    coin.respawnAt = Date.now() + 5000;

    // 生成新的重生位置
    const respawnPosition = randomPositionInMaze(0.8);

    const collectMsg: CoinCollectBroadcast = {
      coinId: coin.id,
      playerId: socket.id,
      scoreGain,
      respawnPosition,
      respawnAt: coin.respawnAt,
    };
    io.to(currentRoomCode).emit('coin:collect', collectMsg);

    // 5 秒后重生
    setTimeout(() => {
      const r = rooms.get(currentRoomCode!);
      if (!r) return;
      const cc = r.coins.find(c => c.id === coin.id);
      if (!cc) return;
      cc.collected = false;
      cc.position = respawnPosition;
      const respawnMsg: CoinRespawnBroadcast = { coinId: cc.id, position: cc.position };
      io.to(currentRoomCode!).emit('coin:respawn', respawnMsg);
    }, 5000);
  });

  // --- C->S: 触发陷阱 -----------------------------------------------
  // GameCore 碰撞检测 -> NetworkManager.notifyTrapTrigger()
  socket.on('trap:trigger', (payload: TrapTriggerPayload) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;
    const player = room.players.get(socket.id);
    if (!player) return;
    if (player.isRooted && Date.now() < player.rootedUntil) return;

    const trap = room.traps.find(t => t.id === payload.trapId);
    if (!trap) return;

    // 距离/范围校验
    const dx = Math.abs(player.position.x - trap.position.x);
    const dz = Math.abs(player.position.z - trap.position.z);
    if (dx > trap.size.x / 2 + 0.5 || dz > trap.size.z / 2 + 0.5) return;

    player.isRooted = true;
    player.deaths += 1;
    player.rootedUntil = Date.now() + 2000;

    const trapMsg: TrapTriggerBroadcast = {
      playerId: socket.id,
      rootedUntil: player.rootedUntil,
      deaths: player.deaths,
    };
    io.to(currentRoomCode).emit('trap:trigger', trapMsg);
  });

  // --- C->S: 再来一局 -----------------------------------------------
  socket.on('game:restart', () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;
    if (room.phase !== 'ended') return;
    resetRoomForRestart(room);
    // 广播新的游戏状态
    io.to(currentRoomCode).emit('game:state', {
      state: buildGameState(room),
      serverTimestamp: Date.now(),
    } as GameStateBroadcast);
    tryStartGame(room, io);
  });

  // --- C->S: 返回大厅 -----------------------------------------------
  socket.on('room:leave', () => {
    handleDisconnect();
  });

  // --- 断开连接 -----------------------------------------------------
  function handleDisconnect() {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (room) {
      room.players.delete(socket.id);
      const leaveMsg: PlayerLeaveBroadcast = { playerId: socket.id };
      socket.to(currentRoomCode).emit('player:leave', leaveMsg);
      // 空房间 30 秒后销毁
      if (room.players.size === 0) {
        setTimeout(() => {
          const r = rooms.get(currentRoomCode!);
          if (r && r.players.size === 0) {
            if (r.tickTimer) clearInterval(r.tickTimer);
            if (r.endTimer) clearTimeout(r.endTimer);
            rooms.delete(currentRoomCode!);
          }
        }, 30000);
      }
    }
    currentRoomCode = null;
  }
  socket.on('disconnect', handleDisconnect);
}

// =====================================================================
// 启动服务器
// =====================================================================

function main() {
  const app = express();
  app.use(cors());
  app.get('/health', (_req, res) => { res.json({ ok: true, rooms: rooms.size }); });

  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: '*' },
  });

  io.on('connection', (socket: Socket) => {
    setupSocket(socket, io);
  });

  httpServer.listen(PORT, () => {
    console.log(`[server] RabbitRush server listening on :${PORT}`);
  });
}

main();
