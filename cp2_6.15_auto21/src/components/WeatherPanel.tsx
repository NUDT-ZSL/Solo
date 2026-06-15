import { useState, useEffect } from 'react';
import type { WeatherData, DailyWeather } from '../types';
import { getWeather, CITIES } from '../services/weatherService';

interface WeatherPanelProps {
  onWeatherChange: (weather: DailyWeather) => void;
}

export default function WeatherPanel({ onWeatherChange }: WeatherPanelProps) {
  const [city, setCity] = useState<string>(CITIES[0]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setLoading(true);
    getWeather(city).then(data => {
      setWeather(data);
      setLoading(false);
      onWeatherChange(data.current);
    });
  }, [city, onWeatherChange]);

  const formatDateShort = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  if (loading) {
    return (
      <div>
        <div className="city-selector">
          {CITIES.map(c => (
            <div key={c} className={`city-chip ${c === city ? 'active' : ''}`}>{c}</div>
          ))}
        </div>
        <div className="weather-card" style={{ background: '#ccc' }}>
          <div>加载中...</div>
        </div>
      </div>
    );
  }

  const current = weather!.current;
  const cardClass = `weather-card ${current.type} ${expanded ? 'expanded' : ''}`;

  return (
    <div>
      <div className="city-selector">
        {CITIES.map(c => (
          <button
            key={c}
            className={`city-chip ${c === city ? 'active' : ''}`}
            onClick={() => setCity(c)}
          >
            {c}
          </button>
        ))}
      </div>

      <div
        className={cardClass}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="weather-card-top">
          <div className="weather-city">{weather!.city}</div>
          <div className="weather-temp">{current.temp.toFixed(1)}°C</div>
        </div>
        <div className="weather-card-bottom">
          <span className="weather-icon-lg">{current.icon}</span>
          <span>💨 {current.windSpeed} km/h</span>
          <span>💧 {current.humidity}%</span>
        </div>

        {expanded && (
          <div className="weather-forecast-grid">
            {weather!.forecast.map(day => (
              <div key={day.date} className="forecast-item">
                <div className="forecast-date">{formatDateShort(day.date)}</div>
                <div className="forecast-icon">{day.icon}</div>
                <div>{day.temp.toFixed(0)}°</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
