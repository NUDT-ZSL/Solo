const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { initializeDatabase } = require('./db');

const itemsRoutes = require('./routes/items');
const exchangesRoutes = require('./routes/exchanges');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

app.use(itemsRoutes);
app.use(exchangesRoutes);

app.get('/api/health', (req: any, res: any) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`社区物品交换平台后端服务已启动`);
      console.log(`服务地址: http://localhost:${PORT}`);
      console.log(`健康检查: http://localhost:${PORT}/api/health`);
    });
  })
  .catch((err: any) => {
    console.error('数据库初始化失败:', err);
    process.exit(1);
  });
