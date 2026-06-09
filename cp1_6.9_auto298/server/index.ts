import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const THUMBS_DIR = path.join(UPLOADS_DIR, 'thumbs');
const VEINS_DIR = path.join(DATA_DIR, 'veins');
const IMAGES_JSON = path.join(DATA_DIR, 'images.json');
const TAGS_JSON = path.join(DATA_DIR, 'tags.json');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));

async function ensureDirs() {
  for (const d of [DATA_DIR, UPLOADS_DIR, THUMBS_DIR, VEINS_DIR]) {
    if (!existsSync(d)) await fs.mkdir(d, { recursive: true });
  }
  if (!existsSync(IMAGES_JSON)) {
    await fs.writeFile(IMAGES_JSON, JSON.stringify({ images: [] }, null, 2));
  }
  if (!existsSync(TAGS_JSON)) {
    await fs.writeFile(TAGS_JSON, JSON.stringify({ tags: [] }, null, 2));
  }
}

function resp<T>(res: Response, success: boolean, data?: T, error?: string) {
  res.json({ success, data, error });
}

async function readImagesFile(): Promise<{ images: any[] }> {
  const raw = await fs.readFile(IMAGES_JSON, 'utf-8');
  return JSON.parse(raw);
}

async function writeImagesFile(data: any) {
  await fs.writeFile(IMAGES_JSON, JSON.stringify(data, null, 2));
}

async function readTagsFile(): Promise<{ tags: any[] }> {
  const raw = await fs.readFile(TAGS_JSON, 'utf-8');
  return JSON.parse(raw);
}

async function writeTagsFile(data: any) {
  await fs.writeFile(TAGS_JSON, JSON.stringify(data, null, 2));
}

async function readVeinFile(id: string): Promise<any | null> {
  const p = path.join(VEINS_DIR, `${id}.json`);
  if (!existsSync(p)) return null;
  const raw = await fs.readFile(p, 'utf-8');
  return JSON.parse(raw);
}

async function writeVeinFile(veinData: any) {
  const p = path.join(VEINS_DIR, `${veinData.id}.json`);
  await fs.writeFile(p, JSON.stringify(veinData, null, 2));
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.jpg', '.jpeg', '.png'].includes(ext)) cb(null, true);
    else cb(new Error('仅支持 JPG 和 PNG 格式'));
  },
});

app.post('/api/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) return resp(res, false, undefined, '未上传文件');
    const plantName = (req.body.plantName as string) || '未知植物';
    const filePath = req.file.path;
    const filename = req.file.filename;

    let metadata;
    try {
      metadata = await sharp(filePath).metadata();
    } catch {
      metadata = { width: 800, height: 600 };
    }
    const width = metadata.width || 800;
    const height = metadata.height || 600;

    const thumbFilename = filename;
    const thumbPath = path.join(THUMBS_DIR, thumbFilename);
    const size = 200;
    try {
      await sharp(filePath)
        .resize(size, size, { fit: 'cover', position: 'center' })
        .jpeg({ quality: 85 })
        .toFile(thumbPath);
    } catch (e) {
      try {
        await sharp(filePath)
          .resize(size, size, { fit: 'cover', position: 'center' })
          .png()
          .toFile(thumbPath);
      } catch {
        // ignore
      }
    }

    const imageId = uuidv4();
    const veinDataId = uuidv4();

    const veinData = {
      id: veinDataId,
      imageId,
      nodes: [] as { x: number; y: number }[],
      edges: [] as [number, number][],
      width,
      height,
      createdAt: new Date().toISOString(),
    };

    const step = Math.max(4, Math.floor(Math.min(width, height) / 150));
    const nodes: { x: number; y: number }[] = [];
    const edges: [number, number][] = [];

    for (let y = step; y < height; y += step * 2) {
      const rowStart = nodes.length;
      for (let x = step; x < width; x += step * 2) {
        const jitterX = x + (Math.sin(x * 0.13 + y * 0.07) * step * 0.5);
        const jitterY = y + (Math.cos(x * 0.09 + y * 0.11) * step * 0.5);
        nodes.push({
          x: Math.max(0, Math.min(width - 1, Math.round(jitterX))),
          y: Math.max(0, Math.min(height - 1, Math.round(jitterY))),
        });
      }
      for (let i = 0; i < nodes.length - rowStart - 1; i++) {
        if (Math.random() < 0.75) edges.push([rowStart + i, rowStart + i + 1]);
      }
    }

    const nodesPerRow = Math.max(1, Math.floor((width - step) / (step * 2)) + 1);
    for (let r = 0; r < Math.floor(nodes.length / nodesPerRow) - 1; r++) {
      for (let c = 0; c < nodesPerRow; c++) {
        const a = r * nodesPerRow + c;
        const b = (r + 1) * nodesPerRow + c;
        if (a < nodes.length && b < nodes.length && Math.random() < 0.55) {
          edges.push([a, b]);
        }
        const b2 = (r + 1) * nodesPerRow + c + 1;
        if (a < nodes.length && b2 < nodes.length && Math.random() < 0.3) {
          edges.push([a, b2]);
        }
      }
    }

    veinData.nodes = nodes;
    veinData.edges = edges;
    await writeVeinFile(veinData);

    const imageRecord = {
      id: imageId,
      filename,
      originalName: req.file.originalname,
      plantName,
      path: `/uploads/${filename}`,
      thumbPath: `/uploads/thumbs/${thumbFilename}`,
      width,
      height,
      veinDataId,
      createdAt: new Date().toISOString(),
    };

    const imagesStore = await readImagesFile();
    imagesStore.images.unshift(imageRecord);
    await writeImagesFile(imagesStore);

    resp(res, true, {
      imageId,
      veinDataId,
      veinData,
      image: imageRecord,
    });
  } catch (e: any) {
    console.error('[upload]', e);
    resp(res, false, undefined, e.message || '上传失败');
  }
});

