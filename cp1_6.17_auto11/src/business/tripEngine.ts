import type {
  Coordinate,
  Attraction,
  DayPlan,
  WeatherInfo,
  LuggageSuggestion,
  PhotoLayout,
  CheckInRecord,
} from '../types';

const EARTH_RADIUS_KM = 6371;

export function haversineDistance(coord1: Coordinate, coord2: Coordinate): number {
  const dLat = toRadians(coord2.lat - coord1.lat);
  const dLng = toRadians(coord2.lng - coord1.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(coord1.lat)) *
      Math.cos(toRadians(coord2.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export function calculateDayDistance(attractions: Attraction[]): number {
  if (attractions.length < 2) return 0;

  let totalDistance = 0;
  for (let i = 0; i < attractions.length - 1; i++) {
    totalDistance += haversineDistance(
      attractions[i].coordinates,
      attractions[i + 1].coordinates
    );
  }
  return Math.round(totalDistance * 100) / 100;
}

export function calculateTotalDistance(days: DayPlan[]): number {
  return days.reduce((total, day) => total + day.totalDistance, 0);
}

export function isDistanceExceeded(distance: number, limitKm: number = 20): boolean {
  return distance > limitKm;
}

const weatherIconMap: Record<string, string> = {
  sunny: '☀️',
  cloudy: '☁️',
  rainy: '🌧️',
  snowy: '❄️',
  windy: '💨',
  foggy: '🌫️',
  thunderstorm: '⛈️',
};

export function getWeatherIcon(condition: string): string {
  return weatherIconMap[condition] || '🌤️';
}

export function generateLuggageSuggestions(weatherList: WeatherInfo[]): LuggageSuggestion[] {
  const suggestions: LuggageSuggestion[] = [];
  const conditions = new Set(weatherList.map((w) => w.condition));
  const temps = weatherList.flatMap((w) => [w.tempHigh, w.tempLow]);
  const minTemp = Math.min(...temps);
  const maxTemp = Math.max(...temps);

  if (conditions.has('rainy') || conditions.has('thunderstorm')) {
    suggestions.push({
      category: '雨具',
      items: ['雨伞', '防水鞋套', '便携雨衣'],
      reason: '行程期间有降雨，建议携带雨具',
    });
  }

  if (conditions.has('snowy')) {
    suggestions.push({
      category: '防寒',
      items: ['厚外套', '保暖内衣', '手套', '围巾', '防滑鞋'],
      reason: '行程期间有降雪，注意保暖防滑',
    });
  }

  if (maxTemp > 30) {
    suggestions.push({
      category: '防晒',
      items: ['防晒霜', '太阳镜', '遮阳帽', '防晒衣'],
      reason: '气温较高，注意防晒',
    });
  }

  if (minTemp < 10) {
    suggestions.push({
      category: '保暖',
      items: ['外套', '长袖衣物', '薄围巾'],
      reason: '早晚温差大，建议携带保暖衣物',
    });
  }

  if (conditions.has('sunny')) {
    suggestions.push({
      category: '舒适',
      items: ['舒适的步行鞋', '充电宝', '水壶'],
      reason: '天气晴朗，适合户外活动',
    });
  }

  if (conditions.has('windy')) {
    suggestions.push({
      category: '防风',
      items: ['防风外套', '帽子'],
      reason: '风力较大，建议防风装备',
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      category: '基础',
      items: ['舒适的鞋子', '日常衣物', '个人洗漱用品'],
      reason: '基础出行装备',
    });
  }

  return suggestions;
}

export interface WaterfallItem {
  id: string;
  width: number;
  height: number;
  photoUrl: string;
}

export interface WaterfallLayoutResult {
  items: (WaterfallItem & PhotoLayout)[];
  totalHeight: number;
  totalWidth: number;
}

export function generateWaterfallLayout(
  photos: { id: string; photoUrl: string; width?: number; height?: number }[],
  containerWidth: number,
  columns: number = 3,
  gap: number = 12
): WaterfallLayoutResult {
  const columnWidth = (containerWidth - gap * (columns - 1)) / columns;
  const columnHeights = new Array(columns).fill(0);
  const layoutItems: (WaterfallItem & PhotoLayout)[] = [];

  const sizedPhotos = photos.map((p) => ({
    ...p,
    width: p.width || 300,
    height: p.height || 200 + Math.random() * 200,
  }));

  for (const photo of sizedPhotos) {
    const shortestColumn = columnHeights.indexOf(Math.min(...columnHeights));
    const scaledHeight = (photo.height / photo.width) * columnWidth;

    layoutItems.push({
      ...photo,
      column: shortestColumn,
      row: 0,
      width: columnWidth,
      height: scaledHeight,
      top: columnHeights[shortestColumn],
      left: shortestColumn * (columnWidth + gap),
    });

    columnHeights[shortestColumn] += scaledHeight + gap;
  }

  return {
    items: layoutItems,
    totalHeight: Math.max(...columnHeights) - gap,
    totalWidth: containerWidth,
  };
}

export interface CollageLayout {
  size: number;
  items: {
    id: string;
    photoUrl: string;
    row: number;
    col: number;
    size: number;
  }[];
}

export function generateCollageLayout(
  photos: string[],
  gridSize: number = 3,
  totalSize: number = 80
): CollageLayout {
  const items: CollageLayout['items'] = [];
  const displayPhotos = photos.slice(0, gridSize * gridSize);
  const cellSize = (totalSize - (gridSize - 1) * 2) / gridSize;

  displayPhotos.forEach((photoUrl, index) => {
    const row = Math.floor(index / gridSize);
    const col = index % gridSize;
    items.push({
      id: `collage-${index}`,
      photoUrl,
      row,
      col,
      size: cellSize,
    });
  });

  return {
    size: totalSize,
    items,
  };
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const dateStr = formatDate(d);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${dateStr} ${hours}:${minutes}`;
}

export function generateTripSummary(checkIns: CheckInRecord[]): string {
  if (checkIns.length === 0) return '暂无打卡记录';

  const attractions = checkIns.map((c) => c.attractionName).join('、');
  const photoCount = checkIns.reduce((sum, c) => sum + c.photos.length, 0);

  return `本次旅行共打卡 ${checkIns.length} 个景点：${attractions}，拍摄照片 ${photoCount} 张。`;
}

export function generateMarkdownLog(
  tripTitle: string,
  checkIns: CheckInRecord[]
): string {
  const sortedCheckIns = [...checkIns].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  let markdown = `# ${tripTitle}\n\n`;
  markdown += `> 打卡景点: ${checkIns.length} 个\n`;
  markdown += `> 照片数量: ${checkIns.reduce((s, c) => s + c.photos.length, 0)} 张\n\n`;
  markdown += `---\n\n`;

  let currentDate = '';
  for (const checkIn of sortedCheckIns) {
    const date = formatDate(checkIn.timestamp);
    if (date !== currentDate) {
      currentDate = date;
      markdown += `## 📅 ${date}\n\n`;
    }

    const time = new Date(checkIn.timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });

    markdown += `### 📍 ${checkIn.attractionName} (${time})\n\n`;

    if (checkIn.notes) {
      markdown += `${checkIn.notes}\n\n`;
    }

    if (checkIn.photos.length > 0) {
      markdown += `**照片 (${checkIn.photos.length}张):**\n\n`;
      checkIn.photos.forEach((photo, idx) => {
        markdown += `![${checkIn.attractionName}-${idx + 1}](${photo})\n\n`;
      });
    }

    markdown += `---\n\n`;
  }

  return markdown;
}
