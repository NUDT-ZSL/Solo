export interface PlanetData {
  id: string;
  name: string;
  nameCN: string;
  orbitRadius: number;
  eccentricity: number;
  orbitPeriod: number;
  rotationPeriod: number;
  radius: number;
  color: string;
  textureType: 'gas' | 'rock' | 'ice' | 'sun';
  hasRings?: boolean;
  ringColor?: string;
  description: string;
  diameter: number;
  distanceFromSun: number;
}

export const planetData: PlanetData[] = [
  {
    id: 'sun',
    name: 'Sun',
    nameCN: '太阳',
    orbitRadius: 0,
    orbitPeriod: 0,
    rotationPeriod: 25,
    radius: 5,
    color: '#ffaa00',
    textureType: 'sun',
    description: '太阳是太阳系的中心天体，是一颗黄矮星，其质量占太阳系总质量的99.86%。太阳通过核聚变反应将氢转化为氦，持续为太阳系提供光和热。',
    diameter: 1392700,
    distanceFromSun: 0,
  },
  {
    id: 'mercury',
    name: 'Mercury',
    nameCN: '水星',
    orbitRadius: 10,
    orbitPeriod: 88,
    rotationPeriod: 59,
    radius: 0.3,
    color: '#8c7853',
    textureType: 'rock',
    description: '水星是太阳系中最小的行星，也是距离太阳最近的行星。它没有大气层，表面布满陨石坑，昼夜温差极大。',
    diameter: 4879,
    distanceFromSun: 57.9,
  },
  {
    id: 'venus',
    name: 'Venus',
    nameCN: '金星',
    orbitRadius: 15,
    orbitPeriod: 225,
    rotationPeriod: 243,
    radius: 0.55,
    color: '#ffc649',
    textureType: 'rock',
    description: '金星是太阳系中最热的行星，拥有浓厚的二氧化碳大气层，表面温度高达462°C。它是夜空中最亮的行星，被称为"启明星"或"长庚星"。',
    diameter: 12104,
    distanceFromSun: 108.2,
  },
  {
    id: 'earth',
    name: 'Earth',
    nameCN: '地球',
    orbitRadius: 20,
    orbitPeriod: 365,
    rotationPeriod: 1,
    radius: 0.6,
    color: '#4a90d9',
    textureType: 'rock',
    description: '地球是太阳系中唯一已知存在生命的行星。它拥有液态水、适宜的大气层和磁场，为生命提供了完美的生存环境。',
    diameter: 12742,
    distanceFromSun: 149.6,
  },
  {
    id: 'mars',
    name: 'Mars',
    nameCN: '火星',
    orbitRadius: 26,
    orbitPeriod: 687,
    rotationPeriod: 1.03,
    radius: 0.45,
    color: '#c1440e',
    textureType: 'rock',
    description: '火星因其红色外观而被称为"红色星球"。它拥有太阳系最高的火山奥林匹斯山和最大的峡谷水手谷，是人类探索的重点目标。',
    diameter: 6779,
    distanceFromSun: 227.9,
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    nameCN: '木星',
    orbitRadius: 35,
    orbitPeriod: 4333,
    rotationPeriod: 0.41,
    radius: 1.2,
    color: '#d8ca9d',
    textureType: 'gas',
    description: '木星是太阳系中最大的行星，其质量是其他七颗行星总和的2.5倍。著名的大红斑是一个持续了数百年的巨型风暴系统。',
    diameter: 139820,
    distanceFromSun: 778.5,
  },
  {
    id: 'saturn',
    name: 'Saturn',
    nameCN: '土星',
    orbitRadius: 45,
    orbitPeriod: 10759,
    rotationPeriod: 0.44,
    radius: 1.0,
    color: '#f4d59e',
    textureType: 'gas',
    hasRings: true,
    ringColor: '#c9b896',
    description: '土星以其壮观的环系统而闻名，环主要由冰块和岩石碎片组成。土星的密度非常低，如果有足够大的海洋，它可以漂浮在水面上。',
    diameter: 116460,
    distanceFromSun: 1434,
  },
  {
    id: 'uranus',
    name: 'Uranus',
    nameCN: '天王星',
    orbitRadius: 55,
    orbitPeriod: 30687,
    rotationPeriod: 0.72,
    radius: 0.7,
    color: '#d1e7e7',
    textureType: 'ice',
    hasRings: true,
    ringColor: '#8899aa',
    description: '天王星是太阳系中最冷的行星，其独特之处在于它的自转轴几乎与公转轨道平行，呈"躺着"旋转的姿态。',
    diameter: 50724,
    distanceFromSun: 2871,
  },
  {
    id: 'neptune',
    name: 'Neptune',
    nameCN: '海王星',
    orbitRadius: 65,
    orbitPeriod: 60190,
    rotationPeriod: 0.67,
    radius: 0.68,
    color: '#5b5ddf',
    textureType: 'ice',
    description: '海王星是太阳系最远的行星，拥有太阳系中最强的风暴，风速可达每小时2100公里。它深邃的蓝色来自大气中的甲烷。',
    diameter: 49244,
    distanceFromSun: 4495,
  },
];

export const getPlanetById = (id: string): PlanetData | undefined => {
  return planetData.find(p => p.id === id);
};

export const sunData = planetData[0];
export const planetsData = planetData.slice(1);
