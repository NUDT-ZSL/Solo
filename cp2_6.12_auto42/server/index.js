import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(bodyParser.json());

function readData() {
  if (!fs.existsSync(DATA_FILE)) {
    const initialData = {
      users: [
        { id: 'user-1', username: 'demo', password: '123456' }
      ],
      boards: [
        {
          id: 'board-1',
          userId: 'user-1',
          name: '北欧风格客厅',
          coverImage: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&q=80',
          createdAt: Date.now()
        },
        {
          id: 'board-2',
          userId: 'user-1',
          name: '温馨卧室',
          coverImage: 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=800&q=80',
          createdAt: Date.now()
        },
        {
          id: 'board-3',
          userId: 'user-1',
          name: '简约厨房',
          coverImage: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80',
          createdAt: Date.now()
        },
        {
          id: 'board-4',
          userId: 'user-1',
          name: '工业风书房',
          coverImage: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800&q=80',
          createdAt: Date.now()
        }
      ],
      images: [
        {
          id: 'img-1',
          boardId: 'board-1',
          imageUrl: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=600&q=80',
          tags: ['北欧', '客厅', '简约'],
          note: '非常喜欢这种简约北欧风格，米色沙发搭配绿植很温馨',
          likes: 0,
          mood: null,
          createdAt: Date.now()
        },
        {
          id: 'img-2',
          boardId: 'board-1',
          imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&q=80',
          tags: ['北欧', '沙发', '暖色'],
          note: '这个沙发的颜色很温暖，适合冬天',
          likes: 0,
          mood: null,
          createdAt: Date.now()
        },
        {
          id: 'img-3',
          boardId: 'board-1',
          imageUrl: 'https://images.unsplash.com/photo-1600210492493-0946911123ea?w=600&q=80',
          tags: ['客厅', '现代', '落地窗'],
          note: '大落地窗采光真好，配上浅色窗帘很美',
          likes: 0,
          mood: null,
          createdAt: Date.now()
        },
        {
          id: 'img-4',
          boardId: 'board-1',
          imageUrl: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=600&q=80',
          tags: ['北欧', '餐桌', '餐厅'],
          note: '木质餐桌很有质感，搭配蜡烛很有情调',
          likes: 0,
          mood: null,
          createdAt: Date.now()
        },
        {
          id: 'img-5',
          boardId: 'board-1',
          imageUrl: 'https://images.unsplash.com/photo-1567016526105-22da7c13161a?w=600&q=80',
          tags: ['绿植', '客厅', '自然'],
          note: '绿植点缀让空间更有生气',
          likes: 0,
          mood: null,
          createdAt: Date.now()
        },
        {
          id: 'img-6',
          boardId: 'board-2',
          imageUrl: 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=600&q=80',
          tags: ['卧室', '温馨', '床品'],
          note: '柔软的床品和暖色灯光，让人放松',
          likes: 0,
          mood: null,
          createdAt: Date.now()
        },
        {
          id: 'img-7',
          boardId: 'board-2',
          imageUrl: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600&q=80',
          tags: ['卧室', '简约', '白色'],
          note: '纯白色调很干净，早晨醒来心情好',
          likes: 0,
          mood: null,
          createdAt: Date.now()
        },
        {
          id: 'img-8',
          boardId: 'board-3',
          imageUrl: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80',
          tags: ['厨房', '简约', '木质'],
          note: '开放式厨房设计，岛台很实用',
          likes: 0,
          mood: null,
          createdAt: Date.now()
        },
        {
          id: 'img-9',
          boardId: 'board-4',
          imageUrl: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=600&q=80',
          tags: ['书房', '工业风', '书架'],
          note: '整面墙的书架，是读书人的梦想',
          likes: 0,
          mood: null,
          createdAt: Date.now()
        }
      ]
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const data = readData();
  const user = data.users.find(u => u.username === username && u.password === password);
  
  if (user) {
    res.json({ success: true, user: { id: user.id, username: user.username } });
  } else {
    res.status(401).json({ success: false, message: '用户名或密码错误' });
  }
});

app.get('/api/boards/:userId', (req, res) => {
  const { userId } = req.params;
  const data = readData();
  const boards = data.boards.filter(b => b.userId === userId);
  res.json(boards);
});

app.post('/api/boards', (req, res) => {
  const { userId, name, coverImage } = req.body;
  const data = readData();
  const newBoard = {
    id: uuidv4(),
    userId,
    name,
    coverImage: coverImage || 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&q=80',
    createdAt: Date.now()
  };
  data.boards.push(newBoard);
  writeData(data);
  res.json(newBoard);
});

app.get('/api/boards/:boardId/images', (req, res) => {
  const { boardId } = req.params;
  const data = readData();
  const images = data.images
    .filter(img => img.boardId === boardId)
    .sort((a, b) => b.createdAt - a.createdAt);
  res.json(images);
});

app.post('/api/images', (req, res) => {
  const { boardId, imageUrl, tags, note } = req.body;
  const data = readData();
  const newImage = {
    id: uuidv4(),
    boardId,
    imageUrl,
    tags: tags || [],
    note: note || '',
    likes: 0,
    mood: null,
    createdAt: Date.now()
  };
  data.images.push(newImage);
  writeData(data);
  res.json(newImage);
});

app.put('/api/images/:imageId/mood', (req, res) => {
  const { imageId } = req.params;
  const { mood } = req.body;
  const data = readData();
  const imageIndex = data.images.findIndex(img => img.id === imageId);
  
  if (imageIndex !== -1) {
    data.images[imageIndex].mood = mood;
    writeData(data);
    res.json(data.images[imageIndex]);
  } else {
    res.status(404).json({ message: '图片不存在' });
  }
});

app.get('/api/boards/:boardId/stats', (req, res) => {
  const { boardId } = req.params;
  const data = readData();
  const images = data.images.filter(img => img.boardId === boardId);
  const totalLikes = images.reduce((sum, img) => sum + (img.mood ? 1 : 0), 0);
  
  res.json({
    totalImages: images.length,
    totalLikes
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
