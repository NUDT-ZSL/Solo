import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { RoastRecord, User, Comment, Follow, ControlPoint } from '../src/types/index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const DATA_DIR = path.join(__dirname, 'data');

const readJsonFile = <T>(filename: string): T => {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return { [filename.replace('.json', '')]: [] } as T;
  }
  const data = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(data);
};

const writeJsonFile = <T>(filename: string, data: T): void => {
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

const getUserById = (id: string): User | undefined => {
  const { users } = readJsonFile<{ users: User[] }>('users.json');
  return users.find(u => u.id === id);
};

const lockMap = new Map<string, Promise<any>>();

const withLock = async <T>(key: string, fn: () => T | Promise<T>): Promise<T> => {
  while (lockMap.has(key)) {
    await lockMap.get(key);
  }
  const promise = Promise.resolve().then(fn);
  lockMap.set(key, promise);
  try {
    return await promise;
  } finally {
    lockMap.delete(key);
  }
};

app.get('/api/records', (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  
  const { records } = readJsonFile<{ records: RoastRecord[] }>('records.json');
  const { users } = readJsonFile<{ users: User[] }>('users.json');
  
  const recordsWithUser = records.map(record => ({
    ...record,
    user: users.find(u => u.id === record.userId) || null,
  }));
  
  recordsWithUser.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedRecords = recordsWithUser.slice(startIndex, endIndex);
  
  res.json({
    records: paginatedRecords,
    hasMore: endIndex < recordsWithUser.length,
  });
});

app.post('/api/records', (req: Request, res: Response) => {
  const { userId, beanOrigin, processMethod, roastLevel, flavorTags, notes, controlPoints, curveImage } = req.body;
  
  const user = getUserById(userId);
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }
  
  const newRecord: RoastRecord = {
    id: uuidv4(),
    userId,
    user,
    beanOrigin,
    processMethod,
    roastLevel,
    flavorTags,
    notes,
    controlPoints,
    curveImage,
    likes: 0,
    likedBy: [],
    createdAt: new Date().toISOString(),
  };
  
  const { records } = readJsonFile<{ records: RoastRecord[] }>('records.json');
  records.unshift(newRecord);
  writeJsonFile('records.json', { records });
  
  res.json(newRecord);
});

