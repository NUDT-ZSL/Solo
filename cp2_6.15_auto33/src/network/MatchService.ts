import type { Request, Response } from 'express';
import sqlite3 from 'sqlite3';
import path from 'path';
import type { LeaderboardEntry, PlayerId } from '../shared/types';
import { GameEngine } from '../game/GameEngine';
import type { WebSocket } from 'ws';

const dbPath = path.join(process.cwd(), 'game.db');
const db = new sqlite3.Database(dbPath);

const MATCH_TIMEOUT_MS = 60000;
const MAX_WAIT_TIME_MS = 30000;
const RANK_MATCH_THRESHOLD = 5;

interface MatchQueueItem {
  queueId: string;
  playerName: string;
  createdAt: number;
  rank: number;
}

interface GameInstance {
  gameId: string;
  engine: GameEngine;
  players: { red?: string; blue?: string };
  createdAt: number;
}

interface PlayerRank {
  name: string;
  wins: number;
  losses: number;
  rank: number;
}

let matchQueue: MatchQueueItem[] = [];
const games = new Map<string, GameInstance>();
const playerRanks = new Map<string, PlayerRank>();

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

    setTimeout(() => {
      refreshPlayerRanks().then(resolve).catch(reject);
    }, 100);
  });
}

async function refreshPlayerRanks() {
  return new Promise<void>((resolve, reject) => {
    db.all(
      `SELECT name, wins, losses FROM players ORDER BY wins DESC,
        CASE WHEN wins + losses > 0 THEN CAST(wins AS FLOAT) / (wins + losses) ELSE 0 END DESC`,
      [],
      (err, rows: any[]) => {
        if (err) {
          reject(err);
          return;
        }
        playerRanks.clear();
        rows.forEach((row, index) => {
          playerRanks.set(row.name, {
            name: row.name,
            wins: row.wins,
            losses: row.losses,
            rank: index + 1,
          });
        });
        resolve();
      }
    );
  });
}

function getPlayerRank(playerName: string): number {
  return playerRanks.get(playerName)?.rank || playerRanks.size + 1;
}

function findMatchingOpponent(player: MatchQueueItem): MatchQueueItem | null {
  const now = Date.now();

  let bestMatch: MatchQueueItem | null = null;
  let bestRankDiff = Infinity;

  for (const opponent of matchQueue) {
    if (opponent.queueId === player.queueId) continue;

    const waitTime = now - opponent.createdAt;
    const rankDiff = Math.abs(player.rank - opponent.rank);

    if (waitTime > MAX_WAIT_TIME_MS || rankDiff <= RANK_MATCH_THRESHOLD) {
      if (rankDiff < bestRankDiff) {
        bestRankDiff = rankDiff;
        bestMatch = opponent;
      }
    }
  }

  return bestMatch;
}

export function joinMatchQueue(playerName: string): {
  queueId: string;
  status: 'waiting' | 'matched' | 'failed';
  gameId?: string;
  playerId?: PlayerId;
} {
  const existing = matchQueue.find(q => q.playerName === playerName);
  if (existing) {
    return { queueId: existing.queueId, status: 'waiting' };
  }

  const rank = getPlayerRank(playerName);
  const queueItem: MatchQueueItem = {
    queueId: `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    playerName,
    createdAt: Date.now(),
    rank,
  };

  const opponent = findMatchingOpponent(queueItem);
  if (opponent) {
    matchQueue = matchQueue.filter(q => q.queueId !== opponent.queueId);

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

  matchQueue.push(queueItem);
  return { queueId: queueItem.queueId, status: 'waiting' };
}

export function getMatchStatus(queueId: string): {
  status: 'waiting' | 'matched' | 'failed';
  gameId?: string;
  playerId?: PlayerId;
} {
  const item = matchQueue.find(q => q.queueId === queueId);
  if (item) {
    const waitTime = Date.now() - item.createdAt;
    if (waitTime > MATCH_TIMEOUT_MS) {
      matchQueue = matchQueue.filter(q => q.queueId !== queueId);
      return { status: 'failed' };
    }

    const opponent = findMatchingOpponent(item);
    if (opponent) {
      matchQueue = matchQueue.filter(q => q.queueId !== queueId && q.queueId !== opponent.queueId);

      const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const engine = new GameEngine(gameId);
      games.set(gameId, {
        gameId,
        engine,
        players: { red: opponent.playerName, blue: item.playerName },
        createdAt: Date.now(),
      });

      engine.setOnGameOver((winner) => {
        handleGameOver(gameId, winner);
      });

      return { status: 'matched', gameId, playerId: 'blue' };
    }

    return { status: 'waiting' };
  }

  if (queueId.startsWith('matched_')) {
    const gameId = queueId.replace('matched_', '');
    if (games.has(gameId)) {
      return { status: 'matched', gameId, playerId: 'blue' };
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

export async function recordMatchResult(
  gameId: string,
  playerName: string,
  won: boolean,
  duration: number
): Promise<void> {
  await ensurePlayerExists(playerName);

  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(
        'INSERT INTO match_results (game_id, player_name, won, duration_seconds) VALUES (?, ?, ?, ?)',
        [gameId, playerName, won ? 1 : 0, duration],
        (err) => {
          if (err) reject(err);
        }
      );

      const field = won ? 'wins' : 'losses';
      db.run(
        `UPDATE players SET ${field} = ${field} + 1 WHERE name = ?`,
        [playerName],
        (err) => {
          if (err) {
            reject(err);
          } else {
            refreshPlayerRanks().then(resolve).catch(reject);
          }
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
          else {
            playerRanks.set(name, { name, wins: 0, losses: 0, rank: playerRanks.size + 1 });
            resolve();
          }
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

export function getPlayerStats(name: string): Promise<{
  playerName: string;
  wins: number;
  losses: number;
  winRate: number;
  rank: number;
} | null> {
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
            rank: getPlayerRank(name),
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

  const results: Promise<void>[] = [];
  if (game.players.red) {
    results.push(recordMatchResult(gameId, game.players.red, winner === 'red', duration));
  }
  if (game.players.blue) {
    results.push(recordMatchResult(gameId, game.players.blue, winner === 'blue', duration));
  }

  Promise.all(results).catch(console.error);

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
  const initialLength = matchQueue.length;
  matchQueue = matchQueue.filter(q => now - q.createdAt < MATCH_TIMEOUT_MS);
  if (matchQueue.length < initialLength) {
    console.log(`Removed ${initialLength - matchQueue.length} timed out players from match queue`);
  }
}, 10000);

export function handleJoinMatch(req: Request, res: Response) {
  const { playerName } = req.body;
  if (!playerName || typeof playerName !== 'string') {
    res.status(400).json({ error: 'Invalid playerName' });
    return;
  }
  const result = joinMatchQueue(playerName.trim());
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
