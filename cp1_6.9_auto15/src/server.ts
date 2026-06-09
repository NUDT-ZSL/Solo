import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

type EmotionType = 'happy' | 'sad' | 'nostalgic' | 'surprised';

interface MemoryMarker {
  id: string;
  x: number;
  y: number;
  title: string;
  content: string;
  photo?: string;
  emotionType: EmotionType;
  emotionIntensity: number;
  createdAt: number;
}

interface MemoryMap {
  id: string;
  shareId: string;
  markers: MemoryMarker[];
  createdAt: number;
  updatedAt: number;
  creatorName: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

const maps: Map<string, MemoryMap> = new Map();
const shareIndex: Map<string, string> = new Map();
const markerToMapId: Map<string, string> = new Map();

function generateShortId(): string {
  return uuidv4().replace(/-/g, '').substring(0, 8);
}

function response<T>(res: Response, statusCode: number, payload: ApiResponse<T>) {
  res.status(statusCode).json(payload);
}

function findMapByShareId(shareId: string): MemoryMap | undefined {
  const mapId = shareIndex.get(shareId);
  if (!mapId) return undefined;
  return maps.get(mapId);
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const PORT = 3000;

app.post('/api/maps', (req: Request, res: Response) => {
  try {
    const { creatorName = '匿名旅人' } = req.body || {};
    const id = uuidv4();
    let shareId = generateShortId();
    while (shareIndex.has(shareId)) {
      shareId = generateShortId();
    }
    const now = Date.now();
    const newMap: MemoryMap = {
      id,
      shareId,
      markers: [],
      createdAt: now,
      updatedAt: now,
      creatorName: typeof creatorName === 'string' ? creatorName : '匿名旅人',
    };
    maps.set(id, newMap);
    shareIndex.set(shareId, id);
    return response<MemoryMap>(res, 201, { success: true, data: newMap });
  } catch (err) {
    return response(res, 500, { success: false, error: '创建地图失败' });
  }
});

app.get('/api/maps/:shareId', (req: Request, res: Response) => {
  try {
    const { shareId } = req.params;
    const map = findMapByShareId(shareId);
    if (!map) {
      return response(res, 404, { success: false, error: '地图不存在' });
    }
    return response<MemoryMap>(res, 200, { success: true, data: map });
  } catch (err) {
    return response(res, 500, { success: false, error: '获取地图失败' });
  }
});

app.put('/api/maps/:shareId', (req: Request, res: Response) => {
  try {
    const { shareId } = req.params;
    const map = findMapByShareId(shareId);
    if (!map) {
      return response(res, 404, { success: false, error: '地图不存在' });
    }
    const { markers } = req.body || {};
    if (Array.isArray(markers)) {
      map.markers = markers.slice(0, 80);
    }
    map.updatedAt = Date.now();
    maps.set(map.id, map);
    return response<MemoryMap>(res, 200, { success: true, data: map });
  } catch (err) {
    return response(res, 500, { success: false, error: '保存地图失败' });
  }
});

app.post('/api/markers', (req: Request, res: Response) => {
  try {
    const { mapId, marker } = req.body || {};
    const map = maps.get(mapId);
    if (!map) {
      return response(res, 404, { success: false, error: '地图不存在' });
    }
    if (map.markers.length >= 80) {
      return response(res, 400, { success: false, error: '标记点数量已达上限(80)' });
    }
    const id = uuidv4();
    const now = Date.now();
    const newMarker: MemoryMarker = {
      id,
      x: Math.max(0, Math.min(5000, Number(marker.x) || 0),
      y: Math.max(0, Math.min(5000, Number(marker.y) || 0),
      title: typeof marker.title === 'string' ? marker.title : '未命名回忆',
      content: typeof marker.content === 'string' ? marker.content.substring(0, 500) : '',
      photo: typeof marker.photo === 'string' ? marker.photo : undefined,
      emotionType: ['happy', 'sad', 'nostalgic', 'surprised'].includes(marker.emotionType) ? marker.emotionType : 'nostalgic',
      emotionIntensity: Math.max(1, Math.min(10, Number(marker.emotionIntensity) || 5),
      createdAt: now,
    };
    map.markers.push(newMarker);
    map.updatedAt = now;
    markerToMapId.set(id, mapId);
    maps.set(mapId, map);
    return response<MemoryMarker>(res, 201, { success: true, data: newMarker });
  } catch (err) {
    return response(res, 500, { success: false, error: '添加标记失败' });
  }
});

app.put('/api/markers/:markerId', (req: Request, res: Response) => {
  try {
    const { markerId } = req.params;
    const mapId = markerToMapId.get(markerId);
    if (!mapId) {
      return response(res, 404, { success: false, error: '标记不存在' });
    }
    const map = maps.get(mapId);
    if (!map) {
      return response(res, 404, { success: false, error: '地图不存在' });
    }
    const idx = map.markers.findIndex((m) => m.id === markerId);
    if (idx === -1) {
      return response(res, 404, { success: false, error: '标记不存在' });
    }
    const body = req.body || {};
    const marker = map.markers[idx];
    const updated: MemoryMarker = {
      ...marker,
      title: typeof body.title === 'string' ? body.title : marker.title,
      content: typeof body.content === 'string' ? body.content.substring(0, 500) : marker.content,
      photo: typeof body.photo === 'string' ? body.photo : marker.photo,
      emotionType: ['happy', 'sad', 'nostalgic', 'surprised'].includes(body.emotionType) ? body.emotionType : marker.emotionType,
      emotionIntensity: body.emotionIntensity
        ? Math.max(1, Math.min(10, Number(body.emotionIntensity)))
        : marker.emotionIntensity,
    };
    map.markers[idx] = updated;
    map.updatedAt = Date.now();
    maps.set(mapId, map);
    return response<MemoryMarker>(res, 200, { success: true, data: updated });
  } catch (err) {
    return response(res, 500, { success: false, error: '更新标记失败' });
  }
});

app.delete('/api/markers/:markerId', (req: Request, res: Response) => {
  try {
    const { markerId } = req.params;
    const mapId = markerToMapId.get(markerId);
    if (!mapId) {
      return response(res, 404, { success: false, error: '标记不存在' });
    }
    const map = maps.get(mapId);
    if (!map) {
      return response(res, 404, { success: false, error: '地图不存在' });
    }
    map.markers = map.markers.filter((m) => m.id !== markerId);
    map.updatedAt = Date.now();
    markerToMapId.delete(markerId);
    maps.set(mapId, map);
    return response(res, 200, { success: true, data: undefined });
  } catch (err) {
    return response(res, 500, { success: false, error: '删除标记失败' });
  }
});

app.get('/api/search/:shareId', (req: Request, res: Response) => {
  try {
    const { shareId } = req.params;
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const map = findMapByShareId(shareId);
    if (!map) {
      return response(res, 404, { success: false, error: '地图不存在' });
    }
    if (!q.trim()) {
      return response<MemoryMarker[]>(res, 200, { success: true, data: [] });
    }
    const keyword = q.toLowerCase();
    const result = map.markers.filter(
      (m) =>
        m.title.toLowerCase().includes(keyword) ||
        m.content.toLowerCase().includes(keyword)
    );
    return response<MemoryMarker[]>(res, 200, { success: true, data: result });
  } catch (err) {
    return response(res, 500, { success: false, error: '搜索失败' });
  }
});

app.post('/api/share', (req: Request, res: Response) => {
  try {
    const { mapId } = req.body || {};
    const map = maps.get(mapId);
    if (!map) {
      return response(res, 404, { success: false, error: '地图不存在' });
    }
    const shareUrl = `/map/${map.shareId}`;
    return response<{ shareId: string; shareUrl: string }>(res, 200, {
      success: true,
      data: { shareId: map.shareId, shareUrl },
    });
  } catch (err) {
    return response(res, 500, { success: false, error: '生成分享链接失败' });
  }
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ success: true, data: { status: 'ok', time: Date.now() } });
});

app.listen(PORT, () => {
  console.log(`[Memory Map Server] running on http://localhost:${PORT}`);
});

export { app };
