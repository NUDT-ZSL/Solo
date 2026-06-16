import express from 'express';
import { PRESET_ROOM_TEMPLATES, DEFAULT_GRID_CONFIG } from '../data';

const app = express();
const PORT = 3001;

app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.get('/api/templates', (_req, res) => {
  res.json({
    success: true,
    data: PRESET_ROOM_TEMPLATES
  });
});

app.get('/api/template/:id', (req, res) => {
  const templateId = req.params.id;
  const template = PRESET_ROOM_TEMPLATES.find(t => t.id === templateId);
  
  if (!template) {
    return res.status(404).json({
      success: false,
      message: '模板不存在'
    });
  }

  res.json({
    success: true,
    data: {
      ...template,
      gridConfig: DEFAULT_GRID_CONFIG,
      modules: [],
      cells: []
    }
  });
});

app.get('/api/default-config', (_req, res) => {
  res.json({
    success: true,
    data: {
      gridConfig: DEFAULT_GRID_CONFIG,
      welcomeMessage: '欢迎使用家庭收纳空间规划器！开始创建您的收纳方案吧。'
    }
  });
});

app.post('/api/save', (req, res) => {
  console.log('保存数据:', req.body);
  res.json({
    success: true,
    message: '数据保存成功（模拟）',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`Express 服务器运行在 http://localhost:${PORT}`);
});
