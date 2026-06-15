export interface MoonData {
  id: string;
  name: string;
  nameEn: string;
  radius: number;
  orbitRadius: number;
  orbitPeriod: number;
  color: string;
  mass: string;
  diameter: string;
  surfaceTemp: string;
}

export interface PlanetDataItem {
  id: string;
  name: string;
  nameEn: string;
  type: 'star' | 'planet' | 'moon';
  radius: number;
  orbitRadius: number;
  orbitPeriod: number;
  rotationSpeed: number;
  color: string;
  emissionColor?: string;
  emissionIntensity?: number;
  mass: string;
  diameter: string;
  surfaceTemp: string;
  distanceFromSun: string;
  hasMoons: boolean;
  moons?: MoonData[];
  description: string;
}

export const PLANET_DATA: PlanetDataItem[] = [
  {
    id: 'sun',
    name: '太阳',
    nameEn: 'Sun',
    type: 'star',
    radius: 12,
    orbitRadius: 0,
    orbitPeriod: 0,
    rotationSpeed: 0.001,
    color: '#fdb813',
    emissionColor: '#fdb813',
    emissionIntensity: 2.0,
    mass: '1.989 × 10³⁰ kg',
    diameter: '1,391,000 km',
    surfaceTemp: '5,500°C (表面)',
    distanceFromSun: '0 km',
    hasMoons: false,
    description: '太阳是太阳系的中心恒星，占据了太阳系总质量的99.86%。',
  },
  {
    id: 'mercury',
    name: '水星',
    nameEn: 'Mercury',
    type: 'planet',
    radius: 1.2,
    orbitRadius: 20,
    orbitPeriod: 2.4,
    rotationSpeed: 0.002,
    color: '#b5b5b5',
    mass: '3.285 × 10²³ kg',
    diameter: '4,879 km',
    surfaceTemp: '-173°C ~ 427°C',
    distanceFromSun: '57.9 million km',
    hasMoons: false,
    description: '水星是太阳系中最小的行星，也是离太阳最近的行星。',
  },
  {
    id: 'venus',
    name: '金星',
    nameEn: 'Venus',
    type: 'planet',
    radius: 2.1,
    orbitRadius: 28,
    orbitPeriod: 6.2,
    rotationSpeed: -0.0015,
    color: '#e6c87a',
    mass: '4.867 × 10²⁴ kg',
    diameter: '12,104 km',
    surfaceTemp: '464°C',
    distanceFromSun: '108.2 million km',
    hasMoons: false,
    description: '金星是太阳系中最热的行星，有着浓厚的二氧化碳大气层。',
  },
  {
    id: 'earth',
    name: '地球',
    nameEn: 'Earth',
    type: 'planet',
    radius: 2.2,
    orbitRadius: 38,
    orbitPeriod: 10,
    rotationSpeed: 0.01,
    color: '#4a90d9',
    mass: '5.972 × 10²⁴ kg',
    diameter: '12,742 km',
    surfaceTemp: '-88°C ~ 58°C',
    distanceFromSun: '149.6 million km',
    hasMoons: true,
    moons: [
      {
        id: 'moon',
        name: '月球',
        nameEn: 'Moon',
        radius: 0.6,
        orbitRadius: 4,
        orbitPeriod: 1.2,
        color: '#c0c0c0',
        mass: '7.342 × 10²² kg',
        diameter: '3,474 km',
        surfaceTemp: '-173°C ~ 127°C',
      },
    ],
    description: '地球是太阳系中唯一已知存在生命的行星，拥有液态水和适宜的大气层。',
  },
  {
    id: 'mars',
    name: '火星',
    nameEn: 'Mars',
    type: 'planet',
    radius: 1.6,
    orbitRadius: 48,
    orbitPeriod: 18.8,
    rotationSpeed: 0.009,
    color: '#c1440e',
    mass: '6.39 × 10²³ kg',
    diameter: '6,779 km',
    surfaceTemp: '-125°C ~ 20°C',
    distanceFromSun: '227.9 million km',
    hasMoons: true,
    moons: [
      {
        id: 'phobos',
        name: '火卫一',
        nameEn: 'Phobos',
        radius: 0.25,
        orbitRadius: 2.8,
        orbitPeriod: 0.4,
        color: '#8b7355',
        mass: '1.0659 × 10¹⁶ kg',
        diameter: '22.2 km',
        surfaceTemp: '-40°C',
      },
      {
        id: 'deimos',
        name: '火卫二',
        nameEn: 'Deimos',
        radius: 0.18,
        orbitRadius: 3.8,
        orbitPeriod: 0.7,
        color: '#7a6b5a',
        mass: '1.4762 × 10¹⁵ kg',
        diameter: '12.4 km',
        surfaceTemp: '-40°C',
      },
    ],
    description: '火星被称为"红色星球"，因其表面富含氧化铁而呈现红色。',
  },
  {
    id: 'jupiter',
    name: '木星',
    nameEn: 'Jupiter',
    type: 'planet',
    radius: 6.5,
    orbitRadius: 65,
    orbitPeriod: 40,
    rotationSpeed: 0.02,
    color: '#d8ca9d',
    mass: '1.898 × 10²⁷ kg',
    diameter: '139,820 km',
    surfaceTemp: '-108°C (云层顶部)',
    distanceFromSun: '778.5 million km',
    hasMoons: true,
    moons: [
      {
        id: 'io',
        name: '木卫一',
        nameEn: 'Io',
        radius: 0.55,
        orbitRadius: 9,
        orbitPeriod: 0.8,
        color: '#ffffe0',
        mass: '8.9319 × 10²² kg',
        diameter: '3,643 km',
        surfaceTemp: '-130°C',
      },
      {
        id: 'europa',
        name: '木卫二',
        nameEn: 'Europa',
        radius: 0.48,
        orbitRadius: 11,
        orbitPeriod: 1.2,
        color: '#f5deb3',
        mass: '4.7998 × 10²² kg',
        diameter: '3,122 km',
        surfaceTemp: '-160°C',
      },
      {
        id: 'ganymede',
        name: '木卫三',
        nameEn: 'Ganymede',
        radius: 0.75,
        orbitRadius: 13,
        orbitPeriod: 1.8,
        color: '#d3d3d3',
        mass: '1.4819 × 10²³ kg',
        diameter: '5,262 km',
        surfaceTemp: '-160°C',
      },
      {
        id: 'callisto',
        name: '木卫四',
        nameEn: 'Callisto',
        radius: 0.68,
        orbitRadius: 15,
        orbitPeriod: 2.5,
        color: '#a9a9a9',
        mass: '1.0759 × 10²³ kg',
        diameter: '4,821 km',
        surfaceTemp: '-139°C',
      },
    ],
    description: '木星是太阳系中最大的行星，著名的大红斑是一个持续了数百年的巨大风暴。',
  },
  {
    id: 'saturn',
    name: '土星',
    nameEn: 'Saturn',
    type: 'planet',
    radius: 5.5,
    orbitRadius: 85,
    orbitPeriod: 70,
    rotationSpeed: 0.018,
    color: '#f4d59e',
    mass: '5.683 × 10²⁶ kg',
    diameter: '116,460 km',
    surfaceTemp: '-139°C (云层顶部)',
    distanceFromSun: '1.43 billion km',
    hasMoons: true,
    description: '土星以其壮观的环系统而闻名，主要由冰和岩石碎片组成。',
  },
  {
    id: 'uranus',
    name: '天王星',
    nameEn: 'Uranus',
    type: 'planet',
    radius: 3.8,
    orbitRadius: 102,
    orbitPeriod: 100,
    rotationSpeed: -0.012,
    color: '#8fd4d9',
    mass: '8.681 × 10²⁵ kg',
    diameter: '50,724 km',
    surfaceTemp: '-197°C (云层顶部)',
    distanceFromSun: '2.87 billion km',
    hasMoons: false,
    description: '天王星的自转轴几乎与公转轨道平面平行，使其"侧躺"着绕太阳旋转。',
  },
  {
    id: 'neptune',
    name: '海王星',
    nameEn: 'Neptune',
    type: 'planet',
    radius: 3.6,
    orbitRadius: 118,
    orbitPeriod: 140,
    rotationSpeed: 0.015,
    color: '#4166f5',
    mass: '1.024 × 10²⁶ kg',
    diameter: '49,244 km',
    surfaceTemp: '-201°C (云层顶部)',
    distanceFromSun: '4.5 billion km',
    hasMoons: false,
    description: '海王星是太阳系中风速最快的行星，风速可达2,100 km/h。',
  },
];

export const getPlanetById = (id: string): PlanetDataItem | MoonData | undefined => {
  for (const planet of PLANET_DATA) {
    if (planet.id === id) return planet;
    if (planet.moons) {
      for (const moon of planet.moons) {
        if (moon.id === id) return moon;
      }
    }
  }
  return undefined;
};
