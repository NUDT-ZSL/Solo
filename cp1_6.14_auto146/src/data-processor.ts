export interface YearlyValue {
  year: number;
  value: number;
}

export interface RawCountryData {
  code: string;
  name: string;
  continent: string;
  lat: number;
  lng: number;
  emissions: YearlyValue[];
  gdpPerCapita: YearlyValue[];
  tradePartners: string[];
}

export interface ProcessedCountry {
  code: string;
  name: string;
  continent: string;
  lat: number;
  lng: number;
  position: { x: number; y: number; z: number };
  latestEmission: number;
  latestGdp: number;
  emissionRadius: number;
  color: string;
  emissions: YearlyValue[];
  gdpPerCapita: YearlyValue[];
  tradePartners: string[];
}

export interface FilterConfig {
  minEmission: number;
  minGdpPerCapita: number;
  yearStart: number;
  yearEnd: number;
}

const GDP_COLOR_STOPS: Array<{ threshold: number; color: string }> = [
  { threshold: 3000, color: '#2dd4bf' },
  { threshold: 8000, color: '#22d3ee' },
  { threshold: 20000, color: '#a78bfa' },
  { threshold: 40000, color: '#e879f9' },
  { threshold: 70000, color: '#fb7185' },
  { threshold: Infinity, color: '#f43f5e' },
];

const MIN_EMISSION_RADIUS = 0.3;
const MAX_EMISSION_RADIUS = 2.0;
const MIN_EMISSION_VALUE = 100;
const MAX_EMISSION_VALUE = 12000;
const SPHERE_RADIUS = 8;

const YEARS = Array.from({ length: 24 }, (_, i) => 2000 + i);

function generateSeries(
  baseValue: number,
  growthRate: number,
  volatility: number,
): YearlyValue[] {
  let value = baseValue;
  return YEARS.map((year) => {
    const noise = (Math.random() - 0.5) * volatility;
    const result = Math.max(0, Math.round(value + noise));
    value *= 1 + growthRate + (Math.random() - 0.5) * 0.02;
    return { year, value: result };
  });
}

