import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import {
  createSession,
  findSessionByCode,
  findSessionById,
  addUserToSession,
  removeUserFromSession,
  addNote,
  updateNote,
  deleteNote,
  toggleVote,
  startVoting,
  endVoting,
  getSessionNotes,
  Session,
  Note,
  User,
} from './models.js';

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

interface SocketData {
  sessionId?: string;
  user?: User;
}

app.post('/api/sessions', async (req, res) => {
  try {
    const { title, description, deadline, hostName } = req.body;
    if (!title || !hostName) {
      return res.status(400).json({ error: '标题和主持人名称必填' });
    }
    const session = await createSession(
      title,
      description || '',
      deadline || Date.now() + 3600000,
      hostName
    );
    res.json({ session, host: session.users[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '创建会议失败' });
  }
});

app.post('/api/sessions/join', async (req, res) => {
  try {
    const { code, userName } = req.body;
    if (!code || !userName) {
      return res.status(400).json({ error: '邀请码和用户名称必填' });
    }
    const session = await findSessionByCode(code);
    if (!session) {
      return res.status(404).json({ error: '会议不存在' });
    }
    const result = await addUserToSession(session.id, userName);
    if (!result) {
      return res.status(500).json({ error: '加入会议失败' });
    }
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '加入会议失败' });
  }
});

app.get('/api/sessions/:id/notes', async (req, res) => {
  try {
    const notes = await getSessionNotes(req.params.id);
    res.json(notes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取便签失败' });
  }
});

io.on('connection', (socket: Socket) => {
  const data: SocketData = {};

  socket.on('join_session', async (payload: { sessionId: string; user: User }) => {
    try {
      const { sessionId, user } = payload;
      const session = await findSessionById(sessionId);
      if (!session) {
        socket.emit('error', { message: '会议不存在' });
        return;
      }

      data.sessionId = sessionId;
      data.user = user;
      socket.join(sessionId);

      io.to(sessionId).emit('user_joined', { user, users: session.users });
    } catch (err) {
      console.error(err);
    }
  });

  socket.on(
    'note_add',
    async (payload: {
      content: string;
      x: number;
      y: number;
      color: string;
      authorId: string;
      authorName: string;
    }) => {
      if (!data.sessionId) return;
      try {
        const note = await addNote(data.sessionId, payload);
        if (note) {
          io.to(data.sessionId).emit('note_added', note);
        }
      } catch (err) {
        console.error(err);
      }
    }
  );

  socket.on(
    'note_update',
    async (payload: {
      noteId: string;
      updates: Partial<Pick<Note, 'content' | 'x' | 'y' | 'color'>>;
    }) => {
      if (!data.sessionId) return;
      try {
        const note = await updateNote(payload.noteId, payload.updates);
        if (note) {
          io.to(data.sessionId).emit('note_updated', {
            note,
            userId: data.user?.id,
            userName: data.user?.name,
            userColor: data.user?.color,
          });
        }
      } catch (err) {
        console.error(err);
      }
    }
  );

  socket.on('note_drag_start', (payload: { noteId: string }) => {
    if (!data.sessionId || !data.user) return;
    io.to(data.sessionId).emit('note_drag_started', {
      noteId: payload.noteId,
      user: data.user,
    });
  });

  socket.on('note_drag_end', (payload: { noteId: string }) => {
    if (!data.sessionId || !data.user) return;
    io.to(data.sessionId).emit('note_drag_ended', {
      noteId: payload.noteId,
      user: data.user,
    });
  });

  socket.on('note_delete', async (payload: { noteId: string }) => {
    if (!data.sessionId) return;
    try {
      const ok = await deleteNote(payload.noteId);
      if (ok) {
        io.to(data.sessionId).emit('note_deleted', { noteId: payload.noteId });
      }
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('note_vote', async (payload: { noteId: string; userId: string }) => {
    if (!data.sessionId) return;
    try {
      const { note } = await toggleVote(payload.noteId, payload.userId);
      if (note) {
        io.to(data.sessionId).emit('note_voted', {
          note,
          userId: payload.userId,
        });
      }
    } catch (err) {
      console.error(err);
    }
  });

  socket.on(
    'voting_start',
    async (payload: { sessionId: string; candidateIds: string[] }) => {
      try {
        const session = await startVoting(payload.sessionId, payload.candidateIds);
        if (session) {
          io.to(payload.sessionId).emit('voting_started', {
            voting: session.voting,
            voteCandidates: session.voteCandidates,
          });
        }
      } catch (err) {
        console.error(err);
      }
    }
  );

  socket.on('voting_end', async (payload: { sessionId: string }) => {
    try {
      const session = await endVoting(payload.sessionId);
      if (session) {
        io.to(payload.sessionId).emit('voting_ended', {
          voting: session.voting,
          voteCandidates: session.voteCandidates,
        });
      }
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('disconnect', async () => {
    if (data.sessionId && data.user) {
      try {
        const session = await removeUserFromSession(data.sessionId, data.user.id);
        if (session) {
          io.to(data.sessionId).emit('user_left', {
            user: data.user,
            users: session.users,
          });
        }
      } catch (err) {
        console.error(err);
      }
    }
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`IdeaVote server running on port ${PORT}`);
});
