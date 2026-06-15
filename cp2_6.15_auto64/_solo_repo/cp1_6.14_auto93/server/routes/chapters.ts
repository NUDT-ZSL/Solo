import { Router, Request, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

const router = Router();

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIMES = ['image/png', 'image/jpeg'];
const ALLOWED_EXTS = ['.png', '.jpg', '.jpeg'];

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_MIMES.includes(file.mimetype) && ALLOWED_EXTS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('仅支持 PNG/JPEG 格式图片'));
    }
  },
});

interface DraftImage {
  id: string;
  chapterId: string;
  stage: string;
  dataUrl: string;
  note: string;
  uploadedBy: string;
  createdAt: string;
}

interface Comment {
  id: string;
  chapterId: string;
  imageId?: string;
  taskId?: string;
  parentId?: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  createdAt: string;
  deleted?: boolean;
}

const draftImages: DraftImage[] = [];
const comments: Comment[] = [];

router.get('/:projectId/chapters/:chapterId', (req: Request, res: Response) => {
  const { _projectStore } = req.app.locals as { _projectStore: any[] };
  const project = _projectStore?.find((p: any) => p.id === req.params.projectId);
  if (!project) {
    res.status(404).json({ error: '项目不存在' });
    return;
  }
  const chapter = project.chapters.find((c: any) => c.id === req.params.chapterId);
  if (!chapter) {
    res.status(404).json({ error: '章节不存在' });
    return;
  }
  const chapterImages = draftImages.filter(img => img.chapterId === req.params.chapterId);
  const chapterComments = comments.filter(c => c.chapterId === req.params.chapterId && !c.deleted);
  res.json({ chapter, images: chapterImages, comments: chapterComments });
});

router.post(
  '/:projectId/chapters/:chapterId/images',
  upload.single('image'),
  (req: Request, res: Response) => {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: '请选择要上传的图片' });
      return;
    }
    const note = req.body.note || '';
    const stage = req.body.stage || 'storyboard';
    const uploadedBy = req.body.uploadedBy || '';

    if (note.length > 200) {
      res.status(400).json({ error: '备注不能超过200字' });
      return;
    }

    const base64 = file.buffer.toString('base64');
    const dataUrl = `data:${file.mimetype};base64,${base64}`;

    const image: DraftImage = {
      id: uuidv4(),
      chapterId: req.params.chapterId,
      stage,
      dataUrl,
      note,
      uploadedBy,
      createdAt: new Date().toISOString(),
    };
    draftImages.push(image);
    res.status(201).json({ id: image.id, chapterId: image.chapterId, stage: image.stage, note: image.note, uploadedBy: image.uploadedBy, createdAt: image.createdAt });
  }
);

router.use((err: any, _req: Request, res: Response, _next: any) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({ error: '图片大小不能超过5MB' });
    return;
  }
  if (err.message === '仅支持 PNG/JPEG 格式图片') {
    res.status(415).json({ error: err.message });
    return;
  }
  res.status(500).json({ error: '服务器错误' });
});

router.post('/:projectId/chapters/:chapterId/comments', (req: Request, res: Response) => {
  const { imageId, taskId, parentId, authorId, authorName, authorAvatar, content } = req.body;
  if (!content || typeof content !== 'string' || content.trim() === '') {
    res.status(400).json({ error: '评论内容不能为空' });
    return;
  }
  if (content.length > 500) {
    res.status(400).json({ error: '评论内容不能超过500字' });
    return;
  }
  const comment: Comment = {
    id: uuidv4(),
    chapterId: req.params.chapterId,
    imageId: imageId || undefined,
    taskId: taskId || undefined,
    parentId: parentId || undefined,
    authorId: authorId || 'anonymous',
    authorName: authorName || '匿名用户',
    authorAvatar: authorAvatar || '',
    content: content.trim(),
    createdAt: new Date().toISOString(),
  };
  comments.push(comment);
  res.status(201).json(comment);
});

router.delete('/:projectId/chapters/:chapterId/comments/:commentId', (req: Request, res: Response) => {
  const comment = comments.find(c => c.id === req.params.commentId);
  if (!comment) {
    res.status(404).json({ error: '评论不存在' });
    return;
  }
  const { authorId } = req.body;
  if (comment.authorId !== authorId) {
    res.status(403).json({ error: '只能删除自己的评论' });
    return;
  }
  comment.deleted = true;
  res.status(204).send();
});

router.get('/:projectId/chapters/:chapterId/comments', (req: Request, res: Response) => {
  const { imageId, taskId } = req.query;
  let filtered = comments.filter(c => c.chapterId === req.params.chapterId && !c.deleted);
  if (imageId) filtered = filtered.filter(c => c.imageId === imageId);
  if (taskId) filtered = filtered.filter(c => c.taskId === taskId);
  res.json(filtered);
});

export default router;
