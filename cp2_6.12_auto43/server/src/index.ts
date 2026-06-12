import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import {
  initDatabase,
  getAllExhibitions,
  getExhibitionById,
  createExhibition,
  updateExhibition,
  deleteExhibition,
  getArtifactsByExhibitionId,
  createArtifact,
  updateArtifact,
  deleteArtifact,
  getCommentsByExhibitionId,
  createComment,
  createFavorite,
  deleteFavorite,
  getFavoritesByUserId,
  getArtifactById,
  Exhibition
} from './database';

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use('/uploads', express.static(uploadsDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024
  },
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

const DEFAULT_USER_ID = 1;

app.get('/api/exhibitions', (req, res) => {
  try {
    const { tag } = req.query;
    const exhibitions = getAllExhibitions(tag as string);
    res.json(exhibitions);
  } catch (error) {
    res.status(500).json({ error: '获取展览列表失败' });
  }
});

app.get('/api/exhibitions/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const exhibition = getExhibitionById(id);
    
    if (!exhibition) {
      return res.status(404).json({ error: '展览不存在' });
    }
    
    const artifacts = getArtifactsByExhibitionId(id);
    res.json({
      ...exhibition,
      artifacts
    });
  } catch (error) {
    res.status(500).json({ error: '获取展览详情失败' });
  }
});

app.post('/api/exhibitions', (req, res) => {
  try {
    const {
      name,
      description = '',
      theme_color = '#3b82f6',
      creator_name = '匿名用户',
      creator_avatar = '',
      tags = '[]',
      status = 'draft'
    } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: '展览名称不能为空' });
    }
    
    const exhibition = createExhibition({
      name: name.trim(),
      description,
      theme_color,
      creator_name,
      creator_avatar,
      tags: typeof tags === 'string' ? tags : JSON.stringify(tags),
      status: status as Exhibition['status']
    });
    
    res.status(201).json(exhibition);
  } catch (error) {
    res.status(500).json({ error: '创建展览失败' });
  }
});

app.put('/api/exhibitions/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = getExhibitionById(id);
    
    if (!existing) {
      return res.status(404).json({ error: '展览不存在' });
    }
    
    const { tags } = req.body;
    const updateData = { ...req.body };
    
    if (tags && typeof tags !== 'string') {
      updateData.tags = JSON.stringify(tags);
    }
    
    const exhibition = updateExhibition(id, updateData);
    res.json(exhibition);
  } catch (error) {
    res.status(500).json({ error: '更新展览失败' });
  }
});

app.delete('/api/exhibitions/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const success = deleteExhibition(id);
    
    if (!success) {
      return res.status(404).json({ error: '展览不存在' });
    }
    
    res.json({ message: '删除成功' });
  } catch (error) {
    res.status(500).json({ error: '删除展览失败' });
  }
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请选择要上传的文件' });
    }
    
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
  } catch (error) {
    res.status(500).json({ error: '上传文件失败' });
  }
});

app.get('/api/artifacts', (req, res) => {
  try {
    const { exhibitionId } = req.query;
    
    if (!exhibitionId) {
      return res.status(400).json({ error: '缺少展览ID参数' });
    }
    
    const artifacts = getArtifactsByExhibitionId(parseInt(exhibitionId as string));
    res.json(artifacts);
  } catch (error) {
    res.status(500).json({ error: '获取展品列表失败' });
  }
});

app.post('/api/artifacts', (req, res) => {
  try {
    const {
      exhibition_id,
      title,
      description = '',
      image_url = '',
      position_x = 0,
      position_z = 0,
      sort_order = 0
    } = req.body;
    
    if (!exhibition_id) {
      return res.status(400).json({ error: '缺少展览ID' });
    }
    
    if (!title || title.trim() === '') {
      return res.status(400).json({ error: '展品标题不能为空' });
    }
    
    const exhibition = getExhibitionById(exhibition_id);
    if (!exhibition) {
      return res.status(404).json({ error: '展览不存在' });
    }
    
    const artifact = createArtifact({
      exhibition_id,
      title: title.trim(),
      description,
      image_url,
      position_x: Number(position_x),
      position_z: Number(position_z),
      sort_order: Number(sort_order)
    });
    
    res.status(201).json(artifact);
  } catch (error) {
    res.status(500).json({ error: '添加展品失败' });
  }
});

