import type { Request, Response } from 'express';
import sqlite3 from 'sqlite3';
import path from 'path';
import type { LeaderboardEntry, PlayerId } from '../shared/types';
import { GameEngine } from '../game/GameEngine';
import type { WebSocket } from 'ws';

const dbPath = path.join(process.cwd(), 'game.db');
const db = new sqlite3.Database(dbPath);

interface MatchQueueItem {
  queueId: string;
  playerName: string;
  createdAt: number;
}

interface GameInstance {
  gameId: string;
  engine: GameEngine;
  players: { red?: string; blue?: string };
  createdAt: number;
}

let matchQueue: MatchQueueItem[] = [];
const games = new Map<string, GameInstance>();

export function initDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS players (
        name TEXT PRIMARY KEY,
        wins INTEGER DEFAULT 0,
        losses INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS match_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id TEXT NOT NULL,
        player_name TEXT NOT NULL,
        won BOOLEAN NOT NULL,
        duration_seconds INTEGER NOT NULL,
        played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (player_name) REFERENCES players(name)
      )`);

      db.run('CREATE INDEX IF NOT EXISTS idx_match_results_game_id ON match_results(game_id)', (err) => {
        if (err) reject(err);
      });
      db.run('CREATE INDEX IF NOT EXISTS idx_players_wins ON players(wins DESC)', (err) => {
        if (err) reject(err);
      });
    });

    setTimeout(resolve, 100);
  });
}

export function joinMatchQueue(playerName: string): { queueId: string; status: 'waiting' | 'matched' | 'failed'; gameId?: string; playerId?: PlayerId } {
  if (matchQueue.find(q => q.playerName === playerName)) {
    const existing = matchQueue.find(q => q.playerName === playerName)!;
    return { queueId: existing.queueId, status: 'waiting' };
  }

  if (matchQueue.length === 0) {
    const queueId = `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    matchQueue.push({ queueId, playerName, createdAt: Date.now() });
    return { queueId, status: 'waiting' };
  }

  const opponent = matchQueue.shift()!;
  const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const engine = new GameEngine(gameId);
  games.set(gameId, {
    gameId,
    engine,
    players: { red: opponent.playerName, blue: playerName },
    createdAt: Date.now(),
  });

  engine.setOnGameOver((winner) => {
    handleGameOver(gameId, winner);
  });

  return {
    queueId: `matched_${gameId}`,
    status: 'matched',
    gameId,
    playerId: 'blue',
  };
}

export function getMatchStatus(queueId: string): { status: 'waiting' | 'matched' | 'failed'; gameId?: string; playerId?: PlayerId } {
  const item = matchQueue.find(q => q.queueId === queueId);
  if (item) {
    return { status: 'waiting' };
  }

  if (queueId.startsWith('matched_')) {
    const gameId = queueId.replace('matched_', '');
    if (games.has(gameId)) {
      const game = games.get(gameId)!;
      const playerId = game.players.red ? 'red' : 'blue';
      return { status: 'matched', gameId, playerId };
    }
  }

  return { status: 'failed' };
}

export function cancelMatch(queueId: string): boolean {
  const initialLength = matchQueue.length;
  matchQueue = matchQueue.filter(q => q.queueId !== queueId);
  return matchQueue.length < initialLength;
}

export function getGame(gameId: string): GameInstance | undefined {
  return games.get(gameId);
}

export function addPlayerToGame(gameId: string, playerId: PlayerId, ws: WebSocket, playerName: string) {
  const game = games.get(gameId);
  if (game) {
    game.engine.addPlayer(playerId, ws, playerName);
  }
}

export async function recordMatchResult(gameId: string, playerName: string, won: boolean, duration: number): Promise<void> {
  await ensurePlayerExists(playerName);

  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('INSERT INTO match_results (game_id, player_name, won, duration_seconds) VALUES (?, ?, ?, ?)',
        [gameId, playerName, won ? 1 : 0, duration],
        (err) => {
          if (err) reject(err);
        }
      );

      const field = won ? 'wins' : 'losses';
      db.run(`UPDATE players SET ${field} = ${field} + 1 WHERE name = ?`,
        [playerName],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  });
}

