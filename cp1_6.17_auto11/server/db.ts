import { v4 as uuidv4 } from 'uuid';

export interface User {
  id: string;
  username: string;
  password: string;
  avatar?: string;
  createdAt: string;
}

export interface Attraction {
  id: string;
  name: string;
  city: string;
  coordinates: { lat: number; lng: number };
  description: string;
  thumbnail: string;
  category: string;
}

export interface CheckInRecord {
  id: string;
  attractionId: string;
  attractionName: string;
  timestamp: string;
  photos: string[];
  notes: string;
  coordinates: { lat: number; lng: number };
}

export interface DayPlan {
  day: number;
  date: string;
  attractions: Attraction[];
  totalDistance: number;
}

export interface Trip {
  id: string;
  userId: string;
  title: string;
  startDate: string;
  endDate: string;
  days: DayPlan[];
  checkIns: CheckInRecord[];
  coverImage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WeatherInfo {
  date: string;
  condition: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'windy';
  tempHigh: number;
  tempLow: number;
  city: string;
}

const mockAttractions: Attraction[] = [
  {
    id: 'attr-1',
    name: '故宫博物院',
    city: '北京',
    coordinates: { lat: 39.9163, lng: 116.3972 },
    description: '中国明清两代的皇家宫殿，世界上现存规模最大、保存最为完整的木质结构古建筑之一。',
    thumbnail: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=300&h=200&fit=crop',
    category: '历史文化',
  },
  {
    id: 'attr-2',
    name: '天安门广场',
    city: '北京',
    coordinates: { lat: 39.9055, lng: 116.3976 },
    description: '世界上最大的城市广场之一，是中华人民共和国的象征。',
    thumbnail: 'https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?w=300&h=200&fit=crop',
    category: '地标建筑',
  },
  {
    id: 'attr-3',
    name: '长城（八达岭）',
    city: '北京',
    coordinates: { lat: 40.3576, lng: 116.0206 },
    description: '万里长城的重要组成部分，是明长城的一个隘口。',
    thumbnail: 'https://images.unsplash.com/photo-1508804052814-cd3ba865a116?w=300&h=200&fit=crop',
    category: '历史文化',
  },
  {
    id: 'attr-4',
    name: '颐和园',
    city: '北京',
    coordinates: { lat: 39.9999, lng: 116.2755 },
    description: '中国清朝时期皇家园林，前身为清漪园，坐落在北京西郊。',
    thumbnail: 'https://images.unsplash.com/photo-1545893835-abaa50cbe628?w=300&h=200&fit=crop',
    category: '自然风光',
  },
  {
    id: 'attr-5',
    name: '外滩',
    city: '上海',
    coordinates: { lat: 31.2397, lng: 121.4905 },
    description: '上海的标志性景点，拥有"万国建筑博览群"之称。',
    thumbnail: 'https://images.unsplash.com/photo-1545893835-abaa50cbe628?w=300&h=200&fit=crop',
    category: '地标建筑',
  },
  {
    id: 'attr-6',
    name: '东方明珠',
    city: '上海',
    coordinates: { lat: 31.2397, lng: 121.4998 },
    description: '上海地标性建筑，塔高468米，是世界第三高塔。',
    thumbnail: 'https://images.unsplash.com/photo-1548919973-5cef591cdbc9?w=300&h=200&fit=crop',
    category: '地标建筑',
  },
  {
    id: 'attr-7',
    name: '西湖',
    city: '杭州',
    coordinates: { lat: 30.2431, lng: 120.1436 },
    description: '中国大陆首批国家重点风景名胜区和中国十大风景名胜之一。',
    thumbnail: 'https://images.unsplash.com/photo-1592828009812-b7c53c6c3a0c?w=300&h=200&fit=crop',
    category: '自然风光',
  },
  {
    id: 'attr-8',
    name: '灵隐寺',
    city: '杭州',
    coordinates: { lat: 30.2418, lng: 120.1015 },
    description: '浙江省杭州西湖区灵隐山麓，是中国佛教著名寺院。',
    thumbnail: 'https://images.unsplash.com/photo-1592828009812-b7c53c6c3a0c?w=300&h=200&fit=crop',
    category: '历史文化',
  },
  {
    id: 'attr-9',
    name: '九寨沟',
    city: '成都',
    coordinates: { lat: 33.1650, lng: 103.9130 },
    description: '世界自然遗产、国家重点风景名胜区、国家AAAAA级旅游景区。',
    thumbnail: 'https://images.unsplash.com/photo-1537531383498-f2835e51c629?w=300&h=200&fit=crop',
    category: '自然风光',
  },
];

const mockWeather: Record<string, WeatherInfo[]> = {
  Beijing: [
    { date: '2024-01-15', condition: 'sunny', tempHigh: 5, tempLow: -3, city: '北京' },
    { date: '2024-01-16', condition: 'cloudy', tempHigh: 4, tempLow: -2, city: '北京' },
    { date: '2024-01-17', condition: 'snowy', tempHigh: 2, tempLow: -5, city: '北京' },
  ],
  Shanghai: [
    { date: '2024-01-15', condition: 'rainy', tempHigh: 12, tempLow: 6, city: '上海' },
    { date: '2024-01-16', condition: 'cloudy', tempHigh: 14, tempLow: 8, city: '上海' },
    { date: '2024-01-17', condition: 'sunny', tempHigh: 16, tempLow: 9, city: '上海' },
  ],
  Hangzhou: [
    { date: '2024-01-15', condition: 'sunny', tempHigh: 10, tempLow: 3, city: '杭州' },
    { date: '2024-01-16', condition: 'rainy', tempHigh: 8, tempLow: 4, city: '杭州' },
    { date: '2024-01-17', condition: 'windy', tempHigh: 9, tempLow: 2, city: '杭州' },
  ],
};

class Database {
  private users: User[] = [];
  private trips: Trip[] = [];
  private attractions: Attraction[] = mockAttractions;
  private weather = mockWeather;

