import express from 'express';
import cors from 'cors';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const poisPath = join(__dirname, 'src', 'data', 'pois.json');
const poisData = JSON.parse(fs.readFileSync(poisPath, 'utf-8'));

const cities = Object.keys(poisData);

app.get('/api/cities', (req, res) => {
  res.json(cities);
});

app.get('/api/pois', (req, res) => {
  const city = req.query.city;
  if (!city || !poisData[city]) {
    return res.status(404).json({ error: '城市未找到' });
  }
  res.json(poisData[city]);
});

app.get('/api/itinerary', (req, res) => {
  const city = req.query.city;
  const days = parseInt(req.query.days, 10);

  if (!city || !poisData[city]) {
    return res.status(404).json({ error: '城市未找到' });
  }
  if (!days || days < 1 || days > 30) {
    return res.status(400).json({ error: '天数需在1-30之间' });
  }

  const { attractions, restaurants, hotels } = poisData[city];
  const itinerary = [];

  for (let day = 0; day < days; day++) {
    const morningAttraction = attractions[day % attractions.length];
    const lunchRestaurant = restaurants[day % restaurants.length];
    const afternoonAttraction = attractions[(day + 1) % attractions.length];
    const eveningHotel = hotels[day % hotels.length];

    itinerary.push({
      day: day + 1,
      schedule: [
        {
          time: '上午',
          type: 'attraction',
          name: morningAttraction.name,
          lat: morningAttraction.lat,
          lng: morningAttraction.lng,
          description: morningAttraction.description,
          duration: morningAttraction.duration
        },
        {
          time: '午餐',
          type: 'restaurant',
          name: lunchRestaurant.name,
          lat: lunchRestaurant.lat,
          lng: lunchRestaurant.lng,
          description: lunchRestaurant.description,
          cuisine: lunchRestaurant.cuisine
        },
        {
          time: '下午',
          type: 'attraction',
          name: afternoonAttraction.name,
          lat: afternoonAttraction.lat,
          lng: afternoonAttraction.lng,
          description: afternoonAttraction.description,
          duration: afternoonAttraction.duration
        },
        {
          time: '晚间',
          type: 'hotel',
          name: eveningHotel.name,
          lat: eveningHotel.lat,
          lng: eveningHotel.lng,
          description: eveningHotel.description,
          stars: eveningHotel.stars
        }
      ]
    });
  }

  res.json(itinerary);
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
