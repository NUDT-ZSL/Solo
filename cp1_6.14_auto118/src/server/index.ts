import express from 'express';
import cors from 'cors';
import codeSnippetsRoutes from './routes/codeSnippets';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api', codeSnippetsRoutes);

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
    },
  });
});

app.listen(PORT, () => {
  console.log(`🚀 CodeMosaic API 服务器已启动: http://localhost:${PORT}`);
  console.log(`📋 API 文档:`);
  console.log(`   GET  /api/snippets       - 获取代码片段列表`);
  console.log(`   GET  /api/snippets/:id   - 获取代码片段详情`);
  console.log(`   POST /api/snippets       - 创建代码片段`);
  console.log(`   PUT  /api/snippets/:id/status - 更新状态`);
  console.log(`   POST /api/snippets/:id/comments - 添加评论`);
  console.log(`   GET  /api/heatmap        - 获取热力图数据`);
  console.log(`   GET  /api/tags           - 获取所有标签`);
});
