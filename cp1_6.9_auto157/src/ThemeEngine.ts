import type { MoodType, ColorScheme, WatercolorBlob, Decoration } from './types';

const MOOD_COLOR_PALETTES: Record<MoodType, string[]> = {
  happy: ['#FFD3A5', '#FD6585', '#FFC3A0', '#FFAFBD', '#F7D9C4'],
  calm: ['#A2D2DF', '#B8E1DD', '#C8A2C8', '#D4A5A5', '#B5D8EB'],
  melancholy: ['#7F7FD5', '#91EAE4', '#86A8E7', '#8E9EAB', '#A3B5C7'],
  excited: ['#FF9A9E', '#FECFEF', '#FFA751', '#FFE259', '#FF6B6B'],
  tired: ['#C9CCD5', '#E4D8DC', '#D9BF77', '#B8B8D1', '#A8B5C0']
};

const WEEKEND_PALETTE_EXTRA = ['#E8F4F8', '#FFF0F5', '#F5F5DC', '#F0FFF0', '#FFF8DC'];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function hexToDateSeed(date: Date): number {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return year * 10000 + month * 100 + day;
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const weekday = weekdays[date.getDay()];
  return `${year}.${month}.${day} ${weekday}`;
}

function uid(prefix = ''): string {
  return prefix + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
}

export function generateColorScheme(date: Date, mood: MoodType): ColorScheme {
  const moodSeed = mood.length + mood.charCodeAt(0) + mood.charCodeAt(mood.length - 1);
  const seed = hexToDateSeed(date) * 31 + moodSeed;
  const rand = seededRandom(seed);

  const basePalette = [...MOOD_COLOR_PALETTES[mood]];
  if (isWeekend(date)) {
    basePalette.push(...WEEKEND_PALETTE_EXTRA);
  }

  const blobCount = Math.floor(rand() * 3) + 3;
  const blobs: WatercolorBlob[] = [];

  for (let i = 0; i < blobCount; i++) {
    const colorIndex = Math.floor(rand() * basePalette.length);
    blobs.push({
      id: uid('blob_'),
      x: 0.15 + rand() * 0.7,
      y: 0.1 + rand() * 0.8,
      radius: 60 + rand() * 140,
      color: basePalette[colorIndex],
      baseOpacity: 0.15 + rand() * 0.2,
      angle: rand() * Math.PI * 2,
      breathPeriod: 4 + rand() * 3,
      breathPhase: rand() * Math.PI * 2
    });
  }

  blobs.sort((a, b) => a.radius - b.radius);

  const accentColors = basePalette.slice(0, 3);
  return {
    blobs,
    baseColor: '#FFF8E7',
    accentColors,
    inkColor: '#1A237E',
    mood,
    dateStr: formatDate(date)
  };
}

export function generateDecorations(scheme: ColorScheme): Decoration[] {
  const seed = scheme.blobs.reduce((acc, b) => acc + b.radius * b.x * b.y, 0);
  const rand = seededRandom(Math.floor(seed * 10000));
  const decorations: Decoration[] = [];
  const decoCount = 5 + Math.floor(rand() * 8);

  for (let i = 0; i < decoCount; i++) {
    const randVal = rand();
    let type: Decoration['type'];
    if (randVal < 0.3) type = 'circle';
    else if (randVal < 0.6) type = 'line';
    else if (randVal < 0.85) type = 'leaf';
    else type = 'flower';

    decorations.push({
      type,
      x: 0.05 + rand() * 0.9,
      y: 0.05 + rand() * 0.9,
      size: 4 + rand() * 16,
      rotation: rand() * Math.PI * 2,
      color: scheme.accentColors[Math.floor(rand() * scheme.accentColors.length)],
      opacity: 0.25 + rand() * 0.35
    });
  }

  return decorations;
}

export function getPastDates(days: number): Date[] {
  const dates: Date[] = [];
  const now = new Date();
  for (let i = 0; i <= days; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    d.setHours(0, 0, 0, 0);
    dates.push(d);
  }
  return dates;
}

export function dateKey(date: Date): string {
  return formatDate(date);
}
