import { Router, Request, Response } from 'express';
import {
  getAllArticles,
  getArticleById,
  createArticle,
  updateArticle,
  getVersionsByArticleId,
  restoreVersion,
  getVersionById
} from './db';

const router = Router();

interface CreateArticleBody {
  title: string;
  content: string;
  editorNickname: string;
}

interface UpdateArticleBody {
  title: string;
  content: string;
  editorNickname: string;
}

interface RestoreVersionBody {
  editorNickname: string;
}

router.get('/articles', async (req: Request, res: Response) => {
  try {
    const { search } = req.query;
    const articles = await getAllArticles(search as string | undefined);
    res.json(articles);
  } catch (error) {
    res.status(500).json({ error: '获取词条列表失败' });
  }
});

router.post('/articles', async (req: Request, res: Response) => {
  try {
    const { title, content, editorNickname } = req.body as CreateArticleBody;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: '标题不能为空' });
    }
    if (title.length > 100) {
      return res.status(400).json({ error: '标题不能超过100字符' });
    }
    if (!editorNickname || !editorNickname.trim()) {
      return res.status(400).json({ error: '编辑者昵称不能为空' });
    }

    const article = await createArticle(title.trim(), content || '', editorNickname.trim());
    res.status(201).json(article);
  } catch (error) {
    res.status(500).json({ error: '创建词条失败' });
  }
});

router.get('/articles/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const article = await getArticleById(id);
    if (!article) {
      return res.status(404).json({ error: '词条不存在' });
    }
    res.json(article);
  } catch (error) {
    res.status(500).json({ error: '获取词条失败' });
  }
});

router.put('/articles/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, content, editorNickname } = req.body as UpdateArticleBody;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: '标题不能为空' });
    }
    if (title.length > 100) {
      return res.status(400).json({ error: '标题不能超过100字符' });
    }
    if (!editorNickname || !editorNickname.trim()) {
      return res.status(400).json({ error: '编辑者昵称不能为空' });
    }

    const article = await updateArticle(id, title.trim(), content || '', editorNickname.trim());
    if (!article) {
      return res.status(404).json({ error: '词条不存在' });
    }
    res.json(article);
  } catch (error) {
    res.status(500).json({ error: '更新词条失败' });
  }
});

router.get('/articles/:id/versions', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const article = await getArticleById(id);
    if (!article) {
      return res.status(404).json({ error: '词条不存在' });
    }
    const versions = await getVersionsByArticleId(id);
    res.json(versions);
  } catch (error) {
    res.status(500).json({ error: '获取版本历史失败' });
  }
});

router.get('/articles/:id/versions/:versionId', async (req: Request, res: Response) => {
  try {
    const { versionId } = req.params;
    const version = await getVersionById(versionId);
    if (!version) {
      return res.status(404).json({ error: '版本不存在' });
    }
    res.json(version);
  } catch (error) {
    res.status(500).json({ error: '获取版本失败' });
  }
});

router.post('/articles/:id/restore/:versionId', async (req: Request, res: Response) => {
  try {
    const { id, versionId } = req.params;
    const { editorNickname } = req.body as RestoreVersionBody;

    if (!editorNickname || !editorNickname.trim()) {
      return res.status(400).json({ error: '编辑者昵称不能为空' });
    }

    const article = await restoreVersion(id, versionId, editorNickname.trim());
    if (!article) {
      return res.status(404).json({ error: '词条或版本不存在' });
    }
    res.json(article);
  } catch (error) {
    res.status(500).json({ error: '回滚版本失败' });
  }
});

export default router;
