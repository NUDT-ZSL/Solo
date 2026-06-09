import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

const UPLOAD_DIR = path.join(__dirname, 'uploads');
const THUMBNAIL_DIR = path.join(UPLOAD_DIR, 'thumbnails');
const DATA_FILE = path.join(__dirname, 'data.json');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(THUMBNAIL_DIR)) fs.mkdirSync(THUMBNAIL_DIR, { recursive: true });

let imagesDB = [];
if (fs.existsSync(DATA_FILE)) {
  try {
    imagesDB = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch (e) {
    imagesDB = [];
  }
}

function saveDB() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(imagesDB, null, 2));
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('只支持 JPG 和 PNG 格式'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use('/uploads', express.static(UPLOAD_DIR));

function generateMockFeatures() {
  const histogram = {
    r: Math.random(),
    g: Math.random(),
    b: Math.random()
  };
  const composition = {
    centerX: Math.random(),
    centerY: Math.random(),
    symmetry: Math.random(),
    density: Math.random()
  };
  const dominantColor = getDominantColorFromHistogram(histogram);
  return { histogram, composition, dominantColor };
}

function getDominantColorFromHistogram(histogram) {
  const { r, g, b } = histogram;
  if (r > g && r > b) return 'red';
  if (g > r && g > b) return 'green';
  if (b > r && b > g) return 'blue';
  if (r + g > b + 0.2) return 'yellow';
  if (r + b > g + 0.2) return 'purple';
  return 'cyan';
}

function calculateSimilarity(img1, img2) {
  const h1 = img1.features.histogram;
  const h2 = img2.features.histogram;
  const colorDist = Math.sqrt(
    Math.pow(h1.r - h2.r, 2) + Math.pow(h1.g - h2.g, 2) + Math.pow(h1.b - h2.b, 2)
  );
  const colorSim = 1 - Math.min(colorDist / Math.sqrt(3), 1);

  const c1 = img1.features.composition;
  const c2 = img2.features.composition;
  const compDist = Math.sqrt(
    Math.pow(c1.centerX - c2.centerX, 2) + Math.pow(c1.centerY - c2.centerY, 2) +
    Math.pow(c1.symmetry - c2.symmetry, 2) + Math.pow(c1.density - c2.density, 2)
  );
  const compSim = 1 - Math.min(compDist / 2, 1);

  return colorSim * 0.6 + compSim * 0.4;
}

function buildNetwork(currentId, allImages, topN = 12) {
  const current = allImages.find(img => img.id === currentId);
  if (!current) return { nodes: [], links: [] };

  const others = allImages.filter(img => img.id !== currentId);
  const related = others
    .map(img => ({ image: img, similarity: calculateSimilarity(current, img) }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topN);

  const nodes = [
    { id: current.id, isCenter: true, ...current }
  ];
  related.forEach(({ image, similarity }, i) => {
    nodes.push({ id: image.id, isCenter: false, ...image, similarity });
  });

  const links = [];
  related.forEach(({ image, similarity }) => {
    if (similarity > 0.3) {
      links.push({
        source: current.id,
        target: image.id,
        similarity
      });
    }
  });

  for (let i = 0; i < related.length; i++) {
    for (let j = i + 1; j < related.length; j++) {
      const sim = calculateSimilarity(related[i].image, related[j].image);
      if (sim > 0.6) {
        links.push({
          source: related[i].image.id,
          target: related[j].image.id,
          similarity: sim
        });
      }
    }
  }

  return { nodes, links };
}

app.get('/api/images', (req, res) => {
  const { sort = 'newest', color = 'all' } = req.query;
  let result = [...imagesDB];
  if (color !== 'all') {
    result = result.filter(img => img.features.dominantColor === color);
  }
  if (sort === 'newest') {
    result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } else {
    result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }
  res.json(result);
});

app.get('/api/images/:id', (req, res) => {
  const img = imagesDB.find(i => i.id === req.params.id);
  if (!img) return res.status(404).json({ error: '图片不存在' });
  res.json(img);
});

app.get('/api/images/:id/network', (req, res) => {
  const network = buildNetwork(req.params.id, imagesDB);
  res.json(network);
});

app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '请上传文件' });
  }
  const { originalname, filename, size, mimetype } = req.file;
  const title = req.body.title || originalname;
  const features = generateMockFeatures();

  const newImage = {
    id: uuidv4(),
    title,
    filename,
    originalName: originalname,
    mimetype,
    size,
    url: `/uploads/${filename}`,
    thumbnail: `/uploads/${filename}`,
    author: '当前用户',
    createdAt: new Date().toISOString(),
    features
  };

  imagesDB.push(newImage);
  saveDB();
  res.status(201).json(newImage);
});

app.delete('/api/images/:id', (req, res) => {
  const idx = imagesDB.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '图片不存在' });

  const img = imagesDB[idx];
  const filePath = path.join(UPLOAD_DIR, img.filename);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (e) {
      console.error(e);
    }
  }

  imagesDB.splice(idx, 1);
  saveDB();
  res.json({ success: true });
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: '文件大小不能超过 5MB' });
    }
  }
  res.status(400).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`流光画廊后端运行在 http://localhost:${PORT}`);
});
