import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { WeatherData, ForecastDay } from '../types';
import { weatherService } from '../services/WeatherService';
import { eventBus, EVENTS } from '../engine/EventBus';

interface DashboardProps {
  onDataLoaded: (data: WeatherData) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onDataLoaded }) => {
  const [searchValue, setSearchValue] = useState('');
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedForecastIndex, setSelectedForecastIndex] = useState(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchWeather = useCallback(async (city: string) => {
    if (!city.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const data = await weatherService.getWeatherData(city.trim());
      setWeatherData(data);
      setSelectedForecastIndex(0);
      onDataLoaded(data);
      eventBus.emit(EVENTS.WEATHER_DATA_UPDATED, data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取天气数据失败');
    } finally {
      setLoading(false);
    }
  }, [onDataLoaded]);

  const debouncedFetch = useCallback(
    (city: string) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        fetchWeather(city);
      }, 500);
    },
    [fetchWeather]
  );

  const handleSearch = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    fetchWeather(searchValue);
  }, [fetchWeather, searchValue]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleSearch();
      }
    },
    [handleSearch]
  );

  const handleForecastClick = useCallback((index: number) => {
    setSelectedForecastIndex(index);
    eventBus.emit(EVENTS.FORECAST_SELECTED, index);
  }, []);

  useEffect(() => {
    fetchWeather('北京');
  }, [fetchWeather]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const renderCircularProgress = (aqi: number, color: string) => {
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const progress = Math.min(aqi / 200, 1);
    const offset = circumference - progress * circumference;

    return (
      <div className="aqi-circle">
        <svg width="80" height="80" viewBox="0 0 80 80">
          <defs>
            <linearGradient id="aqiGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="50%" stopColor="#facc15" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="6"
          />
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 40 40)"
            style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
          />
        </svg>
        <div className="aqi-value">{aqi}</div>
      </div>
    );
  };

  return (
    <div className="dashboard">
      <div className="search-section">
        <div className="search-bar-wrapper">
          <input
            ref={inputRef}
            type="text"
            className="search-input"
            placeholder="搜索城市（中文或英文）"
            value={searchValue}
            onChange={(e) => {
              setSearchValue(e.target.value);
              debouncedFetch(e.target.value);
            }}
            onKeyDown={handleKeyDown}
          />
          <button className="search-button" onClick={handleSearch}>
            🔍
          </button>
        </div>
        {loading && (
          <div className="loading-spinner"></div>
        )}
        {error && (
          <div className="error-message">{error}</div>
        )}
      </div>

      {weatherData && (
        <>
          <div className="current-weather-card">
            <div className="weather-header">
              <h2 className="city-name">{weatherData.current.city}</h2>
              <div className="weather-icon-large">{weatherData.current.icon}</div>
            </div>
            <div className="temperature-section">
              <span className="temperature-value">
                {weatherData.current.temperature}
              </span>
              <span className="temperature-unit">°C</span>
            </div>
            <div className="weather-desc">{weatherData.current.description}</div>
            <div className="weather-details">
              <div className="detail-item">
                <span className="detail-label">湿度</span>
                <span className="detail-value">{weatherData.current.humidity}%</span>
              </div>
              <div className="detail-divider"></div>
              <div className="detail-item">
                <span className="detail-label">风速</span>
                <span className="detail-value">{weatherData.current.windSpeed} km/h</span>
              </div>
            </div>
          </div>

          <div className="forecast-section">
            <h3 className="section-title">未来7天预报</h3>
            <div className="forecast-scroll">
              {weatherData.forecast.map((day: ForecastDay, index: number) => (
                <div
                  key={index}
                  className={`forecast-item ${selectedForecastIndex === index ? 'selected' : ''}`}
                  onClick={() => handleForecastClick(index)}
                >
                  <div className="forecast-day">{day.dayOfWeek}</div>
                  <div className="forecast-icon">{day.icon}</div>
                  <div className="forecast-temp">
                    <span className="temp-max">{day.tempMax}°</span>
                    <span className="temp-min">{day.tempMin}°</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="air-quality-section">
            <h3 className="section-title">空气质量</h3>
            <div className="air-quality-card">
              {renderCircularProgress(weatherData.airQuality.aqi, weatherData.airQuality.levelColor)}
              <div className="aqi-info">
                <div
                  className="aqi-level"
                  style={{ color: weatherData.airQuality.levelColor }}
                >
                  {weatherData.airQuality.level}
                </div>
                <div className="aqi-pm">
                  PM2.5: {weatherData.airQuality.pm25} μg/m³
                </div>
                <div className="aqi-pm">
                  PM10: {weatherData.airQuality.pm10} μg/m³
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
