import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

const dataDir = path.join(__dirname, '../data');
const uploadDir = path.join(__dirname, '../uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

interface Activity {
  id: string;
  name: string;
  dateTime: string;
  location: string;
  ageGroups: string[];
  maxParticipants: number;
  description: string;
  coverImage: string;
  createdAt: string;
  registrations: Registration[];
}

interface Registration {
  id: string;
  parentName: string;
  phone: string;
  children: Child[];
  checkedIn: boolean;
  registeredAt: string;
}

interface Child {
  name: string;
  age: number;
}

interface Photo {
  id: string;
  activityId: string;
  url: string;
  filename: string;
  isFavorite: boolean;
  uploadedAt: string;
}

interface ActivityData {
  activities: Activity[];
}

interface PhotoData {
  photos: Photo[];
}

function readActivities(): ActivityData {
  const filePath = path.join(dataDir, 'activities.json');
  const data = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(data);
}

function writeActivities(data: ActivityData): void {
  const filePath = path.join(dataDir, 'activities.json');
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function readPhotos(): PhotoData {
  const filePath = path.join(dataDir, 'photos.json');
  const data = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(data);
}

function writePhotos(data: PhotoData): void {
  const filePath = path.join(dataDir, 'photos.json');
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const coverUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('只支持 JPG 和 PNG 格式'));
    }
  }
});

const photosUpload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('只支持 JPG、PNG 和 WebP 格式'));
    }
  }
});

app.get('/api/activities', (_req: Request, res: Response) => {
  try {
    const data = readActivities();
    res.json(data.activities);
  } catch (error) {
    res.status(500).json({ error: '获取活动列表失败' });
  }
});

app.get('/api/activities/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = readActivities();
    const activity = data.activities.find(a => a.id === id);
    if (!activity) {
      return res.status(404).json({ error: '活动不存在' });
    }
    res.json(activity);
  } catch (error) {
    res.status(500).json({ error: '获取活动详情失败' });
  }
});

app.post('/api/activities', coverUpload.single('coverImage'), (req: Request, res: Response) => {
  try {
    const { name, dateTime, location, maxParticipants, description } = req.body;
    const ageGroups = typeof req.body.ageGroups === 'string' 
      ? JSON.parse(req.body.ageGroups) 
      : req.body.ageGroups;

    if (!name || !dateTime || !location || !ageGroups || !description) {
      return res.status(400).json({ error: '请填写完整的活动信息' });
    }

    if (!req.file) {
      return res.status(400).json({ error: '请上传活动封面图' });
    }

    const activity: Activity = {
      id: uuidv4(),
      name,
      dateTime,
      location,
      ageGroups,
      maxParticipants: parseInt(maxParticipants) || 20,
      description,
      coverImage: `/uploads/${req.file.filename}`,
      createdAt: new Date().toISOString(),
      registrations: []
    };

    const data = readActivities();
    data.activities.unshift(activity);
    writeActivities(data);

    res.status(201).json(activity);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: '创建活动失败' });
    }
  }
});

app.post('/api/activities/:id/register', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { parentName, phone, children } = req.body;

    if (!parentName || !phone || !children || !Array.isArray(children) || children.length === 0) {
      return res.status(400).json({ error: '请填写完整的报名信息' });
    }

    if (children.length > 2) {
      return res.status(400).json({ error: '每位家长最多可为2名儿童报名' });
    }

    const data = readActivities();
    const activity = data.activities.find(a => a.id === id);

    if (!activity) {
      return res.status(404).json({ error: '活动不存在' });
    }

    const registeredCount = activity.registrations.reduce((sum, r) => sum + r.children.length, 0);
    if (registeredCount >= activity.maxParticipants) {
      return res.status(400).json({ error: '活动名额已满' });
    }

    const registration: Registration = {
      id: uuidv4(),
      parentName,
      phone,
      children: children.map((c: Child) => ({
        name: c.name,
        age: parseInt(c.age.toString())
      })),
      checkedIn: false,
      registeredAt: new Date().toISOString()
    };

    activity.registrations.push(registration);
    writeActivities(data);

    res.status(201).json(registration);
  } catch (error) {
    res.status(500).json({ error: '报名失败' });
  }
});

