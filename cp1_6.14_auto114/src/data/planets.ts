import type { PlanetData } from '../types';

export const planets: PlanetData[] = [
  {
    name: 'mercury',
    nameCn: '水星',
    radius: 0.15,
    color: '#8c7853',
    orbitParams: {
      semiMajorAxis: 3,
      eccentricity: 0.206,
      orbitalPeriod: 14.5,
      initialPhase: 0
    }
  },
  {
    name: 'venus',
    nameCn: '金星',
    radius: 0.3,
    color: '#ffc649',
    orbitParams: {
      semiMajorAxis: 4.5,
      eccentricity: 0.007,
      orbitalPeriod: 30.2,
      initialPhase: Math.PI / 3
    }
  },
  {
    name: 'earth',
    nameCn: '地球',
    radius: 0.4,
    color: '#4a90d9',
    orbitParams: {
      semiMajorAxis: 6,
      eccentricity: 0.017,
      orbitalPeriod: 60,
      initialPhase: Math.PI / 2
    }
  },
  {
    name: 'mars',
    nameCn: '火星',
    radius: 0.3,
    color: '#cd5c5c',
    orbitParams: {
      semiMajorAxis: 7.5,
      eccentricity: 0.093,
      orbitalPeriod: 108.8,
      initialPhase: Math.PI
    }
  },
  {
    name: 'jupiter',
    nameCn: '木星',
    radius: 1.2,
    color: '#d4a574',
    orbitParams: {
      semiMajorAxis: 10,
      eccentricity: 0.049,
      orbitalPeriod: 711.6,
      initialPhase: Math.PI * 1.5
    }
  },
  {
    name: 'saturn',
    nameCn: '土星',
    radius: 1.0,
    color: '#fad5a5',
    orbitParams: {
      semiMajorAxis: 13,
      eccentricity: 0.057,
      orbitalPeriod: 1776,
      initialPhase: Math.PI / 6
    }
  }
];
