import express from 'express';
import cors from 'cors';
import {
  createUser,
  findUser,
  createTea,
  getTeasByUser,
  updateTea,
  deleteTea,
  createTasting,
  getTastingsByTea,
  getTastingsByUser,
  toggleFavorite,
  Tea,
  TastingRecord,
  TeaScores,
} from './data/store.js';

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

app.post('/api/users/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
    }
    const existing = await findUser(username);
    if (existing) {
      return res.status(409).json({ success: false, message: '用户名已存在' });
    }
    const user = await createUser(username, password);
    const { password: _, ...userWithoutPassword } = user;
    res.json({ success: true, user: userWithoutPassword });
  } catch (err) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

app.post('/api/users/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
    }
    const user = await findUser(username);
    if (!user || user.password !== password) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }
    const { password: _, ...userWithoutPassword } = user;
    res.json({ success: true, user: userWithoutPassword });
  } catch (err) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

app.get('/api/teas', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ success: false, message: '缺少userId参数' });
    }
    const teas = await getTeasByUser(String(userId));
    const teasWithLatestTasting = await Promise.all(
      teas.map(async (tea) => {
        const tastings = await getTastingsByTea(tea.id);
        return { ...tea, latestTasting: tastings[0] || null };
      })
    );
    res.json({ success: true, teas: teasWithLatestTasting });
  } catch (err) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

