import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type {
  WeaveWork,
  WeaveData,
  SaveWeaveRequest,
  SaveWeaveResponse,
  WeaveThumbnail
} from '../src/utils/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DATA_FILE = path.join(__dirname, '..', 'weave-data.json');

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const weaveStore: Map<string, WeaveWork[]> = new Map();
const idIndex: Map<string, string> = new Map();
let orderList: string[] = [];

function generateBaseId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 7; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

function parseId(fullId: string): { baseId: string; version: number } {
  const match = fullId.match(/^([a-z0-9]{7})(?:-v(\d+))?$/);
  if (!match) return { baseId: fullId, version: 1 };
  return { baseId: match[1], version: match[2] ? parseInt(match[2]) : 1 };
}

function buildFullId(baseId: string, version: number): string {
  if (version <= 1) return baseId;
  return `${baseId}-v${version}`;
}

function loadData(): void {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed.store) {
        for (const [key, arr] of Object.entries(parsed.store)) {
          weaveStore.set(key, arr as WeaveWork[]);
          for (const w of arr as WeaveWork[]) {
            idIndex.set(w.id, key);
          }
        }
      }
      if (Array.isArray(parsed.order)) {
        orderList = parsed.order;
      }
    }
  } catch (e) {
    console.error('Failed to load data:', e);
  }
}

function saveData(): void {
  try {
    const storeObj: Record<string, WeaveWork[]> = {};
    for (const [k, v] of weaveStore.entries()) {
      storeObj[k] = v;
    }
    const payload = JSON.stringify({ store: storeObj, order: orderList }, null, 2);
    fs.writeFileSync(DATA_FILE, payload, 'utf-8');
  } catch (e) {
    console.error('Failed to save data:', e);
  }
}

loadData();

app.post('/api/weave', (req, res) => {
  const body = req.body as SaveWeaveRequest;
  if (!body || !body.name || !body.data) {
    res.status(400).json({ error: 'Invalid request: name and data required' });
    return;
  }

  let baseId: string;
  let version: number;

  if (body.baseId) {
    const parsed = parseId(body.baseId);
    baseId = parsed.baseId;
    const versions = weaveStore.get(baseId) || [];
    version = versions.length > 0 ? versions[versions.length - 1].version + 1 : 1;
  } else {
    do {
      baseId = generateBaseId();
    } while (weaveStore.has(baseId));
    version = 1;
  }

  const fullId = buildFullId(baseId, version);
  const work: WeaveWork = {
    id: fullId,
    baseId,
    version,
    name: body.name,
    createdAt: Date.now(),
    data: body.data as WeaveData
  };

  if (!weaveStore.has(baseId)) {
    weaveStore.set(baseId, []);
  }
  weaveStore.get(baseId)!.push(work);
  idIndex.set(fullId, baseId);

  if (!orderList.includes(fullId)) {
    orderList.push(fullId);
  }

  saveData();

  const response: SaveWeaveResponse = {
    success: true,
    id: fullId,
    url: `/weave/${fullId}`
  };
  res.json(response);
});

app.get('/api/weave/:id', (req, res) => {
  const idParam = req.params.id;
  const { baseId, version } = parseId(idParam);
  const versions = weaveStore.get(baseId);

  if (!versions || versions.length === 0) {
    res.status(404).json({ error: 'Weave not found' });
    return;
  }

  let target: WeaveWork | undefined;
  if (version) {
    target = versions.find(w => w.version === version);
  }
  if (!target) {
    target = versions[versions.length - 1];
  }

  res.json(target);
});

app.get('/api/weave/list', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const latest: WeaveThumbnail[] = [];
  const visited = new Set<string>();

  for (let i = orderList.length - 1; i >= 0 && latest.length < limit; i--) {
    const fullId = orderList[i];
    const baseId = idIndex.get(fullId);
    if (!baseId) continue;
    const versions = weaveStore.get(baseId);
    if (!versions || versions.length === 0) continue;
    if (visited.has(baseId)) continue;
    visited.add(baseId);

    const latestVersion = versions[versions.length - 1];
    latest.push({
      id: latestVersion.id,
      name: latestVersion.name,
      data: latestVersion.data,
      createdAt: latestVersion.createdAt
    });
  }

  for (const [baseId, versions] of weaveStore) {
    if (latest.length >= limit) break;
    if (visited.has(baseId)) continue;
    visited.add(baseId);
    const latestVersion = versions[versions.length - 1];
    latest.push({
      id: latestVersion.id,
      name: latestVersion.name,
      data: latestVersion.data,
      createdAt: latestVersion.createdAt
    });
  }

  res.json(latest.slice(0, limit));
});

app.listen(PORT, () => {
  console.log(`[server] DreamWeaver API running on port ${PORT}`);
});
