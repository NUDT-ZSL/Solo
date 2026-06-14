import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Low } from 'lowdb';
import { WebSocketServer } from 'ws';
import { User, Session } from './server.js';

interface DatabaseData {
  users: User[];
  sessions: Session[];
  unreadMessages: Record<string, string[]>;
}

const avatarColors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#F8B500', '#52BE80',
];

const languages = [
  '中文', '英语', '日语', '韩语', '法语', '德语',
  '西班牙语', '葡萄牙语', '意大利语', '俄语', '阿拉伯语', '荷兰语'
];

export default function userRoutes(db: Low<DatabaseData>, wss: WebSocketServer) {
  const router = Router();

  router.post('/register', (req: Request, res: Response) => {
    try {
      const { nickname, nativeLanguage, targetLanguage } = req.body;

      if (!nickname || !nativeLanguage || !targetLanguage) {
        return res.status(400).json({ error: '请填写完整信息' });
      }

      if (!languages.includes(nativeLanguage) || !languages.includes(targetLanguage)) {
        return res.status(400).json({ error: '不支持的语言' });
      }

      const avatarColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

      const newUser: User = {
        id: uuidv4(),
        nickname,
        nativeLanguage,
        targetLanguage,
        avatarColor,
        createdAt: Date.now(),
        isOnline: true,
      };

      db.update((data) => {
        data.users.push(newUser);
      });

      res.json({
        success: true,
        user: newUser,
      });
    } catch (error) {
      res.status(500).json({ error: '服务器错误' });
    }
  });

  router.get('/languages', (req: Request, res: Response) => {
    res.json({ languages });
  });

  router.get('/partners', (req: Request, res: Response) => {
    try {
      const { userId } = req.query;

      if (!userId) {
        return res.status(400).json({ error: '缺少用户ID' });
      }

      const currentUser = db.data?.users.find((u) => u.id === userId);
      if (!currentUser) {
        return res.status(404).json({ error: '用户不存在' });
      }

      const partners = db.data?.users.filter(
        (u) =>
          u.id !== userId &&
          u.nativeLanguage === currentUser.targetLanguage &&
          u.targetLanguage === currentUser.nativeLanguage
      ) || [];

      res.json({
        success: true,
        partners,
      });
    } catch (error) {
      res.status(500).json({ error: '服务器错误' });
    }
  });

  router.get('/:userId', (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const user = db.data?.users.find((u) => u.id === userId);

      if (!user) {
        return res.status(404).json({ error: '用户不存在' });
      }

      res.json({ success: true, user });
    } catch (error) {
      res.status(500).json({ error: '服务器错误' });
    }
  });

  router.get('/unread/:userId', (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const unread = db.data?.unreadMessages[userId] || [];
      
      res.json({
        success: true,
        unreadCount: unread.length,
        unreadSessions: [...new Set(unread)],
      });
    } catch (error) {
      res.status(500).json({ error: '服务器错误' });
    }
  });

  router.post('/mark-read', (req: Request, res: Response) => {
    try {
      const { userId, sessionId } = req.body;
      
      db.update((data) => {
        if (data.unreadMessages[userId]) {
          data.unreadMessages[userId] = data.unreadMessages[userId].filter(
            (s) => s !== sessionId
          );
        }
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: '服务器错误' });
    }
  });

  return router;
}
