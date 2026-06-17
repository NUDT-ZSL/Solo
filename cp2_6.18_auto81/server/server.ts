import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

interface Application {
  id: string;
  applicant: string;
  applyTime: string;
  status: 'active' | 'expired' | 'claimed';
}

interface Item {
  id: string;
  title: string;
  category: string;
  description: string;
  image: string;
  status: 'published' | 'applied' | 'claimed';
  publisher: string;
  publisherAvatar: string;
  publishTime: string;
  applications: Application[];
}

const app = express();
const PORT = 3001;
const DATA_FILE = path.join(__dirname, 'data', 'items.json');

app.use(cors());
app.use(express.json({ limit: '10mb' }));

function readItems(): Item[] {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data) as Item[];
  } catch (error) {
    console.error('读取数据文件失败:', error);
    return [];
  }
}

function writeItems(items: Item[]): void {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2), 'utf-8');
  } catch (error) {
    console.error('写入数据文件失败:', error);
  }
}

app.get('/api/items', (req: Request, res: Response) => {
  try {
    const items = readItems();
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: '获取物品列表失败' });
  }
});

app.get('/api/items/:id', (req: Request, res: Response) => {
  try {
    const items = readItems();
    const item = items.find(i => i.id === req.params.id);
    if (!item) {
      res.status(404).json({ error: '物品不存在' });
      return;
    }
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: '获取物品详情失败' });
  }
});

app.post('/api/items', (req: Request, res: Response) => {
  try {
    const { title, category, description, image, publisher, publisherAvatar } = req.body;
    if (!title || !category || !publisher) {
      res.status(400).json({ error: '缺少必填字段' });
      return;
    }

    const items = readItems();
    const newItem: Item = {
      id: uuidv4(),
      title,
      category,
      description: description || '',
      image: image || '',
      status: 'published',
      publisher,
      publisherAvatar: publisherAvatar || '',
      publishTime: new Date().toISOString(),
      applications: [],
    };

    items.push(newItem);
    writeItems(items);
    res.status(201).json(newItem);
  } catch (error) {
    res.status(500).json({ error: '创建物品失败' });
  }
});

app.put('/api/items/:id', (req: Request, res: Response) => {
  try {
    const items = readItems();
    const index = items.findIndex(i => i.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: '物品不存在' });
      return;
    }

    const { title, category, description, image } = req.body;
    items[index] = {
      ...items[index],
      title: title !== undefined ? title : items[index].title,
      category: category !== undefined ? category : items[index].category,
      description: description !== undefined ? description : items[index].description,
      image: image !== undefined ? image : items[index].image,
    };

    writeItems(items);
    res.json(items[index]);
  } catch (error) {
    res.status(500).json({ error: '更新物品失败' });
  }
});

app.delete('/api/items/:id', (req: Request, res: Response) => {
  try {
    const items = readItems();
    const index = items.findIndex(i => i.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: '物品不存在' });
      return;
    }

    const deletedItem = items.splice(index, 1)[0];
    writeItems(items);
    res.json(deletedItem);
  } catch (error) {
    res.status(500).json({ error: '删除物品失败' });
  }
});

app.post('/api/items/:id/applications', (req: Request, res: Response) => {
  try {
    const { applicant } = req.body;
    if (!applicant) {
      res.status(400).json({ error: '缺少申请人信息' });
      return;
    }

    const items = readItems();
    const index = items.findIndex(i => i.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: '物品不存在' });
      return;
    }

    if (items[index].status !== 'published') {
      res.status(400).json({ error: '物品不可申请' });
      return;
    }

    const newApplication: Application = {
      id: uuidv4(),
      applicant,
      applyTime: new Date().toISOString(),
      status: 'active',
    };

    items[index].applications.push(newApplication);
    items[index].status = 'applied';

    writeItems(items);
    res.status(201).json(newApplication);
  } catch (error) {
    res.status(500).json({ error: '提交申请失败' });
  }
});

app.put('/api/items/:id/status', (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!status || !['published', 'applied', 'claimed'].includes(status)) {
      res.status(400).json({ error: '无效的状态值' });
      return;
    }

    const items = readItems();
    const index = items.findIndex(i => i.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: '物品不存在' });
      return;
    }

    items[index].status = status as Item['status'];

    if (status === 'claimed') {
      items[index].applications = items[index].applications.map(app => ({
        ...app,
        status: 'claimed' as const,
      }));
    }

    writeItems(items);
    res.json(items[index]);
  } catch (error) {
    res.status(500).json({ error: '更新状态失败' });
  }
});

app.get('/api/export', (req: Request, res: Response) => {
  try {
    const items = readItems();
    const headers = ['ID', '标题', '分类', '描述', '状态', '发布者', '发布时间', '申请数量'];
    const rows = items.map(item => [
      item.id,
      item.title,
      item.category,
      item.description,
      item.status,
      item.publisher,
      item.publishTime,
      item.applications.length.toString(),
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=items.csv');
    res.send('\uFEFF' + csvContent);
  } catch (error) {
    res.status(500).json({ error: '导出失败' });
  }
});

function checkExpiredApplications(): void {
  const items = readItems();
  const now = new Date().getTime();
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  let hasChanges = false;

  for (const item of items) {
    if (item.status === 'applied') {
      const activeApps = item.applications.filter(app => app.status === 'active');
      if (activeApps.length > 0) {
        const latestApplyTime = new Date(activeApps[activeApps.length - 1].applyTime).getTime();
        if (now - latestApplyTime > TWENTY_FOUR_HOURS) {
          item.status = 'published';
          item.applications = item.applications.map(app => {
            if (app.status === 'active') {
              hasChanges = true;
              return { ...app, status: 'expired' as const };
            }
            return app;
          });
          hasChanges = true;
        }
      }
    }
  }

  if (hasChanges) {
    writeItems(items);
    console.log('已检查并更新过期申请');
  }
}

setInterval(checkExpiredApplications, 5 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
