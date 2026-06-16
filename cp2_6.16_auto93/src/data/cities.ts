export interface City {
  name: string;
  nameEn: string;
  latitude: number;
  longitude: number;
}

export const cities: City[] = [
  {
    name: '东京',
    nameEn: 'Tokyo',
    latitude: 35.6762,
    longitude: 139.6503
  },
  {
    name: '伦敦',
    nameEn: 'London',
    latitude: 51.5074,
    longitude: -0.1278
  },
  {
    name: '纽约',
    nameEn: 'New York',
    latitude: 40.7128,
    longitude: -74.0060
  },
  {
    name: '悉尼',
    nameEn: 'Sydney',
    latitude: -33.8688,
    longitude: 151.2093
  },
  {
    name: '开罗',
    nameEn: 'Cairo',
    latitude: 30.0444,
    longitude: 31.2357
  }
];
