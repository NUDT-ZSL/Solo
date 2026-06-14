export interface PollutantData {
  pm25: number;
  pm10: number;
  o3: number;
  no2: number;
}

export interface StationData {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface TimePointData {
  timestamp: number;
  stations: {
    [stationId: string]: PollutantData;
  };
}

export interface AirQualityDataset {
  stations: StationData[];
  timePoints: TimePointData[];
}

const stations: StationData[] = [
  { id: 'st01', name: '市中心监测站', lat: 39.9042, lng: 116.4074 },
  { id: 'st02', name: '工业园区', lat: 39.9242, lng: 116.4374 },
  { id: 'st03', name: '居民区北', lat: 39.9342, lng: 116.3874 },
  { id: 'st04', name: '交通枢纽', lat: 39.8942, lng: 116.4274 },
  { id: 'st05', name: '公园绿地', lat: 39.9142, lng: 116.3674 },
  { id: 'st06', name: '东郊新城', lat: 39.9092, lng: 116.4674 },
  { id: 'st07', name: '西郊景区', lat: 39.8992, lng: 116.3474 },
  { id: 'st08', name: '北部新区', lat: 39.9542, lng: 116.4074 },
  { id: 'st09', name: '南部物流', lat: 39.8742, lng: 116.4074 },
  { id: 'st10', name: '大学城', lat: 39.9192, lng: 116.3574 },
];

function generatePollutantData(baseHour: number, stationIdx: number): PollutantData {
  const hourFactor = Math.sin((baseHour / 24) * Math.PI * 2) * 0.3 + 0.7;
  const stationFactor = 0.7 + (stationIdx % 5) * 0.15;
  const randomFactor = 0.85 + Math.random() * 0.3;

  return {
    pm25: Math.round(35 * hourFactor * stationFactor * randomFactor * 2) / 2,
    pm10: Math.round(70 * hourFactor * stationFactor * randomFactor * 2) / 2,
    o3: Math.round(60 * (0.5 + Math.sin((baseHour - 6) / 24 * Math.PI * 2) * 0.5) * (0.8 + Math.random() * 0.4) * 2) / 2,
    no2: Math.round(45 * hourFactor * stationFactor * randomFactor * 2) / 2,
  };
}

function generateTimePoints(): TimePointData[] {
  const points: TimePointData[] = [];
  const baseDate = new Date('2024-01-15T00:00:00').getTime();

  for (let h = 0; h < 24; h++) {
    const timestamp = baseDate + h * 3600 * 1000;
    const stationData: { [key: string]: PollutantData } = {};

    stations.forEach((station, idx) => {
      stationData[station.id] = generatePollutantData(h, idx);
    });

    points.push({ timestamp, stations: stationData });
  }

  return points;
}

export const mockAirQualityData: AirQualityDataset = {
  stations,
  timePoints: generateTimePoints(),
};

export const POLLUTANT_COLORS: Record<keyof PollutantData, string> = {
  pm25: '#e74c3c',
  pm10: '#e67e22',
  o3: '#3498db',
  no2: '#9b59b6',
};

export const POLLUTANT_LABELS: Record<keyof PollutantData, string> = {
  pm25: 'PM2.5',
  pm10: 'PM10',
  o3: 'O3',
  no2: 'NO2',
};

export const POLLUTANT_MAX = 200;
export const BAR_MAX_HEIGHT = 5;