app.put('/api/artifacts/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = getArtifactById(id);
    
    if (!existing) {
      return res.status(404).json({ error: '展品不存在' });
    }
    
    const updateData = { ...req.body };
    if (updateData.position_x !== undefined) {
      updateData.position_x = Number(updateData.position_x);
    }
    if (updateData.position_z !== undefined) {
      updateData.position_z = Number(updateData.position_z);
    }
    if (updateData.sort_order !== undefined) {
      updateData.sort_order = Number(updateData.sort_order);
    }
    
    const artifact = updateArtifact(id, updateData);
    res.json(artifact);
  } catch (error) {
    res.status(500).json({ error: '更新展品失败' });
  }
});

app.delete('/api/artifacts/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const success = deleteArtifact(id);
    
    if (!success) {
      return res.status(404).json({ error: '展品不存在' });
    }
    
    res.json({ message: '删除成功' });
  } catch (error) {
    res.status(500).json({ error: '删除展品失败' });
  }
});

app.get('/api/comments', (req, res) => {
  try {
    const { exhibitionId } = req.query;
    
    if (!exhibitionId) {
      return res.status(400).json({ error: '缺少展览ID参数' });
    }
    
    const comments = getCommentsByExhibitionId(parseInt(exhibitionId as string));
    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: '获取评论列表失败' });
  }
});

app.post('/api/comments', (req, res) => {
  try {
    const { exhibition_id, content, user_id = DEFAULT_USER_ID } = req.body;
    
    if (!exhibition_id) {
      return res.status(400).json({ error: '缺少展览ID' });
    }
    
    if (!content || content.trim() === '') {
      return res.status(400).json({ error: '评论内容不能为空' });
    }
    
    const exhibition = getExhibitionById(exhibition_id);
    if (!exhibition) {
      return res.status(404).json({ error: '展览不存在' });
    }
    
    const comment = createComment({
      exhibition_id,
      user_id,
      content: content.trim()
    });
    
    res.status(201).json(comment);
  } catch (error) {
    res.status(500).json({ error: '添加评论失败' });
  }
});

app.post('/api/favorites', (req, res) => {
  try {
    const { exhibition_id, user_id = DEFAULT_USER_ID } = req.body;
    
    if (!exhibition_id) {
      return res.status(400).json({ error: '缺少展览ID' });
    }
    
    const exhibition = getExhibitionById(exhibition_id);
    if (!exhibition) {
      return res.status(404).json({ error: '展览不存在' });
    }
    
    const favorite = createFavorite(user_id, exhibition_id);
    
    if (!favorite) {
      return res.status(409).json({ error: '已经收藏过该展览' });
    }
    
    res.status(201).json(favorite);
  } catch (error) {
    res.status(500).json({ error: '添加收藏失败' });
  }
});

app.delete('/api/favorites/:exhibitionId', (req, res) => {
  try {
    const { exhibitionId } = req.params;
    const { user_id = DEFAULT_USER_ID } = req.query;
    
    const success = deleteFavorite(Number(user_id), parseInt(exhibitionId));
    
    if (!success) {
      return res.status(404).json({ error: '收藏不存在' });
    }
    
    res.json({ message: '取消收藏成功' });
  } catch (error) {
    res.status(500).json({ error: '取消收藏失败' });
  }
});

app.get('/api/favorites', (req, res) => {
  try {
    const { user_id = DEFAULT_USER_ID } = req.query;
    const favorites = getFavoritesByUserId(Number(user_id));
    res.json(favorites);
  } catch (error) {
    res.status(500).json({ error: '获取收藏列表失败' });
  }
});

initDatabase();

app.listen(PORT, () => {
  console.log(`虚拟博物馆后端服务已启动: http://localhost:${PORT}`);
});

export default app;
