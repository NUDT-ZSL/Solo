import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import multer, { FileFilterCallback } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

interface Activity {
  id: string;
  name: string;
  dateTime: string;
  location: string;
  ageGroups: string[];
  capacity: number;
  description: string;
  coverImage: string | null;
  createdAt: string;
}

interface Child {
  name: string;
  age: number;
}

interface Registration {
  id: string;
  activityId: string;
  parentName: string;
  phone: string;
  children: Child[];
  checkIn: boolean;
  createdAt: string;
}

interface Photo {
  id: string;
  activityId: string;
  url: string;
  filename: string;
  favorite: boolean;
  uploadedAt: string;
}

const app = express();
const PORT = 3001;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const UPLOADS_DIR = path.join(ROOT_DIR, 'uploads');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const ACTIVITIES_FILE = path.join(DATA_DIR, 'activities.json');
const REGISTRATIONS_FILE = path.join(DATA_DIR, 'registrations.json');
const PHOTOS_FILE = path.join(DATA_DIR, 'photos.json');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(ACTIVITIES_FILE)) {
  fs.writeFileSync(ACTIVITIES_FILE, JSON.stringify([], null, 2), 'utf-8');
}
if (!fs.existsSync(REGISTRATIONS_FILE)) {
  fs.writeFileSync(REGISTRATIONS_FILE, JSON.stringify([], null, 2), 'utf-8');
}
if (!fs.existsSync(PHOTOS_FILE)) {
  fs.writeFileSync(PHOTOS_FILE, JSON.stringify([], null, 2), 'utf-8');
}

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));

const readJsonFile = <T>(filePath: string): T[] => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T[];
  } catch {
    return [];
  }
};

const writeJsonFile = <T>(filePath: string, data: T[]): void => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
};

const sendSuccess = (res: Response, data: unknown, message = 'success'): void => {
  res.json({ code: 0, message, data });
};

const sendError = (res: Response, code: number, message: string): void => {
  res.status(code >= 400 && code < 600 ? code : 500).json({ code, message, data: null });
};

const coverStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const coverDir = path.join(UPLOADS_DIR, 'covers');
    if (!fs.existsSync(coverDir)) {
      fs.mkdirSync(coverDir, { recursive: true });
    }
    cb(null, coverDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  },
});

const photoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const photoDir = path.join(UPLOADS_DIR, 'photos');
    if (!fs.existsSync(photoDir)) {
      fs.mkdirSync(photoDir, { recursive: true });
    }
    cb(null, photoDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  },
});

const coverFileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback): void => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('仅支持 JPG/PNG 格式的封面图'));
  }
};

const photoFileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback): void => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('仅支持 JPG/PNG/WebP 格式的照片'));
  }
};

const uploadCover = multer({
  storage: coverStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: coverFileFilter,
});

const uploadPhotos = multer({
  storage: photoStorage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: photoFileFilter,
});

app.post('/api/activities', (req: Request, res: Response, next: NextFunction) => {
  uploadCover.single('activityCover')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return sendError(res, 400, '封面图大小不能超过 5MB');
        }
        return sendError(res, 400, err.message);
      }
      return sendError(res, 400, err.message || '文件上传失败');
    }
    next();
  });
}, (req: Request, res: Response) => {
  try {
    const { name, dateTime, location, ageGroups, capacity, description } = req.body;

    if (!name || !dateTime || !location || !ageGroups || capacity === undefined) {
      return sendError(res, 400, '缺少必填字段：name, dateTime, location, ageGroups, capacity');
    }

    let parsedAgeGroups: string[] = ageGroups;
    if (typeof ageGroups === 'string') {
      try {
        parsedAgeGroups = JSON.parse(ageGroups);
      } catch {
        parsedAgeGroups = ageGroups.split(',').map((s: string) => s.trim()).filter(Boolean);
      }
    }

    let parsedCapacity: number;
    if (typeof capacity === 'string') {
      parsedCapacity = parseInt(capacity, 10);
    } else {
      parsedCapacity = capacity;
    }

    if (!Array.isArray(parsedAgeGroups)) {
      return sendError(res, 400, 'ageGroups 必须是数组');
    }
    if (isNaN(parsedCapacity) || parsedCapacity < 0) {
      return sendError(res, 400, 'capacity 必须是有效数字');
    }

    let coverImage: string | null = null;
    if (req.file) {
      const relativePath = path.relative(UPLOADS_DIR, req.file.path).replace(/\\/g, '/');
      coverImage = `/uploads/${relativePath}`;
    }

    const activity: Activity = {
      id: uuidv4(),
      name,
      dateTime,
      location,
      ageGroups: parsedAgeGroups,
      capacity: parsedCapacity,
      description: description || '',
      coverImage,
      createdAt: new Date().toISOString(),
    };

    const activities = readJsonFile<Activity>(ACTIVITIES_FILE);
    activities.push(activity);
    writeJsonFile(ACTIVITIES_FILE, activities);

    sendSuccess(res, activity, '活动创建成功');
  } catch (error) {
    sendError(res, 500, '服务器内部错误');
  }
});

