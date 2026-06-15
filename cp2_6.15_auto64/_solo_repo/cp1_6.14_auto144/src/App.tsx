import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import ChartPanel from './components/ChartPanel';
import type { WeatherData } from './types';
import './index.css';

const App: React.FC = () => {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);

  const handleDataLoaded = (data: WeatherData) => {
    setWeatherData(data);
  };

  useEffect(() => {
    document.title = 'WindVane - 天气仪表盘';
  }, []);

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo">
          <span className="logo-icon">🌤️</span>
          <h1 className="app-title">WindVane</h1>
        </div>
        <p className="app-subtitle">实时天气 · 7天预报 · 空气质量</p>
      </header>
      <main className="main-content">
        <div className="left-panel">
          <Dashboard onDataLoaded={handleDataLoaded} />
        </div>
        <div className="right-panel">
          <ChartPanel weatherData={weatherData} />
        </div>
      </main>
      <footer className="app-footer">
        <p>数据来源: OpenWeatherMap API</p>
      </footer>
    </div>
  );
};

export default App;
