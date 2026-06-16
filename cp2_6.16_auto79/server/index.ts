import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import type { User, Workshop, AuthResponse, SkillCategory } from './types.js';
import { SKILL_CATEGORIES } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const WORKSHOPS_FILE = path.join(DATA_DIR, 'workshops.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

function ensureDataDirectory() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      console.log(`Created data directory: ${DATA_DIR}`);
    }
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
      console.log(`Created uploads directory: ${UPLOADS_DIR}`);
    }
    if (!fs.existsSync(USERS_FILE)) {
      fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2), 'utf8');
      console.log(`Created users file: ${USERS_FILE}`);
    }
    if (!fs.existsSync(WORKSHOPS_FILE)) {
      fs.writeFileSync(WORKSHOPS_FILE, JSON.stringify([], null, 2), 'utf8');
      console.log(`Created workshops file: ${WORKSHOPS_FILE}`);
    }
  } catch (error) {
    console.error('Error ensuring data directories:', error);
    throw error;
  }
}

function readUsers(): User[] {
  try {
    const content = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error reading users file:', error);
    return [];
  }
}

function writeUsers(users: User[]): void {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing users file:', error);
    throw error;
  }
}

function readWorkshops(): Workshop[] {
  try {
    const content = fs.readFileSync(WORKSHOPS_FILE, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error reading workshops file:', error);
    return [];
  }
}

function writeWorkshops(workshops: Workshop[]): void {
  try {
    fs.writeFileSync(WORKSHOPS_FILE, JSON.stringify(workshops, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing workshops file:', error);
    throw error;
  }
}

ensureDataDirectory();

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

function initializeSkills(): Record<string, { level: number; exp: number }> {
  const skills: Record<string, { level: number; exp: number }> = {};
  SKILL_CATEGORIES.forEach(cat => {
    skills[cat.key] = { level: 0, exp: 0 };
  });
  return skills;
}

function addSkillExp(
  skills: Record<string, { level: number; exp: number }>,
  category: string,
  expToAdd: number
): Record<string, { level: number; exp: number }> {
  const newSkills = { ...skills };
  if (!newSkills[category]) {
    newSkills[category] = { level: 0, exp: 0 };
  }
  newSkills[category].exp += expToAdd;
  while (newSkills[category].exp >= newSkills[category].level * 100 + 100) {
    newSkills[category].exp -= newSkills[category].level * 100 + 100;
    newSkills[category].level += 1;
  }
  return newSkills;
}

app.post('/api/auth/register', (req: Request, res: Response<AuthResponse>) => {
  try {
    const { username, password, email } = req.body;

    if (!username || !password || !email) {
      return res.status(400).json({ success: false, message: '请填写完整信息' });
    }

    if (password.length < 6 || password.length > 20) {
      return res.status(400).json({ success: false, message: '密码长度需在6-20位之间' });
    }

    const passwordRegex = /^[a-zA-Z0-9_]+$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ success: false, message: '密码只能包含字母、数字和下划线' });
    }

    const users = readUsers();

    if (users.find(u => u.username === username)) {
      return res.status(400).json({ success: false, message: '用户名已存在' });
    }

    if (users.find(u => u.email === email)) {
      return res.status(400).json({ success: false, message: '邮箱已被注册' });
    }

    const newUser: User = {
      id: uuidv4(),
      username,
      email,
      password,
      registeredWorkshops: [],
      attendedWorkshops: [],
      skills: initializeSkills()
    };

    users.push(newUser);
    writeUsers(users);

    const { password: _, ...userWithoutPassword } = newUser;
    res.json({ success: true, userId: newUser.id, user: userWithoutPassword });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: '注册失败' });
  }
});

app.post('/api/auth/login', (req: Request, res: Response<AuthResponse>) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: '请填写用户名和密码' });
    }

    const users = readUsers();
    const user = users.find(u => u.username === username && u.password === password);

    if (!user) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    const { password: _, ...userWithoutPassword } = user;
    res.json({ success: true, userId: user.id, user: userWithoutPassword });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: '登录失败' });
  }
});

app.get('/api/workshops', (req: Request, res: Response) => {
  try {
    const workshops = readWorkshops();
    res.json({ success: true, workshops });
  } catch (error) {
    console.error('Get workshops error:', error);
    res.status(500).json({ success: false, message: '获取工作坊列表失败' });
  }
});

