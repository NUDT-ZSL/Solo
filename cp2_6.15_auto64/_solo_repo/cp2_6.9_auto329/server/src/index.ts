import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const uploadsDir = path.join(__dirname, '..', 'uploads');
const dataDir = path.join(__dirname, '..', '..', 'data');
const dataFilePath = path.join(dataDir, 'specimens.json');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(dataFilePath)) {
  fs.writeFileSync(dataFilePath, JSON.stringify([]));
}

app.use('/uploads', express.static(uploadsDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  }
});

const fileFilter = (req: express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传 PNG 或 JPG 格式的图片'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

interface Specimen {
  id: string;
  imageUrl: string;
  yearRange: string;
  emotion: string;
  description: string;
  story: string;
  createdAt: number;
}

let fileLock = false;
const pendingOperations: Array<() => void> = [];

const readSpecimens = (): Promise<Specimen[]> => {
  return new Promise((resolve, reject) => {
    const execute = () => {
      fileLock = true;
      try {
        const raw = fs.readFileSync(dataFilePath, 'utf-8');
        const data = JSON.parse(raw) as Specimen[];
        fileLock = false;
        processNext();
        resolve(data);
      } catch (err) {
        fileLock = false;
        processNext();
        reject(err);
      }
    };
    if (fileLock) {
      pendingOperations.push(execute);
    } else {
      execute();
    }
  });
};

const writeSpecimens = (data: Specimen[]): Promise<void> => {
  return new Promise((resolve, reject) => {
    const execute = () => {
      fileLock = true;
      try {
        fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
        fileLock = false;
        processNext();
        resolve();
      } catch (err) {
        fileLock = false;
        processNext();
        reject(err);
      }
    };
    if (fileLock) {
      pendingOperations.push(execute);
    } else {
      execute();
    }
  });
};

const processNext = () => {
  if (pendingOperations.length > 0 && !fileLock) {
    const next = pendingOperations.shift();
    if (next) next();
  }
};

const generateStory = (emotion: string, description: string): string => {
  const year = Math.floor(Math.random() * 80) + 1940;
  const seasons = ['春天', '夏天', '秋天', '冬天'];
  const season = seasons[Math.floor(Math.random() * seasons.length)];

  const emotionTemplates: Record<string, string[]> = {
    '怀念': [
      `我是一件承载着岁月记忆的旧物，${year}年的${season}，我来到了这个世界。`,
      `时光荏苒，我曾见证过无数温暖的瞬间。${description}`,
      `每一道痕迹都是一段故事，每当被人拿起，那些美好的回忆便如潮水般涌来。`
    ],
    '惊奇': [
      `我是一件充满神秘色彩的物件，诞生于${year}年的${season}。`,
      `我的出现总是伴随着惊叹的目光。${description}`,
      `没有人知道我经历过怎样的奇幻旅程，每一个细节都在诉说着不可思议的传奇。`
    ],
    '感伤': [
      `我是一件带着淡淡忧伤的旧物，${year}年的${season}，我开始了自己的故事。`,
      `岁月在我身上留下了斑驳的印记。${description}`,
      `那些离别的场景依然历历在目，我静静躺在这里，等待着某个人能读懂我的心事。`
    ],
    '宁静': [
      `我是一件散发着安详气息的物件，${year}年的${season}，我悄然诞生。`,
      `我见证了无数个平和的日夜。${description}`,
      `时间仿佛在我身边静止，我以最温柔的姿态守护着这份难得的安宁与美好。`
    ]
  };

  const templates = emotionTemplates[emotion] || emotionTemplates['宁静'];
  return templates.join('');
};

app.get('/api/specimens', async (req, res) => {
  try {
    const specimens = await readSpecimens();
    res.json(specimens);
  } catch (err) {
    res.status(500).json({ error: '读取标本列表失败' });
  }
});

app.post('/api/specimens', upload.single('image'), async (req, res) => {
  try {
    const { yearRange, emotion, description } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: '请上传图片文件' });
    }
    if (!yearRange || !emotion || !description) {
      return res.status(400).json({ error: '缺少必要字段' });
    }

    const imageUrl = `/uploads/${file.filename}`;
    const story = generateStory(emotion, description);

    const newSpecimen: Specimen = {
      id: uuidv4(),
      imageUrl,
      yearRange,
      emotion,
      description,
      story,
      createdAt: Date.now()
    };

    const specimens = await readSpecimens();
    specimens.unshift(newSpecimen);
    await writeSpecimens(specimens);

    res.status(201).json(newSpecimen);
  } catch (err) {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: '图片大小不能超过 5MB' });
      }
      return res.status(400).json({ error: err.message });
    }
    if (err instanceof Error) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: '创建标本失败' });
  }
});

app.delete('/api/specimens/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const specimens = await readSpecimens();
    const index = specimens.findIndex(s => s.id === id);

    if (index === -1) {
      return res.status(404).json({ error: '标本不存在' });
    }

    const deleted = specimens[index];
    const imagePath = path.join(uploadsDir, path.basename(deleted.imageUrl));
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    specimens.splice(index, 1);
    await writeSpecimens(specimens);

    res.json({ message: '删除成功' });
  } catch (err) {
    res.status(500).json({ error: '删除标本失败' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