app.post('/api/records/:id/like', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId, action } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: '缺少 userId 参数' });
  }
  
  if (action && action !== 'like' && action !== 'unlike') {
    return res.status(400).json({ error: 'action 参数必须是 like 或 unlike' });
  }
  
  const lockKey = `like:${id}`;
  
  try {
    const result = await withLock(lockKey, () => {
      const { records } = readJsonFile<{ records: RoastRecord[] }>('records.json');
      const recordIndex = records.findIndex(r => r.id === id);
      
      if (recordIndex === -1) {
        return { status: 404, body: { error: '记录不存在' } };
      }
      
      const record = records[recordIndex];
      const likedIndex = record.likedBy.indexOf(userId);
      const isCurrentlyLiked = likedIndex !== -1;
      let liked = isCurrentlyLiked;
      
      if (action === 'like') {
        if (!isCurrentlyLiked) {
          record.likedBy.push(userId);
          record.likes++;
          liked = true;
        }
      } else if (action === 'unlike') {
        if (isCurrentlyLiked) {
          record.likedBy.splice(likedIndex, 1);
          record.likes--;
          liked = false;
        }
      } else {
        if (likedIndex === -1) {
          record.likedBy.push(userId);
          record.likes++;
          liked = true;
        } else {
          record.likedBy.splice(likedIndex, 1);
          record.likes--;
          liked = false;
        }
      }
      
      records[recordIndex] = record;
      writeJsonFile('records.json', { records });
      
      return { status: 200, body: { success: true, likes: record.likes, liked } };
    });
    
    res.status(result.status).json(result.body);
  } catch (error) {
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.post('/api/users/:id/follow', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { followerId, action } = req.body;
  
  if (!followerId) {
    return res.status(400).json({ error: '缺少 followerId 参数' });
  }
  
  if (action && action !== 'follow' && action !== 'unfollow') {
    return res.status(400).json({ error: 'action 参数必须是 follow 或 unfollow' });
  }
  
  if (id === followerId) {
    return res.status(400).json({ error: '不能关注自己' });
  }
  
  const lockKey = `follow:${followerId}:${id}`;
  
  try {
    const result = await withLock(lockKey, () => {
      const { users } = readJsonFile<{ users: User[] }>('users.json');
      const targetUser = users.find(u => u.id === id);
      const followerUser = users.find(u => u.id === followerId);
      
      if (!targetUser || !followerUser) {
        return { status: 404, body: { error: '用户不存在' } };
      }
      
      const { follows } = readJsonFile<{ follows: Follow[] }>('follows.json');
      const followIndex = follows.findIndex(f => f.followerId === followerId && f.followingId === id);
      const isCurrentlyFollowing = followIndex !== -1;
      let following = isCurrentlyFollowing;
      
      if (action === 'follow') {
        if (!isCurrentlyFollowing) {
          const newFollow: Follow = {
            id: uuidv4(),
            followerId,
            followingId: id,
            createdAt: new Date().toISOString(),
          };
          follows.push(newFollow);
          targetUser.followers++;
          followerUser.following++;
          following = true;
        }
      } else if (action === 'unfollow') {
        if (isCurrentlyFollowing) {
          follows.splice(followIndex, 1);
          targetUser.followers--;
          followerUser.following--;
          following = false;
        }
      } else {
        if (followIndex === -1) {
          const newFollow: Follow = {
            id: uuidv4(),
            followerId,
            followingId: id,
            createdAt: new Date().toISOString(),
          };
          follows.push(newFollow);
          targetUser.followers++;
          followerUser.following++;
          following = true;
        } else {
          follows.splice(followIndex, 1);
          targetUser.followers--;
          followerUser.following--;
          following = false;
        }
      }
      
      writeJsonFile('follows.json', { follows });
      writeJsonFile('users.json', { users });
      
      return { status: 200, body: { success: true, following } };
    });
    
    res.status(result.status).json(result.body);
  } catch (error) {
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.get('/api/users/:id/feed', (req: Request, res: Response) => {
  const { id } = req.params;
  
  const { follows } = readJsonFile<{ follows: Follow[] }>('follows.json');
  const followedIds = follows.filter(f => f.followerId === id).map(f => f.followingId);
  
  const { records } = readJsonFile<{ records: RoastRecord[] }>('records.json');
  const { users } = readJsonFile<{ users: User[] }>('users.json');
  
  const feedRecords = records
    .filter(r => followedIds.includes(r.userId))
    .map(record => ({
      ...record,
      user: users.find(u => u.id === record.userId) || null,
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  res.json({ records: feedRecords });
});

app.get('/api/records/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  
  const { records } = readJsonFile<{ records: RoastRecord[] }>('records.json');
  const { users } = readJsonFile<{ users: User[] }>('users.json');
  
  const record = records.find(r => r.id === id);
  if (!record) {
    return res.status(404).json({ error: '记录不存在' });
  }
  
  const recordWithUser = {
    ...record,
    user: users.find(u => u.id === record.userId) || null,
  };
  
  res.json(recordWithUser);
});

app.get('/api/records/:id/comments', (req: Request, res: Response) => {
  const { id } = req.params;
  
  const { comments } = readJsonFile<{ comments: Comment[] }>('comments.json');
  const { users } = readJsonFile<{ users: User[] }>('users.json');
  
  const recordComments = comments
    .filter(c => c.recordId === id)
    .map(comment => ({
      ...comment,
      user: users.find(u => u.id === comment.userId) || null,
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  res.json({ comments: recordComments });
});

app.post('/api/records/:id/comments', (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId, content } = req.body;
  
  const user = getUserById(userId);
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }
  
  const newComment: Comment = {
    id: uuidv4(),
    recordId: id,
    userId,
    user,
    content,
    createdAt: new Date().toISOString(),
  };
  
  const { comments } = readJsonFile<{ comments: Comment[] }>('comments.json');
  comments.unshift(newComment);
  writeJsonFile('comments.json', { comments });
  
  res.json(newComment);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
