import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import Datastore from 'nedb-promises';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

const db = {
  collectibles: Datastore.create(path.join(__dirname, '../../data/collectibles.db')),
  swapRequests: Datastore.create(path.join(__dirname, '../../data/swapRequests.db')),
  notifications: Datastore.create(path.join(__dirname, '../../data/notifications.db'))
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件'));
    }
  }
});

async function generateThumbnail(imagePath: string, filename: string): Promise<string> {
  const thumbnailDir = path.join(__dirname, '../../uploads/thumbnails');
  const thumbnailPath = path.join(thumbnailDir, `thumb_${filename}`);
  await sharp(imagePath)
    .resize(300, 220, { fit: 'cover', position: 'center' })
    .toFile(thumbnailPath);
  return `/uploads/thumbnails/thumb_${filename}`;
}

app.post('/api/upload', upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: '未上传图片' });
      return;
    }
    const imagePath = req.file.path;
    const filename = req.file.filename;
    const imageUrl = `/uploads/${filename}`;
    const thumbnailUrl = await generateThumbnail(imagePath, filename);
    res.json({ image: imageUrl, thumbnail: thumbnailUrl });
  } catch (error) {
    console.error('上传失败:', error);
    res.status(500).json({ error: '图片处理失败' });
  }
});

app.get('/api/collectibles', async (_req: Request, res: Response) => {
  try {
    const collectibles = await db.collectibles.find({}).sort({ createdAt: -1 });
    res.json(collectibles);
  } catch (error) {
    res.status(500).json({ error: '获取藏品列表失败' });
  }
});

app.get('/api/collectibles/:id', async (req: Request, res: Response) => {
  try {
    const collectible = await db.collectibles.findOne({ _id: req.params.id });
    if (!collectible) {
      res.status(404).json({ error: '藏品不存在' });
      return;
    }
    res.json(collectible);
  } catch (error) {
    res.status(500).json({ error: '获取藏品详情失败' });
  }
});

app.post('/api/collectibles', async (req: Request, res: Response) => {
  try {
    const now = new Date().toISOString();
    const collectible = {
      _id: uuidv4(),
      ...req.body,
      createdAt: now,
      updatedAt: now
    };
    const result = await db.collectibles.insert(collectible);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: '创建藏品失败' });
  }
});

app.put('/api/collectibles/:id', async (req: Request, res: Response) => {
  try {
    const now = new Date().toISOString();
    const result = await db.collectibles.update(
      { _id: req.params.id },
      { $set: { ...req.body, updatedAt: now } },
      { returnUpdatedDocs: true }
    );
    if (!result) {
      res.status(404).json({ error: '藏品不存在' });
      return;
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: '更新藏品失败' });
  }
});

app.delete('/api/collectibles/:id', async (req: Request, res: Response) => {
  try {
    const numRemoved = await db.collectibles.remove({ _id: req.params.id }, {});
    if (numRemoved === 0) {
      res.status(404).json({ error: '藏品不存在' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '删除藏品失败' });
  }
});

app.get('/api/swap', async (_req: Request, res: Response) => {
  try {
    const collectibles = await db.collectibles.find({ status: 'swap' }).sort({ createdAt: -1 });
    res.json(collectibles);
  } catch (error) {
    res.status(500).json({ error: '获取待交换列表失败' });
  }
});

app.post('/api/swap/request', async (req: Request, res: Response) => {
  try {
    const { collectibleId, requester } = req.body;
    const collectible = await db.collectibles.findOne({ _id: collectibleId });
    if (!collectible) {
      res.status(404).json({ error: '藏品不存在' });
      return;
    }
    const now = new Date().toISOString();
    const swapRequest = {
      _id: uuidv4(),
      collectibleId,
      collectibleName: collectible.name,
      requester,
      owner: collectible.owner,
      status: 'pending',
      createdAt: now
    };
    const result = await db.swapRequests.insert(swapRequest);
    const notification = {
      _id: uuidv4(),
      userId: collectible.owner,
      type: 'swap_request',
      swapRequestId: result._id,
      collectibleName: collectible.name,
      fromUser: requester,
      read: false,
      createdAt: now
    };
    await db.notifications.insert(notification);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: '发起交换请求失败' });
  }
});

