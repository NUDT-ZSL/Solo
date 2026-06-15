import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';

interface ArticleVersion {
  id: string;
  title: string;
  body: string;
  createdAt: number;
}

interface PublishRecord {
  platformId: string;
  platformName: string;
  status: 'success' | 'failed' | 'publishing';
  timestamp: number;
  formattedContent: string;
  errorMessage?: string;
}

interface Article {
  id: string;
  title: string;
  body: string;
  versions: ArticleVersion[];
  publishHistory: PublishRecord[];
  isDraft: boolean;
  createdAt: number;
  updatedAt: number;
}

interface PlatformConfig {
  id: string;
  name: string;
  includeOriginalLink: boolean;
  hashtagPrefix: string;
  thumbnailSize: string;
  template: string;
}

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

let articles: Article[] = [];
let articleIdCounter = 1;

const defaultPlatforms: PlatformConfig[] = [
  {
    id: 'wechat',
    name: '微信公众号',
    includeOriginalLink: true,
    hashtagPrefix: '#',
    thumbnailSize: '900x383',
    template: '{{title}}\n\n{{body}}\n\n{{#if includeOriginalLink}}\n原文链接：{{originalLink}}\n{{/if}}'
  },
  {
    id: 'weibo',
    name: '微博',
    includeOriginalLink: false,
    hashtagPrefix: '#',
    thumbnailSize: '1080x1080',
    template: '{{title}} {{hashtags}}\n\n{{body}}\n\n{{#if includeOriginalLink}}\n{{originalLink}}\n{{/if}}'
  },
  {
    id: 'zhihu',
    name: '知乎',
    includeOriginalLink: true,
    hashtagPrefix: '',
    thumbnailSize: '1920x1080',
    template: '# {{title}}\n\n{{body}}\n\n{{#if includeOriginalLink}}\n> 原文链接：{{originalLink}}\n{{/if}}'
  }
];

let platforms: PlatformConfig[] = [...defaultPlatforms];

function generateId(prefix: string, counter: number): string {
  return `${prefix}_${counter}_${Date.now()}`;
}

