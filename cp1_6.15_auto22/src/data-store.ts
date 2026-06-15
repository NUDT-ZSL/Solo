export interface TravelRecord {
  id: string;
  placeName: string;
  latitude: number;
  longitude: number;
  arriveTime: string;
  leaveTime: string;
  description: string;
  imageUrls: string[];
}

const STORAGE_KEY = 'travel-footprint-records';

export function loadRecords(): TravelRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as TravelRecord[];
  } catch {
    return [];
  }
}

export function saveRecords(records: TravelRecord[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function addRecord(record: TravelRecord): TravelRecord[] {
  const records = loadRecords();
  records.push(record);
  saveRecords(records);
  return records;
}

export function deleteRecord(id: string): TravelRecord[] {
  const records = loadRecords().filter((r) => r.id !== id);
  saveRecords(records);
  return records;
}

export function exportToJson(): void {
  const records = loadRecords();
  const blob = new Blob([JSON.stringify(records, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'travel-footprint-backup.json';
  a.click();
  URL.revokeObjectURL(url);
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function seedTestDataIfEmpty(): TravelRecord[] {
  const existing = loadRecords();
  if (existing.length > 0) return existing;
  const sample: TravelRecord[] = [
    {
      id: generateId(),
      placeName: '北京',
      latitude: 39.9042,
      longitude: 116.4074,
      arriveTime: '2025-06-01T09:00',
      leaveTime: '2025-06-03T18:00',
      description: '游览了故宫、天安门广场和长城，感受到了古都的壮丽气势。',
      imageUrls: [
        'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=400',
        'https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?w=400',
      ],
    },
    {
      id: generateId(),
      placeName: '上海',
      latitude: 31.2304,
      longitude: 121.4737,
      arriveTime: '2025-06-04T10:30',
      leaveTime: '2025-06-06T14:00',
      description: '漫步外滩，欣赏对岸陆家嘴天际线的璀璨灯火，品尝正宗本帮菜。',
      imageUrls: [
        'https://images.unsplash.com/photo-1545893835-abaa50cbe628?w=400',
      ],
    },
    {
      id: generateId(),
      placeName: '杭州',
      latitude: 30.2741,
      longitude: 120.1551,
      arriveTime: '2025-06-07T08:00',
      leaveTime: '2025-06-08T20:00',
      description: '西湖断桥残雪，雷峰塔夕照，品一杯龙井茶，感受江南水乡的婉约。',
      imageUrls: [
        'https://images.unsplash.com/photo-1528164344705-47542687000d?w=400',
      ],
    },
    {
      id: generateId(),
      placeName: '成都',
      latitude: 30.5728,
      longitude: 104.0668,
      arriveTime: '2025-06-10T07:30',
      leaveTime: '2025-06-13T12:00',
      description: '探访熊猫基地看滚滚，宽窄巷子喝盖碗茶，麻辣火锅令人难忘。',
      imageUrls: [
        'https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?w=400',
      ],
    },
    {
      id: generateId(),
      placeName: '西安',
      latitude: 34.3416,
      longitude: 108.9398,
      arriveTime: '2025-06-14T11:00',
      leaveTime: '2025-06-16T16:30',
      description: '参观兵马俑震撼历史，骑行古城墙俯瞰西安城，尝遍回民街小吃。',
      imageUrls: [
        'https://images.unsplash.com/photo-1545566370-5f30a45c50b9?w=400',
      ],
    },
  ];
  saveRecords(sample);
  return sample;
}

