import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

const JWT_SECRET = 'traderush_secret_key_2024';
const INITIAL_CAPITAL = 100000;
const DB_PATH = './traderush.db';

let db: SqlJsDatabase;

function saveDb() {
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (err) {
    // silently ignore
  }
}

function initDatabase(sqlJsDb: SqlJsDatabase) {
  sqlJsDb.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    cash REAL DEFAULT ${INITIAL_CAPITAL},
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  sqlJsDb.run(`CREATE TABLE IF NOT EXISTS holdings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    stock_symbol TEXT NOT NULL,
    quantity INTEGER DEFAULT 0,
    avg_cost REAL DEFAULT 0,
    UNIQUE(user_id, stock_symbol)
  )`);

  sqlJsDb.run(`CREATE TABLE IF NOT EXISTS trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    stock_symbol TEXT NOT NULL,
    side TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    price REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
}

function dbGet(sql: string, params: any[] = []): any {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

function dbAll(sql: string, params: any[] = []): any[] {
  const results: any[] = [];
  const stmt = db.prepare(sql);
  stmt.bind(params);
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function dbRun(sql: string, params: any[] = []): void {
  db.run(sql, params);
}

interface StockConfig {
  symbol: string;
  name: string;
  basePrice: number;
  volatility: number;
}

const STOCKS: StockConfig[] = [
  { symbol: 'TR001', name: '星辰科技', basePrice: 45.50, volatility: 0.025 },
  { symbol: 'TR002', name: '蓝海能源', basePrice: 128.80, volatility: 0.018 },
  { symbol: 'TR003', name: '金域金融', basePrice: 67.20, volatility: 0.022 },
  { symbol: 'TR004', name: '绿洲医药', basePrice: 203.60, volatility: 0.030 },
  { symbol: 'TR005', name: '云端计算', basePrice: 89.90, volatility: 0.028 },
  { symbol: 'TR006', name: '红土地产', basePrice: 32.40, volatility: 0.020 },
];

interface MarketData {
  symbol: string;
  name: string;
  open: number;
  close: number;
  high: number;
  low: number;
  price: number;
  volume: number;
  change: number;
  changePercent: number;
  timestamp: number;
}

interface HistoryBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const currentPrices: Map<string, number> = new Map();
const stockHistory: Map<string, HistoryBar[]> = new Map();
const currentBars: Map<string, HistoryBar> = new Map();

STOCKS.forEach((stock) => {
  currentPrices.set(stock.symbol, stock.basePrice);
  stockHistory.set(stock.symbol, []);
});

function generateMarketData(): MarketData[] {
  const now = Date.now();
  return STOCKS.map((stock) => {
    const prevPrice = currentPrices.get(stock.symbol) || stock.basePrice;
    const drift = (Math.random() - 0.48) * stock.volatility * prevPrice;
    const newPrice = Math.max(0.01, parseFloat((prevPrice + drift).toFixed(2)));
    currentPrices.set(stock.symbol, newPrice);

    const bar = currentBars.get(stock.symbol);
    let open: number, high: number, low: number, volume: number;

    if (!bar || now - bar.time > 30000) {
      open = prevPrice;
      high = Math.max(prevPrice, newPrice);
      low = Math.min(prevPrice, newPrice);
      volume = Math.floor(Math.random() * 50000) + 10000;

      if (bar) {
        const history = stockHistory.get(stock.symbol) || [];
        history.push({ ...bar });
        if (history.length > 200) history.shift();
        stockHistory.set(stock.symbol, history);
      }

      currentBars.set(stock.symbol, { time: now, open, high, low, close: newPrice, volume });
    } else {
      const currentBar = currentBars.get(stock.symbol)!;
      currentBar.close = newPrice;
      currentBar.high = Math.max(currentBar.high, newPrice);
      currentBar.low = Math.min(currentBar.low, newPrice);
      currentBar.volume += Math.floor(Math.random() * 5000);
      open = currentBar.open;
      high = currentBar.high;
      low = currentBar.low;
      volume = currentBar.volume;
    }

    const change = newPrice - open;
    const changePercent = open !== 0 ? change / open : 0;

    return {
      symbol: stock.symbol, name: stock.name, open, close: newPrice,
      high, low, price: newPrice, volume,
      change: parseFloat(change.toFixed(2)),
      changePercent: parseFloat((changePercent * 100).toFixed(2)),
      timestamp: now,
    };
  });
}

function authenticate(req: express.Request, res: express.Response, next: express.NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: '未提供认证令牌' });
    return;
  }
  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; email: string };
    (req as any).user = decoded;
    next();
  } catch {
    res.status(401).json({ error: '令牌无效或已过期' });
  }
}

app.post('/api/register', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) { res.status(400).json({ error: '邮箱和密码不能为空' }); return; }
  if (password.length < 6) { res.status(400).json({ error: '密码长度不能少于6位' }); return; }

  try {
    const existing = dbGet('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) { res.status(400).json({ error: '该邮箱已注册' }); return; }

    const hashedPassword = bcrypt.hashSync(password, 10);
    dbRun('INSERT INTO users (email, password, cash) VALUES (?, ?, ?)', [email, hashedPassword, INITIAL_CAPITAL]);

    const row = dbGet('SELECT last_insert_rowid() as id');
    const userId = row.id;
    const token = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' });
    saveDb();
    res.json({ token, userId, email });
  } catch (err) {
    res.status(500).json({ error: '注册失败' });
  }
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) { res.status(400).json({ error: '邮箱和密码不能为空' }); return; }

  try {
    const row = dbGet('SELECT id, email, password FROM users WHERE email = ?', [email]);
    if (!row) { res.status(400).json({ error: '邮箱或密码错误' }); return; }

    if (!bcrypt.compareSync(password, row.password as string)) {
      res.status(400).json({ error: '邮箱或密码错误' }); return;
    }

    const token = jwt.sign({ userId: row.id, email: row.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, userId: row.id, email: row.email });
  } catch (err) {
    res.status(500).json({ error: '登录失败' });
  }
});

app.get('/api/portfolio', authenticate, (req, res) => {
  const userId = (req as any).user.userId;

  try {
    const userRow = dbGet('SELECT cash FROM users WHERE id = ?', [userId]);
    if (!userRow) { res.status(500).json({ error: '获取资产失败' }); return; }

    const holdings = dbAll('SELECT stock_symbol, quantity, avg_cost FROM holdings WHERE user_id = ? AND quantity > 0', [userId]);

    const holdingsWithPrice = holdings.map((h: any) => {
      const currentPrice = currentPrices.get(h.stock_symbol as string) || 0;
      return {
        symbol: h.stock_symbol,
        quantity: h.quantity,
        avgCost: h.avg_cost,
        currentPrice,
        marketValue: parseFloat((currentPrice * (h.quantity as number)).toFixed(2)),
        profit: parseFloat(((currentPrice - (h.avg_cost as number)) * (h.quantity as number)).toFixed(2)),
      };
    });

    const totalMarketValue = holdingsWithPrice.reduce((sum: number, h: any) => sum + h.marketValue, 0);
    const totalAsset = (userRow.cash as number) + totalMarketValue;
    const totalProfit = totalAsset - INITIAL_CAPITAL;
    const dailyProfit = holdingsWithPrice.reduce((sum: number, h: any) => {
      const stock = STOCKS.find((s) => s.symbol === h.symbol);
      return sum + (h.currentPrice - (stock?.basePrice || h.avgCost)) * h.quantity;
    }, 0);

    res.json({
      cash: parseFloat((userRow.cash as number).toFixed(2)),
      totalAsset: parseFloat(totalAsset.toFixed(2)),
      marketValue: parseFloat(totalMarketValue.toFixed(2)),
      totalProfit: parseFloat(totalProfit.toFixed(2)),
      dailyProfit: parseFloat(dailyProfit.toFixed(2)),
      holdings: holdingsWithPrice,
    });
  } catch (err) {
    res.status(500).json({ error: '获取资产失败' });
  }
});

app.post('/api/trade', authenticate, (req, res) => {
  const userId = (req as any).user.userId;
  const { symbol, side, quantity } = req.body;

  if (!symbol || !side || !quantity) { res.status(400).json({ error: '交易参数不完整' }); return; }
  if (quantity < 1 || quantity > 1000 || !Number.isInteger(quantity)) { res.status(400).json({ error: '数量必须为1-1000之间的整数' }); return; }
  if (side !== 'buy' && side !== 'sell') { res.status(400).json({ error: '交易方向无效' }); return; }

  const price = currentPrices.get(symbol);
  if (!price) { res.status(400).json({ error: '股票代码无效' }); return; }

  try {
    if (side === 'buy') {
      const totalCost = price * quantity;
      const userRow = dbGet('SELECT cash FROM users WHERE id = ?', [userId]);
      if (!userRow || (userRow.cash as number) < totalCost) {
        res.status(400).json({ error: '可用资金不足' }); return;
      }

      dbRun('UPDATE users SET cash = cash - ? WHERE id = ?', [totalCost, userId]);

      const holding = dbGet('SELECT quantity, avg_cost FROM holdings WHERE user_id = ? AND stock_symbol = ?', [userId, symbol]);
      if (holding && (holding.quantity as number) > 0) {
        const newQty = (holding.quantity as number) + quantity;
        const newAvgCost = ((holding.avg_cost as number) * (holding.quantity as number) + price * quantity) / newQty;
        dbRun('UPDATE holdings SET quantity = ?, avg_cost = ? WHERE user_id = ? AND stock_symbol = ?', [newQty, newAvgCost, userId, symbol]);
      } else {
        dbRun('INSERT INTO holdings (user_id, stock_symbol, quantity, avg_cost) VALUES (?, ?, ?, ?)', [userId, symbol, quantity, price]);
      }

      dbRun('INSERT INTO trades (user_id, stock_symbol, side, quantity, price) VALUES (?, ?, ?, ?, ?)', [userId, symbol, side, quantity, price]);
      saveDb();
      res.json({ success: true, message: `买入${quantity}股${symbol}，成交价${price.toFixed(2)}`, price, quantity });
    } else {
      const holding = dbGet('SELECT quantity, avg_cost FROM holdings WHERE user_id = ? AND stock_symbol = ?', [userId, symbol]);
      if (!holding || (holding.quantity as number) < quantity) {
        res.status(400).json({ error: '持仓不足' }); return;
      }

      const totalRevenue = price * quantity;
      dbRun('UPDATE users SET cash = cash + ? WHERE id = ?', [totalRevenue, userId]);

      const newQty = (holding.quantity as number) - quantity;
      if (newQty > 0) {
        dbRun('UPDATE holdings SET quantity = ? WHERE user_id = ? AND stock_symbol = ?', [newQty, userId, symbol]);
      } else {
        dbRun('UPDATE holdings SET quantity = 0 WHERE user_id = ? AND stock_symbol = ?', [userId, symbol]);
      }

      dbRun('INSERT INTO trades (user_id, stock_symbol, side, quantity, price) VALUES (?, ?, ?, ?, ?)', [userId, symbol, side, quantity, price]);
      saveDb();
      res.json({ success: true, message: `卖出${quantity}股${symbol}，成交价${price.toFixed(2)}`, price, quantity });
    }
  } catch (err) {
    res.status(500).json({ error: '交易失败' });
  }
});

app.get('/api/leaderboard', (req, res) => {
  try {
    const users = dbAll('SELECT id, email, cash FROM users');

    const results = users.map((user: any) => {
      const holdings = dbAll('SELECT stock_symbol, quantity FROM holdings WHERE user_id = ? AND quantity > 0', [user.id]);
      const marketValue = holdings.reduce((sum: number, h: any) => {
        return sum + (currentPrices.get(h.stock_symbol as string) || 0) * (h.quantity as number);
      }, 0);
      const totalAsset = (user.cash as number) + marketValue;
      const returnRate = (totalAsset / INITIAL_CAPITAL - 1) * 100;
      const tradeRow = dbGet('SELECT COUNT(*) as tradeCount FROM trades WHERE user_id = ?', [user.id]);

      return {
        userId: user.id,
        email: user.email,
        totalAsset: parseFloat(totalAsset.toFixed(2)),
        returnRate: parseFloat(returnRate.toFixed(2)),
        tradeCount: tradeRow?.tradeCount || 0,
      };
    });

    results.sort((a: any, b: any) => b.returnRate - a.returnRate);
    res.json(results.slice(0, 20));
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

app.get('/api/history/:symbol', (req, res) => {
  const symbol = req.params.symbol;
  const history = stockHistory.get(symbol) || [];
  const currentBar = currentBars.get(symbol);
  const allBars = currentBar ? [...history, currentBar] : history;
  res.json(allBars.slice(-100));
});

app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/socket.io')) {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  }
});

setInterval(() => {
  const marketData = generateMarketData();
  io.emit('market-data', marketData);
}, 3000);

setInterval(() => {
  try {
    const users = dbAll('SELECT id, email, cash FROM users');
    if (users.length === 0) return;

    const results = users.map((user: any) => {
      const holdings = dbAll('SELECT stock_symbol, quantity FROM holdings WHERE user_id = ? AND quantity > 0', [user.id]);
      const marketValue = holdings.reduce((sum: number, h: any) => {
        return sum + (currentPrices.get(h.stock_symbol as string) || 0) * (h.quantity as number);
      }, 0);
      const totalAsset = (user.cash as number) + marketValue;
      const returnRate = (totalAsset / INITIAL_CAPITAL - 1) * 100;
      const tradeRow = dbGet('SELECT COUNT(*) as tradeCount FROM trades WHERE user_id = ?', [user.id]);

      return {
        userId: user.id,
        email: user.email,
        totalAsset: parseFloat(totalAsset.toFixed(2)),
        returnRate: parseFloat(returnRate.toFixed(2)),
        tradeCount: tradeRow?.tradeCount || 0,
      };
    });

    results.sort((a: any, b: any) => b.returnRate - a.returnRate);
    io.emit('leaderboard', results.slice(0, 10));
  } catch (err) {
    // silently ignore
  }
}, 10000);

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  const latestData = generateMarketData();
  socket.emit('market-data', latestData);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

async function startServer() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
    console.log('Loaded existing database');
  } else {
    db = new SQL.Database();
    initDatabase(db);
    console.log('Created new database');
  }

  setInterval(saveDb, 10000);

  const PORT = 3001;
  server.listen(PORT, () => {
    console.log(`TradeRush server running on port ${PORT}`);
    generateMarketData();
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