app.get('/api/activities', (_req: Request, res: Response) => {
  try {
    const activities = readJsonFile<Activity>(ACTIVITIES_FILE);
    const sorted = activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    sendSuccess(res, sorted);
  } catch (error) {
    sendError(res, 500, '服务器内部错误');
  }
});

app.get('/api/activities/search', (req: Request, res: Response) => {
  try {
    const { keyword, startDate, endDate, ageGroup } = req.query;
    const activities = readJsonFile<Activity>(ACTIVITIES_FILE);

    let result = [...activities];

    if (typeof keyword === 'string' && keyword.trim()) {
      const kw = keyword.toLowerCase().trim();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(kw) ||
          a.location.toLowerCase().includes(kw) ||
          a.description.toLowerCase().includes(kw)
      );
    }

    if (typeof startDate === 'string' && startDate) {
      const start = new Date(startDate).getTime();
      if (!isNaN(start)) {
        result = result.filter((a) => new Date(a.dateTime).getTime() >= start);
      }
    }

    if (typeof endDate === 'string' && endDate) {
      const end = new Date(endDate).getTime();
      if (!isNaN(end)) {
        result = result.filter((a) => new Date(a.dateTime).getTime() <= end);
      }
    }

    if (typeof ageGroup === 'string' && ageGroup) {
      result = result.filter((a) => a.ageGroups.includes(ageGroup));
    }

    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    sendSuccess(res, result);
  } catch (error) {
    sendError(res, 500, '服务器内部错误');
  }
});

app.get('/api/activities/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const activities = readJsonFile<Activity>(ACTIVITIES_FILE);
    const activity = activities.find((a) => a.id === id);

    if (!activity) {
      return sendError(res, 404, '活动不存在');
    }

    sendSuccess(res, activity);
  } catch (error) {
    sendError(res, 500, '服务器内部错误');
  }
});

app.post('/api/activities/:id/register', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { parentName, phone, children } = req.body;

    if (!parentName || !phone || !children) {
      return sendError(res, 400, '缺少必填字段：parentName, phone, children');
    }
    if (!Array.isArray(children) || children.length === 0) {
      return sendError(res, 400, 'children 必须是非空数组');
    }
    for (const child of children) {
      if (!child.name || child.age === undefined || child.age === null) {
        return sendError(res, 400, '每个儿童必须包含 name 和 age 字段');
      }
    }

    const activities = readJsonFile<Activity>(ACTIVITIES_FILE);
    const activity = activities.find((a) => a.id === id);
    if (!activity) {
      return sendError(res, 404, '活动不存在');
    }

    const registrations = readJsonFile<Registration>(REGISTRATIONS_FILE);
    const activityRegistrations = registrations.filter((r) => r.activityId === id);
    if (activityRegistrations.length >= activity.capacity) {
      return sendError(res, 400, '活动报名名额已满');
    }

    const registration: Registration = {
      id: uuidv4(),
      activityId: id,
      parentName,
      phone,
      children,
      checkIn: false,
      createdAt: new Date().toISOString(),
    };

    registrations.push(registration);
    writeJsonFile(REGISTRATIONS_FILE, registrations);

    sendSuccess(res, registration, '报名成功');
  } catch (error) {
    sendError(res, 500, '服务器内部错误');
  }
});

