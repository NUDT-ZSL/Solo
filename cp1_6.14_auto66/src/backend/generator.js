import { v4 as uuidv4 } from 'uuid';

const destinationData = {
  '京都': {
    baseCoords: [35.0116, 135.7681],
    attractions: [
      { name: '伏见稻荷大社', description: '千本鸟居绵延山间的神社', duration: '2小时', offset: [0.03, 0.02] },
      { name: '清水寺', description: '悬空于悬崖的千年古寺', duration: '1.5小时', offset: [0.01, -0.01] },
      { name: '金阁寺', description: '金碧辉煌的禅宗寺院', duration: '1小时', offset: [-0.02, 0.03] },
      { name: '银阁寺', description: '禅意悠远的枯山水庭院', duration: '1小时', offset: [-0.03, 0.01] },
      { name: '岚山竹林', description: '翠绿竹海中的幽静小径', duration: '1.5小时', offset: [-0.04, -0.02] },
      { name: '天龙寺', description: '世界文化遗产的禅宗名刹', duration: '1小时', offset: [-0.045, -0.025] },
      { name: '二条城', description: '德川幕府的华丽城堡', duration: '1.5小时', offset: [0.0, -0.03] },
      { name: '祗园', description: '传统艺伎文化街区', duration: '2小时', offset: [0.015, 0.005] },
      { name: '八坂神社', description: '祗园地区的中心神社', duration: '1小时', offset: [0.02, 0.01] },
      { name: '东福寺', description: '秋季红叶名所', duration: '1.5小时', offset: [0.0, 0.04] }
    ],
    restaurants: [
      { name: '菊乃井', cuisine: '怀石料理', price: '¥¥¥' },
      { name: '祇园佐々木', cuisine: '京料理', price: '¥¥¥' },
      { name: '一兰拉面', cuisine: '豚骨拉面', price: '¥' },
      { name: '中村藤吉', cuisine: '抹茶甜点', price: '¥¥' },
      { name: '伊右卫门', cuisine: '和食', price: '¥¥' },
      { name: '花见小路', cuisine: '京怀石', price: '¥¥¥' },
      { name: '鸟岩楼', cuisine: '天妇罗', price: '¥¥¥' },
      { name: '京都拉面小路', cuisine: '拉面', price: '¥' }
    ],
    imagePrompts: [
      'traditional Japanese temple with red torii gates',
      'zen garden with raked sand and moss',
      'historic wooden architecture in Kyoto',
      'bamboo forest path with sunlight filtering through',
      'golden pavilion reflecting in tranquil pond'
    ]
  },
  '东京': {
    baseCoords: [35.6762, 139.6503],
    attractions: [
      { name: '浅草寺', description: '东京最古老的佛教寺庙', duration: '1.5小时', offset: [0.04, 0.03] },
      { name: '东京塔', description: '城市地标夜景绝佳', duration: '1小时', offset: [0.01, 0.01] },
      { name: '涩谷十字路口', description: '世界最繁忙的人行横道', duration: '1小时', offset: [-0.02, -0.03] },
      { name: '明治神宫', description: '闹市中的静谧神社', duration: '1.5小时', offset: [-0.01, 0.0] },
      { name: '上野公园', description: '博物馆与樱花名所', duration: '2小时', offset: [0.03, 0.01] },
      { name: '秋叶原', description: '动漫与电器天堂', duration: '2小时', offset: [0.02, 0.02] },
      { name: '银座', description: '高端购物与美食', duration: '2小时', offset: [0.0, -0.01] },
      { name: '台场', description: '未来感海滨娱乐区', duration: '2.5小时', offset: [0.02, -0.04] },
      { name: '新宿御苑', description: '都市绿洲与皇居', duration: '1.5小时', offset: [-0.015, 0.005] },
      { name: '筑地市场', description: '新鲜海产美食', duration: '1.5小时', offset: [0.005, -0.02] }
    ],
    restaurants: [
      { name: '数寄屋桥次郎', cuisine: '寿司', price: '¥¥¥' },
      { name: '一风堂', cuisine: '豚骨拉面', price: '¥' },
      { name: '俺的烧肉', cuisine: '日式烧烤', price: '¥¥' },
      { name: '筑地寿司清', cuisine: '新鲜寿司', price: '¥¥' },
      { name: '原宿布丁', cuisine: '甜点咖啡', price: '¥' },
      { name: '新宿炸猪排', cuisine: '日式炸猪排', price: '¥¥' },
      { name: '银座天妇罗', cuisine: '天妇罗', price: '¥¥¥' },
      { name: '涩谷烤串', cuisine: '居酒屋', price: '¥¥' }
    ],
    imagePrompts: [
      'Tokyo skyline with Tokyo Tower at night',
      'bustling Shibuya crossing with neon signs',
      'traditional Japanese temple in modern city',
      'anime and manga store in Akihabara',
      'cherry blossoms in Ueno Park'
    ]
  },
  '大阪': {
    baseCoords: [34.6937, 135.5023],
    attractions: [
      { name: '大阪城', description: '战国时代的象征城堡', duration: '2小时', offset: [0.02, 0.01] },
      { name: '道顿堀', description: '美食与霓虹夜景', duration: '2小时', offset: [0.0, -0.02] },
      { name: '环球影城', description: '主题乐园欢乐一整天', duration: '8小时', offset: [-0.04, 0.02] },
      { name: '梅田蓝天大厦', description: '空中庭园夜景', duration: '1.5小时', offset: [0.01, 0.02] },
      { name: '四天王寺', description: '日本最古老的寺庙', duration: '1.5小时', offset: [0.03, -0.01] },
      { name: '心斋桥', description: '繁华购物步行街', duration: '2小时', offset: [-0.005, -0.015] },
      { name: '大阪历史博物馆', description: '了解城市历史', duration: '1.5小时', offset: [0.015, -0.005] },
      { name: '万博纪念公园', description: '太阳塔与绿地', duration: '2小时', offset: [-0.03, 0.03] },
      { name: '黑门市场', description: '新鲜海产美食街', duration: '1.5小时', offset: [0.0, -0.025] },
      { name: '中之岛公园', description: '城市绿洲与美术馆', duration: '1.5小时', offset: [0.005, 0.0] }
    ],
    restaurants: [
      { name: '大起水产', cuisine: '回转寿司', price: '¥¥' },
      { name: '道顿堀章鱼烧', cuisine: '章鱼小丸子', price: '¥' },
      { name: '大阪烧 美津の', cuisine: '大阪烧', price: '¥¥' },
      { name: '炸串 新世界', cuisine: '日式炸串', price: '¥' },
      { name: '蟹道乐', cuisine: '螃蟹料理', price: '¥¥¥' },
      { name: '一兰拉面', cuisine: '拉面', price: '¥' },
      { name: '河豚料理 春帆楼', cuisine: '河豚', price: '¥¥¥' },
      { name: '拉面 金龙', cuisine: '大阪拉面', price: '¥' }
    ],
    imagePrompts: [
      'Osaka Castle with cherry blossoms',
      'Dotonbori neon signs and Glico Man sign',
      'street food stalls in Osaka',
      'Universal Studios Japan attractions',
      'Umeda Sky Building at night'
    ]
  }
};

