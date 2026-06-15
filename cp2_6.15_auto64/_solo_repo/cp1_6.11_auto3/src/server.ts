import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import type { Request, Response } from 'express';

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_DIR = path.join(__dirname, '..', 'data', 'works');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));

interface WorkMeta {
  id: string;
  createdAt: number;
  flowerCount: number;
  settings: {
    particleDensity: number;
    fadeDuration: number;
    backgroundColor: string;
    backgroundColorEnd?: string;
  };
}

interface WorkData extends WorkMeta {
  flowers: Array<{
    id: string;
    x: number;
    y: number;
    text: string;
    hue: number;
    emotion: string;
    createdAt: number;
    particleCount: number;
  }>;
}

function readWorkFile(id: string): WorkData | null {
  const filePath = path.join(DATA_DIR, `${id}.json`);
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw) as WorkData;
    }
  } catch (err) {
    console.error(`Error reading work ${id}:`, err);
  }
  return null;
}

function listWorkMetas(): WorkMeta[] {
  try {
    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
    const metas: WorkMeta[] = [];

    for (const file of files) {
      try {
        const id = path.basename(file, '.json');
        const raw = fs.readFileSync(path.join(DATA_DIR, file), 'utf-8');
        const data = JSON.parse(raw);
        metas.push({
          id: data.id || id,
          createdAt: data.createdAt || 0,
          flowerCount: data.flowers?.length || 0,
          settings: data.settings || {
            particleDensity: 100,
            fadeDuration: 30,
            backgroundColor: '#E6DFD3',
          },
        });
      } catch (err) {
        console.error(`Error parsing work ${file}:`, err);
      }
    }

    metas.sort((a, b) => b.createdAt - a.createdAt);
    return metas;
  } catch (err) {
    console.error('Error listing works:', err);
    return [];
  }
}

function isValidHexColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

app.get('/api/works', (req: Request, res: Response) => {
  try {
    const rawPage = req.query.page as string | undefined;
    const rawLimit = req.query.limit as string | undefined;

    let page = 1;
    if (rawPage !== undefined) {
      const parsed = parseInt(rawPage, 10);
      if (isNaN(parsed) || parsed < 1) {
        return res.status(400).json({
          success: false,
          error: 'Invalid page parameter. Must be a positive integer.',
        });
      }
      page = parsed;
    }

    let limit = 20;
    if (rawLimit !== undefined) {
      const parsed = parseInt(rawLimit, 10);
      if (isNaN(parsed) || parsed < 1) {
        return res.status(400).json({
          success: false,
          error: 'Invalid limit parameter. Must be a positive integer.',
        });
      }
      if (parsed > 100) {
        return res.status(400).json({
          success: false,
          error: 'Limit parameter exceeds maximum allowed value of 100.',
        });
      }
      limit = parsed;
    }

    const allMetas = listWorkMetas();
    const total = allMetas.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    if (page > totalPages) {
      return res.json({
        success: true,
        data: [],
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      });
    }

    const startIdx = (page - 1) * limit;
    const endIdx = startIdx + limit;
    const paginated = allMetas.slice(startIdx, endIdx);

    return res.json({
      success: true,
      data: paginated,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (err) {
    console.error('GET /api/works error:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

app.get('/api/works/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!/^[a-zA-Z0-9-]+$/.test(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid work ID format.',
      });
    }

    const work = readWorkFile(id);
    if (!work) {
      return res.status(404).json({
        success: false,
        error: 'Work not found',
      });
    }

    return res.json({
      success: true,
      data: work,
    });
  } catch (err) {
    console.error('GET /api/works/:id error:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

app.post('/api/works', (req: Request, res: Response) => {
  try {
    const { flowers, settings } = req.body;

    if (!flowers || !Array.isArray(flowers)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or missing "flowers" field. Expected an array.',
      });
    }

    if (flowers.length > 1000) {
      return res.status(400).json({
        success: false,
        error: 'Too many flowers. Maximum allowed is 1000.',
      });
    }

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid or missing "settings" field.',
      });
    }

    const particleDensity = Number(settings.particleDensity);
    const fadeDuration = Number(settings.fadeDuration);
    const backgroundColor = String(settings.backgroundColor || '#E6DFD3');
    const backgroundColorEnd = String(settings.backgroundColorEnd || '#FFF8EC');

    if (isNaN(particleDensity) || particleDensity < 50 || particleDensity > 200) {
      return res.status(400).json({
        success: false,
        error: 'Invalid settings.particleDensity. Must be a number between 50 and 200.',
      });
    }

    if (isNaN(fadeDuration) || fadeDuration < 15 || fadeDuration > 60) {
      return res.status(400).json({
        success: false,
        error: 'Invalid settings.fadeDuration. Must be a number between 15 and 60.',
      });
    }

    if (!isValidHexColor(backgroundColor)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid settings.backgroundColor. Must be a valid hex color.',
      });
    }

    const id = uuidv4();
    const createdAt = Date.now();

    const workData: WorkData = {
      id,
      createdAt,
      flowerCount: flowers.length,
      settings: {
        particleDensity,
        fadeDuration,
        backgroundColor,
        backgroundColorEnd,
      },
      flowers: flowers.map((f: any) => ({
        id: String(f.id || uuidv4()).substring(0, 64),
        x: Math.max(0, Math.min(10000, Number(f.x) || 0)),
        y: Math.max(0, Math.min(10000, Number(f.y) || 0)),
        text: String(f.text || '').substring(0, 100),
        hue: Math.max(0, Math.min(360, Number(f.hue) || 0)),
        emotion: ['positive', 'negative', 'neutral'].includes(String(f.emotion))
          ? String(f.emotion)
          : 'neutral',
        createdAt: Number(f.createdAt) || createdAt,
        particleCount: Math.max(0, Math.min(500, Number(f.particleCount) || 0)),
      })),
    };

    const filePath = path.join(DATA_DIR, `${id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(workData, null, 2), 'utf-8');

    console.log(`[Server] Saved work ${id} with ${workData.flowers.length} flowers`);

    return res.status(201).json({
      success: true,
      data: {
        id: workData.id,
        createdAt: workData.createdAt,
        flowerCount: workData.flowerCount,
      },
      message: 'Work saved successfully',
    });
  } catch (err) {
    console.error('POST /api/works error:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    status: 'ok',
    timestamp: Date.now(),
    dataDir: DATA_DIR,
    worksCount: listWorkMetas().length,
  });
});

app.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════════════╗`);
  console.log(`║   词光速写 · Word Light Calligraphy      ║`);
  console.log(`╠══════════════════════════════════════════╣`);
  console.log(`║   Server running on http://localhost:${PORT}  ║`);
  console.log(`║   Data directory: ${DATA_DIR.substring(DATA_DIR.length - 20).padStart(26)} ║`);
  console.log(`╚══════════════════════════════════════════╝\n`);
});
