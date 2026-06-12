import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors());
app.use(express.json());

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const db = new Database('brainstorm.db');
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    name TEXT NOT NULL,
    is_host INTEGER DEFAULT 0,
    connected_at INTEGER NOT NULL,
    FOREIGN KEY (room_id) REFERENCES rooms(id)
  );

  CREATE TABLE IF NOT EXISTS thoughts (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    content TEXT NOT NULL,
    author TEXT NOT NULL,
    is_anonymous INTEGER DEFAULT 0,
    score INTEGER DEFAULT 0,
    has_crown INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (room_id) REFERENCES rooms(id)
  );

  CREATE TABLE IF NOT EXISTS votes (
    id TEXT PRIMARY KEY,
    thought_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    vote_type TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (thought_id) REFERENCES thoughts(id)
  );

  CREATE TABLE IF NOT EXISTS vote_sessions (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    duration INTEGER NOT NULL,
    start_time INTEGER NOT NULL,
    end_time INTEGER,
    is_active INTEGER DEFAULT 1,
    FOREIGN KEY (room_id) REFERENCES rooms(id)
  );

  CREATE TABLE IF NOT EXISTS vote_session_options (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    thought_id TEXT NOT NULL,
    votes INTEGER DEFAULT 0,
    FOREIGN KEY (session_id) REFERENCES vote_sessions(id)
  );

  CREATE TABLE IF NOT EXISTS vote_session_voters (
    session_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    thought_id TEXT NOT NULL,
    PRIMARY KEY (session_id, user_id),
    FOREIGN KEY (session_id) REFERENCES vote_sessions(id)
  );

  CREATE INDEX IF NOT EXISTS idx_thoughts_room ON thoughts(room_id);
  CREATE INDEX IF NOT EXISTS idx_users_room ON users(room_id);
  CREATE INDEX IF NOT EXISTS idx_votes_thought ON votes(thought_id);
  CREATE INDEX IF NOT EXISTS idx_vote_sessions_room ON vote_sessions(room_id);
