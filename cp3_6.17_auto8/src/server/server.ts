import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { GameStateManager } from './gameState';
import { QueueHandler } from './queueHandler';
import { AIPlayerServer } from './aiPlayer';
import { GameAction, ServerMessage, GameState } from '../shared/types';

const PORT = process.env.PORT || 3001;

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const gameStateManager = new GameStateManager();
const queueHandler = new QueueHandler();
const aiPlayer = new AIPlayerServer(gameStateManager, 'ai_player_' + uuidv4().slice(0, 8));

let playerWs: WebSocket | null = null;
let playerId: string | null = null;
let playerName: string = '玩家';

queueHandler.setOnProcessAction((action: GameAction) => {
  const validation = gameStateManager.validateAction(action);
  
  if (!validation.valid) {
    return { valid: false, reason: validation.reason };
  }
  
  const newState = gameStateManager.processAction(action);
  
  return { valid: true, state: newState };
});

queueHandler.setOnStateChange((state: GameState) => {
  broadcastStateUpdate(state);
  
  if (state.gameOver) {
    broadcastGameOver(state.winner!);
    aiPlayer.disable();
  } else {
    aiPlayer.checkTurn();
  }
});

aiPlayer.setOnActionReady((action: GameAction) => {
  console.log('[Server] AI action:', action.type, action.cardId);
  
  const validation = gameStateManager.validateAction(action);
  
  if (validation.valid) {
    const newState = gameStateManager.processAction(action);
    if (newState) {
      broadcastStateUpdate(newState);
      
      if (newState.gameOver) {
        broadcastGameOver(newState.winner!);
        aiPlayer.disable();
      }
    }
  }
});

function broadcastStateUpdate(state: GameState): void {
  const message: ServerMessage = {
    type: 'state_update',
    state,
  };
  
  if (playerWs && playerWs.readyState === WebSocket.OPEN) {
    playerWs.send(JSON.stringify(message));
  }
}

function broadcastGameOver(winner: string): void {
  const message: ServerMessage = {
    type: 'game_over',
    winner,
  };
  
  if (playerWs && playerWs.readyState === WebSocket.OPEN) {
    playerWs.send(JSON.stringify(message));
  }
}

function startGame(): void {
  if (!playerId) return;
  
  const aiId = aiPlayer.getPlayerId();
  const state = gameStateManager.createNewGame(playerId, playerName, aiId, 'AI对手');
  
  const startMessage: ServerMessage = {
    type: 'game_start',
    state,
  };
  
  if (playerWs && playerWs.readyState === WebSocket.OPEN) {
    playerWs.send(JSON.stringify(startMessage));
  }
  
  aiPlayer.enable();
  
  console.log('[Server] Game started');
}

function restartGame(): void {
  gameStateManager.reset();
  queueHandler.reset();
  aiPlayer.reset();
  
  startGame();
}

wss.on('connection', (ws: WebSocket) => {
  console.log('[Server] New WebSocket connection');
  
  ws.on('message', (data: string) => {
    try {
      const message = JSON.parse(data);
      handleMessage(ws, message);
    } catch (error) {
      console.error('[Server] Failed to parse message:', error);
    }
  });
  
  ws.on('close', () => {
    console.log('[Server] WebSocket connection closed');
    if (ws === playerWs) {
      playerWs = null;
      playerId = null;
      aiPlayer.disable();
      gameStateManager.reset();
      queueHandler.reset();
    }
  });
  
  ws.on('error', (error) => {
    console.error('[Server] WebSocket error:', error);
  });
});

function handleMessage(ws: WebSocket, message: any): void {
  console.log('[Server] Received message:', message.type);
  
  switch (message.type) {
    case 'join':
      handleJoin(ws, message);
      break;
      
    case 'play_card':
    case 'end_turn':
      handleGameAction(ws, message);
      break;
      
    case 'restart':
      handleRestart(ws);
      break;
      
    default:
      console.log('[Server] Unknown message type:', message.type);
  }
}

function handleJoin(ws: WebSocket, message: any): void {
  if (playerWs && playerWs !== ws) {
    ws.send(JSON.stringify({
      type: 'error',
      message: '游戏中已有玩家',
    }));
    return;
  }
  
  playerWs = ws;
  playerId = message.playerId || 'player_' + uuidv4().slice(0, 8);
  playerName = message.playerName || '玩家';
  
  console.log(`[Server] Player joined: ${playerName} (${playerId})`);
  
  setTimeout(() => {
    startGame();
  }, 500);
}

function handleGameAction(ws: WebSocket, action: GameAction): void {
  if (ws !== playerWs) {
    return;
  }
  
  if (!gameStateManager.getState()) {
    return;
  }
  
  queueHandler.enqueue(action, ws);
}

function handleRestart(ws: WebSocket): void {
  if (ws !== playerWs) {
    return;
  }
  
  console.log('[Server] Restarting game');
  restartGame();
}

app.get('/api/status', (req, res) => {
  const state = gameStateManager.getState();
  res.json({
    status: state ? 'playing' : 'waiting',
    players: state ? Object.keys(state.players).length : 0,
    queueSize: queueHandler.getQueueSize(),
  });
});

app.get('/api/state', (req, res) => {
  const state = gameStateManager.getState();
  if (state) {
    res.json(state);
  } else {
    res.status(404).json({ error: 'No game in progress' });
  }
});

server.listen(PORT, () => {
  console.log(`[Server] Server running on port ${PORT}`);
  console.log(`[Server] WebSocket server ready`);
});

export { server, gameStateManager, queueHandler, aiPlayer };
