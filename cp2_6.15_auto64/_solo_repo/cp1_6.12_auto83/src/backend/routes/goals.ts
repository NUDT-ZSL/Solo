import { Router, Request, Response } from 'express';
import { goalsDB, tasksDB, membersDB, usersDB, generateInviteCode, Goal, Task, Member } from '../models/db.ts';

const router = Router();

interface CreateGoalBody {
  title: string;
  description?: string;
  createdBy: string;
  userName: string;
}

function seedDemoData(goalId: string): Promise<void> {
  return new Promise((resolve) => {
    const branches = ['需求分析', 'UI设计', '前端开发', '后端开发', '测试部署'];
    const subTasks: Record<string, string[]> = {
      '需求分析': ['用户调研', '竞品分析', '需求文档'],
      'UI设计': ['原型设计', '视觉稿', '图标资源'],
      '前端开发': ['页面搭建', '组件开发', '接口对接'],
      '后端开发': ['数据库设计', 'API开发', '服务部署'],
      '测试部署': ['单元测试', '集成测试', '上线发布'],
    };
    const inserted: Record<string, string> = {};
    let remaining = branches.length + 15;

    branches.forEach((b, bi) => {
      const task: Task = {
        goalId,
        parentId: null,
        title: b,
        description: `完成${b}阶段的所有相关工作`,
        status: bi < 2 ? 'completed' : bi === 2 ? 'in-progress' : 'pending',
        userId: 'user_demo',
        assigneeName: '演示用户',
        createdAt: Date.now(),
        startedAt: bi < 3 ? Date.now() : undefined,
        completedAt: bi < 2 ? Date.now() : undefined,
        timeSpent: bi < 2 ? Math.floor(Math.random() * 3600000) + 1800000 : bi === 2 ? 900000 : 0,
        likes: [],
        attachments: [],
        order: bi,
      };
      tasksDB.insert(task, (err, newDoc) => {
        if (!err && newDoc) {
          inserted[b] = newDoc._id!;
          subTasks[b].forEach((st, si) => {
            const sub: Task = {
              goalId,
              parentId: inserted[b],
              title: st,
              description: `${b} - ${st}详细工作`,
              status: bi < 2 ? 'completed' : bi === 2 && si === 0 ? 'completed' : bi === 2 && si === 1 ? 'in-progress' : 'pending',
              userId: 'user_demo',
              assigneeName: '演示用户',
              createdAt: Date.now(),
              startedAt: (bi < 2 || (bi === 2 && si < 2)) ? Date.now() : undefined,
              completedAt: (bi < 2 || (bi === 2 && si === 0)) ? Date.now() : undefined,
              timeSpent: (bi < 2 || (bi === 2 && si === 0)) ? Math.floor(Math.random() * 1800000) + 600000 : (bi === 2 && si === 1) ? 300000 : 0,
              likes: [],
              attachments: [],
              order: si,
            };
            tasksDB.insert(sub, () => {
              remaining--;
              if (remaining <= 0) resolve();
            });
          });
        }
        remaining--;
        if (remaining <= 0) resolve();
      });
    });
  });
}

router.post('/', (req: Request<{}, {}, CreateGoalBody>, res: Response) => {
  const { title, description = '', createdBy, userName } = req.body;
  if (!title || !createdBy) {
    return res.status(400).json({ error: 'title and createdBy are required' });
  }

  const goal: Goal = {
    title,
    description,
    createdAt: Date.now(),
    createdBy,
    inviteCode: generateInviteCode(),
    color: '#6366f1',
  };

  goalsDB.insert(goal, async (err, newGoal) => {
    if (err) return res.status(500).json({ error: err.message });

    const member: Member = {
      goalId: newGoal._id!,
      userId: createdBy,
      name: userName || '创建者',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userName || createdBy)}`,
      joinedAt: Date.now(),
    };
    membersDB.insert(member);

    try {
      await seedDemoData(newGoal._id!);
    } catch {}

    res.status(201).json(newGoal);
  });
});

router.get('/', (_req: Request, res: Response) => {
  goalsDB.find<Goal>({}).sort({ createdAt: -1 }).exec((err, goals) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(goals);
  });
});

router.get('/:id', (req: Request, res: Response) => {
  goalsDB.findOne<Goal>({ _id: req.params.id }, (err, goal) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!goal) return res.status(404).json({ error: 'Goal not found' });
    res.json(goal);
  });
});

router.get('/invite/:code', (req: Request, res: Response) => {
  goalsDB.findOne<Goal>({ inviteCode: req.params.code.toUpperCase() }, (err, goal) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!goal) return res.status(404).json({ error: 'Invalid invite code' });
    res.json(goal);
  });
});

router.post('/:id/join', (req: Request, res: Response) => {
  const { userId, name } = req.body;
  if (!userId || !name) return res.status(400).json({ error: 'userId and name required' });

  membersDB.findOne<Member>({ goalId: req.params.id, userId }, (mErr, existing) => {
    if (mErr) return res.status(500).json({ error: mErr.message });
    if (existing) return res.json(existing);

    const member: Member = {
      goalId: req.params.id,
      userId,
      name,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name + userId)}`,
      joinedAt: Date.now(),
    };
    membersDB.insert(member, (err, newMember) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json(newMember);
    });
  });
});

router.get('/:id/members', (req: Request, res: Response) => {
  membersDB.find<Member>({ goalId: req.params.id }).sort({ joinedAt: 1 }).exec((err, members) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(members);
  });
});

export default router;