  constructor() {
    this.users.push({
      id: 'user-1',
      username: 'demo',
      password: 'demo123',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
      createdAt: new Date().toISOString(),
    });

    const now = new Date();
    this.trips.push({
      id: 'trip-1',
      userId: 'user-1',
      title: '北京三日游',
      startDate: '2024-01-15',
      endDate: '2024-01-17',
      coverImage: mockAttractions[0].thumbnail,
      days: [
        {
          day: 1,
          date: '2024-01-15',
          attractions: [mockAttractions[0], mockAttractions[1]],
          totalDistance: 1.5,
        },
        {
          day: 2,
          date: '2024-01-16',
          attractions: [mockAttractions[2]],
          totalDistance: 0,
        },
        {
          day: 3,
          date: '2024-01-17',
          attractions: [mockAttractions[3]],
          totalDistance: 0,
        },
      ],
      checkIns: [
        {
          id: 'checkin-1',
          attractionId: 'attr-1',
          attractionName: '故宫博物院',
          timestamp: new Date(now.getTime() - 86400000 * 2).toISOString(),
          photos: [
            'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=400&h=300&fit=crop',
            'https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?w=400&h=300&fit=crop',
          ],
          notes: '今天游览了故宫，宏伟的建筑群令人震撼！特别是太和殿，气势磅礴。',
          coordinates: { lat: 39.9163, lng: 116.3972 },
        },
        {
          id: 'checkin-2',
          attractionId: 'attr-2',
          attractionName: '天安门广场',
          timestamp: new Date(now.getTime() - 86400000 * 2 + 3600000 * 4).toISOString(),
          photos: [
            'https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?w=400&h=300&fit=crop',
          ],
          notes: '下午来到天安门广场，人很多但很有序。',
          coordinates: { lat: 39.9055, lng: 116.3976 },
        },
        {
          id: 'checkin-3',
          attractionId: 'attr-3',
          attractionName: '长城（八达岭）',
          timestamp: new Date(now.getTime() - 86400000).toISOString(),
          photos: [
            'https://images.unsplash.com/photo-1508804052814-cd3ba865a116?w=400&h=300&fit=crop',
            'https://images.unsplash.com/photo-1545893835-abaa50cbe628?w=400&h=300&fit=crop',
            'https://images.unsplash.com/photo-1548919973-5cef591cdbc9?w=400&h=300&fit=crop',
          ],
          notes: '不到长城非好汉！今天终于登上了长城，风景太美了。',
          coordinates: { lat: 40.3576, lng: 116.0206 },
        },
      ],
      createdAt: new Date(now.getTime() - 86400000 * 7).toISOString(),
      updatedAt: new Date(now.getTime() - 86400000).toISOString(),
    });

    this.trips.push({
      id: 'trip-2',
      userId: 'user-1',
      title: '杭州周末游',
      startDate: '2024-02-10',
      endDate: '2024-02-11',
      coverImage: mockAttractions[6].thumbnail,
      days: [
        {
          day: 1,
          date: '2024-02-10',
          attractions: [mockAttractions[6], mockAttractions[7]],
          totalDistance: 3.2,
        },
        {
          day: 2,
          date: '2024-02-11',
          attractions: [],
          totalDistance: 0,
        },
      ],
      checkIns: [
        {
          id: 'checkin-4',
          attractionId: 'attr-7',
          attractionName: '西湖',
          timestamp: new Date(now.getTime() - 86400000 * 30).toISOString(),
          photos: [
            'https://images.unsplash.com/photo-1592828009812-b7c53c6c3a0c?w=400&h=300&fit=crop',
          ],
          notes: '西湖真的太美了，湖水清澈，周围的景色如画。',
          coordinates: { lat: 30.2431, lng: 120.1436 },
        },
      ],
      createdAt: new Date(now.getTime() - 86400000 * 45).toISOString(),
      updatedAt: new Date(now.getTime() - 86400000 * 30).toISOString(),
    });
  }

