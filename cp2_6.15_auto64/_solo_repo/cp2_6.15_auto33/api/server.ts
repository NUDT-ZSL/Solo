/**
 * local server entry file, for local development
 */
import { WebSocketServer } from 'ws';
import app from './app.js';
import { getGame, addPlayerToGame } from '../src/network/MatchService.js';
import type { PlayerId } from '../src/shared/types.js';

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`);
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection');
  
  const url = req.url || '/';
  const params = new URLSearchParams(url.split('?')[1]);
  const gameId = params.get('gameId');
  const playerId = params.get('playerId') as PlayerId | null;
  const playerName = params.get('playerName') || '';

  if (gameId && playerId) {
    const game = getGame(gameId);
    if (game) {
      addPlayerToGame(gameId, playerId, ws, playerName);
      console.log(`Player ${playerName} (${playerId}) joined game ${gameId}`);
    } else {
      ws.close(4004, 'Game not found');
    }
  }

  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
  });

  ws.on('close', () => {
    console.log('WebSocket disconnected');
  });
});

console.log('WebSocket server running on ws://localhost:' + PORT);

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received');
  wss.close(() => {
    console.log('WebSocket server closed');
  });
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received');
  wss.close(() => {
    console.log('WebSocket server closed');
  });
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;
