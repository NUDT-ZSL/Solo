import express from 'express';
import Datastore from 'nedb-promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3002;
const PAGE_SIZE = 30;

const db = Datastore.create({
  filename: join(__dirname, 'logs.db'),
  autoload: true
});

const LEVELS = ['error', 'warn', 'info'];
const USERS = ['admin', 'zhangsan', 'lisi', 'wangwu', 'zhaoliu', 'qianqi', 'sunba', 'zhoujiu'];
const ACTIONS = [
  { desc: '用户登录系统', req: { username: 'string', ip: 'string' }, res: { token: 'string', expiresIn: 'number' } },
  { desc: '修改个人密码', req: { oldPassword: 'string', newPassword: 'string' }, res: { success: 'boolean' } },
  { desc: '创建新订单', req: { productId: 'string', quantity: 'number', amount: 'number' }, res: { orderId: 'string', status: 'string' } },
  { desc: '删除订单记录', req: { orderId: 'string' }, res: { success: 'boolean', affectedRows: 'number' } },
  { desc: '导出数据报表', req: { format: 'string', dateRange: 'object' }, res: { fileUrl: 'string', fileSize: 'number' } },
  { desc: '更新商品信息', req: { productId: 'string', name: 'string', price: 'number' }, res: { success: 'boolean' } },
  { desc: '审批请假申请', req: { applicationId: 'string', approved: 'boolean' }, res: { status: 'string' } },
  { desc: '上传文件附件', req: { fileName: 'string', fileType: 'string' }, res: { fileId: 'string', url: 'string' } },
  { desc: '配置系统参数', req: { key: 'string', value: 'string' }, res: { success: 'boolean' } },
  { desc: '查看用户详情', req: { userId: 'string' }, res: { user: 'object' } },
  { desc: '分配角色权限', req: { userId: 'string', roles: 'array' }, res: { success: 'boolean' } },
  { desc: '发送系统通知', req: { recipientIds: 'array', content: 'string' }, res: { sentCount: 'number' } },
  { desc: '批量导入数据', req: { total: 'number', source: 'string' }, res: { imported: 'number', failed: 'number' } },
  { desc: '刷新缓存数据', req: { cacheKey: 'string' }, res: { success: 'boolean' } },
  { desc: '数据库备份', req: { backupName: 'string' }, res: { backupId: 'string', size: 'string' } }
];

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateMockData() {
  const logs = [];
  const now = new Date();

  for (let i = 0; i < 500; i++) {
    const daysAgo = randomInt(0, 6);
    const hoursAgo = randomInt(0, 23);
    const minutesAgo = randomInt(0, 59);
    const secondsAgo = randomInt(0, 59);

    const timestamp = new Date(now);
    timestamp.setDate(timestamp.getDate() - daysAgo);
    timestamp.setHours(timestamp.getHours() - hoursAgo);
    timestamp.setMinutes(timestamp.getMinutes() - minutesAgo);
    timestamp.setSeconds(timestamp.getSeconds() - secondsAgo);

    const action = randomChoice(ACTIONS);
    const level = randomChoice(LEVELS);
    const user = randomChoice(USERS);

    const reqParams = {};
    for (const [key, type] of Object.entries(action.req)) {
      if (type === 'string') {
        reqParams[key] = `${key}_${randomInt(1000, 9999)}`;
      } else if (type === 'number') {
        reqParams[key] = randomInt(1, 10000);
      } else if (type === 'boolean') {
        reqParams[key] = Math.random() > 0.3;
      } else if (type === 'array') {
        reqParams[key] = Array.from({ length: randomInt(1, 5) }, () => `item_${randomInt(1, 100)}`);
      } else if (type === 'object') {
        reqParams[key] = { id: randomInt(1, 999), name: `name_${randomInt(1, 100)}` };
      }
    }

    const resData = {};
    for (const [key, type] of Object.entries(action.res)) {
      if (type === 'string') {
        resData[key] = `${key}_${uuidv4().slice(0, 8)}`;
      } else if (type === 'number') {
        resData[key] = randomInt(1, 10000);
      } else if (type === 'boolean') {
        resData[key] = level === 'error' ? false : true;
      } else if (type === 'object') {
        resData[key] = { id: randomInt(1, 999), status: level === 'error' ? 'failed' : 'success' };
      }
    }

    logs.push({
      _id: uuidv4(),
      timestamp: timestamp.toISOString(),
      level,
      operator: user,
      action: action.desc,
      requestParams: reqParams,
      responseData: resData
    });
  }

  logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  return logs;
}

async function initDatabase() {
  const count = await db.count({});
  if (count === 0) {
    const mockData = generateMockData();
    await db.insert(mockData);
    console.log(`已初始化 ${mockData.length} 条日志数据`);
  } else {
    console.log(`数据库已存在 ${count} 条日志数据`);
  }
}

app.use(express.json());

app.get('/api/logs', async (req, res) => {
  try {
    const { date, q, page = 1 } = req.query;
    const pageNum = parseInt(page, 10);
    const skip = (pageNum - 1) * PAGE_SIZE;

    const query = {};

    if (date) {
      const targetDate = new Date(date);
      const nextDate = new Date(targetDate);
      nextDate.setDate(nextDate.getDate() + 1);
      query.timestamp = {
        $gte: targetDate.toISOString(),
        $lt: nextDate.toISOString()
      };
    }

    if (q) {
      const searchRegex = new RegExp(q, 'i');
      query.$or = [
        { operator: searchRegex },
        { action: searchRegex },
        { level: searchRegex }
      ];
    }

    const [logs, total] = await Promise.all([
      db.find(query).sort({ timestamp: -1 }).skip(skip).limit(PAGE_SIZE),
      db.count(query)
    ]);

    res.json({
      data: logs,
      pagination: {
        page: pageNum,
        pageSize: PAGE_SIZE,
        total,
        hasMore: skip + logs.length < total
      }
    });
  } catch (err) {
    console.error('查询日志失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.listen(PORT, async () => {
  console.log(`LogPage 后端服务运行在 http://localhost:${PORT}`);
  await initDatabase();
});
