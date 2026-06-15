const express = require('express');
const cors = require('cors');
const initSqlJs = require('sql.js');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

let db;
const dbPath = path.join(__dirname, '..', 'data.db');

async function initDatabase() {
  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      language TEXT NOT NULL,
      targetLanguage TEXT NOT NULL,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS translations (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL,
      sourceText TEXT NOT NULL,
      translatedText TEXT DEFAULT '',
      category TEXT DEFAULT 'dialogue',
      status TEXT DEFAULT 'pending',
      version INTEGER DEFAULT 1,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (projectId) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS translation_history (
      id TEXT PRIMARY KEY,
      translationId TEXT NOT NULL,
      translatedText TEXT NOT NULL,
      version INTEGER NOT NULL,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (translationId) REFERENCES translations(id)
    );

    CREATE TABLE IF NOT EXISTS ui_styles (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL,
      config TEXT NOT NULL,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (projectId) REFERENCES projects(id)
    );
  `);
}

function saveDatabase() {
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  } catch (e) {
    console.error('Failed to save database:', e.message);
  }
}

function runQuery(query, params = []) {
  try {
    const stmt = db.prepare(query);
    if (params && params.length > 0) {
      stmt.bind(params);
    }
    const result = [];
    while (stmt.step()) {
      result.push(stmt.getAsObject());
    }
    stmt.free();
    return result;
  } catch (e) {
    console.error('Query error:', e.message, 'Query:', query);
    throw e;
  }
}

function runExec(query, params = []) {
  try {
    db.run(query, params);
    saveDatabase();
  } catch (e) {
    console.error('Exec error:', e.message, 'Query:', query);
    throw e;
  }
}

async function seedData() {
  const countResult = runQuery('SELECT COUNT(*) as count FROM projects');
  if (countResult[0].count === 0) {
    const project1Id = uuidv4();
    const project2Id = uuidv4();

    runExec(
      'INSERT INTO projects (id, name, language, targetLanguage) VALUES (?, ?, ?, ?)',
      [project1Id, '奇幻冒险RPG', 'zh-CN', 'en-US']
    );
    runExec(
      'INSERT INTO projects (id, name, language, targetLanguage) VALUES (?, ?, ?, ?)',
      [project2Id, '科幻射击游戏', 'zh-CN', 'ja-JP']
    );

    const dialogues = [
      '欢迎来到艾尔达大陆，勇敢的冒险者！',
      '你必须找到失落的神器，才能拯救这个世界。',
      '前方的森林中潜伏着危险的生物，请小心行事。',
      '村长：年轻人，你愿意帮助我们吗？',
      '传说中的龙之宝藏就藏在这座山的深处。',
      '魔法师：使用这枚符文可以打开封印之门。',
      '骑士团团长：我们需要更多的勇士加入战斗。',
      '黑暗领主即将苏醒，时间不多了。',
      '精灵长老：古老的预言正在逐步实现。',
      '你获得了经验值 +100',
      '背包已满，请整理物品后再继续。',
      '任务已完成！获得金币 500 枚。',
      '是否保存当前进度？',
      '生命值不足，无法使用该技能。',
      '新技能已解锁：火焰风暴',
      '物品：治疗药水 - 恢复50点生命值',
      '装备：秘银剑 - 攻击力+35',
      '警告：前方区域等级过高，建议提升等级后再前往。',
      '与NPC对话中...',
      '你确定要删除这个存档吗？此操作无法撤销。'
    ];

    for (let i = 0; i < dialogues.length; i++) {
      runExec(
        'INSERT INTO translations (id, projectId, sourceText, translatedText, category, status) VALUES (?, ?, ?, ?, ?, ?)',
        [
          uuidv4(),
          project1Id,
          dialogues[i],
          i % 3 === 0 ? `[Translated] ${dialogues[i]}` : '',
          i < 15 ? 'dialogue' : 'ui',
          i % 3 === 0 ? 'translated' : 'pending'
        ]
      );
    }

    const sciFiTexts = [
      '星舰指挥官，欢迎回到指挥中心。',
      '检测到外星舰队正在逼近，距离12光年。',
      '护盾能量剩余35%，建议立即撤退。',
      '任务目标：破坏敌方能量核心。',
      '武器系统已就绪，等待开火指令。',
      '船员：长官，我们收到了神秘信号。',
      '超空间引擎冷却中，预计10分钟后可启动。',
      '这是我们最后的希望，全靠你了，指挥官。'
    ];

    for (let i = 0; i < sciFiTexts.length; i++) {
      runExec(
        'INSERT INTO translations (id, projectId, sourceText, translatedText, category, status) VALUES (?, ?, ?, ?, ?, ?)',
        [
          uuidv4(),
          project2Id,
          sciFiTexts[i],
          '',
          'dialogue',
          'pending'
        ]
      );
    }

    const defaultStyle = JSON.stringify({
      dialogBgColor: '#333333',
      textColor: '#ffffff',
      fontSize: 14,
      lineHeight: 1.6,
      padding: 16,
      borderRadius: 12,
      avatarSize: 64
    });

    runExec(
      'INSERT INTO ui_styles (id, projectId, config) VALUES (?, ?, ?)',
      [uuidv4(), project1Id, defaultStyle]
    );
    runExec(
      'INSERT INTO ui_styles (id, projectId, config) VALUES (?, ?, ?)',
      [uuidv4(), project2Id, defaultStyle]
    );
  }
}

app.get('/api/projects', (req, res) => {
  try {
    const rows = runQuery('SELECT * FROM projects ORDER BY createdAt DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/projects', (req, res) => {
  const { name, language, targetLanguage } = req.body;
  const id = uuidv4();
  try {
    runExec(
      'INSERT INTO projects (id, name, language, targetLanguage) VALUES (?, ?, ?, ?)',
      [id, name, language, targetLanguage]
    );
    res.json({ id, name, language, targetLanguage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/projects/:projectId/translations', (req, res) => {
  const { projectId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 60;
  const offset = (page - 1) * pageSize;

  try {
    const items = runQuery(
      'SELECT * FROM translations WHERE projectId = ? ORDER BY createdAt ASC LIMIT ? OFFSET ?',
      [projectId, pageSize, offset]
    );

    const countRow = runQuery(
      'SELECT COUNT(*) as total FROM translations WHERE projectId = ?',
      [projectId]
    );

    res.json({
      items,
      total: countRow[0].total,
      page,
      pageSize
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/projects/:projectId/progress', (req, res) => {
  const { projectId } = req.params;
  try {
    const row = runQuery(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'translated' THEN 1 ELSE 0 END) as translated
       FROM translations WHERE projectId = ?`,
      [projectId]
    );

    const total = row[0].total || 0;
    const translated = row[0].translated || 0;
    const percentage = total > 0 ? Math.round((translated / total) * 100) : 0;
    res.json({ total, translated, percentage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/translations/:id', (req, res) => {
  const { id } = req.params;
  const { translatedText } = req.body;

  try {
    const current = runQuery(
      'SELECT version, translatedText as oldText FROM translations WHERE id = ?',
      [id]
    );

    if (!current || current.length === 0) {
      return res.status(404).json({ error: 'Translation not found' });
    }

    const newVersion = current[0].version + 1;
    const historyId = uuidv4();
    const status = translatedText && translatedText.trim() !== '' ? 'translated' : 'pending';

    runExec(
      'INSERT INTO translation_history (id, translationId, translatedText, version) VALUES (?, ?, ?, ?)',
      [historyId, id, current[0].oldText, current[0].version]
    );

    runExec(
      'UPDATE translations SET translatedText = ?, status = ?, version = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
      [translatedText, status, newVersion, id]
    );

    res.json({
      id,
      translatedText,
      status,
      version: newVersion
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/translations/:id/history', (req, res) => {
  const { id } = req.params;
  try {
    const rows = runQuery(
      'SELECT * FROM translation_history WHERE translationId = ? ORDER BY version DESC',
      [id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/projects/:projectId/ui-styles', (req, res) => {
  const { projectId } = req.params;
  try {
    const row = runQuery(
      'SELECT * FROM ui_styles WHERE projectId = ? ORDER BY createdAt DESC LIMIT 1',
      [projectId]
    );

    if (row && row.length > 0) {
      res.json({ ...row[0], config: JSON.parse(row[0].config) });
    } else {
      res.json(null);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/projects/:projectId/ui-styles', (req, res) => {
  const { projectId } = req.params;
  const { config } = req.body;
  const id = uuidv4();

  try {
    runExec(
      'INSERT INTO ui_styles (id, projectId, config) VALUES (?, ?, ?)',
      [id, projectId, JSON.stringify(config)]
    );
    res.json({ id, projectId, config });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function startServer() {
  try {
    await initDatabase();
    await seedData();
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (e) {
    console.error('Failed to start server:', e);
    process.exit(1);
  }
}

startServer();
