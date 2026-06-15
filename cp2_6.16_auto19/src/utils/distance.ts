export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 10) / 10;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export const TAGS = [
  '文学', '科幻', '悬疑', '历史', '哲学',
  '经济', '心理', '编程', '设计', '艺术',
  '旅行', '美食', '健康', '教育', '儿童',
  '漫画', '诗歌', '传记', '商业', '科技'
];

export const CONDITIONS: BookCondition[] = ['全新', '九成新', '有笔记'];

export type BookCondition = '全新' | '九成新' | '有笔记';
