export type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'snowy'

export interface CityWeather {
  id: string
  name: string
  x: number
  y: number
  temperature: number
  humidity: number
  windSpeed: number
  weatherType: WeatherType
  hourlyTemp: number[]
  hourlyHumidity: number[]
}

export interface Airflow {
  x: number
  y: number
  vx: number
  vy: number
  speed: number
  targetCity: string
}
