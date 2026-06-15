import { CityWeather, WeatherType } from './types'

const weatherTypes: WeatherType[] = ['sunny', 'cloudy', 'rainy', 'stormy', 'snowy']

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

function generateHourlyData(base: number, amplitude: number): number[] {
  const data: number[] = []
  for (let i = 0; i < 24; i++) {
    const hour = i
    const sineWave = Math.sin((hour / 24) * Math.PI * 2 - Math.PI / 2)
    data.push(Math.round(base + amplitude * sineWave + randomInRange(-2, 2)))
  }
  return data
}

export function generateCityWeather(): CityWeather[] {
  const cities: CityWeather[] = [
    {
      id: 'beijing',
      name: '北京',
      x: 420,
      y: 150,
      temperature: Math.round(randomInRange(-5, 35)),
      humidity: Math.round(randomInRange(30, 70)),
      windSpeed: Math.round(randomInRange(0, 30)),
      weatherType: weatherTypes[Math.floor(Math.random() * weatherTypes.length)],
      hourlyTemp: [],
      hourlyHumidity: [],
    },
    {
      id: 'shanghai',
      name: '上海',
      x: 500,
      y: 250,
      temperature: Math.round(randomInRange(0, 38)),
      humidity: Math.round(randomInRange(50, 90)),
      windSpeed: Math.round(randomInRange(0, 25)),
      weatherType: weatherTypes[Math.floor(Math.random() * weatherTypes.length)],
      hourlyTemp: [],
      hourlyHumidity: [],
    },
    {
      id: 'guangzhou',
      name: '广州',
      x: 430,
      y: 340,
      temperature: Math.round(randomInRange(10, 40)),
      humidity: Math.round(randomInRange(60, 90)),
      windSpeed: Math.round(randomInRange(0, 20)),
      weatherType: weatherTypes[Math.floor(Math.random() * weatherTypes.length)],
      hourlyTemp: [],
      hourlyHumidity: [],
    },
    {
      id: 'chengdu',
      name: '成都',
      x: 280,
      y: 250,
      temperature: Math.round(randomInRange(5, 35)),
      humidity: Math.round(randomInRange(50, 85)),
      windSpeed: Math.round(randomInRange(0, 15)),
      weatherType: weatherTypes[Math.floor(Math.random() * weatherTypes.length)],
      hourlyTemp: [],
      hourlyHumidity: [],
    },
    {
      id: 'xian',
      name: '西安',
      x: 320,
      y: 190,
      temperature: Math.round(randomInRange(-2, 38)),
      humidity: Math.round(randomInRange(35, 75)),
      windSpeed: Math.round(randomInRange(0, 25)),
      weatherType: weatherTypes[Math.floor(Math.random() * weatherTypes.length)],
      hourlyTemp: [],
      hourlyHumidity: [],
    },
    {
      id: 'harbin',
      name: '哈尔滨',
      x: 500,
      y: 70,
      temperature: Math.round(randomInRange(-25, 28)),
      humidity: Math.round(randomInRange(40, 80)),
      windSpeed: Math.round(randomInRange(5, 30)),
      weatherType: weatherTypes[Math.floor(Math.random() * weatherTypes.length)],
      hourlyTemp: [],
      hourlyHumidity: [],
    },
  ]

  return cities.map((city) => ({
    ...city,
    hourlyTemp: generateHourlyData(city.temperature, 8),
    hourlyHumidity: generateHourlyData(city.humidity, 15),
  }))
}

export const weatherTypeLabels: Record<WeatherType, string> = {
  sunny: '晴天',
  cloudy: '多云',
  rainy: '小雨',
  stormy: '暴风雨',
  snowy: '雪天',
}
