import express from 'express';
import cors from 'cors';
import { readFile, watch } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const booksPath = join(__dirname, '../data/books.json');
const pagesPath = join(__dirname, '../data/pages.json');

let booksData = null;
let pagesData = null;
let booksLoadTime = 0;
let pagesLoadTime = 0;
const CACHE_DURATION = 0;

const aliasMap = {
  '李白': ['李太白', '青莲居士', '谪仙人'],
  '杜甫': ['杜子美', '杜工部', '少陵野老'],
  '苏轼': ['苏东坡', '苏子瞻', '东坡居士'],
  '孔子': ['孔丘', '仲尼', '孔夫子'],
  '老子': ['李耳', '老聃', '太上老君'],
  '屈原': ['屈平', '屈子', '三闾大夫'],
  '司马迁': ['司马子长', '太史公'],
  '陶渊明': ['陶潜', '陶元亮', '五柳先生'],
  '王羲之': ['王右军', '王逸少'],
  '朱熹': ['朱元晦', '朱文公', '紫阳先生'],
  '郑玄': ['郑康成', '郑司农'],
  '何晏': ['何平叔'],
  '邢昺': ['邢叔明'],
  '王逸': ['王叔师'],
  '郭璞': ['郭景纯', '郭记室'],
  '袁珂': ['袁圣时'],
  '河上公': ['河上丈人'],
  '毛亨': ['毛公', '大毛公'],
};

function expandKeyword(keyword) {
  const expanded = new Set([keyword]);
  for (const [name, aliases] of Object.entries(aliasMap)) {
    if (name.includes(keyword) || keyword.includes(name)) {
      expanded.add(name);
      aliases.forEach(a => expanded.add(a));
    }
    for (const alias of aliases) {
      if (alias.includes(keyword) || keyword.includes(alias)) {
        expanded.add(name);
        aliases.forEach(a => expanded.add(a));
      }
    }
  }
  return Array.from(expanded);
}

function loadJsonFile(filePath) {
  return new Promise((resolve, reject) => {
    readFile(filePath, 'utf-8', (err, data) => {
      if (err) {
        reject(err);
      } else {
        try {
          resolve(JSON.parse(data));
        } catch (parseErr) {
          reject(parseErr);
        }
      }
    });
  });
}

async function loadBooks() {
  const now = Date.now();
  if (booksData && CACHE_DURATION > 0 && (now - booksLoadTime) < CACHE_DURATION) {
    return booksData;
  }
  try {
    booksData = await loadJsonFile(booksPath);
    booksLoadTime = now;
    return booksData;
  } catch (err) {
    console.error('Failed to load books.json:', err.message);
    throw err;
  }
}

async function loadPages() {
  const now = Date.now();
  if (pagesData && CACHE_DURATION > 0 && (now - pagesLoadTime) < CACHE_DURATION) {
    return pagesData;
  }
  try {
    pagesData = await loadJsonFile(pagesPath);
    pagesLoadTime = now;
    return pagesData;
  } catch (err) {
    console.error('Failed to load pages.json:', err.message);
    throw err;
  }
}

function setupWatcher(filePath, label, reloadFn) {
  let debounceTimer = null;
  watch(filePath, { persistent: false }, (eventType) => {
    if (eventType === 'change') {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        console.log(`[Hot Reload] ${label} changed, reloading...`);
        reloadFn().then(() => {
          console.log(`[Hot Reload] ${label} reloaded successfully.`);
        }).catch((err) => {
          console.error(`[Hot Reload] Failed to reload ${label}:`, err.message);
        });
      }, 200);
    }
  });
}

const app = express();
const PORT = 3001;

app.use(cors());
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

app.get('/api/books', async (req, res) => {
  try {
    const data = await loadBooks();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/books/search', async (req, res) => {
  try {
    const data = await loadBooks();
    const keyword = (req.query.q || '').toString().toLowerCase().trim();
    if (!keyword) {
      res.json([]);
      return;
    }
    const keywords = expandKeyword(keyword);
    const results = data.filter((book) => {
      return keywords.some(kw => {
        const lowerKw = kw.toLowerCase();
        return (
          book.title.toLowerCase().includes(lowerKw) ||
          book.author.toLowerCase().includes(lowerKw) ||
          book.era.toLowerCase().includes(lowerKw) ||
          book.description.toLowerCase().includes(lowerKw)
        );
      });
    });
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/books/:id/pages/:page', async (req, res) => {
  try {
    const data = await loadPages();
    const { id, page } = req.params;
    const pageIndex = parseInt(page, 10);
    const bookPages = data[id];
    if (!bookPages || bookPages[pageIndex] === undefined) {
      res.status(404).json({ error: 'Page not found' });
      return;
    }
    res.json(bookPages[pageIndex]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function startServer() {
  try {
    await loadBooks();
    await loadPages();
    setupWatcher(booksPath, 'books.json', loadBooks);
    setupWatcher(pagesPath, 'pages.json', loadPages);
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

startServer();
