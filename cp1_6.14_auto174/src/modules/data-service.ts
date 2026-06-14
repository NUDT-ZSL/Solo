export interface WaveDataPoint {
  lat: number;
  lon: number;
  height: number;
}

export interface StationData {
  id: string;
  name: string;
  lat: number;
  lon: number;
  waveHeight: number;
  tideTime: string;
  tideType: "高潮" | "低潮";
  windDirection: string;
  windLevel: number;
}

export interface WaveForecastResponse {
  grid: WaveDataPoint[];
  stations: StationData[];
  timestamp: string;
}

const GRID_SIZE = 40;
const STATION_COUNT = 30;
const WIND_DIRECTIONS = ["东风", "南风", "西风", "北风", "东北风", "东南风", "西北风", "西南风"];
const STATION_NAMES = [
  "北太平洋观测站", "南海监测点", "大西洋中部站", "印度洋枢纽站", "北冰洋前沿站",
  "赤道暖流站", "千岛群岛站", "夏威夷群岛站", "百慕大三角站", "马尔代夫站",
  "冰岛南岸站", "新西兰东部站", "好望角监测站", "合恩角站", "马达加斯加站",
  "日本海观测站", "地中海中央站", "加勒比海站", "墨西哥湾站", "波罗的海站",
  "红海监测站", "阿拉伯海站", "孟加拉湾站", "白令海峡站", "格陵兰站",
  "塔斯马尼亚站", "加拉帕戈斯站", "苏伊士运河站", "巴拿马运河站", "英吉利海峡站"
];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function formatTideTime(baseHour: number, offset: number): string {
  const totalMinutes = (baseHour * 60 + offset * 37) % (24 * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = Math.floor(totalMinutes % 60);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

export async function getWaveForecast(
  lat: number,
  lon: number,
  datetime?: string
): Promise<WaveForecastResponse> {
  const seed = datetime
    ? new Date(datetime).getTime() / 60000
    : Date.now() / 60000;
  const rand = seededRandom(Math.floor(seed));

  const grid: WaveDataPoint[] = [];
  for (let i = 0; i <= GRID_SIZE; i++) {
    for (let j = 0; j <= GRID_SIZE; j++) {
      const lonStep = (i / GRID_SIZE - 0.5) * 60;
      const latStep = (j / GRID_SIZE - 0.5) * 40;
      const baseWave =
        Math.sin(lonStep * 0.3 + seed * 0.0001) *
        Math.cos(latStep * 0.4 + seed * 0.00015) *
        3;
      const noise = (rand() - 0.5) * 2;
      let height = baseWave + noise;
      height = Math.max(-5, Math.min(5, height));
      grid.push({
        lat: lat + latStep,
        lon: lon + lonStep,
        height
      });
    }
  }

  const stations: StationData[] = [];
  for (let i = 0; i < STATION_COUNT; i++) {
    const sLat = lat + (rand() - 0.5) * 36;
    const sLon = lon + (rand() - 0.5) * 54;
    stations.push({
      id: `station-${i}`,
      name: STATION_NAMES[i % STATION_NAMES.length],
      lat: sLat,
      lon: sLon,
      waveHeight: Math.round((rand() * 6 - 1) * 10) / 10,
      tideTime: formatTideTime(6 + Math.floor(rand() * 12), i),
      tideType: rand() > 0.5 ? "高潮" : "低潮",
      windDirection: WIND_DIRECTIONS[Math.floor(rand() * WIND_DIRECTIONS.length)],
      windLevel: 1 + Math.floor(rand() * 7)
    });
  }

  await new Promise((r) => setTimeout(r, 150));

  return {
    grid,
    stations,
    timestamp: new Date().toISOString()
  };
}

export function subscribeWaveUpdates(
  callback: (data: WaveForecastResponse) => void,
  lat = 30,
  lon = 120
): () => void {
  let cancelled = false;
  const tick = async () => {
    if (cancelled) return;
    try {
      const data = await getWaveForecast(lat, lon);
      if (!cancelled) callback(data);
    } finally {
      if (!cancelled) setTimeout(tick, 10000);
    }
  };
  tick();
  return () => {
    cancelled = true;
  };
}