app.get('/api/images', async (_req, res) => {
  try {
    const store = await readImagesFile();
    resp(res, true, store.images);
  } catch (e: any) {
    resp(res, false, undefined, e.message);
  }
});

app.get('/api/images/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const store = await readImagesFile();
    const image = store.images.find((i: any) => i.id === id);
    if (!image) return resp(res, false, undefined, '图片不存在');
    const veinData = await readVeinFile(image.veinDataId);
    const tagsStore = await readTagsFile();
    const tags = tagsStore.tags.filter((t: any) => t.veinDataId === image.veinDataId);
    resp(res, true, { ...image, veinData: veinData || { nodes: [], edges: [], width: image.width, height: image.height, id: image.veinDataId, imageId: id }, tags });
  } catch (e: any) {
    resp(res, false, undefined, e.message);
  }
});

app.get('/api/veins/:id', async (req, res) => {
  try {
    const data = await readVeinFile(req.params.id);
    if (!data) return resp(res, false, undefined, '叶脉数据不存在');
    resp(res, true, data);
  } catch (e: any) {
    resp(res, false, undefined, e.message);
  }
});

app.post('/api/veins', async (req, res) => {
  try {
    const veinData = req.body;
    if (!veinData || !veinData.id) return resp(res, false, undefined, '参数错误');
    await writeVeinFile(veinData);
    resp(res, true, veinData);
  } catch (e: any) {
    resp(res, false, undefined, e.message);
  }
});

app.get('/api/tags', async (req, res) => {
  try {
    const { imageId, plantName, dateFrom, dateTo } = req.query;
    const store = await readTagsFile();
    let tags = [...store.tags];
    if (imageId) {
      const imgStore = await readImagesFile();
      const img = imgStore.images.find((i: any) => i.id === imageId);
      if (img) tags = tags.filter((t: any) => t.veinDataId === img.veinDataId);
    }
    if (plantName) tags = tags.filter((t: any) => t.plantName === plantName);
    if (dateFrom) tags = tags.filter((t: any) => t.date >= dateFrom);
    if (dateTo) tags = tags.filter((t: any) => t.date <= dateTo);
    tags.sort((a: any, b: any) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
    resp(res, true, tags);
  } catch (e: any) {
    resp(res, false, undefined, e.message);
  }
});

app.post('/api/tags', async (req, res) => {
  try {
    const { veinDataId, nodeIndex, x, y, note, date, plantName } = req.body;
    if (veinDataId === undefined || x === undefined || y === undefined) {
      return resp(res, false, undefined, '参数不完整');
    }
    const tag = {
      id: uuidv4(),
      veinDataId,
      nodeIndex: nodeIndex ?? -1,
      x: Number(x),
      y: Number(y),
      note: note || '',
      date: date || new Date().toISOString().slice(0, 10),
      plantName: plantName || '未知植物',
      createdAt: new Date().toISOString(),
    };
    const store = await readTagsFile();
    store.tags.unshift(tag);
    await writeTagsFile(store);
    resp(res, true, tag);
  } catch (e: any) {
    resp(res, false, undefined, e.message);
  }
});

app.delete('/api/tags/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const store = await readTagsFile();
    const before = store.tags.length;
    store.tags = store.tags.filter((t: any) => t.id !== id);
    if (store.tags.length === before) return resp(res, false, undefined, '标记不存在');
    await writeTagsFile(store);
    resp(res, true, { id });
  } catch (e: any) {
    resp(res, false, undefined, e.message);
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', uptime: process.uptime() } });
});

async function start() {
  await ensureDirs();
  app.listen(PORT, () => {
    console.log(`[叶脉时光·后端] 运行在 http://localhost:${PORT}`);
  });
}

start().catch((e) => {
  console.error('启动失败:', e);
  process.exit(1);
});
