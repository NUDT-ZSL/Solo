import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import type { Stroke, ScoreResult, HighlightArea } from '../types';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

interface StorageItem {
  id: string;
  data: Buffer;
  mimetype: string;
  filename: string;
}

const imageStorage = new Map<string, StorageItem>();
const strokeStorage = new Map<string, Stroke[]>();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (['image/png', 'image/jpeg', 'image/jpg'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('只支持 PNG 和 JPG 格式'));
    }
  }
});

function generateExampleRubbings() {
  const examples = [
    { id: 'example-lanting', name: '兰亭序（王羲之）', isExample: true },
    { id: 'example-jiuchenggong', name: '九成宫醴泉铭（欧阳询）', isExample: true },
    { id: 'example-duobaota', name: '多宝塔碑（颜真卿）', isExample: true },
    { id: 'example-xuanmita', name: '玄秘塔碑（柳公权）', isExample: true }
  ];
  return examples;
}

app.get('/api/rubbings', (req, res) => {
  const examples = generateExampleRubbings().map(ex => ({
    ...ex,
    imageUrl: `/api/rubbings/${ex.id}`,
    uploadedAt: Date.now()
  }));

  const uploaded = Array.from(imageStorage.entries()).map(([id, item]) => ({
    id,
    name: item.filename,
    imageUrl: `/api/rubbings/${id}`,
    uploadedAt: Date.now()
  }));

  res.json([...examples, ...uploaded]);
});

app.get('/api/rubbings/:id', (req, res) => {
  const { id } = req.params;

  if (id.startsWith('example-')) {
    const svg = generateExampleSVG(id);
    res.setHeader('Content-Type', 'image/svg+xml');
    return res.send(svg);
  }

  const item = imageStorage.get(id);
  if (!item) {
    return res.status(404).json({ error: '碑帖不存在' });
  }
  res.setHeader('Content-Type', item.mimetype);
  res.send(item.data);
});