  findUserByUsername(username: string): User | undefined {
    return this.users.find((u) => u.username === username);
  }

  findUserById(id: string): User | undefined {
    return this.users.find((u) => u.id === id);
  }

  createUser(username: string, password: string): User {
    const user: User = {
      id: uuidv4(),
      username,
      password,
      createdAt: new Date().toISOString(),
    };
    this.users.push(user);
    return user;
  }

  getTripsByUserId(userId: string): Trip[] {
    return this.trips
      .filter((t) => t.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getTripById(tripId: string): Trip | undefined {
    return this.trips.find((t) => t.id === tripId);
  }

  createTrip(userId: string, tripData: Partial<Trip>): Trip {
    const now = new Date().toISOString();
    const trip: Trip = {
      id: uuidv4(),
      userId,
      title: tripData.title || '新的旅行',
      startDate: tripData.startDate || now,
      endDate: tripData.endDate || now,
      days: tripData.days || [],
      checkIns: tripData.checkIns || [],
      coverImage: tripData.coverImage,
      createdAt: now,
      updatedAt: now,
    };
    this.trips.push(trip);
    return trip;
  }

  updateTrip(tripId: string, updates: Partial<Trip>): Trip | undefined {
    const index = this.trips.findIndex((t) => t.id === tripId);
    if (index === -1) return undefined;

    this.trips[index] = {
      ...this.trips[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return this.trips[index];
  }

  deleteTrip(tripId: string): boolean {
    const index = this.trips.findIndex((t) => t.id === tripId);
    if (index === -1) return false;
    this.trips.splice(index, 1);
    return true;
  }

  addCheckIn(tripId: string, checkIn: Omit<CheckInRecord, 'id'>): CheckInRecord | undefined {
    const trip = this.getTripById(tripId);
    if (!trip) return undefined;

    const newCheckIn: CheckInRecord = {
      ...checkIn,
      id: uuidv4(),
    };
    trip.checkIns.push(newCheckIn);
    trip.updatedAt = new Date().toISOString();
    return newCheckIn;
  }

  searchAttractions(query: string): Attraction[] {
    if (!query) return this.attractions;
    const lowerQuery = query.toLowerCase();
    return this.attractions.filter(
      (a) =>
        a.name.toLowerCase().includes(lowerQuery) ||
        a.city.toLowerCase().includes(lowerQuery) ||
        a.category.toLowerCase().includes(lowerQuery)
    );
  }

  getAttractionById(id: string): Attraction | undefined {
    return this.attractions.find((a) => a.id === id);
  }

  getWeather(city: string): WeatherInfo[] {
    const cityMap: Record<string, string> = {
      '北京': 'Beijing',
      '上海': 'Shanghai',
      '杭州': 'Hangzhou',
    };
    const key = cityMap[city] || 'Beijing';
    return this.weather[key] || [];
  }
}

export const db = new Database();