const defaultData = {
  baseCoords: [35.0, 135.0],
  attractions: [
    { name: '市中心广场', description: '城市中心地带', duration: '1小时', offset: [0.01, 0.01] },
    { name: '历史博物馆', description: '了解当地历史文化', duration: '1.5小时', offset: [0.02, 0.0] },
    { name: '艺术画廊', description: '现代艺术展览', duration: '1小时', offset: [-0.01, 0.02] },
    { name: '中央公园', description: '城市绿地休闲', duration: '1.5小时', offset: [-0.02, -0.01] },
    { name: '老城区', description: '传统建筑街区', duration: '2小时', offset: [0.01, -0.02] },
    { name: '观景台', description: '城市全景俯瞰', duration: '1小时', offset: [0.03, 0.01] },
    { name: '本地市场', description: '特产与美食', duration: '1.5小时', offset: [0.0, -0.015] },
    { name: '海滨步道', description: '浪漫海边漫步', duration: '1.5小时', offset: [-0.015, 0.015] }
  ],
  restaurants: [
    { name: '本地风味餐厅', cuisine: '地方特色菜', price: '¥¥' },
    { name: '网红咖啡馆', cuisine: '咖啡甜点', price: '¥' },
    { name: '家庭餐馆', cuisine: '家常料理', price: '¥' },
    { name: '海鲜大排档', cuisine: '新鲜海鲜', price: '¥¥' },
    { name: '老字号饭店', cuisine: '传统名菜', price: '¥¥¥' },
    { name: '时尚酒吧', cuisine: '酒水小食', price: '¥¥' },
    { name: '素食餐厅', cuisine: '健康素食', price: '¥¥' },
    { name: '甜品店', cuisine: '精致甜点', price: '¥' }
  ],
  imagePrompts: [
    'beautiful cityscape at sunset',
    'historic architecture in old town',
    'local market with fresh produce',
    'scenic natural landscape',
    'modern city skyline'
  ]
};

const timeSlots = ['09:00', '10:30', '12:00', '14:00', '15:30', '17:00', '19:00', '20:30'];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffleArray(arr) {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function generateDayPlan(dateNum, data, preferences) {
  const spotsCount = Math.min(3 + Math.floor(Math.random() * 2), 5);
  const shuffledAttractions = shuffleArray(data.attractions);
  const selectedAttractions = shuffledAttractions.slice(0, spotsCount);
  
  const spots = selectedAttractions.map((attraction, idx) => ({
    id: uuidv4(),
    name: attraction.name,
    description: attraction.description,
    time: timeSlots[idx * 2] || timeSlots[timeSlots.length - 1],
    duration: attraction.duration,
    coordinates: [
      data.baseCoords[0] + attraction.offset[0] + (Math.random() - 0.5) * 0.01,
      data.baseCoords[1] + attraction.offset[1] + (Math.random() - 0.5) * 0.01
    ],
    imagePrompt: getRandomItem(data.imagePrompts)
  }));

  const shuffledRestaurants = shuffleArray(data.restaurants);
  const restaurants = shuffledRestaurants.slice(0, 2).map(r => ({
    id: uuidv4(),
    name: r.name,
    cuisine: r.cuisine,
    price: r.price
  }));

  const summary = spots.map(a => a.name);

  return {
    id: uuidv4(),
    date: dateNum,
    summary,
    spots,
    restaurants
  };
}

export function generateTravelPlan(destination, days, preferences, budget) {
  const data = destinationData[destination] || defaultData;
  
  const dailyPlans = [];
  for (let i = 1; i <= days; i++) {
    dailyPlans.push(generateDayPlan(i, data, preferences));
  }

  return {
    id: uuidv4(),
    destination,
    days,
    preferences,
    budget,
    dailyPlans,
    createdAt: new Date().toISOString()
  };
}

export default generateTravelPlan;
