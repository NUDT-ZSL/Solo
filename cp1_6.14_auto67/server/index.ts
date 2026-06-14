import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import { CommandQueue, DanmakuCommand, GameAction } from './commandQueue.js';

const app = express();
app.use(cors());
app.use(express.json());

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const commandQueue = new CommandQueue();

const viewers = new Map<string, { id: string; name: string; connectedAt: number }>();
let viewerCounter = 0;

const commandPatterns: Record<string, GameAction> = {
  '左移': 'MOVE_LEFT',
  '向左': 'MOVE_LEFT',
  '左走': 'MOVE_LEFT',
  '右移': 'MOVE_RIGHT',
  '向右': 'MOVE_RIGHT',
  '右走': 'MOVE_RIGHT',
  '前进': 'MOVE_FORWARD',
  '向前': 'MOVE_FORWARD',
  '前移': 'MOVE_FORWARD',
  '后退': 'MOVE_BACKWARD',
  '向后': 'MOVE_BACKWARD',
  '后移': 'MOVE_BACKWARD',
  '放火球': 'SKILL_FIREBALL',
  '火球': 'SKILL_FIREBALL',
  '火焰': 'SKILL_FIREBALL',
  '放冰冻': 'SKILL_ICE',
  '冰冻': 'SKILL_ICE',
  '冰晶': 'SKILL_ICE',
  '放护盾': 'SKILL_SHIELD',
  '护盾': 'SKILL_SHIELD',
  '防御': 'SKILL_SHIELD',
  '选项A': 'STORY_A',
  '选A': 'STORY_A',
  'A': 'STORY_A',
  '选项B': 'STORY_B',
  '选B': 'STORY_B',
  'B': 'STORY_B',
  '选项C': 'STORY_C',
  '选C': 'STORY_C',
  'C': 'STORY_C',
};

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function fuzzyMatch(text: string): GameAction | null {
  const normalized = text.trim().toLowerCase();
  if (commandPatterns[normalized]) return commandPatterns[normalized];

  for (const [pattern, action] of Object.entries(commandPatterns)) {
    const maxLen = Math.max(normalized.length, pattern.length);
    if (maxLen === 0) continue;
    const distance = levenshteinDistance(normalized, pattern.toLowerCase());
    const similarity = 1 - distance / maxLen;
    if (similarity >= 0.8) return action;
  }

  return null;
}

function broadcast(data: object) {
  const msg = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

app.post('/api/danmaku', (req, res) => {
  const { text, viewerId } = req.body as { text: string; viewerId?: string };

  if (!text) {
    res.status(400).json({ error: 'Text is required' });
    return;
  }

  const vid = viewerId || `viewer_${++viewerCounter}`;
  if (!viewers.has(vid)) {
    viewers.set(vid, { id: vid, name: `观众${viewerCounter}`, connectedAt: Date.now() });
  }

  const action = fuzzyMatch(text);
  const command = commandQueue.pushCommand({
    text,
    action,
    timestamp: Date.now(),
    viewerId: vid,
  });

  const voteResult = commandQueue.getAggregatedVote();

  broadcast({
    type: 'new_command',
    command,
    voteResult,
    viewerCount: viewers.size,
    recentCommands: commandQueue.getRecentCommands(10),
  });

  res.json({ success: true, command, voteResult });
});

app.get('/api/status', (_req, res) => {
  res.json({
    viewerCount: viewers.size,
    totalCommands: commandQueue.getTotalCount(),
    voteResult: commandQueue.getAggregatedVote(),
    recentCommands: commandQueue.getRecentCommands(10),
  });
});

app.post('/api/reset', (_req, res) => {
  commandQueue.clear();
  viewers.clear();
  viewerCounter = 0;
  broadcast({ type: 'reset' });
  res.json({ success: true });
});

wss.on('connection', (ws) => {
  const viewerId = `viewer_${++viewerCounter}`;
  viewers.set(viewerId, { id: viewerId, name: `观众${viewerCounter}`, connectedAt: Date.now() });

  ws.send(JSON.stringify({
    type: 'init',
    viewerId,
    viewerCount: viewers.size,
    totalCommands: commandQueue.getTotalCount(),
    voteResult: commandQueue.getAggregatedVote(),
    recentCommands: commandQueue.getRecentCommands(10),
  }));

  broadcast({ type: 'viewer_update', viewerCount: viewers.size });

  ws.on('close', () => {
    viewers.delete(viewerId);
    broadcast({ type: 'viewer_update', viewerCount: viewers.size });
  });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'poll') {
        ws.send(JSON.stringify({
          type: 'poll_response',
          viewerCount: viewers.size,
          totalCommands: commandQueue.getTotalCount(),
          voteResult: commandQueue.getAggregatedVote(),
          recentCommands: commandQueue.getRecentCommands(10),
        }));
      }
    } catch {}
  });
});

const PORT = 4000;
server.listen(PORT, () => {
  console.log(`TwitchCortex server running on http://localhost:${PORT}`);
  console.log(`WebSocket available at ws://localhost:${PORT}/ws`);
});
