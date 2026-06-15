import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import {
  initDatabase,
  getAllExhibitions,
  getExhibitionById,
  getExhibitionsByCreator,
  createExhibition,
  updateExhibition,
  deleteExhibition,
  getArtifactsByExhibition,
  createArtifact,
  updateArtifact,
  deleteArtifactsByExhibition,
  getCommentsByExhibition,
  createComment,
  getFavoritesByUser,
  isFavorite,
  createFavorite,
  deleteFavorite,
  Exhibition,
  Artifact,
} from './database';

const app = express();
const PORT = 4000;

const MOCK_USER_ID = 'user_demo_001';
const MOCK_USER_NAME = '博物馆爱好者';
const MOCK_USER_AVATAR = 'https://api.dicebear.com/7.x/avataaars/svg?seed=museum';

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const uploadDir = path.resolve(__dirname, '../../uploads');
const publicDir = path.resolve(__dirname, '../../public');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

app.use('/uploads', express.static(uploadDir));
app.use('/public', express.static(publicDir));

const MAX_FILE_SIZE = 3 * 1024 * 1024;
const ALLOWED_MIME = ['image/jpeg', 'image/jpg', 'image/png'];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    cb(null, `${Date.now()}_${uuidv4().slice(0, 8)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      cb(new Error('只允许上传 JPG 或 PNG 格式的图片'));
      return;
    }
    cb(null, true);
  },
});

initDatabase();

const VALID_THEME_COLORS = [
  '暖阳橙', '深海蓝', '森林绿', '暗夜紫',
  '樱花粉', '极光青', '熔岩红', '星空白',
];

function validatePosition(val: number): boolean {
  return typeof val === 'number' && !isNaN(val) && val >= -5 && val <= 5;
}

function parseTags(tags: any): string {
  if (Array.isArray(tags)) return JSON.stringify(tags);
  if (typeof tags === 'string') {
    try {
      const arr = JSON.parse(tags);
      if (Array.isArray(arr)) return JSON.stringify(arr);
    } catch {
      return JSON.stringify(tags.split(',').map(t => t.trim()).filter(Boolean));
    }
  }
  return '[]';
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.post('/api/upload', (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      if (err.message.includes('File too large')) {
        return res.status(400).json({ error: '图片大小不能超过 3MB' });
      }
      return res.status(400).json({ error: err.message || '上传失败' });
    }
    if (!req.file) {
      return res.status(400).json({ error: '请选择要上传的图片' });
    }
    try {
      const filePath = req.file.path;
      const ext = path.extname(req.file.filename).toLowerCase();
      const webpName = req.file.filename.replace(ext, '.webp');
      const webpPath = path.join(uploadDir, webpName);

      await sharp(filePath)
        .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(webpPath);

      try { fs.unlinkSync(filePath); } catch { /* ignore */ }

      res.json({
        url: `/uploads/${webpName}`,
        originalName: req.file.originalname,
        size: fs.statSync(webpPath).size,
      });
    } catch (processErr) {
      console.error('Image processing error:', processErr);
      res.json({
        url: `/uploads/${req.file.filename}`,
        originalName: req.file.originalname,
      });
    }
  });
});

app.get('/api/exhibitions', (req, res) => {
  const { tag } = req.query;
  try {
    const exhibitions = getAllExhibitions(tag as string);
    const result = exhibitions.map(ex => ({
      ...ex,
      tags: JSON.parse(ex.tags || '[]'),
    }));
    res.json(result);
  } catch (err) {
    console.error('Get exhibitions error:', err);
    res.status(500).json({ error: '获取展览列表失败' });
  }
});

app.get('/api/exhibitions/mine', (_req, res) => {
  try {
    const exhibitions = getExhibitionsByCreator(MOCK_USER_ID);
    const result = exhibitions.map(ex => ({
      ...ex,
      tags: JSON.parse(ex.tags || '[]'),
    }));
    res.json(result);
  } catch (err) {
    console.error('Get my exhibitions error:', err);
    res.status(500).json({ error: '获取我的展览失败' });
  }
});

app.get('/api/exhibitions/:id', (req, res) => {
  const { id } = req.params;
  try {
    const ex = getExhibitionById(id);
    if (!ex) {
      return res.status(404).json({ error: '展览不存在' });
    }
    const artifacts = getArtifactsByExhibition(id);
    res.json({
      ...ex,
      tags: JSON.parse(ex.tags || '[]'),
      artifacts,
    });
  } catch (err) {
    console.error('Get exhibition detail error:', err);
    res.status(500).json({ error: '获取展览详情失败' });
  }
});

app.post('/api/exhibitions', (req, res) => {
  const { name, description, theme_color, tags, status, cover_image, artifacts } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: '展览名称不能为空' });
  }
  if (name.length > 100) {
    return res.status(400).json({ error: '展览名称不能超过100字' });
  }
  if (description && description.length > 500) {
    return res.status(400).json({ error: '展览描述不能超过500字' });
  }
  if (theme_color && !VALID_THEME_COLORS.includes(theme_color)) {
    return res.status(400).json({ error: '无效的主题配色' });
  }
  if (!artifacts || !Array.isArray(artifacts) || artifacts.length < 1 || artifacts.length > 5) {
    return res.status(400).json({ error: '展品数量需在 1-5 件之间' });
  }

  for (let i = 0; i < artifacts.length; i++) {
    const art = artifacts[i];
    if (!art.image_url) {
      return res.status(400).json({ error: `第${i + 1}件展品缺少图片` });
    }
    if (!validatePosition(art.position_x) || !validatePosition(art.position_z)) {
      return res.status(400).json({ error: `第${i + 1}件展品坐标必须在 -5 到 5 之间` });
    }
  }

  const exId = uuidv4();
  const finalTheme = theme_color || '暖阳橙';
  const finalCover = cover_image || (artifacts[0]?.image_url ?? null);

  try {
    const exhibition: Omit<Exhibition, 'created_at' | 'updated_at'> = {
      id: exId,
      name: name.trim(),
      description: (description || '').trim(),
      theme_color: finalTheme,
      tags: parseTags(tags),
      status: status === 'published' ? 'published' : 'draft',
      creator_id: MOCK_USER_ID,
      creator_name: MOCK_USER_NAME,
      creator_avatar: MOCK_USER_AVATAR,
      cover_image: finalCover,
    };

    createExhibition(exhibition);

    for (let i = 0; i < artifacts.length; i++) {
      const art = artifacts[i];
      const artifact: Omit<Artifact, 'created_at'> = {
        id: uuidv4(),
        exhibition_id: exId,
        title: (art.title || '展品').trim(),
        description: (art.description || '').trim(),
        image_url: art.image_url,
        position_x: Number(art.position_x),
        position_z: Number(art.position_z),
        sort_order: i,
      };
      createArtifact(artifact);
    }

    res.status(201).json({ id: exId, message: '展览创建成功' });
  } catch (err) {
    console.error('Create exhibition error:', err);
    res.status(500).json({ error: '创建展览失败' });
  }
});

app.put('/api/exhibitions/:id', (req, res) => {
  const { id } = req.params;
  const { name, description, theme_color, tags, status, cover_image, artifacts } = req.body;

  const existing = getExhibitionById(id);
  if (!existing) {
    return res.status(404).json({ error: '展览不存在' });
  }

  if (name !== undefined) {
    if (!name.trim()) return res.status(400).json({ error: '展览名称不能为空' });
    if (name.length > 100) return res.status(400).json({ error: '展览名称不能超过100字' });
  }
  if (description !== undefined && description.length > 500) {
    return res.status(400).json({ error: '展览描述不能超过500字' });
  }
  if (theme_color !== undefined && !VALID_THEME_COLORS.includes(theme_color)) {
    return res.status(400).json({ error: '无效的主题配色' });
  }
  if (artifacts !== undefined) {
    if (!Array.isArray(artifacts) || artifacts.length < 1 || artifacts.length > 5) {
      return res.status(400).json({ error: '展品数量需在 1-5 件之间' });
    }
    for (let i = 0; i < artifacts.length; i++) {
      const art = artifacts[i];
      if (!art.image_url) {
        return res.status(400).json({ error: `第${i + 1}件展品缺少图片` });
      }
      if (!validatePosition(art.position_x) || !validatePosition(art.position_z)) {
        return res.status(400).json({ error: `第${i + 1}件展品坐标必须在 -5 到 5 之间` });
      }
    }
  }

  try {
    const updateData: Partial<Omit<Exhibition, 'id' | 'created_at'>> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (theme_color !== undefined) updateData.theme_color = theme_color;
    if (tags !== undefined) updateData.tags = parseTags(tags);
    if (status !== undefined) updateData.status = status;
    if (cover_image !== undefined) updateData.cover_image = cover_image;

    if (Object.keys(updateData).length > 0) {
      updateExhibition(id, updateData);
    }

    if (artifacts !== undefined) {
      deleteArtifactsByExhibition(id);
      for (let i = 0; i < artifacts.length; i++) {
        const art = artifacts[i];
        createArtifact({
          id: art.id || uuidv4(),
          exhibition_id: id,
          title: (art.title || '展品').trim(),
          description: (art.description || '').trim(),
          image_url: art.image_url,
          position_x: Number(art.position_x),
          position_z: Number(art.position_z),
          sort_order: i,
        });
      }
    }

    res.json({ id, message: '展览更新成功' });
  } catch (err) {
    console.error('Update exhibition error:', err);
    res.status(500).json({ error: '更新展览失败' });
  }
});

app.delete('/api/exhibitions/:id', (req, res) => {
  const { id } = req.params;
  const existing = getExhibitionById(id);
  if (!existing) {
    return res.status(404).json({ error: '展览不存在' });
  }
  try {
    deleteExhibition(id);
    res.json({ message: '删除成功' });
  } catch (err) {
    console.error('Delete exhibition error:', err);
    res.status(500).json({ error: '删除失败' });
  }
});

app.patch('/api/exhibitions/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['draft', 'published', 'archived'].includes(status)) {
    return res.status(400).json({ error: '无效的状态值' });
  }
  const existing = getExhibitionById(id);
  if (!existing) {
    return res.status(404).json({ error: '展览不存在' });
  }
  try {
    updateExhibition(id, { status });
    res.json({ message: '状态更新成功' });
  } catch (err) {
    console.error('Status update error:', err);
    res.status(500).json({ error: '状态更新失败' });
  }
});

app.get('/api/exhibitions/:id/comments', (req, res) => {
  const { id } = req.params;
  try {
    const comments = getCommentsByExhibition(id);
    res.json(comments);
  } catch (err) {
    console.error('Get comments error:', err);
    res.status(500).json({ error: '获取评论失败' });
  }
});

app.post('/api/exhibitions/:id/comments', (req, res) => {
  const { id } = req.params;
  const { content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: '评论内容不能为空' });
  }
  if (content.length > 200) {
    return res.status(400).json({ error: '评论不能超过200字' });
  }
  const existing = getExhibitionById(id);
  if (!existing) {
    return res.status(404).json({ error: '展览不存在' });
  }
  try {
    const comment = createComment({
      id: uuidv4(),
      exhibition_id: id,
      user_id: MOCK_USER_ID,
      user_name: MOCK_USER_NAME,
      user_avatar: MOCK_USER_AVATAR,
      content: content.trim(),
    });
    res.status(201).json(comment);
  } catch (err) {
    console.error('Create comment error:', err);
    res.status(500).json({ error: '评论发布失败' });
  }
});

app.get('/api/favorites', (_req, res) => {
  try {
    const favs = getFavoritesByUser(MOCK_USER_ID);
    const result = favs.map(f => ({
      id: f.exhibition_id,
      name: (f as any).name,
      description: (f as any).description,
      theme_color: (f as any).theme_color,
      tags: JSON.parse((f as any).tags || '[]'),
      status: (f as any).status,
      creator_name: (f as any).creator_name,
      creator_avatar: (f as any).creator_avatar,
      cover_image: (f as any).cover_image,
      favorited_at: f.created_at,
    }));
    res.json(result);
  } catch (err) {
    console.error('Get favorites error:', err);
    res.status(500).json({ error: '获取收藏列表失败' });
  }
});

app.get('/api/favorites/:exhibitionId', (req, res) => {
  const { exhibitionId } = req.params;
  try {
    const favorited = isFavorite(MOCK_USER_ID, exhibitionId);
    res.json({ favorited });
  } catch (err) {
    console.error('Check favorite error:', err);
    res.status(500).json({ error: '检查收藏状态失败' });
  }
});

app.post('/api/favorites/:exhibitionId', (req, res) => {
  const { exhibitionId } = req.params;
  const existing = getExhibitionById(exhibitionId);
  if (!existing) {
    return res.status(404).json({ error: '展览不存在' });
  }
  try {
    if (isFavorite(MOCK_USER_ID, exhibitionId)) {
      deleteFavorite(MOCK_USER_ID, exhibitionId);
      res.json({ favorited: false, message: '已取消收藏' });
    } else {
      createFavorite(MOCK_USER_ID, exhibitionId);
      res.json({ favorited: true, message: '收藏成功' });
    }
  } catch (err) {
    console.error('Toggle favorite error:', err);
    res.status(500).json({ error: '操作失败' });
  }
});

app.get('/api/user/me', (_req, res) => {
  res.json({
    id: MOCK_USER_ID,
    name: MOCK_USER_NAME,
    avatar: MOCK_USER_AVATAR,
  });
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: '服务器内部错误' });
});

app.listen(PORT, () => {
  console.log(`Virtual Museum API server running on http://localhost:${PORT}`);
});