app.post('/api/teas', async (req, res) => {
  try {
    const { userId, name, origin, year, imageUrl, isFavorite } = req.body;
    if (!userId || !name) {
      return res.status(400).json({ success: false, message: 'userId和name不能为空' });
    }
    const tea = await createTea({
      userId,
      name,
      origin: origin || '',
      year: year || new Date().getFullYear(),
      imageUrl: imageUrl || '',
      isFavorite: isFavorite || false,
    });
    res.json({ success: true, tea });
  } catch (err) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

app.put('/api/teas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, origin, year, imageUrl, isFavorite } = req.body;
    const updateData: Partial<Tea> = {};
    if (name !== undefined) updateData.name = name;
    if (origin !== undefined) updateData.origin = origin;
    if (year !== undefined) updateData.year = year;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (isFavorite !== undefined) updateData.isFavorite = isFavorite;
    const tea = await updateTea(id, updateData);
    if (!tea) {
      return res.status(404).json({ success: false, message: '茶品不存在' });
    }
    res.json({ success: true, tea });
  } catch (err) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

app.delete('/api/teas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteTea(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: '茶品不存在' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

app.get('/api/tastings', async (req, res) => {
  try {
    const { teaId } = req.query;
    if (!teaId) {
      return res.status(400).json({ success: false, message: '缺少teaId参数' });
    }
    const tastings = await getTastingsByTea(String(teaId));
    res.json({ success: true, tastings });
  } catch (err) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

app.post('/api/tastings', async (req, res) => {
  try {
    const { userId, teaId, scores, notes } = req.body;
    if (!userId || !teaId || !scores) {
      return res.status(400).json({ success: false, message: 'userId、teaId和scores不能为空' });
    }
    const requiredKeys: (keyof TeaScores)[] = ['aroma', 'taste', 'color', 'leaf', 'aftertaste'];
    for (const key of requiredKeys) {
      if (typeof scores[key] !== 'number') {
        return res.status(400).json({ success: false, message: `评分维度 ${key} 缺失` });
      }
    }
    const tasting = await createTasting({
      userId,
      teaId,
      scores,
      notes: notes || '',
    });
    res.json({ success: true, tasting });
  } catch (err) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

app.post('/api/recommend', async (req, res) => {
  try {
    const { userId, moodTags }: { userId: string; moodTags: string[] } = req.body;
    if (!userId || !Array.isArray(moodTags)) {
      return res.status(400).json({ success: false, message: '参数错误' });
    }
    const teas = await getTeasByUser(userId);
    const tastings = await getTastingsByUser(userId);

    const moodWeights: Record<string, Partial<Record<keyof TeaScores, number>>> = {
      清甜: { aftertaste: 2, taste: 1.5 },
      醇厚: { taste: 2, leaf: 1.5 },
      花香: { aroma: 2.5 },
      烟熏: { aroma: 2, leaf: 1.5 },
      鲜爽: { color: 2, aftertaste: 1.5 },
    };

    const weights: Record<keyof TeaScores, number> = {
      aroma: 1,
      taste: 1,
      color: 1,
      leaf: 1,
      aftertaste: 1,
    };

    for (const tag of moodTags) {
      const tagWeights = moodWeights[tag];
      if (tagWeights) {
        for (const key of Object.keys(tagWeights) as (keyof TeaScores)[]) {
          weights[key] = (weights[key] || 1) * (tagWeights[key] || 1);
        }
      }
    }

    const scoredTeas = teas.map((tea) => {
      const teaTastings = tastings.filter((t) => t.teaId === tea.id);
      if (teaTastings.length === 0) {
        return { tea, score: 0, avgScores: null as TeaScores | null };
      }
      const avgScores: TeaScores = { aroma: 0, taste: 0, color: 0, leaf: 0, aftertaste: 0 };
      for (const t of teaTastings) {
        avgScores.aroma += t.scores.aroma;
        avgScores.taste += t.scores.taste;
        avgScores.color += t.scores.color;
        avgScores.leaf += t.scores.leaf;
        avgScores.aftertaste += t.scores.aftertaste;
      }
      const len = teaTastings.length;
      (Object.keys(avgScores) as (keyof TeaScores)[]).forEach((k) => {
        avgScores[k] = avgScores[k] / len;
      });
      const weightedScore =
        avgScores.aroma * weights.aroma +
        avgScores.taste * weights.taste +
        avgScores.color * weights.color +
        avgScores.leaf * weights.leaf +
        avgScores.aftertaste * weights.aftertaste;
      return { tea, score: weightedScore, avgScores };
    });

    scoredTeas.sort((a, b) => b.score - a.score);
    const recommendations = scoredTeas.map((item) => ({
      ...item.tea,
      score: Math.round(item.score * 100) / 100,
    }));

    res.json({ success: true, recommendations });
  } catch (err) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

app.get('/api/statistics', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ success: false, message: '缺少userId参数' });
    }
    const tastings = await getTastingsByUser(String(userId));
    const totalTastings = tastings.length;

    let averageScore = 0;
    const dimensionAverages: TeaScores = { aroma: 0, taste: 0, color: 0, leaf: 0, aftertaste: 0 };

    if (totalTastings > 0) {
      let totalScoreSum = 0;
      for (const t of tastings) {
        totalScoreSum += t.totalScore;
        dimensionAverages.aroma += t.scores.aroma;
        dimensionAverages.taste += t.scores.taste;
        dimensionAverages.color += t.scores.color;
        dimensionAverages.leaf += t.scores.leaf;
        dimensionAverages.aftertaste += t.scores.aftertaste;
      }
      averageScore = Math.round((totalScoreSum / totalTastings) * 10) / 10;
      (Object.keys(dimensionAverages) as (keyof TeaScores)[]).forEach((k) => {
        dimensionAverages[k] = Math.round((dimensionAverages[k] / totalTastings) * 10) / 10;
      });
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const monthlyHeatmap: number[][] = [];
    for (let w = 0; w < 5; w++) {
      const row: number[] = [];
      for (let d = 0; d < 7; d++) {
        let dayIndex = w * 7 + d - firstDayOfWeek + 1;
        if (dayIndex < 1 || dayIndex > daysInMonth) {
          row.push(0);
        } else {
          const dayDate = new Date(year, month, dayIndex);
          const dayStart = new Date(dayDate);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(dayDate);
          dayEnd.setHours(23, 59, 59, 999);
          const count = tastings.filter((t) => {
            const tDate = new Date(t.createdAt);
            return tDate >= dayStart && tDate <= dayEnd;
          }).length;
          row.push(count);
        }
      }
      monthlyHeatmap.push(row);
    }

    res.json({
      success: true,
      statistics: {
        totalTastings,
        averageScore,
        dimensionAverages,
        monthlyHeatmap,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

app.post('/api/favorites/:teaId', async (req, res) => {
  try {
    const { teaId } = req.params;
    const isFavorite = await toggleFavorite(teaId);
    res.json({ success: true, isFavorite });
  } catch (err) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

app.get('/api/favorites', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ success: false, message: '缺少userId参数' });
    }
    const teas = await getTeasByUser(String(userId));
    const favorites = teas.filter((t) => t.isFavorite);
    const favoritesWithLatest = await Promise.all(
      favorites.map(async (tea) => {
        const tastings = await getTastingsByTea(tea.id);
        return { ...tea, latestTasting: tastings[0] || null };
      })
    );
    res.json({ success: true, favorites: favoritesWithLatest });
  } catch (err) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
