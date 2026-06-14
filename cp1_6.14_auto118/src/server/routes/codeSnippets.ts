import express from 'express';
import { snippetStore } from '../models/snippetStore';
import type { CodeSnippet, Comment } from '../../client/types';

const router = express.Router();

router.get('/snippets', (req, res) => {
  const { tags, language, page = '1', limit = '20' } = req.query;
  
  const filters: { tags?: string[]; language?: string } = {};
  
  if (tags) {
    filters.tags = Array.isArray(tags) ? tags : [tags];
  }
  
  if (language && typeof language === 'string') {
    filters.language = language;
  }
  
  const result = snippetStore.getSnippets(
    filters,
    parseInt(page as string, 10),
    parseInt(limit as string, 10)
  );
  
  res.json({
    success: true,
    data: result,
  });
});

router.get('/snippets/:id', (req, res) => {
  const { id } = req.params;
  const snippet = snippetStore.getSnippetById(id);
  
  if (!snippet) {
    return res.status(404).json({
      success: false,
      data: null,
      message: '代码片段不存在',
    });
  }
  
  res.json({
    success: true,
    data: snippet,
  });
});

router.post('/snippets', (req, res) => {
  const { code, language, tags, title } = req.body;
  
  if (!code || !language || !tags) {
    return res.status(400).json({
      success: false,
      data: null,
      message: '缺少必要字段: code, language, tags',
    });
  }
  
  const snippet = snippetStore.createSnippet({
    code,
    language,
    tags: Array.isArray(tags) ? tags : [tags],
    title,
  });
  
  res.status(201).json({
    success: true,
    data: snippet,
  });
});

router.put('/snippets/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  if (!status || !['pending', 'approved', 'changes_requested'].includes(status)) {
    return res.status(400).json({
      success: false,
      data: null,
      message: '无效的状态值',
    });
  }
  
  const updated = snippetStore.updateSnippetStatus(id, status as CodeSnippet['status']);
  
  if (!updated) {
    return res.status(404).json({
      success: false,
      data: null,
      message: '代码片段不存在',
    });
  }
  
  res.json({
    success: true,
    data: updated,
  });
});

router.get('/snippets/:id/comments', (req, res) => {
  const { id } = req.params;
  const { page = '1', limit = '10' } = req.query;
  
  const result = snippetStore.getComments(
    id,
    parseInt(page as string, 10),
    parseInt(limit as string, 10)
  );
  
  res.json({
    success: true,
    data: result,
  });
});

router.post('/snippets/:id/comments', (req, res) => {
  const { id } = req.params;
  const { content, lineNumber, authorId } = req.body;
  
  if (!content || !authorId) {
    return res.status(400).json({
      success: false,
      data: null,
      message: '缺少必要字段: content, authorId',
    });
  }
  
  const comment = snippetStore.addComment(id, {
    content,
    lineNumber: lineNumber ? parseInt(lineNumber, 10) : undefined,
    authorId,
  });
  
  if (!comment) {
    return res.status(404).json({
      success: false,
      data: null,
      message: '代码片段不存在',
    });
  }
  
  res.status(201).json({
    success: true,
    data: comment,
  });
});

router.put('/snippets/:id/like', (req, res) => {
  const { id } = req.params;
  const updated = snippetStore.incrementLikes(id);
  
  if (!updated) {
    return res.status(404).json({
      success: false,
      data: null,
      message: '代码片段不存在',
    });
  }
  
  res.json({
    success: true,
    data: updated,
  });
});

router.get('/heatmap', (_req, res) => {
  const data = snippetStore.getHeatmapData();
  
  res.json({
    success: true,
    data,
  });
});

router.get('/tags', (_req, res) => {
  const tags = snippetStore.getAllTags();
  
  res.json({
    success: true,
    data: tags,
  });
});

export default router;