function ensurePlayerExists(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    db.get('SELECT name FROM players WHERE name = ?', [name], (err, row) => {
      if (err) {
        reject(err);
      } else if (!row) {
        db.run('INSERT INTO players (name) VALUES (?)', [name], (err2) => {
          if (err2) reject(err2);
          else resolve();
        });
      } else {
        resolve();
      }
    });
  });
}

export function getLeaderboard(limit: number = 10): Promise<LeaderboardEntry[]> {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT name, wins, losses,
        CASE WHEN wins + losses > 0 THEN CAST(wins AS FLOAT) / (wins + losses) ELSE 0 END as winRate
       FROM players
       ORDER BY wins DESC, winRate DESC
       LIMIT ?`,
      [limit],
      (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const entries: LeaderboardEntry[] = rows.map((row, index) => ({
            rank: index + 1,
            playerName: row.name,
            wins: row.wins,
            losses: row.losses,
            winRate: Math.round(row.winRate * 100) / 100,
          }));
          resolve(entries);
        }
      }
    );
  });
}

export function getPlayerStats(name: string): Promise<{ playerName: string; wins: number; losses: number; winRate: number } | null> {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT name, wins, losses,
        CASE WHEN wins + losses > 0 THEN CAST(wins AS FLOAT) / (wins + losses) ELSE 0 END as winRate
       FROM players
       WHERE name = ?`,
      [name],
      (err, row: any) => {
        if (err) {
          reject(err);
        } else if (!row) {
          resolve(null);
        } else {
          resolve({
            playerName: row.name,
            wins: row.wins,
            losses: row.losses,
            winRate: Math.round(row.winRate * 100) / 100,
          });
        }
      }
    );
  });
}

function handleGameOver(gameId: string, winner: PlayerId | 'draw') {
  const game = games.get(gameId);
  if (!game) return;

  const duration = Math.floor((Date.now() - game.createdAt) / 1000);

  if (game.players.red) {
    recordMatchResult(gameId, game.players.red, winner === 'red', duration).catch(console.error);
  }
  if (game.players.blue) {
    recordMatchResult(gameId, game.players.blue, winner === 'blue', duration).catch(console.error);
  }

  setTimeout(() => {
    const g = games.get(gameId);
    if (g) {
      g.engine.stop();
      games.delete(gameId);
    }
  }, 30000);
}

setInterval(() => {
  const now = Date.now();
  matchQueue = matchQueue.filter(q => now - q.createdAt < 60000);
}, 10000);

export function handleJoinMatch(req: Request, res: Response) {
  const { playerName } = req.body;
  if (!playerName || typeof playerName !== 'string') {
    res.status(400).json({ error: 'Invalid playerName' });
    return;
  }
  const result = joinMatchQueue(playerName);
  res.json(result);
}

export function handleGetMatchStatus(req: Request, res: Response) {
  const { queueId } = req.params;
  const result = getMatchStatus(queueId);
  res.json(result);
}

export function handleCancelMatch(req: Request, res: Response) {
  const { queueId } = req.body;
  const success = cancelMatch(queueId);
  res.json({ success });
}

export function handleMatchResult(req: Request, res: Response) {
  const { gameId, playerName, won, duration } = req.body;
  if (!gameId || !playerName || won === undefined || duration === undefined) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }
  recordMatchResult(gameId, playerName, won, duration)
    .then(() => res.json({ success: true }))
    .catch(err => res.status(500).json({ error: err.message }));
}

export function handleLeaderboard(req: Request, res: Response) {
  const limit = parseInt(req.query.limit as string) || 10;
  getLeaderboard(limit)
    .then(entries => res.json(entries))
    .catch(err => res.status(500).json({ error: err.message }));
}

export function handlePlayerStats(req: Request, res: Response) {
  const { name } = req.params;
  getPlayerStats(name)
    .then(stats => {
      if (!stats) {
        res.status(404).json({ error: 'Player not found' });
      } else {
        res.json(stats);
      }
    })
    .catch(err => res.status(500).json({ error: err.message }));
}
