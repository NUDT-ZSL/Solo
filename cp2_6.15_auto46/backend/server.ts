import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { initDatabase, getWeatherData, WeatherData, closeDatabase, VALID_CITIES, CITY_NAME_MAP } from './database.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

interface ErrorResponse {
  success: false;
  errorCode: string;
  error: string;
  details?: Record<string, any>;
}

interface SuccessResponse<T> {
  success: true;
  data: T;
}

type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse;

function createError(errorCode: string, error: string, details?: Record<string, any>): ErrorResponse {
  const response: ErrorResponse = {
    success: false,
    errorCode,
    error,
  };
  if (details) {
    response.details = details;
  }
  return response;
}

app.get('/api/weather', async (req: Request, res: Response) => {
  try {
    const cityList = VALID_CITIES.filter(c => c !== 'all').map(code => ({
      code,
      name: CITY_NAME_MAP[code],
    }));

    res.json({
      success: true,
      data: {
        cities: cityList,
        message: '请在URL中指定城市参数，例如：/api/weather/beijing?days=7',
      },
    });
  } catch (error) {
    res.status(500).json(
      createError('INTERNAL_ERROR', error instanceof Error ? error.message : '获取城市列表失败')
    );
  }
});

app.get('/api/weather/:city', async (req: Request, res: Response) => {
  try {
    const { city } = req.params;

    if (city === null || city === undefined || city.trim() === '') {
      res.status(400).json(
        createError('CITY_EMPTY', '城市参数不能为空', {
          hint: '请在URL中指定城市，例如：/api/weather/beijing',
          validCities: VALID_CITIES,
        })
      );
      return;
    }

    if (!VALID_CITIES.includes(city as any)) {
      res.status(400).json(
        createError('CITY_INVALID', `不支持的城市: ${city}`, {
          currentValue: city,
          validCities: VALID_CITIES,
          hint: '请使用以下城市代码: beijing, shanghai, guangzhou, all',
        })
      );
      return;
    }

    const daysStr = req.query.days as string;
    let days: number;

    if (daysStr === undefined || daysStr === null || daysStr === '') {
      days = 7;
    } else {
      days = parseInt(daysStr, 10);

      if (isNaN(days)) {
        res.status(400).json(
          createError('DAYS_INVALID', 'days参数必须是有效数字', {
            currentValue: daysStr,
            hint: '请输入一个有效的整数，例如：?days=7',
          })
        );
        return;
      }
    }

    if (days < 1 || days > 365) {
      res.status(400).json(
        createError('DAYS_OUT_OF_RANGE', `days参数超出允许范围`, {
          currentValue: days,
          minValue: 1,
          maxValue: 365,
          hint: '天数必须在 1 到 365 天之间',
        })
      );
      return;
    }

    const data: WeatherData[] = await getWeatherData(city, days);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).json(
      createError('QUERY_FAILED', error instanceof Error ? error.message : '查询天气数据失败')
    );
  }
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('服务器错误:', err);
  res.status(500).json(
    createError('INTERNAL_ERROR', err.message || '服务器内部错误')
  );
});

app.use((req: Request, res: Response) => {
  res.status(404).json(
    createError('NOT_FOUND', '接口不存在', {
      path: req.path,
      method: req.method,
    })
  );
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