`);

const rooms = new Map();

function getOrCreateRoom(roomId) {
  if (!rooms.has(roomId)) {
    const roomStmt = db.prepare('INSERT OR IGNORE INTO rooms (id, created_at) VALUES (?, ?)');
    roomStmt.run(roomId, Date.now());

    rooms.set(roomId, {
      id: roomId,
      clients: new Map(),
      voteTimer: null,
    });
  }
  return rooms.get(roomId);
}

function broadcast(room, message) {
  const data = JSON.stringify(message);
  for (const client of room.clients.values()) {
    if (client.readyState === 1) {
      client.send(data);
    }
  }
}

function getThoughts(roomId) {
  const thoughts = db
    .prepare('SELECT * FROM thoughts WHERE room_id = ? ORDER BY created_at DESC')
    .all(roomId);

  return thoughts.map((t) => {
    const likes = db
      .prepare("SELECT user_id FROM votes WHERE thought_id = ? AND vote_type = 'like'")
      .all(t.id)
      .map((v) => v.user_id);

    const dislikes = db
      .prepare("SELECT user_id FROM votes WHERE thought_id = ? AND vote_type = 'dislike'")
      .all(t.id)
      .map((v) => v.user_id);

    return {
      id: t.id,
      content: t.content,
      author: t.author,
      isAnonymous: !!t.is_anonymous,
      score: t.score,
      createdAt: t.created_at,
      hasCrown: !!t.has_crown,
      likes,
      dislikes,
    };
  });
}

function getUsers(roomId) {
  return db
    .prepare('SELECT id, name, is_host FROM users WHERE room_id = ? ORDER BY connected_at')
    .all(roomId)
    .map((u) => ({
      id: u.id,
      name: u.name,
      isHost: !!u.is_host,
    }));
}

function getVoteSession(roomId) {
  const session = db
    .prepare('SELECT * FROM vote_sessions WHERE room_id = ? ORDER BY start_time DESC LIMIT 1')
    .get(roomId);

  if (!session) return null;

  const options = db
    .prepare(
      'SELECT thought_id, votes FROM vote_session_options WHERE session_id = ? ORDER BY votes DESC',
    )
    .all(session.id)
    .map((o) => ({
      thoughtId: o.thought_id,
      votes: o.votes,
    }));

  const votedUsers = db
    .prepare('SELECT user_id FROM vote_session_voters WHERE session_id = ?')
    .all(session.id)
    .map((v) => v.user_id);

  return {
    id: session.id,
    options,
    duration: session.duration,
    startTime: session.start_time,
    isActive: !!session.is_active,
    votedUsers,
  };
}

function getRoomState(roomId) {
  return {
    id: roomId,
    thoughts: getThoughts(roomId),
    voteSession: getVoteSession(roomId),
    users: getUsers(roomId),
  };
}

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'http://localhost');
  const roomId = url.searchParams.get('roomId');
  const userId = url.searchParams.get('userId');

  if (!roomId || !userId) {
    ws.close();
    return;
  }

  const room = getOrCreateRoom(roomId);

  const userExists = db.prepare('SELECT 1 FROM users WHERE id = ?').get(userId);
  const isFirstUser = !db.prepare('SELECT 1 FROM users WHERE room_id = ?').get(roomId);

  if (!userExists) {
    db.prepare('INSERT INTO users (id, room_id, name, is_host, connected_at) VALUES (?, ?, ?, ?, ?)').run(
      userId,
      roomId,
      '用户',
      isFirstUser ? 1 : 0,
      Date.now(),
    );
  } else {
    db.prepare('UPDATE users SET connected_at = ? WHERE id = ?').run(Date.now(), userId);
  }

  room.clients.set(userId, ws);

  ws.send(JSON.stringify({
    type: 'roomStateSync',
    state: getRoomState(roomId),
  }));

  broadcast(room, {
    type: 'userJoined',
    users: getUsers(roomId),
  });

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case 'ping': {
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;
        }

        case 'setUserName': {
          db.prepare('UPDATE users SET name = ? WHERE id = ?').run(message.name, message.userId);
          broadcast(room, {
            type: 'userJoined',
            users: getUsers(roomId),
          });
          break;
        }

        case 'addThought': {
          const thoughtId = uuidv4();
          const now = Date.now();

          db.prepare(
            'INSERT INTO thoughts (id, room_id, content, author, is_anonymous, score, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)',
          ).run(
            thoughtId,
            roomId,
            message.thought.content,
            message.thought.author,
            message.thought.isAnonymous ? 1 : 0,
            now,
          );

          const thought = getThoughts(roomId).find((t) => t.id === thoughtId);
          broadcast(room, {
            type: 'thoughtAdded',
            thought,
          });
          break;
        }

        case 'likeThought': {
          const { thoughtId, userId: uid } = message;

          const existingLike = db
            .prepare("SELECT * FROM votes WHERE thought_id = ? AND user_id = ? AND vote_type = 'like'")
            .get(thoughtId, uid);

          const existingDislike = db
            .prepare(
              "SELECT * FROM votes WHERE thought_id = ? AND user_id = ? AND vote_type = 'dislike'",
            )
            .get(thoughtId, uid);

          if (existingDislike) {
            db.prepare('DELETE FROM votes WHERE id = ?').run(existingDislike.id);
          }

          if (existingLike) {
            db.prepare('DELETE FROM votes WHERE id = ?').run(existingLike.id);
          } else {
            const voteId = uuidv4();
            db.prepare(
              "INSERT INTO votes (id, thought_id, user_id, vote_type, created_at) VALUES (?, ?, ?, 'like', ?)",
            ).run(voteId, thoughtId, uid, Date.now());
          }

          const likes = db
            .prepare("SELECT COUNT(*) as count FROM votes WHERE thought_id = ? AND vote_type = 'like'")
            .get(thoughtId).count;

          const dislikes = db
            .prepare(
              "SELECT COUNT(*) as count FROM votes WHERE thought_id = ? AND vote_type = 'dislike'",
            )
            .get(thoughtId).count;

          const score = likes - dislikes;
          db.prepare('UPDATE thoughts SET score = ? WHERE id = ?').run(score, thoughtId);

          const thought = getThoughts(roomId).find((t) => t.id === thoughtId);
          broadcast(room, {
            type: 'thoughtUpdated',
            thought,
          });
          break;
        }

        case 'dislikeThought': {
          const { thoughtId, userId: uid } = message;

          const existingLike = db
            .prepare("SELECT * FROM votes WHERE thought_id = ? AND user_id = ? AND vote_type = 'like'")
            .get(thoughtId, uid);

          const existingDislike = db
            .prepare(
              "SELECT * FROM votes WHERE thought_id = ? AND user_id = ? AND vote_type = 'dislike'",
            )
            .get(thoughtId, uid);

          if (existingLike) {
            db.prepare('DELETE FROM votes WHERE id = ?').run(existingLike.id);
          }

          if (existingDislike) {
            db.prepare('DELETE FROM votes WHERE id = ?').run(existingDislike.id);
          } else {
            const voteId = uuidv4();
            db.prepare(
              "INSERT INTO votes (id, thought_id, user_id, vote_type, created_at) VALUES (?, ?, ?, 'dislike', ?)",
            ).run(voteId, thoughtId, uid, Date.now());
          }

          const likes = db
            .prepare("SELECT COUNT(*) as count FROM votes WHERE thought_id = ? AND vote_type = 'like'")
            .get(thoughtId).count;

          const dislikes = db
            .prepare(
              "SELECT COUNT(*) as count FROM votes WHERE thought_id = ? AND vote_type = 'dislike'",
            )
            .get(thoughtId).count;

          const score = likes - dislikes;
          db.prepare('UPDATE thoughts SET score = ? WHERE id = ?').run(score, thoughtId);

          const thought = getThoughts(roomId).find((t) => t.id === thoughtId);
          broadcast(room, {
            type: 'thoughtUpdated',
            thought,
          });
          break;
        }

        case 'startVote': {
          const { options, duration, userId: uid } = message;

          const user = db.prepare('SELECT is_host FROM users WHERE id = ?').get(uid);
          if (!user?.is_host) break;

          db.prepare('UPDATE vote_sessions SET is_active = 0 WHERE room_id = ? AND is_active = 1').run(
            roomId,
          );

          const sessionId = uuidv4();
          const now = Date.now();

          db.prepare(
            'INSERT INTO vote_sessions (id, room_id, duration, start_time, is_active) VALUES (?, ?, ?, ?, 1)',
          ).run(sessionId, roomId, duration, now);

          for (const thoughtId of options) {
            const optionId = uuidv4();
            db.prepare(
              'INSERT INTO vote_session_options (id, session_id, thought_id, votes) VALUES (?, ?, ?, 0)',
            ).run(optionId, sessionId, thoughtId);
          }

          const session = getVoteSession(roomId);
          broadcast(room, {
            type: 'voteStarted',
            session,
          });

          if (room.voteTimer) {
            clearTimeout(room.voteTimer);
          }

          room.voteTimer = setTimeout(() => {
            db.prepare('UPDATE vote_sessions SET is_active = 0, end_time = ? WHERE id = ?').run(
              Date.now(),
              sessionId,
            );

            const finalSession = getVoteSession(roomId);
            broadcast(room, {
              type: 'voteEnded',
              session: finalSession,
            });

            room.voteTimer = null;
          }, duration * 1000);

          break;
        }

        case 'submitVote': {
          const { thoughtId, userId: uid } = message;

          const session = db
            .prepare('SELECT * FROM vote_sessions WHERE room_id = ? AND is_active = 1')
            .get(roomId);

          if (!session) break;

          const hasVoted = db
            .prepare('SELECT 1 FROM vote_session_voters WHERE session_id = ? AND user_id = ?')
            .get(session.id, uid);

          if (hasVoted) break;

          db.prepare(
            'INSERT INTO vote_session_voters (session_id, user_id, thought_id) VALUES (?, ?, ?)',
          ).run(session.id, uid, thoughtId);

          db.prepare(
            'UPDATE vote_session_options SET votes = votes + 1 WHERE session_id = ? AND thought_id = ?',
          ).run(session.id, thoughtId);

          const updatedSession = getVoteSession(roomId);
          broadcast(room, {
            type: 'voteUpdated',
            session: updatedSession,
          });
          break;
        }
      }
    } catch (e) {
      console.error('处理消息错误:', e);
    }
  });

  ws.on('close', () => {
    room.clients.delete(userId);

    broadcast(room, {
      type: 'userLeft',
      users: getUsers(roomId),
    });

    if (room.clients.size === 0) {
      if (room.voteTimer) {
        clearTimeout(room.voteTimer);
      }
      setTimeout(() => {
        if (room.clients.size === 0) {
          rooms.delete(roomId);
        }
      }, 60000);
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});
