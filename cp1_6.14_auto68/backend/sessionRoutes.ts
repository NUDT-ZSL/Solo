import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Low } from 'lowdb';
import { WebSocketServer } from 'ws';
import { User, Session, Message, Correction, Note } from './server.js';

interface DatabaseData {
  users: User[];
  sessions: Session[];
  unreadMessages: Record<string, string[]>;
}

export default function sessionRoutes(db: Low<DatabaseData>, wss: WebSocketServer) {
  const router = Router();

  router.post('/create', (req: Request, res: Response) => {
    try {
      const { userId, partnerId } = req.body;

      if (!userId || !partnerId) {
        return res.status(400).json({ error: '缺少用户信息' });
      }

      const existingSession = db.data?.sessions.find(
        (s) =>
          s.participants.includes(userId) &&
          s.participants.includes(partnerId) &&
          s.endedAt === null
      );

      if (existingSession) {
        return res.json({ success: true, session: existingSession });
      }

      const newSession: Session = {
        id: uuidv4(),
        participants: [userId, partnerId],
        messages: [],
        corrections: [],
        notes: [],
        createdAt: Date.now(),
        endedAt: null,
        duration: 0,
      };

      db.update((data) => {
        data.sessions.push(newSession);
      });

      res.json({ success: true, session: newSession });
    } catch (error) {
      res.status(500).json({ error: '服务器错误' });
    }
  });

  router.get('/:sessionId', (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const session = db.data?.sessions.find((s) => s.id === sessionId);

      if (!session) {
        return res.status(404).json({ error: '会话不存在' });
      }

      res.json({ success: true, session });
    } catch (error) {
      res.status(500).json({ error: '服务器错误' });
    }
  });

  router.post('/message', (req: Request, res: Response) => {
    try {
      const { sessionId, senderId, content, type = 'text' } = req.body;

      if (!sessionId || !senderId || !content) {
        return res.status(400).json({ error: '缺少必要信息' });
      }

      const newMessage: Message = {
        id: uuidv4(),
        sessionId,
        senderId,
        content,
        timestamp: Date.now(),
        type: type as 'text' | 'topic',
      };

      db.update((data) => {
        const session = data.sessions.find((s) => s.id === sessionId);
        if (session) {
          session.messages.push(newMessage);
        }
      });

      res.json({ success: true, message: newMessage });
    } catch (error) {
      res.status(500).json({ error: '服务器错误' });
    }
  });

  router.get('/:sessionId/messages', (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const { before } = req.query;

      const session = db.data?.sessions.find((s) => s.id === sessionId);
      if (!session) {
        return res.status(404).json({ error: '会话不存在' });
      }

      let messages = session.messages;
      if (before) {
        const beforeTime = parseInt(before as string);
        messages = messages.filter((m) => m.timestamp < beforeTime);
      }

      res.json({
        success: true,
        messages: messages.slice(-50),
      });
    } catch (error) {
      res.status(500).json({ error: '服务器错误' });
    }
  });

  router.post('/correction', (req: Request, res: Response) => {
    try {
      const { sessionId, messageId, correctorId, originalText, correctedText } = req.body;

      if (!sessionId || !messageId || !correctorId || !originalText || !correctedText) {
        return res.status(400).json({ error: '缺少必要信息' });
      }

      const correction: Correction = {
        id: uuidv4(),
        sessionId,
        messageId,
        correctorId,
        originalText,
        correctedText,
        timestamp: Date.now(),
      };

      db.update((data) => {
        const session = data.sessions.find((s) => s.id === sessionId);
        if (session) {
          session.corrections.push(correction);
        }
      });

      res.json({ success: true, correction });
    } catch (error) {
      res.status(500).json({ error: '服务器错误' });
    }
  });

  router.get('/:sessionId/corrections', (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const session = db.data?.sessions.find((s) => s.id === sessionId);

      if (!session) {
        return res.status(404).json({ error: '会话不存在' });
      }

      res.json({ success: true, corrections: session.corrections });
    } catch (error) {
      res.status(500).json({ error: '服务器错误' });
    }
  });

  router.post('/note', (req: Request, res: Response) => {
    try {
      const { sessionId, userId, messageId, content } = req.body;

      if (!sessionId || !userId || !content) {
        return res.status(400).json({ error: '缺少必要信息' });
      }

      const note: Note = {
        id: uuidv4(),
        sessionId,
        userId,
        messageId: messageId || null,
        content,
        timestamp: Date.now(),
      };

      db.update((data) => {
        const session = data.sessions.find((s) => s.id === sessionId);
        if (session) {
          session.notes.push(note);
        }
      });

      res.json({ success: true, note });
    } catch (error) {
      res.status(500).json({ error: '服务器错误' });
    }
  });

  router.get('/:sessionId/notes', (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const { userId } = req.query;
      const session = db.data?.sessions.find((s) => s.id === sessionId);

      if (!session) {
        return res.status(404).json({ error: '会话不存在' });
      }

      let notes = session.notes;
      if (userId) {
        notes = notes.filter((n) => n.userId === userId);
      }

      notes.sort((a, b) => b.timestamp - a.timestamp);

      res.json({ success: true, notes });
    } catch (error) {
      res.status(500).json({ error: '服务器错误' });
    }
  });

  router.post('/end', (req: Request, res: Response) => {
    try {
      const { sessionId } = req.body;

      db.update((data) => {
        const session = data.sessions.find((s) => s.id === sessionId);
        if (session) {
          session.endedAt = Date.now();
          session.duration = session.endedAt - session.createdAt;
        }
      });

      const session = db.data?.sessions.find((s) => s.id === sessionId);
      res.json({ success: true, session });
    } catch (error) {
      res.status(500).json({ error: '服务器错误' });
    }
  });

  router.get('/user/:userId/history', (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      
      const userSessions = db.data?.sessions.filter(
        (s) => s.participants.includes(userId) && s.endedAt !== null
      ) || [];

      const history = userSessions.map((session) => {
        const otherParticipantId = session.participants.find((p) => p !== userId);
        const otherUser = db.data?.users.find((u) => u.id === otherParticipantId);
        return {
          sessionId: session.id,
          partner: otherUser,
          createdAt: session.createdAt,
          endedAt: session.endedAt,
          duration: session.duration,
          messageCount: session.messages.length,
        };
      });

      history.sort((a, b) => (b.createdAt as number) - (a.createdAt as number));

      res.json({ success: true, history });
    } catch (error) {
      res.status(500).json({ error: '服务器错误' });
    }
  });

  return router;
}