function formatContent(
  article: Article,
  platform: PlatformConfig,
  hashtags: string[] = []
): string {
  let content = platform.template;
  content = content.replace(/\{\{title\}\}/g, article.title);
  content = content.replace(/\{\{body\}\}/g, article.body);
  
  const hashtagStr = hashtags.map(tag => 
    `${platform.hashtagPrefix}${tag}${platform.hashtagPrefix ? '' : ''}`
  ).join(' ');
  content = content.replace(/\{\{hashtags\}\}/g, hashtagStr);
  
  if (platform.includeOriginalLink) {
    content = content.replace(/\{\{#if includeOriginalLink\}\}([\s\S]*?)\{\{\/if\}\}/g, '$1');
    content = content.replace(/\{\{originalLink\}\}/g, `https://example.com/article/${article.id}`);
  } else {
    content = content.replace(/\{\{#if includeOriginalLink\}\}[\s\S]*?\{\{\/if\}\}/g, '');
  }
  
  return content.trim();
}

app.get('/api/articles', (req, res) => {
  const result = articles.map(a => ({
    id: a.id,
    title: a.title,
    body: a.body,
    isDraft: a.isDraft,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
    versionsCount: a.versions.length,
    publishHistoryCount: a.publishHistory.length,
    latestPublishStatus: a.publishHistory.length > 0 
      ? a.publishHistory[a.publishHistory.length - 1].status 
      : null
  }));
  res.json(result);
});

app.get('/api/articles/:id', (req, res) => {
  const article = articles.find(a => a.id === req.params.id);
  if (!article) {
    return res.status(404).json({ error: 'Article not found' });
  }
  res.json(article);
});

app.post('/api/articles', (req, res) => {
  const { title, body } = req.body;
  const versionId = generateId('ver', articleIdCounter);
  
  const newArticle: Article = {
    id: generateId('art', articleIdCounter),
    title: title || '无标题文章',
    body: body || '',
    versions: [{
      id: versionId,
      title: title || '无标题文章',
      body: body || '',
      createdAt: Date.now()
    }],
    publishHistory: [],
    isDraft: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  
  articleIdCounter++;
  articles.unshift(newArticle);
  res.status(201).json(newArticle);
});

app.put('/api/articles/:id', (req, res) => {
  const index = articles.findIndex(a => a.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Article not found' });
  }
  
  const { title, body } = req.body;
  const article = articles[index];
  
  const versionId = generateId('ver', articleIdCounter);
  article.versions.push({
    id: versionId,
    title: title || article.title,
    body: body || article.body,
    createdAt: Date.now()
  });
  
  article.title = title || article.title;
  article.body = body || article.body;
  article.updatedAt = Date.now();
  article.isDraft = true;
  
  articleIdCounter++;
  res.json(article);
});

app.delete('/api/articles/:id', (req, res) => {
  const index = articles.findIndex(a => a.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Article not found' });
  }
  articles.splice(index, 1);
  res.json({ success: true });
});

app.get('/api/articles/:id/versions', (req, res) => {
  const article = articles.find(a => a.id === req.params.id);
  if (!article) {
    return res.status(404).json({ error: 'Article not found' });
  }
  res.json(article.versions);
});

app.post('/api/articles/:id/versions/:versionId/restore', (req, res) => {
  const article = articles.find(a => a.id === req.params.id);
  if (!article) {
    return res.status(404).json({ error: 'Article not found' });
  }
  
  const version = article.versions.find(v => v.id === req.params.versionId);
  if (!version) {
    return res.status(404).json({ error: 'Version not found' });
  }
  
  const newVersionId = generateId('ver', articleIdCounter);
  article.versions.push({
    id: newVersionId,
    title: version.title,
    body: version.body,
    createdAt: Date.now()
  });
  
  article.title = version.title;
  article.body = version.body;
  article.updatedAt = Date.now();
  
  articleIdCounter++;
  res.json(article);
});

app.get('/api/platforms', (req, res) => {
  res.json(platforms);
});

app.put('/api/platforms/:id', (req, res) => {
  const index = platforms.findIndex(p => p.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Platform not found' });
  }
  
  platforms[index] = { ...platforms[index], ...req.body };
  res.json(platforms[index]);
});

app.post('/api/articles/:id/publish', async (req, res) => {
  const article = articles.find(a => a.id === req.params.id);
  if (!article) {
    return res.status(404).json({ error: 'Article not found' });
  }
  
  const { platformIds } = req.body;
  const targetPlatforms = platformIds 
    ? platforms.filter(p => platformIds.includes(p.id))
    : platforms;
  
  const publishRecords: PublishRecord[] = targetPlatforms.map(p => ({
    platformId: p.id,
    platformName: p.name,
    status: 'publishing' as const,
    timestamp: Date.now(),
    formattedContent: formatContent(article, p)
  }));
  
  article.publishHistory.push(...publishRecords);
  article.isDraft = false;
  article.updatedAt = Date.now();
  
  res.json({ 
    articleId: article.id,
    status: 'publishing',
    records: publishRecords
  });
  
  setTimeout(() => {
    targetPlatforms.forEach((platform, idx) => {
      setTimeout(() => {
        const record = article.publishHistory.find(
          r => r.platformId === platform.id && r.status === 'publishing'
        );
        if (record) {
          const success = Math.random() > 0.15;
          record.status = success ? 'success' : 'failed';
          record.timestamp = Date.now();
          if (!success) {
            record.errorMessage = '网络连接超时，请稍后重试';
          }
        }
      }, 200 + idx * 150);
    });
  }, 100);
});

app.get('/api/articles/:id/publish-status', (req, res) => {
  const article = articles.find(a => a.id === req.params.id);
  if (!article) {
    return res.status(404).json({ error: 'Article not found' });
  }
  res.json({
    publishHistory: article.publishHistory
  });
});

app.listen(PORT, () => {
  console.log(`CrossPostHub server running on http://localhost:${PORT}`);
});