app.post('/api/swap/:id/accept', async (req: Request, res: Response) => {
  try {
    const result = await db.swapRequests.update(
      { _id: req.params.id },
      { $set: { status: 'accepted' } },
      { returnUpdatedDocs: true }
    );
    if (!result) {
      res.status(404).json({ error: '交换请求不存在' });
      return;
    }
    const now = new Date().toISOString();
    const notification = {
      _id: uuidv4(),
      userId: result.requester,
      type: 'swap_accepted',
      swapRequestId: result._id,
      collectibleName: result.collectibleName,
      fromUser: result.owner,
      read: false,
      createdAt: now
    };
    await db.notifications.insert(notification);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '接受交换失败' });
  }
});

app.post('/api/swap/:id/reject', async (req: Request, res: Response) => {
  try {
    const result = await db.swapRequests.update(
      { _id: req.params.id },
      { $set: { status: 'rejected' } },
      { returnUpdatedDocs: true }
    );
    if (!result) {
      res.status(404).json({ error: '交换请求不存在' });
      return;
    }
    const now = new Date().toISOString();
    const notification = {
      _id: uuidv4(),
      userId: result.requester,
      type: 'swap_rejected',
      swapRequestId: result._id,
      collectibleName: result.collectibleName,
      fromUser: result.owner,
      read: false,
      createdAt: now
    };
    await db.notifications.insert(notification);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '拒绝交换失败' });
  }
});

app.get('/api/notifications/:userId', async (req: Request, res: Response) => {
  try {
    const notifications = await db.notifications
      .find({ userId: req.params.userId })
      .sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: '获取通知失败' });
  }
});

app.put('/api/notifications/:id/read', async (req: Request, res: Response) => {
  try {
    const result = await db.notifications.update(
      { _id: req.params.id },
      { $set: { read: true } },
      { returnUpdatedDocs: true }
    );
    if (!result) {
      res.status(404).json({ error: '通知不存在' });
      return;
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: '更新通知失败' });
  }
});