app.get('/api/activities/:id/registrations', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = readActivities();
    const activity = data.activities.find(a => a.id === id);
    if (!activity) {
      return res.status(404).json({ error: '活动不存在' });
    }
    res.json(activity.registrations);
  } catch (error) {
    res.status(500).json({ error: '获取报名名单失败' });
  }
});

app.get('/api/activities/:id/registrations/export', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = readActivities();
    const activity = data.activities.find(a => a.id === id);
    if (!activity) {
      return res.status(404).json({ error: '活动不存在' });
    }

    const headers = ['报名时间', '家长姓名', '联系电话', '儿童名单'];
    const rows = activity.registrations.map(r => [
      new Date(r.registeredAt).toLocaleString('zh-CN'),
      r.parentName,
      r.phone,
      r.children.map(c => `${c.name}(${c.age}岁)`).join('、')
    ]);

    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="registrations.csv"');
    res.send('\uFEFF' + csvContent);
  } catch (error) {
    res.status(500).json({ error: '导出失败' });
  }
});

app.put('/api/activities/:id/checkin', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { registrationId, checkedIn } = req.body;

    const data = readActivities();
    const activity = data.activities.find(a => a.id === id);

    if (!activity) {
      return res.status(404).json({ error: '活动不存在' });
    }

    const registration = activity.registrations.find(r => r.id === registrationId);

    if (!registration) {
      return res.status(404).json({ error: '报名记录不存在' });
    }

    registration.checkedIn = checkedIn;
    writeActivities(data);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '更新签到状态失败' });
  }
});

app.post('/api/activities/:id/photos', photosUpload.array('photos', 30), (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ error: '请选择要上传的照片' });
    }

    const data = readActivities();
    const activity = data.activities.find(a => a.id === id);
    if (!activity) {
      return res.status(404).json({ error: '活动不存在' });
    }

    const photosData = readPhotos();
    const newPhotos: Photo[] = files.map(file => ({
      id: uuidv4(),
      activityId: id,
      url: `/uploads/${file.filename}`,
      filename: file.originalname,
      isFavorite: false,
      uploadedAt: new Date().toISOString()
    }));

    photosData.photos.push(...newPhotos);
    writePhotos(photosData);

    res.status(201).json(newPhotos);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: '上传照片失败' });
    }
  }
});

app.get('/api/activities/:id/photos', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = readPhotos();
    const photos = data.photos.filter(p => p.activityId === id);
    res.json(photos);
  } catch (error) {
    res.status(500).json({ error: '获取照片列表失败' });
  }
});

app.put('/api/activities/:id/photos/:photoId/favorite', (req: Request, res: Response) => {
  try {
    const { photoId } = req.params;
    const { isFavorite } = req.body;

    const data = readPhotos();
    const photo = data.photos.find(p => p.id === photoId);

    if (!photo) {
      return res.status(404).json({ error: '照片不存在' });
    }

    photo.isFavorite = isFavorite;
    writePhotos(data);

    res.json(photo);
  } catch (error) {
    res.status(500).json({ error: '更新照片状态失败' });
  }
});

app.get('/api/activities/search', (req: Request, res: Response) => {
  try {
    const { keyword, startDate, endDate, ageGroup } = req.query;

    let data = readActivities();
    let activities = [...data.activities];

    if (keyword) {
      const keywordStr = keyword.toString().toLowerCase();
      activities = activities.filter(a =>
        a.name.toLowerCase().includes(keywordStr));
    }

    if (startDate) {
      activities = activities.filter(a => new Date(a.dateTime) >= new Date(startDate.toString()));
    }

    if (endDate) {
      activities = activities.filter(a => new Date(a.dateTime) <= new Date(endDate.toString()));
    }

    if (ageGroup) {
      activities = activities.filter(a => a.ageGroups.includes(ageGroup.toString()));
    }

    res.json(activities);
  } catch (error) {
    res.status(500).json({ error: '搜索活动失败' });
  }
});

app.use((error: Error, _req: Request, res: Response) => {
  console.error(error);
  res.status(500).json({ error: error.message || '服务器错误' });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