app.get('/api/activities/:id/registrations', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { format } = req.query;

    const activities = readJsonFile<Activity>(ACTIVITIES_FILE);
    const activity = activities.find((a) => a.id === id);
    if (!activity) {
      return sendError(res, 404, '活动不存在');
    }

    const registrations = readJsonFile<Registration>(REGISTRATIONS_FILE);
    const activityRegistrations = registrations.filter((r) => r.activityId === id);

    if (format === 'csv') {
      const headers = ['报名ID', '家长姓名', '联系电话', '儿童姓名', '儿童年龄', '签到状态', '报名时间'];
      const rows: string[] = [headers.join(',')];

      for (const reg of activityRegistrations) {
        const childrenNames = reg.children.map((c) => c.name).join('/');
        const childrenAges = reg.children.map((c) => c.age).join('/');
        const checkInStatus = reg.checkIn ? '已签到' : '未签到';
        const row = [
          `"${reg.id}"`,
          `"${reg.parentName}"`,
          `"${reg.phone}"`,
          `"${childrenNames}"`,
          `"${childrenAges}"`,
          `"${checkInStatus}"`,
          `"${reg.createdAt}"`,
        ];
        rows.push(row.join(','));
      }

      const csvContent = '\uFEFF' + rows.join('\n');
      const filename = encodeURIComponent(`${activity.name}-报名名单.csv`);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filename}`);
      res.send(csvContent);
      return;
    }

    sendSuccess(res, activityRegistrations);
  } catch (error) {
    sendError(res, 500, '服务器内部错误');
  }
});

app.put('/api/activities/:id/checkin', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { registrationId } = req.body;

    if (!registrationId) {
      return sendError(res, 400, '缺少必填字段：registrationId');
    }

    const activities = readJsonFile<Activity>(ACTIVITIES_FILE);
    const activity = activities.find((a) => a.id === id);
    if (!activity) {
      return sendError(res, 404, '活动不存在');
    }

    const registrations = readJsonFile<Registration>(REGISTRATIONS_FILE);
    const regIndex = registrations.findIndex((r) => r.id === registrationId && r.activityId === id);

    if (regIndex === -1) {
      return sendError(res, 404, '报名记录不存在');
    }

    registrations[regIndex].checkIn = !registrations[regIndex].checkIn;
    writeJsonFile(REGISTRATIONS_FILE, registrations);

    sendSuccess(res, registrations[regIndex], '签到状态已更新');
  } catch (error) {
    sendError(res, 500, '服务器内部错误');
  }
});

app.post('/api/activities/:id/photos', (req: Request, res: Response, next: NextFunction) => {
  uploadPhotos.array('photos', 30)(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return sendError(res, 400, '单张照片大小不能超过 8MB');
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_FILE_COUNT') {
          return sendError(res, 400, '单次最多上传 30 张照片');
        }
        return sendError(res, 400, err.message);
      }
      return sendError(res, 400, err.message || '文件上传失败');
    }
    next();
  });
}, (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const activities = readJsonFile<Activity>(ACTIVITIES_FILE);
    const activity = activities.find((a) => a.id === id);
    if (!activity) {
      if (req.files) {
        const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
        for (const file of files) {
          try {
            fs.unlinkSync(file.path);
          } catch {
            // ignore
          }
        }
      }
      return sendError(res, 404, '活动不存在');
    }

    const photos = readJsonFile<Photo>(PHOTOS_FILE);
    const uploadedPhotos: Photo[] = [];

    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files) {
        const relativePath = path.relative(UPLOADS_DIR, file.path).replace(/\\/g, '/');
        const photo: Photo = {
          id: uuidv4(),
          activityId: id,
          url: `/uploads/${relativePath}`,
          filename: file.filename,
          favorite: false,
          uploadedAt: new Date().toISOString(),
        };
        photos.push(photo);
        uploadedPhotos.push(photo);
      }
    }

    writeJsonFile(PHOTOS_FILE, photos);
    sendSuccess(res, uploadedPhotos, `成功上传 ${uploadedPhotos.length} 张照片`);
  } catch (error) {
    sendError(res, 500, '服务器内部错误');
  }
});

app.get('/api/activities/:id/photos', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const activities = readJsonFile<Activity>(ACTIVITIES_FILE);
    const activity = activities.find((a) => a.id === id);
    if (!activity) {
      return sendError(res, 404, '活动不存在');
    }

    const photos = readJsonFile<Photo>(PHOTOS_FILE);
    const activityPhotos = photos
      .filter((p) => p.activityId === id)
      .sort((a, b) => {
        if (a.favorite !== b.favorite) {
          return a.favorite ? -1 : 1;
        }
        return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
      });

    sendSuccess(res, activityPhotos);
  } catch (error) {
    sendError(res, 500, '服务器内部错误');
  }
});

app.put('/api/activities/:id/photos/:photoId/favorite', (req: Request, res: Response) => {
  try {
    const { id, photoId } = req.params;

    const activities = readJsonFile<Activity>(ACTIVITIES_FILE);
    const activity = activities.find((a) => a.id === id);
    if (!activity) {
      return sendError(res, 404, '活动不存在');
    }

    const photos = readJsonFile<Photo>(PHOTOS_FILE);
    const photoIndex = photos.findIndex((p) => p.id === photoId && p.activityId === id);

    if (photoIndex === -1) {
      return sendError(res, 404, '照片不存在');
    }

    photos[photoIndex].favorite = !photos[photoIndex].favorite;
    writeJsonFile(PHOTOS_FILE, photos);

    sendSuccess(res, photos[photoIndex], '精彩瞬间标记已更新');
  } catch (error) {
    sendError(res, 500, '服务器内部错误');
  }
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('未捕获的错误:', err);
  sendError(res, 500, '服务器内部错误');
});

app.use((_req: Request, res: Response) => {
  sendError(res, 404, '接口不存在');
});

app.listen(PORT, () => {
  console.log(`服务器已启动，监听端口: ${PORT}`);
  console.log(`数据目录: ${DATA_DIR}`);
  console.log(`上传目录: ${UPLOADS_DIR}`);
});