app.post('/api/workshops', (req: Request, res: Response) => {
  try {
    const { title, date, location, maxParticipants, materials, hostId, category } = req.body;

    if (!title || !date || !location || !maxParticipants || !materials || !hostId) {
      return res.status(400).json({ success: false, message: '请填写完整信息' });
    }

    if (title.length > 50) {
      return res.status(400).json({ success: false, message: '工作坊名称最多50字' });
    }

    const maxP = parseInt(maxParticipants, 10);
    if (isNaN(maxP) || maxP < 1 || maxP > 50) {
      return res.status(400).json({ success: false, message: '人数上限需在1-50之间' });
    }

    const workshops = readWorkshops();

    const newWorkshop: Workshop = {
      id: uuidv4(),
      title,
      date,
      location,
      maxParticipants: maxP,
      materials,
      participants: [],
      hostId,
      category: category || 'other',
      submissions: []
    };

    workshops.push(newWorkshop);
    writeWorkshops(workshops);

    res.json({ success: true, workshop: newWorkshop, workshops });
  } catch (error) {
    console.error('Create workshop error:', error);
    res.status(500).json({ success: false, message: '发布工作坊失败' });
  }
});

app.post('/api/workshops/:id/register', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: '请先登录' });
    }

    const workshops = readWorkshops();
    const workshopIndex = workshops.findIndex(w => w.id === id);

    if (workshopIndex === -1) {
      return res.status(404).json({ success: false, message: '工作坊不存在' });
    }

    const workshop = workshops[workshopIndex];

    if (workshop.participants.includes(userId)) {
      return res.status(400).json({ success: false, message: '您已报名此工作坊' });
    }

    if (workshop.participants.length >= workshop.maxParticipants) {
      return res.status(400).json({ success: false, message: '报名人数已满' });
    }

    workshop.participants.push(userId);
    workshops[workshopIndex] = workshop;
    writeWorkshops(workshops);

    const users = readUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      if (!users[userIndex].registeredWorkshops.includes(id)) {
        users[userIndex].registeredWorkshops.push(id);
      }
      users[userIndex].skills = addSkillExp(users[userIndex].skills, workshop.category, 30);
      writeUsers(users);
    }

    res.json({ success: true, workshop, user: users[userIndex] });
  } catch (error) {
    console.error('Register workshop error:', error);
    res.status(500).json({ success: false, message: '报名失败' });
  }
});

app.post('/api/workshops/:id/cancel', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: '请先登录' });
    }

    const workshops = readWorkshops();
    const workshopIndex = workshops.findIndex(w => w.id === id);

    if (workshopIndex === -1) {
      return res.status(404).json({ success: false, message: '工作坊不存在' });
    }

    const workshop = workshops[workshopIndex];
    const participantIndex = workshop.participants.indexOf(userId);

    if (participantIndex === -1) {
      return res.status(400).json({ success: false, message: '您未报名此工作坊' });
    }

    workshop.participants.splice(participantIndex, 1);
    workshops[workshopIndex] = workshop;
    writeWorkshops(workshops);

    const users = readUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      const registeredIndex = users[userIndex].registeredWorkshops.indexOf(id);
      if (registeredIndex !== -1) {
        users[userIndex].registeredWorkshops.splice(registeredIndex, 1);
      }
      writeUsers(users);
    }

    res.json({ success: true, workshop, user: users[userIndex] });
  } catch (error) {
    console.error('Cancel workshop error:', error);
    res.status(500).json({ success: false, message: '取消报名失败' });
  }
});

app.post('/api/workshops/:id/submit', upload.single('photo'), (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId || !req.file) {
      return res.status(400).json({ success: false, message: '请提交照片' });
    }

    const workshops = readWorkshops();
    const workshopIndex = workshops.findIndex(w => w.id === id);

    if (workshopIndex === -1) {
      return res.status(404).json({ success: false, message: '工作坊不存在' });
    }

    const photoUrl = `/uploads/${req.file.filename}`;
    workshops[workshopIndex].submissions.push({ userId, photo: photoUrl });

    if (!workshops[workshopIndex].participants.includes(userId)) {
      workshops[workshopIndex].participants.push(userId);
    }

    writeWorkshops(workshops);

    const users = readUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      if (!users[userIndex].attendedWorkshops.includes(id)) {
        users[userIndex].attendedWorkshops.push(id);
      }
      if (!users[userIndex].registeredWorkshops.includes(id)) {
        users[userIndex].registeredWorkshops.push(id);
      }
      users[userIndex].skills = addSkillExp(users[userIndex].skills, workshops[workshopIndex].category, 50);
      writeUsers(users);
    }

    res.json({ success: true, photoUrl, user: users[userIndex] });
  } catch (error) {
    console.error('Submit work error:', error);
    res.status(500).json({ success: false, message: '提交作品失败' });
  }
});

app.get('/api/users/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const users = readUsers();
    const user = users.find(u => u.id === id);

    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    const { password: _, ...userWithoutPassword } = user;
    res.json({ success: true, user: userWithoutPassword });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, message: '获取用户信息失败' });
  }
});

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ success: true, message: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Data directory: ${DATA_DIR}`);
});
