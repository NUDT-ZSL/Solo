import { create } from 'zustand';
import {
  City,
  WeatherData,
  WeatherPoint,
  fetchCities,
  fetchWeather,
  fetchWeatherBatch,
  lerpWeatherData,
} from '../services/dataService';

interface AppState {
  cities: City[];
  currentCity: City | null;
  currentTime: Date;
  startTime: Date;
  endTime: Date;
  isPlaying: boolean;
  playSpeed: number;
  weatherData: WeatherData | null;
  nextWeatherData: WeatherData | null;
  interpolatedPoints: WeatherPoint[];
  interpolationProgress: number;
  showTemperature: boolean;
  showWind: boolean;
  showPrecipitation: boolean;
  legendPanelCollapsed: boolean;
  lastApiFetchTime: number;
  lastFrameUpdateTime: number;

  setCurrentCity: (city: City) => void;
  setCurrentTime: (time: Date) => void;
  setIsPlaying: (playing: boolean) => void;
  setPlaySpeed: (speed: number) => void;
  toggleTemperature: () => void;
  toggleWind: () => void;
  togglePrecipitation: () => void;
  toggleLegendPanel: () => void;
  loadCities: () => Promise<void>;
  loadWeatherData: (cityId: string, time: Date) => Promise<void>;
  fetchNextWeatherBatch: (cityId: string, time: Date) => Promise<void>;
  updateInterpolation: (delta: number) => void;
  updateFrame: (delta: number) => void;
  advanceTime: (deltaSeconds: number) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  cities: [],
  currentCity: null,
  currentTime: new Date('2024-06-15T12:00:00'),
  startTime: new Date('2024-01-01T00:00:00'),
  endTime: new Date('2024-12-31T23:59:59'),
  isPlaying: false,
  playSpeed: 1,
  weatherData: null,
  nextWeatherData: null,
  interpolatedPoints: [],
  interpolationProgress: 1,
  showTemperature: true,
  showWind: true,
  showPrecipitation: true,
  legendPanelCollapsed: false,
  lastApiFetchTime: 0,
  lastFrameUpdateTime: 0,

  setCurrentCity: (city) => {
    set({
      currentCity: city,
      weatherData: null,
      nextWeatherData: null,
      interpolatedPoints: [],
      interpolationProgress: 1,
    });
    get().loadWeatherData(city.id, get().currentTime);
  },

  setCurrentTime: (time) => {
    set({
      currentTime: time,
      weatherData: null,
      nextWeatherData: null,
      interpolatedPoints: [],
      interpolationProgress: 1,
    });
    const { currentCity } = get();
    if (currentCity) {
      get().loadWeatherData(currentCity.id, time);
    }
  },

  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setPlaySpeed: (speed) => set({ playSpeed: speed }),

  toggleTemperature: () => set((state) => ({ showTemperature: !state.showTemperature })),
  toggleWind: () => set((state) => ({ showWind: !state.showWind })),
  togglePrecipitation: () => set((state) => ({ showPrecipitation: !state.showPrecipitation })),
  toggleLegendPanel: () => set((state) => ({ legendPanelCollapsed: !state.legendPanelCollapsed })),

  loadCities: async () => {
    const cities = await fetchCities();
    set({ cities, currentCity: cities[0] });
    if (cities[0]) {
      await get().loadWeatherData(cities[0].id, get().currentTime);
    }
  },

  loadWeatherData: async (cityId, time) => {
    try {
      const weatherData = await fetchWeather(cityId, time.toISOString());
      set({
        weatherData,
        interpolatedPoints: weatherData.points,
        interpolationProgress: 0,
        lastApiFetchTime: performance.now(),
      });

      const nextTime = new Date(time.getTime() + 3 * 60 * 60 * 1000);
      const nextWeatherData = await fetchWeather(cityId, nextTime.toISOString());
      set({ nextWeatherData });
    } catch (error) {
      console.error('Failed to load weather data:', error);
    }
  },

  fetchNextWeatherBatch: async (cityId, time) => {
    try {
      const dataList = await fetchWeatherBatch(cityId, time.toISOString(), 3, 3);
      if (dataList.length >= 2) {
        set({
          weatherData: dataList[0],
          nextWeatherData: dataList[1],
          interpolatedPoints: dataList[0].points,
          interpolationProgress: 0,
          lastApiFetchTime: performance.now(),
        });
      }
    } catch (error) {
      console.error('Failed to fetch weather batch:', error);
    }
  },

  updateInterpolation: (delta) => {
    const { weatherData, nextWeatherData, interpolationProgress } = get();
    if (!weatherData || !nextWeatherData) return;

    const transitionDuration = 0.5;
    let newProgress = interpolationProgress + delta / transitionDuration;

    if (newProgress >= 1) {
      set({
        weatherData: nextWeatherData,
        interpolationProgress: 0,
        nextWeatherData: null,
        interpolatedPoints: nextWeatherData.points,
      });
      return;
    }

    const interpolatedPoints = lerpWeatherData(weatherData, nextWeatherData, newProgress);
    set({
      interpolationProgress: newProgress,
      interpolatedPoints,
    });
  },

  updateFrame: (delta) => {
    const {
      isPlaying,
      currentCity,
      currentTime,
      weatherData,
      nextWeatherData,
      lastApiFetchTime,
      lastFrameUpdateTime,
    } = get();

    const now = performance.now();
    const frameInterval = 1000;

    if (now - lastFrameUpdateTime >= frameInterval) {
      if (!nextWeatherData && weatherData) {
        const nextTime = new Date(weatherData.time);
        nextTime.setHours(nextTime.getHours() + 3);
        fetchWeather(currentCity!.id, nextTime.toISOString())
          .then((data) => {
            set({ nextWeatherData: data });
          })
          .catch(console.error);
      }

      get().updateInterpolation(delta);
      set({ lastFrameUpdateTime: now });
    }

    const apiInterval = 3000;
    if (now - lastApiFetchTime >= apiInterval && currentCity && isPlaying) {
      const nextBatchTime = new Date(currentTime.getTime() + 3 * 60 * 60 * 1000);
      get().fetchNextWeatherBatch(currentCity.id, nextBatchTime);
    }
  },

  advanceTime: (deltaSeconds) => {
    const { currentTime, startTime, endTime, playSpeed, isPlaying } = get();
    if (!isPlaying) return;

    const speedMultiplier = playSpeed;
    const gameMsPerRealSecond = 60 * 60 * 1000;
    const deltaMs = deltaSeconds * gameMsPerRealSecond * speedMultiplier;

    let newTime = new Date(currentTime.getTime() + deltaMs);
    if (newTime > endTime) {
      newTime = new Date(startTime);
    }

    set({ currentTime: newTime });

    const { weatherData } = get();
    if (weatherData) {
      const dataTime = new Date(weatherData.time);
      const diff = Math.abs(newTime.getTime() - dataTime.getTime());
      if (diff > 1.5 * 60 * 60 * 1000) {
        const { currentCity } = get();
        if (currentCity) {
          get().loadWeatherData(currentCity.id, newTime);
        }
      }
    }
  },
}));
