export type WeatherType = 'sunny' | 'rainy' | 'snowy' | 'thunder'

export interface WeatherTransition {
  from: WeatherType
  to: WeatherType
  progress: number
  duration: number
}

export interface WeatherState {
  current: WeatherType
  previous: WeatherType
  transition: WeatherTransition | null
  locked: boolean
  gameTime: number
  timeSpeed: number
}

const TRANSITION_DURATION = 1000

const WEATHER_CYCLE: WeatherType[] = ['sunny', 'rainy', 'snowy', 'thunder']

const HOUR_TO_WEATHER: Record<number, WeatherType> = {
  0: 'sunny', 1: 'sunny', 2: 'sunny', 3: 'sunny', 4: 'sunny', 5: 'sunny',
  6: 'sunny', 7: 'sunny', 8: 'sunny', 9: 'sunny', 10: 'rainy', 11: 'rainy',
  12: 'sunny', 13: 'sunny', 14: 'sunny', 15: 'rainy', 16: 'rainy', 17: 'thunder',
  18: 'thunder', 19: 'rainy', 20: 'snowy', 21: 'snowy', 22: 'snowy', 23: 'sunny',
}

export function getWeatherForHour(hour: number): WeatherType {
  const h = ((Math.floor(hour) % 24) + 24) % 24
  return HOUR_TO_WEATHER[h]
}

export function createWeatherState(): WeatherState {
  const now = new Date()
  const hour = now.getHours() + now.getMinutes() / 60
  return {
    current: getWeatherForHour(hour),
    previous: getWeatherForHour(hour),
    transition: null,
    locked: false,
    gameTime: hour,
    timeSpeed: 1,
  }
}

export function advanceTime(state: WeatherState, deltaMs: number): WeatherState {
  if (state.timeSpeed === 0) return state

  const gameMinutesPerRealMs = state.timeSpeed * (60 / 60000)
  const deltaGameHours = (deltaMs * gameMinutesPerRealMs) / 60
  const newGameTime = (state.gameTime + deltaGameHours) % 24

  if (state.locked) {
    return { ...state, gameTime: newGameTime }
  }

  const targetWeather = getWeatherForHour(newGameTime)

  if (state.transition) {
    const elapsed = state.transition.progress + deltaMs
    if (elapsed >= state.transition.duration) {
      return {
        ...state,
        current: state.transition.to,
        previous: state.transition.to,
        transition: null,
        gameTime: newGameTime,
      }
    }
    return {
      ...state,
      transition: { ...state.transition, progress: elapsed },
      gameTime: newGameTime,
    }
  }

  if (targetWeather !== state.current) {
    return {
      ...state,
      previous: state.current,
      transition: {
        from: state.current,
        to: targetWeather,
        progress: 0,
        duration: TRANSITION_DURATION,
      },
      gameTime: newGameTime,
    }
  }

  return { ...state, gameTime: newGameTime }
}

export function switchWeather(state: WeatherState, target: WeatherType): WeatherState {
  if (target === state.current && !state.transition) return state

  return {
    ...state,
    previous: state.current,
    transition: {
      from: state.current,
      to: target,
      progress: 0,
      duration: TRANSITION_DURATION,
    },
  }
}

export function lockWeather(state: WeatherState, locked: boolean): WeatherState {
  return { ...state, locked }
}

export function setTimeSpeed(state: WeatherState, speed: number): WeatherState {
  return { ...state, timeSpeed: speed }
}

export function getTransitionProgress(state: WeatherState): number {
  if (!state.transition) return 1
  return Math.min(state.transition.progress / state.transition.duration, 1)
}

export function getEffectiveWeather(state: WeatherState): WeatherType {
  if (!state.transition) return state.current
  const progress = getTransitionProgress(state)
  return progress >= 0.5 ? state.transition.to : state.transition.from
}
