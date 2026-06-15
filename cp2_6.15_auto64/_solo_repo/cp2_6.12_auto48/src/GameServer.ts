import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import {
  PlayerState,
  GemState,
  ServerState,
  PlayerInput,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  GROUND_Y,
  PLAYER_SIZE,
  MOVE_SPEED,
  SPRINT_MULTIPLIER,
  JUMP_VELOCITY,
  GRAVITY,
  GEM_RADIUS,
  GEM_COLLECT_DIST,
  SERVER_TICK_MS,
  GEM_SPAWN_INTERVAL_MS,
  MAX_PLAYERS,
  MAX_GEMS,
  PLAYER_COLORS,
  PLAYER_NAMES,
} from './types.js';

const app = express();
app.use(cors());
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

const players: Record<string, PlayerState> = {};
const gemMap = new Map<string, GemState>();
const gemOrder: string[] = [];
const inputs: Record<string, PlayerInput> = {};
let usedColors = new Set<string>();
let usedNames = new Set<string>();
const INPUT_TIMESTAMP_TOLERANCE_MS = 5000;

function getRandomColor(): string {
  const available = PLAYER_COLORS.filter(c => !usedColors.has(c));
  if (available.length === 0) {
    return PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)];
  }
  const color = available[Math.floor(Math.random() * available.length)];
  usedColors.add(color);
  return color;
}

function getRandomName(): string {
  const available = PLAYER_NAMES.filter(n => !usedNames.has(n));
  if (available.length === 0) {
    return 'Player-' + Math.floor(Math.random() * 9999);
  }
  const name = available[Math.floor(Math.random() * available.length)];
  usedNames.add(name);
  return name;
}

function createPlayer(id: string): PlayerState {
  const color = getRandomColor();
  const name = getRandomName();
  return {
    id,
    name,
    color,
    x: 100 + Math.random() * (CANVAS_WIDTH - 200),
    y: GROUND_Y - PLAYER_SIZE / 2,
    vx: 0,
    vy: 0,
    score: 0,
    connected: true,
    isJumping: false,
    isSprinting: false,
    facingRight: true,
    spawnTime: Date.now(),
  };
}

function spawnGem() {
  if (gemMap.size >= MAX_GEMS) {
    const oldestId = gemOrder.shift();
    if (oldestId) {
      gemMap.delete(oldestId);
    }
  }
  const id = uuidv4();
  const gem: GemState = {
    id,
    x: 40 + Math.random() * (CANVAS_WIDTH - 80),
    y: 100 + Math.random() * (GROUND_Y - 140),
    spawnTime: Date.now(),
  };
  gemMap.set(id, gem);
  gemOrder.push(id);
}

function processInputs() {
  const dt = SERVER_TICK_MS / 1000;

  for (const id in players) {
    const player = players[id];
    if (!player.connected) continue;

    const input = inputs[id];
    if (!input) {
      player.vx = 0;
      continue;
    }

    let speed = MOVE_SPEED;
    player.isSprinting = input.shift;
    if (input.shift) {
      speed *= SPRINT_MULTIPLIER;
    }

    let vx = 0;
    if (input.a) vx -= speed;
    if (input.d) vx += speed;
    player.vx = vx;

    if (vx > 0) player.facingRight = true;
    else if (vx < 0) player.facingRight = false;

    if (input.space && !player.isJumping) {
      player.vy = JUMP_VELOCITY;
      player.isJumping = true;
    }

    player.x += player.vx * dt;
    player.vy += GRAVITY * dt;
    player.y += player.vy * dt;

    if (player.y >= GROUND_Y - PLAYER_SIZE / 2) {
      player.y = GROUND_Y - PLAYER_SIZE / 2;
      player.vy = 0;
      player.isJumping = false;
    }

    player.x = Math.max(PLAYER_SIZE / 2, Math.min(CANVAS_WIDTH - PLAYER_SIZE / 2, player.x));

    for (const [gemId, gem] of gemMap) {
      const dx = player.x - gem.x;
      const dy = player.y - gem.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < GEM_COLLECT_DIST) {
        player.score++;
        gemMap.delete(gemId);
        const idx = gemOrder.indexOf(gemId);
        if (idx >= 0) gemOrder.splice(idx, 1);
        io.emit('gemCollected', { gemId, playerId: id, x: gem.x, y: gem.y });
      }
    }
  }
}

function getFullState(): ServerState {
  const gemsArr: GemState[] = [];
  for (const gem of gemMap.values()) {
    gemsArr.push({ id: gem.id, x: gem.x, y: gem.y, spawnTime: gem.spawnTime });
  }
  return {
    players: JSON.parse(JSON.stringify(players)),
    gems: gemsArr,
    timestamp: Date.now(),
  };
}

io.on('connection', (socket) => {
  if (Object.keys(players).length >= MAX_PLAYERS) {
    socket.emit('roomFull');
    socket.disconnect();
    return;
  }

  const player = createPlayer(socket.id);
  players[socket.id] = player;
  inputs[socket.id] = { w: false, a: false, s: false, d: false, shift: false, space: false, timestamp: Date.now() };

  socket.emit('init', { id: socket.id, state: getFullState() });
  io.emit('playerJoined', { id: socket.id, player });

  socket.on('requestFullState', () => {
    socket.emit('init', { id: socket.id, state: getFullState() });
  });

  socket.on('input', (input: PlayerInput) => {
    if (!players[socket.id]) return;
    const now = Date.now();
    const tsDiff = now - input.timestamp;
    if (Math.abs(tsDiff) > INPUT_TIMESTAMP_TOLERANCE_MS) {
      input.timestamp = now;
    }
    inputs[socket.id] = input;
  });

  socket.on('disconnect', () => {
    const player = players[socket.id];
    if (player) {
      usedColors.delete(player.color);
      usedNames.delete(player.name);
    }
    delete players[socket.id];
    delete inputs[socket.id];
    io.emit('playerLeft', { id: socket.id });
  });
});

setInterval(processInputs, SERVER_TICK_MS);

setInterval(spawnGem, GEM_SPAWN_INTERVAL_MS);

setInterval(() => {
  io.emit('stateUpdate', getFullState());
}, SERVER_TICK_MS);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', players: Object.keys(players).length, gems: gemMap.size });
});

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`Game server running on port ${PORT}`);
});
