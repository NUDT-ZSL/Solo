import express from 'express';
import cors from 'cors';
import Datastore from 'nedb-promises';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import type { Project, Support, Comment, User, ThankYouLetter } from './models';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function createDatastore(filename: string) {
  return Datastore.create({
    filename: path.join(dataDir, filename),
    autoload: true,
  });
}

const projectsDB = createDatastore('projects.db');
const supportsDB = createDatastore('supports.db');
const commentsDB = createDatastore('comments.db');
const usersDB = createDatastore('users.db');
const thankYouLettersDB = createDatastore('thankyou.db');

async function loadAllDatabases() {
  await Promise.all([
    (projectsDB as any).loadDatabase ? (projectsDB as any).loadDatabase() : Promise.resolve(),
    (supportsDB as any).loadDatabase ? (supportsDB as any).loadDatabase() : Promise.resolve(),
    (commentsDB as any).loadDatabase ? (commentsDB as any).loadDatabase() : Promise.resolve(),
    (usersDB as any).loadDatabase ? (usersDB as any).loadDatabase() : Promise.resolve(),
    (thankYouLettersDB as any).loadDatabase ? (thankYouLettersDB as any).loadDatabase() : Promise.resolve(),
  ]);
  console.log('All databases loaded successfully');
}

async function generateThankYouLetter(projectId: string): Promise<ThankYouLetter | null> {
  const project = (await projectsDB.findOne({ id: projectId })) as Project | null;
  if (!project) return null;

  if (project.currentAmount < project.goalAmount) {
    console.log(`Project ${projectId} has not reached goal yet. Current: ${project.currentAmount}, Goal: ${project.goalAmount}`);
    return null;
  }

  const supports = (await supportsDB.find({ projectId }).sort({ createdAt: -1 })) as Support[];

  const supporterMap = new Map<string, { total: number; messages: string[] }>();
  for (const support of supports) {
    const existing = supporterMap.get(support.supporterName);
    if (existing) {
      existing.total += support.amount;
      if (support.message) existing.messages.push(support.message);
    } else {
      supporterMap.set(support.supporterName, {
        total: support.amount,
        messages: support.message ? [support.message] : [],
      });
    }
  }

  const supporters = Array.from(supporterMap.entries()).map(([name, data]) => ({
    name,
    amount: data.total,
    message: data.messages[0] || '',
  }));

  const ranking = [...supporters]
    .sort((a, b) => b.amount - a.amount)
    .map((s, index) => ({
      name: s.name,
      amount: s.amount,
      rank: index + 1,
    }));

  const letter: ThankYouLetter = {
    projectId,
    projectTitle: project.title,
    totalAmount: project.currentAmount,
    supporterCount: supporters.length,
    supporters,
    ranking,
    generatedAt: new Date().toISOString(),
  };

  const existing = await thankYouLettersDB.findOne({ projectId });
  if (existing) {
    await thankYouLettersDB.update({ projectId }, { $set: letter });
    console.log(`Thank you letter updated for project ${projectId}`);
  } else {
    await thankYouLettersDB.insert(letter);
    console.log(`Thank you letter created for project ${projectId}`);
  }

  return letter;
}

async function checkAndCompleteProject(projectId: string): Promise<boolean> {
  const project = (await projectsDB.findOne({ id: projectId })) as Project | null;
  if (!project) return false;

  const reachedGoal = project.currentAmount >= project.goalAmount;
  const wasNotCompleted = project.status !== 'completed';

  if (reachedGoal && wasNotCompleted) {
    await projectsDB.update({ id: projectId }, { $set: { status: 'completed' } });
    console.log(`Project ${projectId} status updated to completed!`);

    const letter = await generateThankYouLetter(projectId);
    if (letter) {
      console.log(`Thank you letter generated with ${letter.supporterCount} supporters!`);
      return true;
    }
  } else if (reachedGoal && project.status === 'completed') {
    const existingLetter = await thankYouLettersDB.findOne({ projectId });
    if (!existingLetter) {
      await generateThankYouLetter(projectId);
    }
  }

  return false;
}

