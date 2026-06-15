import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { initDatabase, getWeatherData, WeatherData, closeDatabase } from './database.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get('/api/weather/:city', async (req: Request, res: Response) => {
  try {
    const { city } = req.params;
    const days = parseInt(req.query.days as string) || 7;

    if (days < 1 || days > 365) {
      res.status(400).json({
        success: false,
        error: 'days参数必须在1-365之间'
      });
      return;
    }

    const validCities = ['beijing', 'shanghai', 'guangzhou', 'all'];
    if (!validCities.includes(city)) {
      res.status(400).json({
        success: false,
        error: '不支持的城市，可选值：beijing, shanghai, guangzhou, all'
      });
      return;
    }

    const data: WeatherData[] = await getWeatherData(city, days);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '查询天气数据失败'
    });
  }
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    success: false,
    error: err.message || '服务器内部错误'
  });
});

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: '接口不存在'
  });
});

async function startServer() {
  try {
    await initDatabase();
    console.log('数据库初始化成功');

    const server = app.listen(PORT, () => {
      console.log(`天气服务已启动，监听端口 ${PORT}`);
      console.log(`接口地址: http://localhost:${PORT}/api/weather/beijing?days=7`);
    });

    process.on('SIGTERM', async () => {
      console.log('收到SIGTERM信号，正在关闭服务...');
      server.close(() => {
        closeDatabase().then(() => {
          console.log('服务已关闭');
          process.exit(0);
        });
      });
    });

    process.on('SIGINT', async () => {
      console.log('收到SIGINT信号，正在关闭服务...');
      server.close(() => {
        closeDatabase().then(() => {
          console.log('服务已关闭');
          process.exit(0);
        });
      });
    });
  } catch (error) {
    console.error('服务启动失败:', error);
    process.exit(1);
  }
}

startServer();

export default app;
