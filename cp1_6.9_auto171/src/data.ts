import { PlanetData } from './types';

export const SUN_RADIUS = 3;
export const ORBIT_SCALE = 6;
export const EARTH_YEAR_DURATION = 5;

export const planets: PlanetData[] = [
  {
    name: 'Sun',
    nameCN: '太阳',
    radiusRatio: 1,
    orbitRadiusRatio: 0,
    orbitPeriodRatio: 0,
    rotationPeriodRatio: 25.05,
    color: '#FFCC00',
    initialAngle: 0,
    isSun: true,
    rotationPeriodDays: 25.05,
    orbitPeriodYears: 0
  },
  {
    name: 'Mercury',
    nameCN: '水星',
    radiusRatio: 0.05,
    orbitRadiusRatio: 1.2,
    orbitPeriodRatio: 0.24,
    rotationPeriodRatio: 58.6,
    color: '#B5A68F',
    initialAngle: 0.3,
    rotationPeriodDays: 58.6,
    orbitPeriodYears: 0.24
  },
  {
    name: 'Venus',
    nameCN: '金星',
    radiusRatio: 0.095,
    orbitRadiusRatio: 1.8,
    orbitPeriodRatio: 0.62,
    rotationPeriodRatio: 243,
    color: '#E8D185',
    initialAngle: 1.1,
    rotationPeriodDays: 243,
    orbitPeriodYears: 0.62
  },
  {
    name: 'Earth',
    nameCN: '地球',
    radiusRatio: 0.1,
    orbitRadiusRatio: 2.6,
    orbitPeriodRatio: 1,
    rotationPeriodRatio: 1,
    color: '#4B7BE5',
    initialAngle: 2.4,
    rotationPeriodDays: 1,
    orbitPeriodYears: 1
  },
  {
    name: 'Mars',
    nameCN: '火星',
    radiusRatio: 0.053,
    orbitRadiusRatio: 3.4,
    orbitPeriodRatio: 1.88,
    rotationPeriodRatio: 1.03,
    color: '#E27B58',
    initialAngle: 0.8,
    rotationPeriodDays: 1.03,
    orbitPeriodYears: 1.88
  },
  {
    name: 'Jupiter',
    nameCN: '木星',
    radiusRatio: 0.35,
    orbitRadiusRatio: 4.6,
    orbitPeriodRatio: 11.86,
    rotationPeriodRatio: 0.41,
    color: '#D4A574',
    initialAngle: 3.7,
    rotationPeriodDays: 0.41,
    orbitPeriodYears: 11.86
  },
  {
    name: 'Saturn',
    nameCN: '土星',
    radiusRatio: 0.3,
    orbitRadiusRatio: 5.8,
    orbitPeriodRatio: 29.46,
    rotationPeriodRatio: 0.45,
    color: '#E8C99B',
    initialAngle: 5.2,
    rotationPeriodDays: 0.45,
    orbitPeriodYears: 29.46
  },
  {
    name: 'Uranus',
    nameCN: '天王星',
    radiusRatio: 0.18,
    orbitRadiusRatio: 7.0,
    orbitPeriodRatio: 84.01,
    rotationPeriodRatio: 0.72,
    color: '#7EC8E3',
    initialAngle: 4.1,
    rotationPeriodDays: 0.72,
    orbitPeriodYears: 84.01
  },
  {
    name: 'Neptune',
    nameCN: '海王星',
    radiusRatio: 0.175,
    orbitRadiusRatio: 8.2,
    orbitPeriodRatio: 164.8,
    rotationPeriodRatio: 0.67,
    color: '#3B5BA5',
    initialAngle: 1.9,
    rotationPeriodDays: 0.67,
    orbitPeriodYears: 164.8
  }
];