function pickRandomPartners(allCodes: string[], ownCode: string, count: number): string[] {
  const available = allCodes.filter((c) => c !== ownCode);
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

const RAW_COUNTRIES: Omit<RawCountryData, 'emissions' | 'gdpPerCapita' | 'tradePartners'>[] = [
  { code: 'CN', name: '中国', continent: 'Asia', lat: 35.8617, lng: 104.1954 },
  { code: 'US', name: '美国', continent: 'North America', lat: 37.0902, lng: -95.7129 },
  { code: 'IN', name: '印度', continent: 'Asia', lat: 20.5937, lng: 78.9629 },
  { code: 'JP', name: '日本', continent: 'Asia', lat: 36.2048, lng: 138.2529 },
  { code: 'DE', name: '德国', continent: 'Europe', lat: 51.1657, lng: 10.4515 },
  { code: 'GB', name: '英国', continent: 'Europe', lat: 55.3781, lng: -3.4360 },
  { code: 'FR', name: '法国', continent: 'Europe', lat: 46.2276, lng: 2.2137 },
  { code: 'BR', name: '巴西', continent: 'South America', lat: -14.2350, lng: -51.9253 },
  { code: 'CA', name: '加拿大', continent: 'North America', lat: 56.1304, lng: -106.3468 },
  { code: 'KR', name: '韩国', continent: 'Asia', lat: 35.9078, lng: 127.7669 },
  { code: 'IT', name: '意大利', continent: 'Europe', lat: 41.8719, lng: 12.5674 },
  { code: 'MX', name: '墨西哥', continent: 'North America', lat: 23.6345, lng: -102.5528 },
  { code: 'AU', name: '澳大利亚', continent: 'Oceania', lat: -25.2744, lng: 133.7751 },
  { code: 'SA', name: '沙特阿拉伯', continent: 'Asia', lat: 23.8859, lng: 45.0792 },
  { code: 'ID', name: '印度尼西亚', continent: 'Asia', lat: -0.7893, lng: 113.9213 },
  { code: 'ZA', name: '南非', continent: 'Africa', lat: -30.5595, lng: 22.9375 },
  { code: 'TR', name: '土耳其', continent: 'Asia', lat: 38.9637, lng: 35.2433 },
  { code: 'RU', name: '俄罗斯', continent: 'Europe', lat: 61.5240, lng: 105.3188 },
  { code: 'ES', name: '西班牙', continent: 'Europe', lat: 40.4637, lng: -3.7492 },
  { code: 'EG', name: '埃及', continent: 'Africa', lat: 26.8206, lng: 30.8025 },
  { code: 'AR', name: '阿根廷', continent: 'South America', lat: -38.4161, lng: -63.6167 },
  { code: 'TH', name: '泰国', continent: 'Asia', lat: 15.8700, lng: 100.9925 },
  { code: 'PL', name: '波兰', continent: 'Europe', lat: 51.9194, lng: 19.1451 },
  { code: 'NG', name: '尼日利亚', continent: 'Africa', lat: 9.0820, lng: 8.6753 },
  { code: 'NL', name: '荷兰', continent: 'Europe', lat: 52.1326, lng: 5.2913 },
  { code: 'SE', name: '瑞典', continent: 'Europe', lat: 60.1282, lng: 18.6435 },
  { code: 'CH', name: '瑞士', continent: 'Europe', lat: 46.8182, lng: 8.2275 },
  { code: 'SG', name: '新加坡', continent: 'Asia', lat: 1.3521, lng: 103.8198 },
  { code: 'NO', name: '挪威', continent: 'Europe', lat: 60.4720, lng: 8.4689 },
  { code: 'NZ', name: '新西兰', continent: 'Oceania', lat: -40.9006, lng: 174.8860 },
  { code: 'KE', name: '肯尼亚', continent: 'Africa', lat: -0.0236, lng: 37.9062 },
  { code: 'CL', name: '智利', continent: 'South America', lat: -35.6751, lng: -71.5430 },
];

const EMISSION_PROFILES: Record<string, { base: number; rate: number; vol: number }> = {
  CN: { base: 3500, rate: 0.055, vol: 150 },
  US: { base: 5800, rate: -0.005, vol: 120 },
  IN: { base: 900, rate: 0.05, vol: 60 },
  JP: { base: 1200, rate: -0.01, vol: 40 },
  DE: { base: 850, rate: -0.02, vol: 25 },
  GB: { base: 550, rate: -0.025, vol: 20 },
  FR: { base: 400, rate: -0.015, vol: 15 },
  BR: { base: 450, rate: 0.02, vol: 30 },
  CA: { base: 550, rate: 0.0, vol: 20 },
  KR: { base: 450, rate: 0.015, vol: 20 },
  IT: { base: 450, rate: -0.015, vol: 15 },
  MX: { base: 380, rate: 0.01, vol: 20 },
  AU: { base: 420, rate: 0.005, vol: 20 },
  SA: { base: 320, rate: 0.03, vol: 15 },
  ID: { base: 280, rate: 0.04, vol: 18 },
  ZA: { base: 350, rate: 0.005, vol: 20 },
  TR: { base: 220, rate: 0.03, vol: 15 },
  RU: { base: 1000, rate: -0.005, vol: 60 },
  ES: { base: 280, rate: -0.015, vol: 15 },
  EG: { base: 130, rate: 0.035, vol: 10 },
  AR: { base: 140, rate: 0.01, vol: 12 },
  TH: { base: 180, rate: 0.035, vol: 12 },
  PL: { base: 300, rate: -0.005, vol: 15 },
  NG: { base: 60, rate: 0.04, vol: 8 },
  NL: { base: 180, rate: -0.02, vol: 8 },
  SE: { base: 60, rate: -0.03, vol: 5 },
  CH: { base: 45, rate: -0.02, vol: 3 },
  SG: { base: 55, rate: 0.015, vol: 4 },
  NO: { base: 45, rate: -0.01, vol: 3 },
  NZ: { base: 35, rate: 0.0, vol: 3 },
  KE: { base: 12, rate: 0.04, vol: 3 },
  CL: { base: 70, rate: 0.015, vol: 5 },
};

const GDP_PROFILES: Record<string, { base: number; rate: number; vol: number }> = {
  CN: { base: 950, rate: 0.085, vol: 150 },
  US: { base: 36300, rate: 0.028, vol: 800 },
  IN: { base: 440, rate: 0.06, vol: 80 },
  JP: { base: 37300, rate: 0.01, vol: 700 },
  DE: { base: 26500, rate: 0.022, vol: 600 },
  GB: { base: 28200, rate: 0.018, vol: 600 },
  FR: { base: 24500, rate: 0.015, vol: 500 },
  BR: { base: 3800, rate: 0.022, vol: 250 },
  CA: { base: 27500, rate: 0.02, vol: 600 },
  KR: { base: 12200, rate: 0.04, vol: 400 },
  IT: { base: 20200, rate: 0.008, vol: 400 },
  MX: { base: 7200, rate: 0.015, vol: 300 },
  AU: { base: 21800, rate: 0.022, vol: 600 },
  SA: { base: 9100, rate: 0.018, vol: 500 },
  ID: { base: 780, rate: 0.05, vol: 100 },
  ZA: { base: 3200, rate: 0.015, vol: 200 },
  TR: { base: 4200, rate: 0.035, vol: 300 },
  RU: { base: 1800, rate: 0.05, vol: 400 },
  ES: { base: 14700, rate: 0.015, vol: 400 },
  EG: { base: 1500, rate: 0.028, vol: 150 },
  AR: { base: 7800, rate: 0.01, vol: 500 },
  TH: { base: 2000, rate: 0.038, vol: 150 },
  PL: { base: 4500, rate: 0.04, vol: 250 },
  NG: { base: 550, rate: 0.025, vol: 80 },
  NL: { base: 28800, rate: 0.018, vol: 600 },
  SE: { base: 29500, rate: 0.022, vol: 600 },
  CH: { base: 38500, rate: 0.018, vol: 700 },
  SG: { base: 21500, rate: 0.035, vol: 600 },
  NO: { base: 37800, rate: 0.015, vol: 700 },
  NZ: { base: 14200, rate: 0.022, vol: 400 },
  KE: { base: 450, rate: 0.03, vol: 60 },
  CL: { base: 5000, rate: 0.03, vol: 250 },
};

function buildRawData(): RawCountryData[] {
  const codes = RAW_COUNTRIES.map((c) => c.code);
  return RAW_COUNTRIES.map((c) => {
    const ep = EMISSION_PROFILES[c.code] || { base: 100, rate: 0.02, vol: 10 };
    const gp = GDP_PROFILES[c.code] || { base: 2000, rate: 0.03, vol: 100 };
    return {
      ...c,
      emissions: generateSeries(ep.base, ep.rate, ep.vol),
      gdpPerCapita: generateSeries(gp.base, gp.rate, gp.vol),
      tradePartners: pickRandomPartners(codes, c.code, 3 + Math.floor(Math.random() * 3)),
    };
  });
}

function latLngToSphere(
  lat: number,
  lng: number,
  radius: number,
): { x: number; y: number; z: number } {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return {
    x: -(radius * Math.sin(phi) * Math.cos(theta)),
    y: radius * Math.cos(phi),
    z: radius * Math.sin(phi) * Math.sin(theta),
  };
}

export function calculateEmissionRadius(emission: number): number {
  const clamped = Math.max(MIN_EMISSION_VALUE, Math.min(MAX_EMISSION_VALUE, emission));
  const ratio = (clamped - MIN_EMISSION_VALUE) / (MAX_EMISSION_VALUE - MIN_EMISSION_VALUE);
  return MIN_EMISSION_RADIUS + ratio * (MAX_EMISSION_RADIUS - MIN_EMISSION_RADIUS);
}

export function calculateColor(gdp: number): string {
  for (const stop of GDP_COLOR_STOPS) {
    if (gdp <= stop.threshold) {
      return stop.color;
    }
  }
  return GDP_COLOR_STOPS[GDP_COLOR_STOPS.length - 1].color;
}

export function processRawData(): ProcessedCountry[] {
  const raw = buildRawData();
  return raw.map((r) => {
    const latestEmission = r.emissions[r.emissions.length - 1].value;
    const latestGdp = r.gdpPerCapita[r.gdpPerCapita.length - 1].value;
    return {
      code: r.code,
      name: r.name,
      continent: r.continent,
      lat: r.lat,
      lng: r.lng,
      position: latLngToSphere(r.lat, r.lng, SPHERE_RADIUS),
      latestEmission,
      latestGdp,
      emissionRadius: calculateEmissionRadius(latestEmission),
      color: calculateColor(latestGdp),
      emissions: r.emissions,
      gdpPerCapita: r.gdpPerCapita,
      tradePartners: r.tradePartners,
    };
  });
}

export function getTradePartners(
  code: string,
  data: ProcessedCountry[],
): ProcessedCountry[] {
  const country = data.find((c) => c.code === code);
  if (!country) return [];
  return country.tradePartners
    .map((p) => data.find((c) => c.code === p))
    .filter((c): c is ProcessedCountry => !!c);
}

export function filterCountries(
  data: ProcessedCountry[],
  filters: FilterConfig,
): ProcessedCountry[] {
  return data.filter((c) => {
    if (c.latestEmission < filters.minEmission) return false;
    if (c.latestGdp < filters.minGdpPerCapita) return false;
    return true;
  });
}

export function formatNumber(value: number): string {
  return value.toLocaleString('zh-CN');
}

export function getEmissionLevel(emission: number): string {
  if (emission >= 5000) return '极高排放';
  if (emission >= 2000) return '高排放';
  if (emission >= 800) return '中高排放';
  if (emission >= 300) return '中排放';
  if (emission >= 100) return '中低排放';
  return '低排放';
}
