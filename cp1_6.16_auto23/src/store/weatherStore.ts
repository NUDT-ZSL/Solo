import { create } from 'zustand'
import {
  type WeatherType,
  type WeatherState,
  createWeatherState,
  advanceTime,
  switchWeather,
  lockWeather,
  setTimeSpeed,
  getTransitionProgress,
  getEffectiveWeather,
} from '../logic/weatherStateMachine'
import {
  getEnvironmentParams,
  interpolateEnvironment,
  getWeatherMetrics,
  interpolateMetrics,
  type EnvironmentParams,
  type WeatherMetrics,
} from '../logic/environmentMapper'

interface HourlyData {
  hour: number
  temperature: number
  humidity: number
}

interface WeatherAlert {
  id: string
  type: string
  level: 'red' | 'orange' | 'yellow' | 'blue'
  message: string
  timestamp: number
}

interface WeatherStoreState {
  weatherState: WeatherState
  environmentParams: EnvironmentParams
  weatherMetrics: WeatherMetrics
  historyData: HourlyData[]
  alerts: WeatherAlert[]
  panelOpen: boolean
  isMobile: boolean
}

interface WeatherStoreActions {
  tick: (deltaMs: number) => void
  setWeather: (weather: WeatherType) => void
  setLocked: (locked: boolean) => void
  setTimeSpeed: (speed: number) => void
  fetchHistoryData: () => Promise<void>
  fetchAlerts: () => Promise<void>
  togglePanel: () => void
  addAlert: (alert: WeatherAlert) => void
  setIsMobile: (value: boolean) => void
}

const initialWeatherState = createWeatherState()

const useWeatherStore = create<WeatherStoreState & WeatherStoreActions>((set, get) => ({
  weatherState: initialWeatherState,
  environmentParams: getEnvironmentParams(initialWeatherState.current),
  weatherMetrics: getWeatherMetrics(initialWeatherState.current),
  historyData: [],
  alerts: [],
  panelOpen: true,
  isMobile: window.innerWidth <= 768,

  tick(deltaMs: number) {
    const { weatherState } = get()
    const next = advanceTime(weatherState, deltaMs)
    if (next === weatherState) return

    let environmentParams: EnvironmentParams
    let weatherMetrics: WeatherMetrics

    if (next.transition) {
      const progress = getTransitionProgress(next)
      environmentParams = interpolateEnvironment(
        next.transition.from,
        next.transition.to,
        progress,
      )
      weatherMetrics = interpolateMetrics(
        next.transition.from,
        next.transition.to,
        progress,
      )
    } else {
      const effective = getEffectiveWeather(next)
      environmentParams = getEnvironmentParams(effective)
      weatherMetrics = getWeatherMetrics(effective)
    }

    set({ weatherState: next, environmentParams, weatherMetrics })
  },

  setWeather(weather: WeatherType) {
    const { weatherState } = get()
    const next = switchWeather(weatherState, weather)
    if (next === weatherState) return

    let environmentParams: EnvironmentParams
    let weatherMetrics: WeatherMetrics

    if (next.transition) {
      const progress = getTransitionProgress(next)
      environmentParams = interpolateEnvironment(
        next.transition.from,
        next.transition.to,
        progress,
      )
      weatherMetrics = interpolateMetrics(
        next.transition.from,
        next.transition.to,
        progress,
      )
    } else {
      environmentParams = getEnvironmentParams(next.current)
      weatherMetrics = getWeatherMetrics(next.current)
    }

    set({ weatherState: next, environmentParams, weatherMetrics })
  },

  setLocked(locked: boolean) {
    const { weatherState } = get()
    set({ weatherState: lockWeather(weatherState, locked) })
  },

  setTimeSpeed(speed: number) {
    const { weatherState } = get()
    set({ weatherState: setTimeSpeed(weatherState, speed) })
  },

  async fetchHistoryData() {
    try {
      const res = await fetch('/api/weather/history')
      const data: HourlyData[] = await res.json()
      set({ historyData: data })
    } catch {
      console.error('Failed to fetch history data')
    }
  },

  async fetchAlerts() {
    try {
      const res = await fetch('/api/weather/alerts')
      const data: WeatherAlert[] = await res.json()
      set({ alerts: data })
    } catch {
      console.error('Failed to fetch alerts')
    }
  },

  togglePanel() {
    set((state) => ({ panelOpen: !state.panelOpen }))
  },

  addAlert(alert: WeatherAlert) {
    set((state) => ({ alerts: [...state.alerts, alert] }))
  },

  setIsMobile(value: boolean) {
    set({ isMobile: value })
  },
}))

export type { HourlyData, WeatherAlert }
export default useWeatherStore
