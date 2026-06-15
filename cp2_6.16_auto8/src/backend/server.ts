import express, { Request, Response } from 'express';
import cors from 'cors';
import initSqlJs from 'sql.js';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

const uploadsDir = path.resolve(__dirname, '../../uploads');
const thumbnailsDir = path.resolve(__dirname, '../../uploads/thumbnails');
const dbPath = path.resolve(__dirname, '../../data.sqlite');

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(thumbnailsDir)) fs.mkdirSync(thumbnailsDir, { recursive: true });

app.use('/uploads', express.static(uploadsDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({ storage });

let db: any;

function saveDb() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

function dbRunSync(sql: string, params: any[] = []): void {
  db.run(sql, params);
  saveDb();
}

function dbGetSync<T>(sql: string, params: any[] = []): T | null {
  const stmt = db.prepare(sql, params);
  if (stmt.step()) {
    const row = stmt.getAsObject() as T;
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

function dbAllSync<T>(sql: string, params: any[] = []): T[] {
  const results: T[] = [];
  const stmt = db.prepare(sql, params);
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

async function main() {
  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT '我的旅行纪录片',
    background_music TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS photos (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    filepath TEXT NOT NULL,
    thumbnail_path TEXT,
    location TEXT DEFAULT '',
    city TEXT DEFAULT '',
    timestamp DATETIME NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    exif_data TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS narratives (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT DEFAULT '',
    content TEXT DEFAULT '',
    order_index INTEGER NOT NULL DEFAULT 0,
    after_photo_id TEXT REFERENCES photos(id) ON DELETE SET NULL
  )`);

  db.run(`CREATE INDEX IF NOT EXISTS idx_photos_project ON photos(project_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_photos_order ON photos(project_id, order_index)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_narratives_project ON narratives(project_id)`);

  saveDb();

  app.post('/api/project', async (req: Request, res: Response) => {
    try {
      const id = uuidv4();
      const title = req.body.title || '我的旅行纪录片';
      const now = new Date().toISOString();
      dbRunSync(`INSERT INTO projects (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)`, [id, title, now, now]);
      res.json({ projectId: id, id, title, createdAt: now, updatedAt: now });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create project' });
    }
  });

  app.get('/api/project/:id', async (req: Request, res: Response) => {
    try {
      const project = dbGetSync<any>(`SELECT * FROM projects WHERE id = ?`, [req.params.id]);
      if (!project) return res.status(404).json({ error: 'Project not found' });
      const photos = dbAllSync<any>(`SELECT * FROM photos WHERE project_id = ? ORDER BY order_index ASC`, [req.params.id]);
      const narratives = dbAllSync<any>(`SELECT * FROM narratives WHERE project_id = ? ORDER BY order_index ASC`, [req.params.id]);
      res.json({
        project: {
          id: project.id,
          title: project.title,
          createdAt: project.created_at,
          updatedAt: project.updated_at,
          backgroundMusic: project.background_music,
        },
        photos: photos.map((p) => ({
          id: p.id,
          projectId: p.project_id,
          filename: p.filename,
          filepath: p.filepath,
          thumbnail: p.thumbnail_path,
          location: p.location,
          city: p.city,
          timestamp: p.timestamp,
          orderIndex: p.order_index,
          exifData: p.exif_data ? JSON.parse(p.exif_data) : undefined,
        })),
        narratives: narratives.map((n) => ({
          id: n.id,
          projectId: n.project_id,
          title: n.title,
          content: n.content,
          orderIndex: n.order_index,
          afterPhotoId: n.after_photo_id,
        })),
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch project' });
    }
  });

  app.post('/api/project/:id/photo', upload.single('photo'), async (req: Request, res: Response) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      const photoId = uuidv4();
      const projectId = req.params.id;
      const location = req.body.location || '';
      const city = req.body.city || '';
      const timestamp = req.body.timestamp || new Date().toISOString();
      const exifData = req.body.exifData || null;

      const maxOrderRow = dbGetSync<{ max: number }>(`SELECT MAX(order_index) as max FROM photos WHERE project_id = ?`, [projectId]);
      const orderIndex = (maxOrderRow?.max ?? -1) + 1;

      const filepath = `/uploads/${req.file.filename}`;

      dbRunSync(
        `INSERT INTO photos (id, project_id, filename, filepath, location, city, timestamp, order_index, exif_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [photoId, projectId, req.file.originalname, filepath, location, city, timestamp, orderIndex, exifData ? JSON.stringify(exifData) : null]
      );

      res.json({
        id: photoId,
        projectId,
        filename: req.file.originalname,
        filepath,
        location,
        city,
        timestamp,
        orderIndex,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to upload photo' });
    }
  });

  app.put('/api/project/:id/photo/:photoId', async (req: Request, res: Response) => {
    try {
      const { location, city, timestamp, orderIndex } = req.body;
      const fields = [];
      const values = [];
      if (location !== undefined) { fields.push('location = ?'); values.push(location); }
      if (city !== undefined) { fields.push('city = ?'); values.push(city); }
      if (timestamp !== undefined) { fields.push('timestamp = ?'); values.push(timestamp); }
      if (orderIndex !== undefined) { fields.push('order_index = ?'); values.push(orderIndex); }
      if (!fields.length) return res.status(400).json({ error: 'No fields to update' });
      values.push(req.params.photoId);
      dbRunSync(`UPDATE photos SET ${fields.join(', ')} WHERE id = ?`, values);
      const photo = dbGetSync<any>(`SELECT * FROM photos WHERE id = ?`, [req.params.photoId]);
      if (!photo) return res.status(404).json({ error: 'Photo not found' });
      res.json({
        id: photo.id,
        projectId: photo.project_id,
        filename: photo.filename,
        filepath: photo.filepath,
        thumbnail: photo.thumbnail_path,
        location: photo.location,
        city: photo.city,
        timestamp: photo.timestamp,
        orderIndex: photo.order_index,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update photo' });
    }
  });

  app.delete('/api/project/:id/photo/:photoId', async (req: Request, res: Response) => {
    try {
      const photo = dbGetSync<any>(`SELECT * FROM photos WHERE id = ?`, [req.params.photoId]);
      if (photo) {
        const filePath = path.resolve(__dirname, '../..', photo.filepath);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
      dbRunSync(`DELETE FROM photos WHERE id = ?`, [req.params.photoId]);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to delete photo' });
    }
  });

  app.post('/api/project/:id/narrative', async (req: Request, res: Response) => {
    try {
      const id = uuidv4();
      const projectId = req.params.id;
      const { title = '', content = '', afterPhotoId = null } = req.body;

      const maxOrderRow = dbGetSync<{ max: number }>(`SELECT MAX(order_index) as max FROM narratives WHERE project_id = ?`, [projectId]);
      let orderIndex = (maxOrderRow?.max ?? -1) + 1;
      if (afterPhotoId) {
        const afterPhoto = dbGetSync<{ order_index: number }>(`SELECT order_index FROM photos WHERE id = ?`, [afterPhotoId]);
        if (afterPhoto) orderIndex = afterPhoto.order_index + 0.5;
      }

      dbRunSync(
        `INSERT INTO narratives (id, project_id, title, content, order_index, after_photo_id) VALUES (?, ?, ?, ?, ?, ?)`,
        [id, projectId, title, content, orderIndex, afterPhotoId]
      );

      res.json({ id, projectId, title, content, orderIndex, afterPhotoId });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create narrative' });
    }
  });

  app.put('/api/project/:id/narrative/:narrativeId', async (req: Request, res: Response) => {
    try {
      const { title, content, orderIndex } = req.body;
      const fields = [];
      const values = [];
      if (title !== undefined) { fields.push('title = ?'); values.push(title); }
      if (content !== undefined) { fields.push('content = ?'); values.push(content); }
      if (orderIndex !== undefined) { fields.push('order_index = ?'); values.push(orderIndex); }
      if (!fields.length) return res.status(400).json({ error: 'No fields to update' });
      values.push(req.params.narrativeId);
      dbRunSync(`UPDATE narratives SET ${fields.join(', ')} WHERE id = ?`, values);
      const narrative = dbGetSync<any>(`SELECT * FROM narratives WHERE id = ?`, [req.params.narrativeId]);
      if (!narrative) return res.status(404).json({ error: 'Narrative not found' });
      res.json({
        id: narrative.id,
        projectId: narrative.project_id,
        title: narrative.title,
        content: narrative.content,
        orderIndex: narrative.order_index,
        afterPhotoId: narrative.after_photo_id,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update narrative' });
    }
  });

  app.delete('/api/project/:id/narrative/:narrativeId', async (req: Request, res: Response) => {
    try {
      dbRunSync(`DELETE FROM narratives WHERE id = ?`, [req.params.narrativeId]);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to delete narrative' });
    }
  });

  app.get('/api/project/:id/timeline', async (req: Request, res: Response) => {
    try {
      const photos = dbAllSync<any>(`SELECT * FROM photos WHERE project_id = ?`, [req.params.id]);
      const narratives = dbAllSync<any>(`SELECT * FROM narratives WHERE project_id = ?`, [req.params.id]);
      const timeline: any[] = [
        ...photos.map((p) => ({
          type: 'photo' as const,
          orderIndex: p.order_index,
          data: {
            id: p.id,
            projectId: p.project_id,
            filename: p.filename,
            filepath: p.filepath,
            thumbnail: p.thumbnail_path,
            location: p.location,
            city: p.city,
            timestamp: p.timestamp,
            orderIndex: p.order_index,
          },
        })),
        ...narratives.map((n) => ({
          type: 'narrative' as const,
          orderIndex: n.order_index,
          data: {
            id: n.id,
            projectId: n.project_id,
            title: n.title,
            content: n.content,
            orderIndex: n.order_index,
            afterPhotoId: n.after_photo_id,
          },
        })),
      ];
      timeline.sort((a, b) => a.orderIndex - b.orderIndex);
      res.json(timeline);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch timeline' });
    }
  });

  app.post('/api/project/:id/music', upload.single('music'), async (req: Request, res: Response) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      const musicData = fs.readFileSync(req.file.path);
      const base64 = `data:${req.file.mimetype};base64,${musicData.toString('base64')}`;
      fs.unlinkSync(req.file.path);
      dbRunSync(`UPDATE projects SET background_music = ?, updated_at = ? WHERE id = ?`, [base64, new Date().toISOString(), req.params.id]);
      res.json({ musicUrl: base64 });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to upload music' });
    }
  });

  app.get('/api/project/:id/export', async (req: Request, res: Response) => {
    try {
      const project = dbGetSync<any>(`SELECT * FROM projects WHERE id = ?`, [req.params.id]);
      if (!project) return res.status(404).json({ error: 'Project not found' });
      const photos = dbAllSync<any>(`SELECT * FROM photos WHERE project_id = ? ORDER BY order_index ASC`, [req.params.id]);
      const narratives = dbAllSync<any>(`SELECT * FROM narratives WHERE project_id = ? ORDER BY order_index ASC`, [req.params.id]);

      const photoData: any[] = [];
      for (const p of photos) {
        const filePath = path.resolve(__dirname, '../..', p.filepath);
        let imgBase64 = '';
        if (fs.existsSync(filePath)) {
          const ext = path.extname(filePath).slice(1).toLowerCase() || 'jpeg';
          const mime = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
          imgBase64 = `data:${mime};base64,${fs.readFileSync(filePath).toString('base64')}`;
        }
        photoData.push({
          id: p.id,
          filename: p.filename,
          src: imgBase64,
          location: p.location,
          city: p.city,
          timestamp: p.timestamp,
          orderIndex: p.order_index,
        });
      }

      const narrativeData = narratives.map((n: any) => ({
        id: n.id,
        title: n.title,
        content: n.content,
        orderIndex: n.order_index,
      }));

      const exportHtml = generateExportHtml(project.title, photoData, narrativeData, project.background_music);

      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `attachment; filename="travel-documentary-${req.params.id}.html"`);
      res.send(exportHtml);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to export' });
    }
  });

  app.listen(PORT, () => {
    console.log(`Travel Timeline Server running on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

function generateExportHtml(title: string, photos: any[], narratives: any[], music?: string): string {
  const timelineData = JSON.stringify([
    ...photos.map((p) => ({ type: 'photo', orderIndex: p.orderIndex, data: p })),
    ...narratives.map((n) => ({ type: 'narrative', orderIndex: n.orderIndex, data: n })),
  ].sort((a, b) => a.orderIndex - b.orderIndex));

  const cities = Array.from(new Set(photos.filter(p => p.city).map(p => p.city)));
  const locationPoints = cities.map((city, i) => {
    const angle = (i / Math.max(cities.length, 1)) * Math.PI * 2;
    return { city, x: 160 + Math.cos(angle) * 100, y: 120 + Math.sin(angle) * 70, orderIndex: photos.find(p => p.city === city)?.orderIndex ?? i };
  }).sort((a, b) => a.orderIndex - b.orderIndex);

  const musicTag = music ? `<audio id="bg-music" src="${music}" loop></audio>` : '';
  const musicScript = music ? `
    var audio = document.getElementById('bg-music');
    var playBtn = document.getElementById('play-btn');
    var volumeSlider = document.getElementById('volume-slider');
    var isPlaying = false;
    audio.volume = 0.5;
    playBtn.addEventListener('click', function() {
      if (isPlaying) { audio.pause(); playBtn.textContent = '\\u25B6'; playBtn.classList.remove('playing'); }
      else { audio.play(); playBtn.textContent = '\\u275A\\u275A'; playBtn.classList.add('playing'); }
      isPlaying = !isPlaying;
    });
    volumeSlider.addEventListener('input', function(e) { audio.volume = Number(e.target.value) / 100; });
  ` : '';
  const musicUi = music ? `
    <div style="position:fixed;top:72px;right:24px;z-index:100;display:flex;flex-direction:column;align-items:center;gap:8px;">
      <button id="play-btn" style="width:56px;height:56px;border-radius:50%;background:#1e88e5;color:#fff;border:none;font-size:18px;cursor:pointer;box-shadow:0 4px 12px rgba(30,136,229,0.4);transition:transform .2s;">\u25B6</button>
      <div style="background:#fff;border-radius:8px;padding:6px 10px;box-shadow:0 2px 8px rgba(0,0,0,0.1);display:flex;align-items:center;gap:6px;">
        <input id="volume-slider" type="range" min="0" max="100" value="50" style="width:80px;accent-color:#1e88e5;">
        <span id="volume-label" style="font-size:11px;color:#999;">50%</span>
      </div>
    </div>
    <style>
      #play-btn.playing { animation: spinMusic 3s linear infinite; }
      @keyframes spinMusic { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      input[type="range"] { -webkit-appearance:none; height:4px; background:#e0e0e0; border-radius:2px; outline:none; }
      input[type="range"]::-webkit-slider-thumb { -webkit-appearance:none; width:14px; height:14px; background:#1e88e5; border-radius:50%; cursor:pointer; }
    </style>
  ` : '';

  return `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} - 旅行纪录片</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, -apple-system, sans-serif; background: #faf5eb; color: #333; overflow-x: hidden; }
header { height: 56px; background: #333; color: #fff; display: flex; align-items: center; padding: 0 24px; justify-content: space-between; position: sticky; top: 0; z-index: 50; }
header h1 { font-size: 18px; font-weight: 600; }
.timeline-wrapper { height: calc(100vh - 56px); overflow-x: auto; overflow-y: hidden; padding: 40px 24px; -webkit-overflow-scrolling: touch; }
.timeline { display: flex; align-items: flex-start; min-width: min-content; position: relative; padding: 80px 0; }
.timeline::before { content: ''; position: absolute; top: 50%; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, #e0e0e0, #90caf9); transform: translateY(-50%); }
.timeline-node { flex: 0 0 auto; position: relative; display: flex; flex-direction: column; align-items: center; margin: 0 12px; min-width: 320px; }
.photo-card { background: #fff; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.08); overflow: hidden; width: 180px; transition: transform .2s, box-shadow .2s; cursor: pointer; z-index: 2; }
.photo-card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0,0,0,0.15); }
.photo-card img { width: 100%; height: 120px; object-fit: cover; display: block; }
.photo-card .info { padding: 12px; }
.photo-card .city { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
.photo-card .location { font-size: 12px; color: #666; margin-bottom: 6px; }
.photo-card .date { font-size: 11px; color: #999; }
.timeline-dot { width: 16px; height: 16px; border-radius: 50%; background: #1e88e5; border: 3px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.2); margin: 16px 0; z-index: 3; }
.narrative-card { background: rgba(255,255,255,0.9); border-radius: 16px; padding: 20px; width: 260px; box-shadow: 0 4px 16px rgba(0,0,0,0.08); backdrop-filter: blur(8px); z-index: 2; }
.narrative-card h3 { font-size: 16px; color: #1565c0; margin-bottom: 10px; }
.narrative-card p { font-size: 13px; line-height: 1.6; color: #444; }
.map-wrapper { position: sticky; bottom: 0; background: #f0ede6; padding: 20px; border-radius: 16px 16px 0 0; }
.map-wrapper h3 { margin-bottom: 12px; font-size: 14px; color: #555; }
.map-container { display: flex; gap: 24px; align-items: flex-start; flex-wrap: wrap; }
svg.map { background: #fff; border-radius: 8px; box-shadow: inset 0 0 0 1px #e0e0e0; }
.cities-list { display: flex; flex-direction: column; gap: 8px; }
.city-chip { display: flex; align-items: center; gap: 8px; padding: 6px 12px; background: #fff; border-radius: 20px; font-size: 13px; cursor: pointer; transition: background .2s; }
.city-chip:hover { background: #e3f2fd; }
.city-chip .chip-dot { width: 10px; height: 10px; border-radius: 50%; background: #1565c0; }
.modal-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 200; align-items: center; justify-content: center; padding: 24px; }
.modal-overlay.active { display: flex; }
.modal-overlay img { max-width: 90vw; max-height: 85vh; border-radius: 8px; box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
.modal-overlay .close { position: absolute; top: 24px; right: 24px; width: 40px; height: 40px; border-radius: 50%; background: rgba(255,255,255,0.2); color: #fff; border: none; font-size: 20px; cursor: pointer; }
</style></head><body>
<header><h1>\u2708\uFE0F ${title}</h1></header>
${musicUi}
${musicTag}
<div class="timeline-wrapper" id="timeline-wrapper">
  <div class="timeline" id="timeline"></div>
</div>
<div class="map-wrapper">
  <h3>\uD83D\uDCCD 旅行地图</h3>
  <div class="map-container">
    <svg class="map" width="320" height="240" viewBox="0 0 320 240">
      <defs><linearGradient id="mapBg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#e8f5e9"/><stop offset="100%" stop-color="#e3f2fd"/></linearGradient></defs>
      <rect width="320" height="240" fill="url(#mapBg)" rx="8"/>
      <path d="M 60 180 Q 160 40 260 180" fill="none" stroke="#c8e6c9" stroke-width="20" stroke-opacity="0.5"/>
      <path d="M 30 140 L 290 100" fill="none" stroke="#bbdefb" stroke-width="16" stroke-opacity="0.4"/>
      ${locationPoints.length > 1 ? `<polyline points="${locationPoints.map(p => `${p.x},${p.y}`).join(' ')}" fill="none" stroke="#1565c0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>` : ''}
      ${locationPoints.map((p, i) => {
        const next = locationPoints[i + 1];
        let arrow = '';
        if (next) {
          const dx = next.x - p.x, dy = next.y - p.y;
          const mx = p.x + dx * 0.5, my = p.y + dy * 0.5;
          const angle = Math.atan2(dy, dx) * 180 / Math.PI;
          arrow = `<polygon points="-8,-6 8,0 -8,6" fill="#ff5722" transform="translate(${mx},${my}) rotate(${angle})"/>`;
        }
        return `<circle cx="${p.x}" cy="${p.y}" r="8" fill="#fff" stroke="#1565c0" stroke-width="2"/><circle cx="${p.x}" cy="${p.y}" r="4" fill="#ff5722"/><text x="${p.x}" y="${p.y - 14}" text-anchor="middle" font-size="11" fill="#333" font-weight="600">${p.city}</text>${arrow}`;
      }).join('')}
    </svg>
    <div class="cities-list">
      ${locationPoints.map((p, i) => `<div class="city-chip" data-order="${p.orderIndex}" data-index="${i}"><span class="chip-dot"></span>${i + 1}. ${p.city}</div>`).join('')}
    </div>
  </div>
</div>
<div class="modal-overlay" id="modal"><button class="close" id="modal-close">\u00D7</button><img id="modal-img" alt=""/></div>
<script>
var TIMELINE = ${timelineData};
var timelineEl = document.getElementById('timeline');
var modal = document.getElementById('modal');
var modalImg = document.getElementById('modal-img');
var modalClose = document.getElementById('modal-close');
var nodes = [];

TIMELINE.forEach(function(node) {
  var wrap = document.createElement('div');
  wrap.className = 'timeline-node';
  if (node.type === 'photo') {
    var p = node.data;
    var d = new Date(p.timestamp);
    var dateStr = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    wrap.innerHTML =
      '<div class="photo-card" data-photo><img src="' + p.src + '" loading="lazy" alt="' + p.filename + '"/><div class="info">' +
        '<div class="city">' + (p.city || '未命名地点') + '</div>' +
        '<div class="location">' + (p.location || '') + '</div>' +
        '<div class="date">\uD83D\uDCC5 ' + dateStr + '</div>' +
      '</div></div>' +
      '<div class="timeline-dot"></div>';
    wrap.querySelector('[data-photo]').addEventListener('click', function() { modalImg.src = p.src; modal.classList.add('active'); });
    nodes.push(wrap);
  } else {
    var n = node.data;
    wrap.innerHTML =
      '<div class="narrative-card"><h3>\uD83D\uDCDD ' + (n.title || '幕布') + '</h3><p>' + (n.content || '') + '</p></div>' +
      '<div class="timeline-dot" style="background:#ff5722"></div>';
    nodes.push(wrap);
  }
  timelineEl.appendChild(wrap);
});

modalClose.addEventListener('click', function() { modal.classList.remove('active'); });
modal.addEventListener('click', function(e) { if (e.target === modal) modal.classList.remove('active'); });

document.querySelectorAll('.city-chip').forEach(function(chip) {
  chip.addEventListener('click', function() {
    var idx = Number(chip.dataset.order);
    var target = TIMELINE.findIndex(function(n) { return n.type === 'photo' && n.data.orderIndex === idx; });
    if (target >= 0 && nodes[target]) {
      nodes[target].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      nodes[target].style.animation = 'pulse 1s ease';
      setTimeout(function() { nodes[target].style.animation = ''; }, 1000);
    }
  });
});

var style = document.createElement('style');
style.textContent = '@keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }';
document.head.appendChild(style);

var wrapper = document.getElementById('timeline-wrapper');
var touchStartX = 0;
var touchStartScroll = 0;
wrapper.addEventListener('touchstart', function(e) { touchStartX = e.touches[0].clientX; touchStartScroll = wrapper.scrollLeft; }, { passive: true });
wrapper.addEventListener('touchmove', function(e) { var delta = e.touches[0].clientX - touchStartX; wrapper.scrollLeft = touchStartScroll - delta; }, { passive: true });

${musicScript}
</script></body></html>`;
}