async function initSampleData() {
  const existingProjects = await projectsDB.find({});
  if (existingProjects.length > 0) {
    console.log(`Found ${existingProjects.length} existing projects, skipping sample data init.`);

    for (const proj of existingProjects) {
      if (proj.currentAmount >= proj.goalAmount && proj.status !== 'completed') {
        await checkAndCompleteProject(proj.id);
      }
    }
    return;
  }

  console.log('Initializing sample data...');

  const sampleUsers: User[] = [
    { id: uuidv4(), name: '张三', avatar: '' },
    { id: uuidv4(), name: '李四', avatar: '' },
    { id: uuidv4(), name: '王五', avatar: '' },
    { id: uuidv4(), name: '赵六', avatar: '' },
  ];

  for (const user of sampleUsers) {
    await usersDB.insert(user);
  }

  const now = new Date();
  const sampleProjects: Project[] = [
    {
      id: uuidv4(),
      title: '独立音乐专辑制作',
      description: '我们是一支独立乐队，正在筹备第一张录音室专辑。需要您的支持来完成录音、混音和母带制作。每一位支持者都将获得专辑签名版！',
      goalAmount: 5000,
      currentAmount: 3200,
      status: 'ongoing',
      creatorId: sampleUsers[0].id,
      createdAt: now.toISOString(),
      coverImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=music%20band%20recording%20studio%20microphone&image_size=landscape_16_9',
      endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: uuidv4(),
      title: '社区公益图书馆',
      description: '为城市边缘的社区建立一个公益图书馆，为孩子们提供免费阅读空间和书籍。您的每一分支持都将帮助孩子们接触更多知识。',
      goalAmount: 10000,
      currentAmount: 8500,
      status: 'ongoing',
      creatorId: sampleUsers[1].id,
      createdAt: now.toISOString(),
      coverImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=library%20books%20children%20reading&image_size=landscape_16_9',
      endDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: uuidv4(),
      title: '环保艺术展览',
      description: '用回收材料创作大型艺术装置，呼吁环保意识。展览将在城市中心广场展出，为期一个月。',
      goalAmount: 8000,
      currentAmount: 8000,
      status: 'completed',
      creatorId: sampleUsers[2].id,
      createdAt: now.toISOString(),
      coverImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=recycled%20art%20installation%20eco%20art&image_size=landscape_16_9',
      endDate: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: uuidv4(),
      title: '老年人智能手机培训课程',
      description: '为社区老年人提供免费的智能手机使用培训课程，帮助他们跨越数字鸿沟，更好地与家人保持联系。',
      goalAmount: 3000,
      currentAmount: 1200,
      status: 'ongoing',
      creatorId: sampleUsers[3].id,
      createdAt: now.toISOString(),
      coverImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=elderly%20learning%20smartphone%20technology&image_size=landscape_16_9',
      endDate: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: uuidv4(),
      title: '城市屋顶花园计划',
      description: '在城市办公楼顶建立公共屋顶花园，种植有机蔬菜和花卉，为都市人提供亲近自然的空间。',
      goalAmount: 15000,
      currentAmount: 5000,
      status: 'ongoing',
      creatorId: sampleUsers[0].id,
      createdAt: now.toISOString(),
      coverImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=rooftop%20garden%20urban%20green&image_size=landscape_16_9',
      endDate: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: uuidv4(),
      title: '街头艺人纪录片',
      description: '记录这座城市里街头艺人的故事，制作一部关于梦想与坚持的纪录片。',
      goalAmount: 6000,
      currentAmount: 2400,
      status: 'ongoing',
      creatorId: sampleUsers[1].id,
      createdAt: now.toISOString(),
      coverImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=street%20musician%20guitar%20performance&image_size=landscape_16_9',
      endDate: new Date(now.getTime() + 40 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  for (const project of sampleProjects) {
    await projectsDB.insert(project);
  }

  const sampleSupports: Support[] = [
    { id: uuidv4(), projectId: sampleProjects[0].id, supporterName: '音乐爱好者', amount: 200, message: '加油！期待你们的专辑！', createdAt: now.toISOString() },
    { id: uuidv4(), projectId: sampleProjects[0].id, supporterName: '摇滚粉', amount: 500, message: '支持独立音乐！', createdAt: now.toISOString() },
    { id: uuidv4(), projectId: sampleProjects[0].id, supporterName: '小明', amount: 100, message: '很棒的项目！', createdAt: now.toISOString() },
    { id: uuidv4(), projectId: sampleProjects[1].id, supporterName: '爱心人士', amount: 1000, message: '孩子们需要更多书籍！', createdAt: now.toISOString() },
    { id: uuidv4(), projectId: sampleProjects[1].id, supporterName: '教育工作者', amount: 500, message: '支持教育事业！', createdAt: now.toISOString() },
    { id: uuidv4(), projectId: sampleProjects[2].id, supporterName: '环保志愿者', amount: 2000, message: '环保很重要！', createdAt: now.toISOString() },
    { id: uuidv4(), projectId: sampleProjects[2].id, supporterName: '艺术家', amount: 3000, message: '创意无限！', createdAt: now.toISOString() },
    { id: uuidv4(), projectId: sampleProjects[2].id, supporterName: '市民', amount: 1000, message: '期待展览！', createdAt: now.toISOString() },
    { id: uuidv4(), projectId: sampleProjects[2].id, supporterName: '学生', amount: 500, message: '支持环保艺术！', createdAt: now.toISOString() },
    { id: uuidv4(), projectId: sampleProjects[2].id, supporterName: '摄影师', amount: 1500, message: '很有意义的项目！', createdAt: now.toISOString() },
    { id: uuidv4(), projectId: sampleProjects[3].id, supporterName: '孝心子女', amount: 300, message: '我父母也需要这样的课程！', createdAt: now.toISOString() },
    { id: uuidv4(), projectId: sampleProjects[4].id, supporterName: '城市居民', amount: 800, message: '希望城市需要更多绿色！', createdAt: now.toISOString() },
    { id: uuidv4(), projectId: sampleProjects[5].id, supporterName: '纪录片爱好者', amount: 400, message: '期待成片！', createdAt: now.toISOString() },
  ];

  for (const support of sampleSupports) {
    await supportsDB.insert(support);
  }

  const sampleComments: Comment[] = [
    { id: uuidv4(), projectId: sampleProjects[0].id, userId: sampleUsers[1].id, text: '这个项目太棒了！我已经支持了。', createdAt: now.toISOString() },
    { id: uuidv4(), projectId: sampleProjects[0].id, userId: sampleUsers[2].id, text: '什么时候能听到小样？', createdAt: now.toISOString() },
    { id: uuidv4(), projectId: sampleProjects[1].id, userId: sampleUsers[0].id, text: '作为家长非常感谢这样的项目！', createdAt: now.toISOString() },
    { id: uuidv4(), projectId: sampleProjects[1].id, userId: sampleUsers[3].id, text: '我也想捐书，怎么联系？', createdAt: now.toISOString() },
    { id: uuidv4(), projectId: sampleProjects[2].id, userId: sampleUsers[0].id, text: '恭喜众筹成功！期待展览！', createdAt: now.toISOString() },
    { id: uuidv4(), projectId: sampleProjects[2].id, userId: sampleUsers[1].id, text: '用回收材料做艺术，太有创意了！', createdAt: now.toISOString() },
    { id: uuidv4(), projectId: sampleProjects[3].id, userId: sampleUsers[2].id, text: '这个项目太有意义了，我也想报名当志愿者！', createdAt: now.toISOString() },
    { id: uuidv4(), projectId: sampleProjects[4].id, userId: sampleUsers[3].id, text: '屋顶花园！听起来太棒了！', createdAt: now.toISOString() },
    { id: uuidv4(), projectId: sampleProjects[5].id, userId: sampleUsers[0].id, text: '街头艺人确实值得被看见！', createdAt: now.toISOString() },
  ];

  for (const comment of sampleComments) {
    await commentsDB.insert(comment);
  }

  for (const proj of sampleProjects) {
    if (proj.currentAmount >= proj.goalAmount) {
      await projectsDB.update({ id: proj.id }, { $set: { status: 'completed' } });
      await generateThankYouLetter(proj.id);
    }
  }

  console.log('Sample data initialized successfully!');
}

app.get('/api/projects', async (_req, res) => {
  try {
    const projects = await projectsDB.find({}).sort({ createdAt: -1 });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

app.post('/api/projects', async (req, res) => {
  try {
    const { title, description, goalAmount, creatorId, coverImage, endDate } = req.body;

    if (!title || !description || !goalAmount || !creatorId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const project: Project = {
      id: uuidv4(),
      title,
      description,
      goalAmount: Number(goalAmount),
      currentAmount: 0,
      status: 'ongoing',
      creatorId,
      createdAt: new Date().toISOString(),
      coverImage,
      endDate: endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const newProject = await projectsDB.insert(project);
    res.status(201).json(newProject);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create project' });
  }
});

app.get('/api/projects/:id', async (req, res) => {
  try {
    const project = (await projectsDB.findOne({ id: req.params.id })) as Project | null;
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

app.get('/api/projects/:id/thankyou', async (req, res) => {
  try {
    const projectId = req.params.id;
    const project = (await projectsDB.findOne({ id: projectId })) as Project | null;

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.currentAmount < project.goalAmount) {
      return res.status(400).json({
        error: 'Project goal not reached yet',
        currentAmount: project.currentAmount,
        goalAmount: project.goalAmount,
        progress: ((project.currentAmount / project.goalAmount) * 100).toFixed(1) + '%',
      });
    }

    let letter = (await thankYouLettersDB.findOne({ projectId })) as ThankYouLetter | null;
    if (!letter) {
      letter = await generateThankYouLetter(projectId);
    }

    if (!letter) {
      return res.status(500).json({ error: 'Failed to generate thank you letter' });
    }

    res.json(letter);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch thank you letter' });
  }
});

app.post('/api/support', async (req, res) => {
  try {
    const { projectId, supporterName, amount, message } = req.body;

    if (!projectId || !supporterName || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const project = (await projectsDB.findOne({ id: projectId })) as Project | null;
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.status === 'completed') {
      return res.status(400).json({ error: 'Project already completed' });
    }

    const support: Support = {
      id: uuidv4(),
      projectId,
      supporterName,
      amount: Number(amount),
      message: message || '',
      createdAt: new Date().toISOString(),
    };

    const newSupport = await supportsDB.insert(support);

    const newCurrentAmount = project.currentAmount + Number(amount);
    await projectsDB.update(
      { id: projectId },
      { $set: { currentAmount: newCurrentAmount } }
    );

    console.log(`Support added! Project ${projectId}: ${project.currentAmount} -> ${newCurrentAmount} (Goal: ${project.goalAmount})`);

    const letterGenerated = await checkAndCompleteProject(projectId);

    const updatedProject = (await projectsDB.findOne({ id: projectId })) as Project;

    res.json({
      support: newSupport,
      project: updatedProject,
      letterGenerated,
      reachedGoal: newCurrentAmount >= project.goalAmount,
    });
  } catch (error) {
    console.error('Error in /api/support:', error);
    res.status(500).json({ error: 'Failed to submit support' });
  }
});

app.get('/api/comments', async (req, res) => {
  try {
    const { projectId, page = '1', limit = '20' } = req.query;

    if (!projectId) {
      return res.status(400).json({ error: 'ProjectId is required' });
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const comments = await commentsDB
      .find({ projectId: projectId as string })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await commentsDB.count({ projectId: projectId as string });

    res.json({
      comments,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        hasMore: skip + comments.length < total,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

app.post('/api/comments', async (req, res) => {
  try {
    const { projectId, userId, text } = req.body;

    if (!projectId || !userId || !text) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const comment: Comment = {
      id: uuidv4(),
      projectId,
      userId,
      text,
      createdAt: new Date().toISOString(),
    };

    const newComment = await commentsDB.insert(comment);
    res.status(201).json(newComment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to post comment' });
  }
});

app.get('/api/users', async (_req, res) => {
  try {
    const users = await usersDB.find({});
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { name, avatar } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    let user = (await usersDB.findOne({ name })) as User | null;

    if (!user) {
      user = {
        id: uuidv4(),
        name,
        avatar: avatar || '',
      };
      user = await usersDB.insert(user);
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const user = (await usersDB.findOne({ id: req.params.id })) as User | null;
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

async function startServer() {
  try {
    await loadAllDatabases();
    await initSampleData();
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Data directory: ${dataDir}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