async function seedData() {
  const count = await db.collectibles.count({});
  if (count > 0) return;

  const now = new Date().toISOString();
  const dataDir = path.join(__dirname, '../../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const sampleImages = [
    {
      image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=lego%20star%20wars%20millennium%20falcon%20box%20toy%20product%20photo&image_size=landscape_4_3',
      thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=lego%20star%20wars%20millennium%20falcon%20box%20toy%20product%20photo&image_size=square'
    },
    {
      image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=anime%20figure%20girl%20pvc%20statue%20collectible%20product%20photo&image_size=landscape_4_3',
      thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=anime%20figure%20girl%20pvc%20statue%20collectible%20product%20photo&image_size=square'
    },
    {
      image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=pop%20mart%20blind%20box%20toy%20cute%20figure%20product%20photo&image_size=landscape_4_3',
      thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=pop%20mart%20blind%20box%20toy%20cute%20figure%20product%20photo&image_size=square'
    },
    {
      image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=lego%20ninjago%20dragon%20set%20box%20toy%20product%20photo&image_size=landscape_4_3',
      thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=lego%20ninjago%20dragon%20set%20box%20toy%20product%20photo&image_size=square'
    },
    {
      image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=gundam%20model%20kit%20rx78%20robot%20collectible%20product%20photo&image_size=landscape_4_3',
      thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=gundam%20model%20kit%20rx78%20robot%20collectible%20product%20photo&image_size=square'
    },
    {
      image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=disney%20blind%20box%20mystery%20mini%20figure%20product%20photo&image_size=landscape_4_3',
      thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=disney%20blind%20box%20mystery%20mini%20figure%20product%20photo&image_size=square'
    },
    {
      image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=one%20piece%20anime%20figure%20luffy%20statue%20product%20photo&image_size=landscape_4_3',
      thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=one%20piece%20anime%20figure%20luffy%20statue%20product%20photo&image_size=square'
    },
    {
      image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=lego%20harry%20potter%20hogwarts%20castle%20set%20product%20photo&image_size=landscape_4_3',
      thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=lego%20harry%20potter%20hogwarts%20castle%20set%20product%20photo&image_size=square'
    },
    {
      image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=sonny%20angel%20blind%20box%20cute%20doll%20figure%20product%20photo&image_size=landscape_4_3',
      thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=sonny%20angel%20blind%20box%20cute%20doll%20figure%20product%20photo&image_size=square'
    }
  ];

  const collectibles = [
    { _id: uuidv4(), name: '乐高千年隼', series: '星球大战系列', purchaseDate: '2025-12-15', price: 1299, status: 'new', notes: '经典珍藏版，未拆封', ...sampleImages[0], owner: 'alice', createdAt: now, updatedAt: now },
    { _id: uuidv4(), name: '初音未来手办', series: 'VOCALOID系列', purchaseDate: '2026-01-20', price: 599, status: 'opened', notes: '拆封展示过，品相完好', ...sampleImages[1], owner: 'bob', createdAt: now, updatedAt: now },
    { _id: uuidv4(), name: 'DIMOO太空系列', series: '泡泡玛特盲盒', purchaseDate: '2026-02-10', price: 69, status: 'swap', notes: '重复款，待交换', ...sampleImages[2], owner: 'alice', createdAt: now, updatedAt: now },
    { _id: uuidv4(), name: '乐高忍者龙', series: '幻影忍者系列', purchaseDate: '2025-11-05', price: 899, status: 'opened', notes: '已拼好，可赠送', ...sampleImages[3], owner: 'charlie', createdAt: now, updatedAt: now },
    { _id: uuidv4(), name: '高达RX-78', series: 'GUNDAM系列', purchaseDate: '2026-03-01', price: 399, status: 'new', notes: '未拼，全新', ...sampleImages[4], owner: 'bob', createdAt: now, updatedAt: now },
    { _id: uuidv4(), name: '迪士尼盲盒隐藏款', series: '迪士尼系列', purchaseDate: '2026-02-28', price: 89, status: 'swap', notes: '抽到重复款，想换米奇款', ...sampleImages[5], owner: 'charlie', createdAt: now, updatedAt: now },
    { _id: uuidv4(), name: '路飞手办', series: '海贼王系列', purchaseDate: '2025-10-15', price: 459, status: 'swap', notes: '拆封后闲置，交换同价位', ...sampleImages[6], owner: 'alice', createdAt: now, updatedAt: now },
    { _id: uuidv4(), name: '乐高霍格沃茨城堡', series: '哈利波特系列', purchaseDate: '2025-09-20', price: 3999, status: 'new', notes: '珍藏级，未拆封', ...sampleImages[7], owner: 'bob', createdAt: now, updatedAt: now },
    { _id: uuidv4(), name: 'Sonny Angel隐藏款', series: 'Sonny Angel系列', purchaseDate: '2026-01-08', price: 129, status: 'swap', notes: '重复款，待交换', ...sampleImages[8], owner: 'charlie', createdAt: now, updatedAt: now }
  ];

  await db.collectibles.insert(collectibles);

  const sampleSwapRequest1 = {
    _id: uuidv4(),
    collectibleId: collectibles[2]._id,
    collectibleName: collectibles[2].name,
    requester: 'bob',
    owner: 'alice',
    status: 'pending',
    createdAt: now
  };
  await db.swapRequests.insert(sampleSwapRequest1);
  await db.notifications.insert({
    _id: uuidv4(),
    userId: 'alice',
    type: 'swap_request',
    swapRequestId: sampleSwapRequest1._id,
    collectibleName: sampleSwapRequest1.collectibleName,
    fromUser: 'bob',
    read: false,
    createdAt: now
  });

  const sampleSwapRequest2 = {
    _id: uuidv4(),
    collectibleId: collectibles[5]._id,
    collectibleName: collectibles[5].name,
    requester: 'alice',
    owner: 'charlie',
    status: 'pending',
    createdAt: now
  };
  await db.swapRequests.insert(sampleSwapRequest2);
  await db.notifications.insert({
    _id: uuidv4(),
    userId: 'charlie',
    type: 'swap_request',
    swapRequestId: sampleSwapRequest2._id,
    collectibleName: sampleSwapRequest2.collectibleName,
    fromUser: 'alice',
    read: false,
    createdAt: now
  });

  console.log('演示数据已初始化');
}

app.listen(PORT, async () => {
  console.log(`后端服务器运行在 http://localhost:${PORT}`);
  await seedData();
});
