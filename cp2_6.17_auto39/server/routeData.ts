import type { ShippingRoute, YearlyEmission, EmissionAggregate, ShipInfo } from '../src/types';

const YEARS = [2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030];

function generateYearlyData(baseEmission: number, baseShips: number): YearlyEmission[] {
  return YEARS.map((year, idx) => {
    const growth = idx < 5 ? 1 + idx * 0.03 : 1 + 5 * 0.03 + (idx - 5) * 0.05;
    return {
      year,
      emission: Math.round(baseEmission * growth),
      shipCount: Math.round(baseShips * (1 + idx * 0.02))
    };
  });
}

export const shippingRoutes: ShippingRoute[] = [
  {
    id: 'r001',
    name: '上海 → 洛杉矶',
    fromPort: '上海港 (上海)',
    toPort: '洛杉矶港 (美国)',
    from: { lat: 31.2304, lng: 121.4737 },
    to: { lat: 33.7399, lng: -118.2620 },
    distanceKm: 10500,
    avgShipsPerYear: 12500,
    totalEmissionTons: 21000000,
    region: '跨太平洋',
    yearlyData: generateYearlyData(18000000, 11000)
  },
  {
    id: 'r002',
    name: '新加坡 → 鹿特丹',
    fromPort: '新加坡港 (新加坡)',
    toPort: '鹿特丹港 (荷兰)',
    from: { lat: 1.3521, lng: 103.8198 },
    to: { lat: 51.9244, lng: 4.4777 },
    distanceKm: 15600,
    avgShipsPerYear: 9800,
    totalEmissionTons: 28500000,
    region: '马六甲-苏伊士',
    yearlyData: generateYearlyData(24000000, 8500)
  },
  {
    id: 'r003',
    name: '迪拜 → 汉堡',
    fromPort: '杰贝阿里港 (阿联酋)',
    toPort: '汉堡港 (德国)',
    from: { lat: 25.0215, lng: 55.0845 },
    to: { lat: 53.5511, lng: 9.9937 },
    distanceKm: 9800,
    avgShipsPerYear: 7200,
    totalEmissionTons: 16800000,
    region: '波斯湾-欧洲',
    yearlyData: generateYearlyData(14200000, 6300)
  },
  {
    id: 'r004',
    name: '釜山 → 纽约',
    fromPort: '釜山港 (韩国)',
    toPort: '纽约-新泽西港 (美国)',
    from: { lat: 35.1796, lng: 129.0756 },
    to: { lat: 40.7128, lng: -74.0060 },
    distanceKm: 14200,
    avgShipsPerYear: 8400,
    totalEmissionTons: 22000000,
    region: '东亚-北美东',
    yearlyData: generateYearlyData(18500000, 7400)
  },
  {
    id: 'r005',
    name: '深圳 → 悉尼',
    fromPort: '盐田港 (深圳)',
    toPort: '悉尼港 (澳大利亚)',
    from: { lat: 22.5431, lng: 114.0579 },
    to: { lat: -33.8688, lng: 151.2093 },
    distanceKm: 7400,
    avgShipsPerYear: 5600,
    totalEmissionTons: 9400000,
    region: '亚太',
    yearlyData: generateYearlyData(7900000, 4900)
  },
  {
    id: 'r006',
    name: '里约热内卢 → 开普敦',
    fromPort: '里约热内卢港 (巴西)',
    toPort: '开普敦港 (南非)',
    from: { lat: -22.9068, lng: -43.1729 },
    to: { lat: -33.9249, lng: 18.4241 },
    distanceKm: 6100,
    avgShipsPerYear: 3200,
    totalEmissionTons: 5800000,
    region: '南美-南非',
    yearlyData: generateYearlyData(4900000, 2800)
  },
  {
    id: 'r007',
    name: '孟买 → 科伦坡',
    fromPort: '尼赫鲁港 (孟买)',
    toPort: '科伦坡港 (斯里兰卡)',
    from: { lat: 19.0760, lng: 72.8777 },
    to: { lat: 6.9271, lng: 79.8612 },
    distanceKm: 1450,
    avgShipsPerYear: 6800,
    totalEmissionTons: 2800000,
    region: '印度洋',
    yearlyData: generateYearlyData(2400000, 6000)
  },
  {
    id: 'r008',
    name: '洛杉矶 → 巴拿马城',
    fromPort: '洛杉矶港 (美国)',
    toPort: '巴拿马城港 (巴拿马)',
    from: { lat: 33.7399, lng: -118.2620 },
    to: { lat: 8.9824, lng: -79.5199 },
    distanceKm: 4900,
    avgShipsPerYear: 14200,
    totalEmissionTons: 12800000,
    region: '巴拿马运河',
    yearlyData: generateYearlyData(10800000, 12500)
  },
  {
    id: 'r009',
    name: '阿姆斯特丹 → 伦敦',
    fromPort: '阿姆斯特丹港 (荷兰)',
    toPort: '伦敦门户港 (英国)',
    from: { lat: 52.3676, lng: 4.9041 },
    to: { lat: 51.5074, lng: -0.1278 },
    distanceKm: 320,
    avgShipsPerYear: 18500,
    totalEmissionTons: 1600000,
    region: '北海近洋',
    yearlyData: generateYearlyData(1350000, 16200)
  },
  {
    id: 'r010',
    name: '广州 → 胡志明市',
    fromPort: '广州南沙港 (中国)',
    toPort: '胡志明港 (越南)',
    from: { lat: 23.1291, lng: 113.2644 },
    to: { lat: 10.8231, lng: 106.6297 },
    distanceKm: 1200,
    avgShipsPerYear: 9200,
    totalEmissionTons: 2100000,
    region: '东南亚近洋',
    yearlyData: generateYearlyData(1780000, 8100)
  }
];

export const shipInfos: ShipInfo[] = [
  { type: '集装箱船', count: 5800, avgEmissionPerShip: 3200 },
  { type: '散货船', count: 12500, avgEmissionPerShip: 2800 },
  { type: '油轮', count: 7200, avgEmissionPerShip: 3800 },
  { type: '液化天然气船', count: 680, avgEmissionPerShip: 2100 },
  { type: '汽车运输船', count: 1100, avgEmissionPerShip: 1900 }
];

export function getAllRoutes(): ShippingRoute[] {
  return shippingRoutes;
}

export function getRouteById(id: string): ShippingRoute | undefined {
  return shippingRoutes.find(r => r.id === id);
}

export function getEmissionAggregate(year: number): EmissionAggregate {
  const routes = getAllRoutes();
  let totalEmission = 0;
  let totalShips = 0;
  const regionMap = new Map<string, number>();

  for (const route of routes) {
    const yd = route.yearlyData.find(y => y.year === year) || route.yearlyData[0];
    totalEmission += yd.emission;
    totalShips += yd.shipCount;
    const cur = regionMap.get(route.region) || 0;
    regionMap.set(route.region, cur + yd.emission);
  }

  return {
    year,
    totalEmissionTons: totalEmission,
    totalShips,
    regionBreakdown: Array.from(regionMap.entries())
      .map(([region, emission]) => ({ region, emission }))
      .sort((a, b) => b.emission - a.emission)
  };
}

export function getAllShips(): ShipInfo[] {
  return shipInfos;
}

export function getTimestamp(): string {
  return new Date().toISOString();
}
