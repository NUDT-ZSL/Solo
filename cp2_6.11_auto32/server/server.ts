import express, { Request, Response } from 'express';
import cors from 'cors';
import cuid from 'cuid';
import type { Milestone, CelebrationRecord, CreateMilestoneRequest, UpdateMilestoneRequest, CelebrateResponse } from '../src/types';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

let milestones: Milestone[] = [
  {
    id: cuid(),
    title: '完成需求分析文档',
    description: '完成项目需求分析和技术选型，输出详细的产品需求文档和技术架构设计方案，为后续开发工作奠定基础。',
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    progress: 45,
    createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
    celebrations: [
      { id: cuid(), timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000, progressIncrease: 5 },
      { id: cuid(), timestamp: Date.now() - 1 * 24 * 60 * 60 * 1000, progressIncrease: 5 }
    ],
    celebrationCount: 2,
    lastCelebrationDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  },
  {
    id: cuid(),
    title: '用户界面设计稿完成',
    description: '完成所有页面的UI设计稿，包括首页、详情页、表单页等，确保视觉风格统一且符合品牌定位。',
    deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    progress: 20,
    createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
    celebrations: [
      { id: cuid(), timestamp: Date.now() - 12 * 60 * 60 * 1000, progressIncrease: 5 }
    ],
    celebrationCount: 1,
    lastCelebrationDate: new Date().toISOString().split('T')[0]
  },
  {
    id: cuid(),
    title: '后端API开发',
    description: '开发完整的后端API接口，包括用户认证、数据CRUD操作、权限管理等核心功能模块。',
    deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    progress: 0,
    createdAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
    celebrations: [],
    celebrationCount: 0,
    lastCelebrationDate: null
  },
  {
    id: cuid(),
    title: '前端功能开发',
    description: '实现前端所有页面功能，包括数据展示、表单交互、状态管理、响应式布局等。',
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    progress: 0,
    createdAt: Date.now(),
    celebrations: [],
    celebrationCount: 0,
    lastCelebrationDate: null
  }
];

const getTodayDateString = (): string => {
  return new Date().toISOString().split('T')[0];
};

const sortMilestones = (data: Milestone[]): Milestone[] => {
  return [...data].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
};

app.get('/api/milestones', (_req: Request, res: Response<Milestone[]>): void => {
  res.json(sortMilestones(milestones));
});

app.post('/api/milestones', (req: Request<unknown, unknown, CreateMilestoneRequest>, res: Response): void => {
  const { title, description = '', deadline } = req.body;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadlineDate = new Date(deadline);
  deadlineDate.setHours(0, 0, 0, 0);

  if (!title || title.trim().length === 0) {
    res.status(400).json({ error: '标题不能为空' });
    return;
  }

  if (title.length > 50) {
    res.status(400).json({ error: '标题不能超过50个字符' });
    return;
  }

  if (description.length > 200) {
    res.status(400).json({ error: '描述不能超过200个字符' });
    return;
  }

  if (!deadline || isNaN(deadlineDate.getTime())) {
    res.status(400).json({ error: '请选择有效的截止日期' });
    return;
  }

  if (deadlineDate < today) {
    res.status(400).json({ error: '截止日期必须是未来日期' });
    return;
  }

  const newMilestone: Milestone = {
    id: cuid(),
    title: title.trim(),
    description: description.trim(),
    deadline,
    progress: 0,
    createdAt: Date.now(),
    celebrations: [],
    celebrationCount: 0,
    lastCelebrationDate: null
  };

  milestones.push(newMilestone);
  res.status(201).json(newMilestone);
});

app.put('/api/milestones/:id', (req: Request<{ id: string }, unknown, UpdateMilestoneRequest>, res: Response): void => {
  const { id } = req.params;
  const { title, description } = req.body;

  const milestone = milestones.find(m => m.id === id);
  if (!milestone) {
    res.status(404).json({ error: '里程碑不存在' });
    return;
  }

  if (title !== undefined) {
    if (!title.trim()) {
      res.status(400).json({ error: '标题不能为空' });
      return;
    }
    if (title.length > 50) {
      res.status(400).json({ error: '标题不能超过50个字符' });
      return;
    }
    milestone.title = title.trim();
  }

  if (description !== undefined) {
    if (description.length > 200) {
      res.status(400).json({ error: '描述不能超过200个字符' });
      return;
    }
    milestone.description = description.trim();
  }

  res.json(milestone);
});

app.delete('/api/milestones/:id', (req: Request<{ id: string }>, res: Response): void => {
  const { id } = req.params;
  const index = milestones.findIndex(m => m.id === id);
  
  if (index === -1) {
    res.status(404).json({ error: '里程碑不存在' });
    return;
  }

  milestones.splice(index, 1);
  res.status(204).send();
});

app.post('/api/milestones/:id/celebrate', (req: Request<{ id: string }>, res: Response<CelebrateResponse>): void => {
  const { id } = req.params;
  const milestone = milestones.find(m => m.id === id);

  if (!milestone) {
    res.status(404).json({ success: false, newProgress: 0, message: '里程碑不存在' });
    return;
  }

  const today = getTodayDateString();
  if (milestone.lastCelebrationDate === today && milestone.celebrationCount >= 5) {
    res.status(400).json({ success: false, newProgress: milestone.progress, message: '今日庆祝次数已达上限' });
    return;
  }

  if (milestone.progress >= 100) {
    res.status(400).json({ success: false, newProgress: 100, message: '进度已达100%' });
    return;
  }

  const progressIncrease = 5;
  const newProgress = Math.min(milestone.progress + progressIncrease, 100);

  const record: CelebrationRecord = {
    id: cuid(),
    timestamp: Date.now(),
    progressIncrease
  };

  milestone.progress = newProgress;
  milestone.celebrations.push(record);
  milestone.lastCelebrationDate = today;
  milestone.celebrationCount = milestone.lastCelebrationDate === today ? milestone.celebrationCount + 1 : 1;

  res.json({ success: true, newProgress });
});

app.listen(PORT, (): void => {
  console.log(`Server running on http://localhost:${PORT}`);
});
