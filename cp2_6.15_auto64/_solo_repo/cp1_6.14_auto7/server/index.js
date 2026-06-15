import express from 'express';
import Datastore from 'nedb-promises';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());

const dbPath = path.join(__dirname, '..', 'data');
const savesDb = Datastore.create(path.join(dbPath, 'saves.db'));
const leaderboardDb = Datastore.create(path.join(dbPath, 'leaderboard.db'));

let leaderboardCache: any[] = [];
let leaderboardLastUpdate = 0;
const LEADERBOARD_CACHE_TTL = 30 * 60 * 1000;

const updateLeaderboardCache = async () => {
  const now = Date.now();
  if (now - leaderboardLastUpdate < LEADERBOARD_CACHE_TTL && leaderboardCache.length > 0) {
    return;
  }

  const entries = await leaderboardDb
    .find({})
    .sort({ completionTime: 1, level: -1 })
    .limit(50)
    .exec();

  const seen = new Set<string>();
  leaderboardCache = entries.filter(entry => {
    const key = `${entry.playerId || entry._id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 10);

  leaderboardLastUpdate = now;
};

setInterval(updateLeaderboardCache, 5 * 60 * 1000);

app.post('/api/save', async (req, res) => {
  try {
    const { oxygen, energy, minerals, upgrades, level, completionTime, playerName } = req.body;

    const saveId = uuidv4();

    const saveDoc = {
      saveId,
      oxygen,
      energy,
      minerals,
      upgrades,
      level,
      completionTime: completionTime || 0,
      playerName: playerName || 'Anonymous',
      createdAt: new Date().toISOString(),
      timestamp: Date.now()
    };

    await savesDb.insert(saveDoc);

    if (completionTime && completionTime > 0 && level > 0) {
      const leaderboardDoc = {
        saveId,
        level,
        completionTime,
        playerName: playerName || 'Anonymous',
        minerals: minerals || {},
        upgrades: upgrades || {},
        createdAt: new Date().toISOString(),
        timestamp: Date.now()
      };
      await leaderboardDb.insert(leaderboardDoc);
      await updateLeaderboardCache();
    }

    res.status(200).json({
      success: true,
      saveId,
      message: 'Game saved successfully'
    });
  } catch (error) {
    console.error('Save error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save game'
    });
  }
});

app.get('/api/load/:saveId', async (req, res) => {
  try {
    const { saveId } = req.params;

    const save = await savesDb.findOne({ saveId });

    if (!save) {
      return res.status(404).json({
        success: false,
        error: 'Save not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        oxygen: save.oxygen,
        energy: save.energy,
        minerals: save.minerals,
        upgrades: save.upgrades,
        level: save.level
      }
    });
  } catch (error) {
    console.error('Load error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load game'
    });
  }
});

app.get('/api/leaderboard', async (req, res) => {
  try {
    await updateLeaderboardCache();

    res.status(200).json({
      success: true,
      data: leaderboardCache.map(entry => ({
        rank: 0,
        playerName: entry.playerName,
        level: entry.level,
        completionTime: entry.completionTime,
        saveId: entry.saveId,
        createdAt: entry.createdAt
      })).map((entry, idx) => ({ ...entry, rank: idx + 1 })),
      lastUpdated: new Date(leaderboardLastUpdate).toISOString(),
      nextUpdate: new Date(leaderboardLastUpdate + LEADERBOARD_CACHE_TTL).toISOString()
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leaderboard'
    });
  }
});

app.get('/api/upgrades', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      speed: {
        name: '速度升级',
        description: '提升潜水器移动速度',
        maxLevel: 3,
        costs: [
          { sphalerite: 3, kyanite: 0, emerald: 0 },
          { sphalerite: 3, kyanite: 0, emerald: 0 },
          { sphalerite: 3, kyanite: 0, emerald: 0 }
        ],
        bonuses: ['+20% 速度', '+40% 速度', '+60% 速度']
      },
      sonarRange: {
        name: '声纳范围升级',
        description: '提升声纳扫描范围',
        maxLevel: 3,
        costs: [
          { sphalerite: 0, kyanite: 2, emerald: 0 },
          { sphalerite: 0, kyanite: 2, emerald: 0 },
          { sphalerite: 0, kyanite: 2, emerald: 0 }
        ],
        bonuses: ['范围 10 格', '范围 12 格', '范围 15 格']
      },
      energyEfficiency: {
        name: '能量效率升级',
        description: '减少推进时的能量消耗',
        maxLevel: 3,
        costs: [
          { sphalerite: 0, kyanite: 0, emerald: 2 },
          { sphalerite: 0, kyanite: 0, emerald: 2 },
          { sphalerite: 0, kyanite: 0, emerald: 2 }
        ],
        bonuses: ['-30% 消耗', '-50% 消耗', '-70% 消耗']
      }
    }
  });
});

app.get('/api/minerals', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      sphalerite: {
        name: '闪锌矿',
        color: '#a855f7',
        rarity: '稀有',
        description: '用于提升潜水器速度的紫色稀有矿物'
      },
      kyanite: {
        name: '蓝晶石',
        color: '#3b82f6',
        rarity: '稀有',
        description: '用于扩大声纳范围的蓝色稀有矿物'
      },
      emerald: {
        name: '祖母绿',
        color: '#22c55e',
        rarity: '稀有',
        description: '用于提升能量效率的绿色稀有矿物'
      }
    }
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: Date.now() });
});

app.listen(PORT, () => {
  console.log(`\n🚀 AbyssDrifter Server running on http://localhost:${PORT}`);
  console.log(`📊 API Endpoints:`);
  console.log(`   POST /api/save       - Save game progress`);
  console.log(`   GET  /api/load/:id   - Load game progress`);
  console.log(`   GET  /api/leaderboard- Get top 10 leaderboard`);
  console.log(`   GET  /api/upgrades   - Get upgrade config`);
  console.log(`   GET  /api/minerals   - Get mineral guide`);
  console.log(`   GET  /api/health     - Health check\n`);
});

export default app;
