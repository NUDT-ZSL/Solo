import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { saveItinerary, getItinerary } from './database.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const generateActivities = (budget, days, preference) => {
  const dailyBudget = budget / days;
  const multiplier = preference === 'budget' ? 0.7 : preference === 'luxury' ? 1.5 : 1;
  
  const activitiesPool = {
    morning: [
      { name: '城市公园漫步', location: '中央公园', cost: 0, duration: 1.5 },
      { name: '博物馆参观', location: '市立博物馆', cost: 50 * multiplier, duration: 2 },
      { name: '古迹游览', location: '古城遗址', cost: 80 * multiplier, duration: 2.5 },
      { name: '美术馆展览', location: '现代美术馆', cost: 60 * multiplier, duration: 2 },
      { name: '早市体验', location: '传统市场', cost: 30 * multiplier, duration: 1.5 },
    ],
    lunch: [
      { name: '当地小吃', location: '美食街', cost: 40 * multiplier, duration: 1 },
      { name: '特色餐厅', location: '老字号餐厅', cost: 80 * multiplier, duration: 1.5 },
      { name: '快餐简餐', location: '连锁餐厅', cost: 30 * multiplier, duration: 0.5 },
      { name: '景观餐厅', location: '观景台餐厅', cost: 150 * multiplier, duration: 2 },
    ],
    afternoon: [
      { name: '购物中心', location: '商业中心', cost: 200 * multiplier, duration: 3 },
      { name: '自然风光', location: '郊外景区', cost: 100 * multiplier, duration: 4 },
      { name: '主题乐园', location: '欢乐世界', cost: 250 * multiplier, duration: 5 },
      { name: '历史街区', location: '老城区', cost: 0, duration: 2 },
      { name: '水上活动', location: '滨海浴场', cost: 120 * multiplier, duration: 3 },
    ],
    dinner: [
      { name: '夜市美食', location: '观光夜市', cost: 60 * multiplier, duration: 2 },
      { name: '高级餐厅', location: '米其林餐厅', cost: 300 * multiplier, duration: 2.5 },
      { name: '当地家常菜', location: '家庭餐馆', cost: 50 * multiplier, duration: 1 },
      { name: '烧烤大排档', location: '美食广场', cost: 80 * multiplier, duration: 1.5 },
    ],
    evening: [
      { name: '夜景观赏', location: '城市观景台', cost: 40 * multiplier, duration: 1.5 },
      { name: '演出观看', location: '大剧院', cost: 180 * multiplier, duration: 2.5 },
      { name: '酒吧休闲', location: '酒吧街', cost: 100 * multiplier, duration: 2 },
      { name: '夜游河景', location: '游船码头', cost: 150 * multiplier, duration: 2 },
      { name: '回酒店休息', location: '酒店', cost: 0, duration: 1 },
    ],
  };

  const accommodationCost = (preference === 'budget' ? 150 : preference === 'luxury' ? 800 : 350) * multiplier;
  const transportCost = (preference === 'budget' ? 30 : preference === 'luxury' ? 150 : 60) * multiplier;

  const itineraries = [];
  const baseLat = 39.9042;
  const baseLng = 116.4074;

  for (let day = 0; day < days; day++) {
    const dayActivities = [];
    let dayCost = accommodationCost + transportCost;
    const dayBudget = dailyBudget * (0.8 + Math.random() * 0.4);

    const periods = ['morning', 'lunch', 'afternoon', 'dinner', 'evening'];
    const periodStartTimes = { morning: 8, lunch: 12, afternoon: 13.5, dinner: 18, evening: 20 };

    periods.forEach((period, periodIndex) => {
      const pool = activitiesPool[period];
      const randomActivity = pool[Math.floor(Math.random() * pool.length)];
      
      if (dayCost + randomActivity.cost <= dayBudget * 1.1) {
        const startTime = periodStartTimes[period] + (Math.random() * 0.5);
        const endTime = startTime + randomActivity.duration;
        
        const angle = (day * 360 / days + periodIndex * 72 + Math.random() * 30) * (Math.PI / 180);
        const radius = 0.02 + Math.random() * 0.03;
        
        dayActivities.push({
          id: uuidv4(),
          time: `${Math.floor(startTime).toString().padStart(2, '0')}:${Math.round((startTime % 1) * 60).toString().padStart(2, '0')} - ${Math.floor(endTime).toString().padStart(2, '0')}:${Math.round((endTime % 1) * 60).toString().padStart(2, '0')}`,
          name: randomActivity.name,
          location: randomActivity.location,
          cost: Math.round(randomActivity.cost * 100) / 100,
          lat: baseLat + Math.sin(angle) * radius,
          lng: baseLng + Math.cos(angle) * radius,
          period
        });
        
        dayCost += randomActivity.cost;
      }
    });

    dayActivities.unshift({
      id: uuidv4(),
      time: '07:00 - 08:00',
      name: '早餐',
      location: '酒店餐厅',
      cost: Math.round((preference === 'budget' ? 15 : preference === 'luxury' ? 80 : 35) * multiplier * 100) / 100,
      lat: baseLat + (Math.random() - 0.5) * 0.01,
      lng: baseLng + (Math.random() - 0.5) * 0.01,
      period: 'breakfast'
    });

    dayCost += (preference === 'budget' ? 15 : preference === 'luxury' ? 80 : 35) * multiplier;

    itineraries.push({
      day: day + 1,
      date: `第${day + 1}天`,
      totalBudget: Math.round(dayBudget * 100) / 100,
      actualCost: Math.round(dayCost * 100) / 100,
      accommodationCost: Math.round(accommodationCost * 100) / 100,
      transportCost: Math.round(transportCost * 100) / 100,
      activities: dayActivities
    });
  }

  return itineraries;
};

app.post('/api/generate-itinerary', (req, res) => {
  const startTime = Date.now();
  const { budget, days, preference } = req.body;

  if (!budget || !days || !preference) {
    return res.status(400).json({ error: '缺少必要参数' });
  }

  const itineraries = generateActivities(budget, days, preference);
  const itineraryId = uuidv4();
  const totalCost = itineraries.reduce((sum, day) => sum + day.actualCost, 0);

  const result = {
    id: itineraryId,
    budget: Number(budget),
    days: Number(days),
    preference,
    totalCost: Math.round(totalCost * 100) / 100,
    itineraries
  };

  try {
    saveItinerary(itineraryId, result);
  } catch (err) {
    console.error('Database error:', err);
  }

  const elapsed = Date.now() - startTime;
  console.log(`行程生成耗时: ${elapsed}ms`);

  res.json(result);
});

app.get('/api/itinerary/:id', (req, res) => {
  const { id } = req.params;
  
  try {
    const row = getItinerary(id);
    
    if (!row) {
      return res.status(404).json({ error: '行程不存在' });
    }
    
    res.json(JSON.parse(row.data));
  } catch (err) {
    return res.status(500).json({ error: '数据库错误' });
  }
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
