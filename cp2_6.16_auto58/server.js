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

const citiesMap = {};
poisData.cities.forEach(city => {
  citiesMap[city.name] = {
    attractions: city.attractions,
    restaurants: city.restaurants,
    hotels: city.hotels
  };
});

const cityNames = poisData.cities.map(city => city.name);

app.get('/api/cities', (req, res) => {
  res.json(cityNames);
});

app.get('/api/pois', (req, res) => {
  const city = req.query.city;
  if (!city || !citiesMap[city]) {
    return res.status(404).json({ error: '城市未找到' });
  }
  res.json(citiesMap[city]);
});

app.get('/api/itinerary', (req, res) => {
  const city = req.query.city;
  const days = parseInt(req.query.days, 10);

  if (!city || !citiesMap[city]) {
    return res.status(404).json({ error: '城市未找到' });
  }
  if (!days || days < 1 || days > 14) {
    return res.status(400).json({ error: '天数需在1-14之间' });
  }

  const { attractions, restaurants, hotels } = citiesMap[city];
  
  const sortedAttractions = [...attractions].sort((a, b) => b.rating - a.rating);
  const sortedRestaurants = [...restaurants].sort((a, b) => b.rating - a.rating);
  const sortedHotels = [...hotels].sort((a, b) => b.rating - a.rating);

  const itinerary = [];

  for (let day = 0; day < days; day++) {
    const morningAttraction = sortedAttractions[day % sortedAttractions.length];
    const lunchRestaurant = sortedRestaurants[day % sortedRestaurants.length];
    const afternoonAttraction = sortedAttractions[(day + 1) % sortedAttractions.length];
    const eveningHotel = sortedHotels[day % sortedHotels.length];

    itinerary.push({
      day: day + 1,
      schedule: [
        {
          id: `day${day + 1}-morning`,
          time: '上午',
          type: 'attraction',
          name: morningAttraction.name,
          lat: morningAttraction.lat,
          lng: morningAttraction.lng,
          rating: morningAttraction.rating,
          description: morningAttraction.description,
          duration: morningAttraction.duration
        },
        {
          id: `day${day + 1}-lunch`,
          time: '中午',
          type: 'restaurant',
          name: lunchRestaurant.name,
          lat: lunchRestaurant.lat,
          lng: lunchRestaurant.lng,
          rating: lunchRestaurant.rating,
          description: lunchRestaurant.description,
          duration: lunchRestaurant.duration
        },
        {
          id: `day${day + 1}-afternoon`,
          time: '下午',
          type: 'attraction',
          name: afternoonAttraction.name,
          lat: afternoonAttraction.lat,
          lng: afternoonAttraction.lng,
          rating: afternoonAttraction.rating,
          description: afternoonAttraction.description,
          duration: afternoonAttraction.duration
        },
        {
          id: `day${day + 1}-evening`,
          time: '晚上',
          type: 'hotel',
          name: eveningHotel.name,
          lat: eveningHotel.lat,
          lng: eveningHotel.lng,
          rating: eveningHotel.rating,
          description: eveningHotel.description,
          duration: eveningHotel.duration
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