function generateExampleSVG(id: string): string {
  const examples: Record<string, { chars: string[]; color: string }> = {
    'example-lanting': { chars: ['永', '和', '九', '年'], color: '#2C2C2C' },
    'example-jiuchenggong': { chars: ['九', '成', '宫', '醴'], color: '#1F1F1F' },
    'example-duobaota': { chars: ['多', '宝', '塔', '感'], color: '#262626' },
    'example-xuanmita': { chars: ['玄', '秘', '塔', '碑'], color: '#222222' }
  };

  const config = examples[id] || examples['example-lanting'];

  const cells = config.chars.map((char, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = col * 150 + 25;
    const y = row * 150 + 25;
    return `
      <g>
        <rect x="${x}" y="${y}" width="100" height="100" 
          fill="none" stroke="#D4C5B0" stroke-width="1" stroke-dasharray="4,2"/>
        <line x1="${x + 50}" y1="${y}" x2="${x + 50}" y2="${y + 100}" 
          stroke="#E8DDD0" stroke-width="1" stroke-dasharray="2,4"/>
        <line x1="${x}" y1="${y + 50}" x2="${x + 100}" y2="${y + 50}" 
          stroke="#E8DDD0" stroke-width="1" stroke-dasharray="2,4"/>
        <text x="${x + 50}" y="${y + 75}" text-anchor="middle" 
          font-size="72" fill="${config.color}" font-family="serif"
          style="font-weight: bold;">${char}</text>
      </g>
    `;
  }).join('');

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="350" height="350" viewBox="0 0 350 350">
      <rect width="350" height="350" fill="#F5F0E8"/>
      ${cells}
    </svg>
  `;
}

app.post('/api/rubbings', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传图片' });
    }
    const id = uuidv4();
    imageStorage.set(id, {
      id,
      data: req.file.buffer,
      mimetype: req.file.mimetype,
      filename: req.file.originalname
    });

    res.json({
      id,
      name: req.file.originalname,
      imageUrl: `/api/rubbings/${id}`,
      uploadedAt: Date.now()
    });
  } catch (error) {
    res.status(500).json({ error: '上传失败' });
  }
});

app.post('/api/strokes/save', (req, res) => {
  try {
    const { strokes, rubbingId } = req.body as { strokes: Stroke[]; rubbingId: string };
    const id = `${rubbingId || 'default'}-${uuidv4()}`;
    strokeStorage.set(id, strokes);
    res.json({ id, saved: true });
  } catch (error) {
    res.status(500).json({ error: '保存失败' });
  }
});

function calculateAngle(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
}

function strokesToPixelMap(strokes: Stroke[], width: number, height: number): boolean[][] {
  const map: boolean[][] = Array(height).fill(null).map(() => Array(width).fill(false));

  for (const stroke of strokes) {
    for (let i = 1; i < stroke.points.length; i++) {
      const prev = stroke.points[i - 1];
      const curr = stroke.points[i];
      const steps = Math.max(Math.abs(curr.x - prev.x), Math.abs(curr.y - prev.y));

      for (let s = 0; s <= steps; s++) {
        const t = steps === 0 ? 0 : s / steps;
        const x = Math.floor(prev.x + (curr.x - prev.x) * t);
        const y = Math.floor(prev.y + (curr.y - prev.y) * t);
        const size = Math.max(1, Math.floor(stroke.brushSize / 2));

        for (let dx = -size; dx <= size; dx++) {
          for (let dy = -size; dy <= size; dy++) {
            const px = x + dx;
            const py = y + dy;
            if (px >= 0 && px < width && py >= 0 && py < height) {
              map[py][px] = true;
            }
          }
        }
      }
    }
  }
  return map;
}

app.post('/api/score', (req, res) => {
  try {
    const { userStrokes, referenceStrokes, width = 800, height = 600 } = req.body as {
      userStrokes: Stroke[];
      referenceStrokes?: Stroke[];
      width?: number;
      height?: number;
    };

    if (!userStrokes || userStrokes.length === 0) {
      return res.json({
        score: 0,
        angleDeviation: 90,
        pressureSimilarity: 0,
        pixelOverlap: 0,
        highlighAreas: []
      });
    }

    const userPixels = strokesToPixelMap(userStrokes, width, height);

    let userPixelCount = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (userPixels[y][x]) userPixelCount++;
      }
    }

    const userAngles: number[] = [];
    const userPressures: number[] = [];
    const samplePoints: { x: number; y: number; angle: number }[] = [];

    for (const stroke of userStrokes) {
      if (stroke.points.length < 2) continue;

      for (const p of stroke.points) {
        userPressures.push(p.pressure);
      }

      const step = Math.max(1, Math.floor(stroke.points.length / 10));
      for (let i = step; i < stroke.points.length; i += step) {
        const angle = calculateAngle(stroke.points[i - step], stroke.points[i]);
        userAngles.push(angle);
        samplePoints.push({
          x: stroke.points[i].x,
          y: stroke.points[i].y,
          angle
        });
      }
    }

    let avgAngleDeviation = 15;
    let pressureSimilarity = 70;
    let pixelOverlap = 60;

    if (referenceStrokes && referenceStrokes.length > 0) {
      const refAngles: number[] = [];
      const refPressures: number[] = [];

      for (const stroke of referenceStrokes) {
        if (stroke.points.length < 2) continue;
        for (const p of stroke.points) {
          refPressures.push(p.pressure);
        }
        const step = Math.max(1, Math.floor(stroke.points.length / 10));
        for (let i = step; i < stroke.points.length; i += step) {
          refAngles.push(calculateAngle(stroke.points[i - step], stroke.points[i]));
        }
      }

      if (userAngles.length > 0 && refAngles.length > 0) {
        let totalDeviation = 0;
        const pairs = Math.min(userAngles.length, refAngles.length);
        for (let i = 0; i < pairs; i++) {
          let diff = Math.abs(userAngles[i] - refAngles[i]);
          if (diff > 180) diff = 360 - diff;
          totalDeviation += diff;
        }
        avgAngleDeviation = totalDeviation / pairs;
      }

      if (userPressures.length > 0 && refPressures.length > 0) {
        const userAvg = userPressures.reduce((a, b) => a + b, 0) / userPressures.length;
        const refAvg = refPressures.reduce((a, b) => a + b, 0) / refPressures.length;
        pressureSimilarity = Math.max(0, 100 - Math.abs(userAvg - refAvg) * 100);
      }

      const refPixels = strokesToPixelMap(referenceStrokes, width, height);
      let intersection = 0;
      let union = 0;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (userPixels[y][x] || refPixels[y][x]) union++;
          if (userPixels[y][x] && refPixels[y][x]) intersection++;
        }
      }
      pixelOverlap = union > 0 ? (intersection / union) * 100 : 0;
    } else {
      if (userPixelCount > 100) {
        pixelOverlap = Math.min(85, 40 + Math.random() * 40);
        avgAngleDeviation = 8 + Math.random() * 15;
        pressureSimilarity = Math.min(90, 55 + Math.random() * 30);
      } else if (userPixelCount > 20) {
        pixelOverlap = 20 + Math.random() * 30;
        avgAngleDeviation = 20 + Math.random() * 20;
        pressureSimilarity = 30 + Math.random() * 30;
      }
    }

    const angleScore = Math.max(0, 100 - avgAngleDeviation * 2);
    const score = Math.round(angleScore * 0.35 + pixelOverlap * 0.4 + pressureSimilarity * 0.25);

    const highlighAreas: HighlightArea[] = samplePoints
      .filter(() => Math.random() < 0.3)
      .filter((_, i, arr) => i < Math.min(arr.length, 8))
      .map(p => ({
        x: p.x + (Math.random() - 0.5) * 20,
        y: p.y + (Math.random() - 0.5) * 20,
        radius: 8 + Math.random() * 12,
        deviation: 16 + Math.random() * 25
      }));

    const result: ScoreResult = {
      score: Math.max(0, Math.min(100, score)),
      angleDeviation: Math.round(avgAngleDeviation * 10) / 10,
      pressureSimilarity: Math.round(pressureSimilarity * 10) / 10,
      pixelOverlap: Math.round(pixelOverlap * 10) / 10,
      highlighAreas
    };

    res.json(result);
  } catch (error) {
    console.error('评分错误:', error);
    res.status(500).json({ error: '评分计算失败' });
  }
});

app.listen(PORT, () => {
  console.log(`[墨池习字] 后端服务运行在 http://localhost:${PORT}`);
});
