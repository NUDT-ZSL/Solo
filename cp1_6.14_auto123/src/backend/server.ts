import express, { Request, Response } from 'express';
import cors from 'cors';
import { dataStore } from './dataStore.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

function success<T>(res: Response, data?: T, message?: string): void {
  const response: ApiResponse<T> = { success: true };
  if (data !== undefined) response.data = data;
  if (message !== undefined) response.message = message;
  res.json(response);
}

function fail(res: Response, status: number, message: string): void {
  res.status(status).json({ success: false, message });
}

app.get('/api/galleries', (_req: Request, res: Response) => {
  const galleries = dataStore.getGalleries().map((g) => ({
    id: g.id,
    name: g.name,
    description: g.description,
    createdAt: g.createdAt,
    artworkCount: g.artworks.length,
  }));
  success(res, galleries);
});

app.get('/api/galleries/:id', (req: Request, res: Response) => {
  const gallery = dataStore.getGalleryById(req.params.id);
  if (!gallery) {
    return fail(res, 404, '展厅不存在');
  }
  success(res, gallery);
});

app.post('/api/galleries', (req: Request, res: Response) => {
  const { name, description } = req.body;
  if (!name || !description) {
    return fail(res, 400, '名称和简介不能为空');
  }
  const gallery = dataStore.createGallery(name, description);
  success(res, gallery, '展厅创建成功');
});

app.delete('/api/galleries/:id', (req: Request, res: Response) => {
  const deleted = dataStore.deleteGallery(req.params.id);
  if (!deleted) {
    return fail(res, 404, '展厅不存在');
  }
  success(res, undefined, '展厅删除成功');
});

app.get('/api/galleries/:galleryId/artworks/:artworkId', (req: Request, res: Response) => {
  const { galleryId, artworkId } = req.params;
  const artwork = dataStore.getArtworkById(galleryId, artworkId);
  if (!artwork) {
    return fail(res, 404, '画作不存在');
  }
  success(res, artwork);
});

app.post('/api/galleries/:galleryId/artworks', (req: Request, res: Response) => {
  const { galleryId } = req.params;
  const { title, author, description, thumbnail, image } = req.body;
  if (!title || !author) {
    return fail(res, 400, '标题和作者不能为空');
  }
  const artwork = dataStore.createArtwork(galleryId, {
    title,
    author,
    description: description || '',
    thumbnail: thumbnail || '',
    image: image || '',
  });
  if (!artwork) {
    return fail(res, 404, '展厅不存在');
  }
  success(res, artwork, '画作添加成功');
});

app.post('/api/galleries/:galleryId/artworks/:artworkId/like', (req: Request, res: Response) => {
  const { galleryId, artworkId } = req.params;
  const artwork = dataStore.likeArtwork(galleryId, artworkId);
  if (!artwork) {
    return fail(res, 404, '画作不存在');
  }
  success(res, { likes: artwork.likes }, '点赞成功');
});

app.get('/api/galleries/:galleryId/artworks/:artworkId/comments', (req: Request, res: Response) => {
  const { galleryId, artworkId } = req.params;
  const comments = dataStore.getComments(galleryId, artworkId);
  if (comments === undefined) {
    return fail(res, 404, '画作不存在');
  }
  success(res, comments);
});

app.post('/api/galleries/:galleryId/artworks/:artworkId/comments', (req: Request, res: Response) => {
  const { galleryId, artworkId } = req.params;
  const { username, avatar, content } = req.body;
  if (!username || !content) {
    return fail(res, 400, '用户名和评论内容不能为空');
  }
  const comment = dataStore.addComment(galleryId, artworkId, {
    username,
    avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
    content,
  });
  if (!comment) {
    return fail(res, 404, '画作不存在');
  }
  success(res, comment, '评论发表成功');
});

app.put('/api/galleries/:galleryId/artworks/:artworkId/comments/:commentId', (req: Request, res: Response) => {
  const { galleryId, artworkId, commentId } = req.params;
  const { content } = req.body;
  if (!content) {
    return fail(res, 400, '评论内容不能为空');
  }
  const comment = dataStore.updateComment(galleryId, artworkId, commentId, content);
  if (!comment) {
    return fail(res, 404, '评论不存在');
  }
  success(res, comment, '评论更新成功');
});

app.delete('/api/galleries/:galleryId/artworks/:artworkId/comments/:commentId', (req: Request, res: Response) => {
  const { galleryId, artworkId, commentId } = req.params;
  const deleted = dataStore.deleteComment(galleryId, artworkId, commentId);
  if (!deleted) {
    return fail(res, 404, '评论不存在');
  }
  success(res, undefined, '评论删除成功');
});

app.listen(PORT, () => {
  console.log(`CloudGallery API server running on http://localhost:${PORT}`);
});
