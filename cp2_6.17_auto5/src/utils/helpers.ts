import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';

dayjs.extend(duration);

/**
 * 格式化倒计时为"DD天HH时mm分ss秒"
 * @param endTime 结束时间字符串
 * @returns 格式化后的倒计时字符串
 */
export function formatCountdown(endTime: string): string {
  const now = dayjs();
  const end = dayjs(endTime);
  const diff = end.diff(now);

  if (diff <= 0) {
    return '已过期';
  }

  const dur = dayjs.duration(diff);
  const days = Math.floor(dur.asDays());
  const hours = dur.hours();
  const minutes = dur.minutes();
  const seconds = dur.seconds();

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}天`);
  if (hours > 0 || days > 0) parts.push(`${hours}时`);
  if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes}分`);
  parts.push(`${seconds}秒`);

  return parts.join('');
}

/**
 * 获取灾种对应的emoji
 * @param type 灾害类型
 * @returns emoji字符串
 */
export function getAlertEmoji(type: string): string {
  const emojiMap: Record<string, string> = {
    typhoon: '🌀',
    rainstorm: '🌧️',
    flood: '🌊',
    earthquake: '🌍',
    landslide: '⛰️',
    thunder: '⛈️',
    hail: '🧊',
    frost: '❄️',
    heatwave: '🔥',
    coldwave: '🥶',
    drought: '🏜️',
    sandstorm: '🌪️',
    other: '⚠️',
  };
  return emojiMap[type] || '⚠️';
}

/**
 * 获取预警级别对应的颜色配置
 * @param level 预警级别
 * @returns 包含背景渐变色和色条颜色的对象
 */
export function getLevelColors(level: string): { bg: string; bar: string } {
  const colorMap: Record<string, { bg: string; bar: string }> = {
    blue: {
      bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      bar: '#3b82f6',
    },
    yellow: {
      bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      bar: '#eab308',
    },
    orange: {
      bg: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      bar: '#f97316',
    },
    red: {
      bg: 'linear-gradient(135deg, #ff0844 0%, #ffb199 100%)',
      bar: '#ef4444',
    },
  };
  return colorMap[level] || colorMap.blue;
}

/**
 * 获取上报类型对应的颜色
 * @param type 上报类型
 * @returns 颜色值字符串
 */
export function getReportColor(type: string): string {
  const colorMap: Record<string, string> = {
    flooding: '#3b82f6',
    debris: '#8b5cf6',
    roadblock: '#f59e0b',
    collapse: '#ef4444',
    damage: '#ec4899',
    injury: '#dc2626',
    other: '#6b7280',
  };
  return colorMap[type] || colorMap.other;
}

/**
 * 判断预警是否已过期
 * @param endTime 结束时间字符串
 * @returns 是否过期
 */
export function isExpired(endTime: string): boolean {
  return dayjs(endTime).isBefore(dayjs());
}

/**
 * 判断时间是否在24小时内
 * @param time 时间字符串
 * @returns 是否在24小时内
 */
export function isWithin24Hours(time: string): boolean {
  const now = dayjs();
  const targetTime = dayjs(time);
  return now.diff(targetTime, 'hour') < 24;
}
