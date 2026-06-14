import express from 'express';
import cors from 'cors';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const file = join(__dirname, 'db.json');
const adapter = new JSONFile(file);
const defaultData = { beans: [], feedback: [] };
const db = new Low(adapter, defaultData);

await db.read();

const FLAVOR_WEIGHTS = {
  '果酸': 'acidity',
  '花香': 'aroma',
  '坚果': 'body',
  '巧克力': 'sweetness',
  '焦糖': 'sweetness',
  '草本': 'aftertaste',
  '酒香': 'acidity'
};

const calculateMatchScore = (bean, preferences) => {
  let score = 0;
  const { flavors, brewMethod, minBudget, maxBudget } = preferences;

  const flavorMatch = bean.flavors.filter(f => flavors.includes(f)).length;
  score += flavorMatch * 15;

  if (bean.brewMethods.includes(brewMethod)) {
    score += 25;
  }

  if (bean.price >= minBudget && bean.price <= maxBudget) {
    score += 20;
    const midBudget = (minBudget + maxBudget) / 2;
    const priceRange = maxBudget - minBudget;
    if (priceRange > 0) {
      const priceDeviation = Math.abs(bean.price - midBudget) / priceRange;
      score += Math.max(0, (1 - priceDeviation) * 10);
    }
  } else if (bean.price < minBudget) {
    score += 10;
  }

  if (flavors.length > 0) {
    let profileScore = 0;
    flavors.forEach(flavor => {
      const attr = FLAVOR_WEIGHTS[flavor];
      if (attr && bean.flavorProfile[attr]) {
        profileScore += bean.flavorProfile[attr];
      }
    });
    score += (profileScore / (flavors.length * 5)) * 30;
  }

  score += (bean.avgRating / 5) * 10;

  return Math.min(Math.round(score), 100);
};

const priceToStars = (score) => {
  if (score >= 90) return 5;
  if (score >= 75) return 4.5;
  if (score >= 60) return 4;
  if (score >= 45) return 3.5;
  if (score >= 30) return 3;
  return 2.5;
};

app.post('/api/recommend', async (req, res) => {
  const startTime = Date.now();
  try {
    const { flavors = [], brewMethod = '手冲', minBudget = 50, maxBudget = 300 } = req.body;

    if (!Array.isArray(flavors)) {
      return res.status(400).json({ error: 'flavors must be an array' });
    }

    const results = db.data.beans
      .map(bean => ({
        ...bean,
        matchScore: calculateMatchScore(bean, { flavors, brewMethod, minBudget, maxBudget }),
        matchStars: priceToStars(calculateMatchScore(bean, { flavors, brewMethod, minBudget, maxBudget }))
      }))
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 8);

    await new Promise(resolve => setTimeout(resolve, Math.max(0, 50 - (Date.now() - startTime))));

    res.json({
      code: 0,
      data: results,
      total: results.length,
      time: Date.now() - startTime
    });
  } catch (error) {
    console.error('Recommend error:', error);
    res.status(500).json({ code: 1, error: 'Internal server error' });
  }
});

app.get('/api/beans/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const bean = db.data.beans.find(b => b.id === id);

    if (!bean) {
      return res.status(404).json({ code: 1, error: 'Bean not found' });
    }

    res.json({
      code: 0,
      data: bean
    });
  } catch (error) {
    console.error('Get bean detail error:', error);
    res.status(500).json({ code: 1, error: 'Internal server error' });
  }
});

app.post('/api/feedback', async (req, res) => {
  try {
    const { beanId, userId, rating, comment, satisfaction } = req.body;

    if (!beanId || !rating) {
      return res.status(400).json({ code: 1, error: 'beanId and rating are required' });
    }

    const feedback = {
      id: Date.now().toString(),
      beanId,
      userId: userId || 'anonymous',
      rating: Number(rating),
      comment: comment || '',
      satisfaction: satisfaction || null,
      createdAt: new Date().toISOString()
    };

    db.data.feedback.push(feedback);

    const bean = db.data.beans.find(b => b.id === beanId);
    if (bean && comment) {
      bean.reviews.unshift({
        user: userId || '匿名用户',
        rating: Number(rating),
        comment,
        date: new Date().toISOString().split('T')[0]
      });
      const totalRating = bean.reviews.reduce((sum, r) => sum + r.rating, 0);
      bean.avgRating = Number((totalRating / bean.reviews.length).toFixed(1));
      bean.reviewCount = bean.reviews.length;
    }

    await db.write();

    res.json({
      code: 0,
      data: {
        success: true,
        feedbackId: feedback.id,
        newAvgRating: bean ? bean.avgRating : null
      }
    });
  } catch (error) {
    console.error('Feedback error:', error);
    res.status(500).json({ code: 1, error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`BeanOracle API server running on http://localhost:${PORT}`);
});
