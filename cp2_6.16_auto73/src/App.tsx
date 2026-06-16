import { useState, useCallback } from 'react';
import MapView from '@/components/MapView';
import DetailPanel from '@/components/DetailPanel';
import SearchBar from '@/components/SearchBar';
import { Region, Dish } from '@/data/cuisineData';
import './App.css';

export default function App() {
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [highlightRegionId, setHighlightRegionId] = useState<string | undefined>(undefined);

  const handleRegionClick = useCallback((region: Region) => {
    setSelectedRegion(region);
    setSelectedDish(null);
    setHighlightRegionId(region.id);
  }, []);

  const handleDishClick = useCallback((dish: Dish) => {
    setSelectedDish(dish);
  }, []);

  const handleSearchSelect = useCallback((region: Region) => {
    setSelectedRegion(region);
    setSelectedDish(null);
    setHighlightRegionId(region.id);

    setTimeout(() => {
      setHighlightRegionId(undefined);
    }, 2000);
  }, []);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">🌍 全球美食地图</h1>
        <p className="app-subtitle">探索世界各地的美食文化与创意搭配</p>
      </header>

      <div className="app-main">
        <div className="map-section">
          <div className="map-header">
            <SearchBar onSelectRegion={handleSearchSelect} />
          </div>
          <div className="map-wrapper">
            <MapView
              onRegionClick={handleRegionClick}
              selectedRegionId={selectedRegion?.id}
              highlightRegionId={highlightRegionId}
            />
          </div>
          <div className="map-legend">
            <span className="legend-title">美食文化区域</span>
            <div className="legend-items">
              <span className="legend-item">
                <span className="legend-dot" style={{ backgroundColor: '#e63946' }}></span>
                意大利
              </span>
              <span className="legend-item">
                <span className="legend-dot" style={{ backgroundColor: '#2a9d8f' }}></span>
                墨西哥
              </span>
              <span className="legend-item">
                <span className="legend-dot" style={{ backgroundColor: '#f4a261' }}></span>
                日本
              </span>
              <span className="legend-item">
                <span className="legend-dot" style={{ backgroundColor: '#ff9f1c' }}></span>
                印度
              </span>
              <span className="legend-item">
                <span className="legend-dot" style={{ backgroundColor: '#3a86ff' }}></span>
                法国
              </span>
              <span className="legend-item">
                <span className="legend-dot" style={{ backgroundColor: '#e63946' }}></span>
                泰国
              </span>
              <span className="legend-item">
                <span className="legend-dot" style={{ backgroundColor: '#9b5de5' }}></span>
                摩洛哥
              </span>
              <span className="legend-item">
                <span className="legend-dot" style={{ backgroundColor: '#06d6a0' }}></span>
                巴西
              </span>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <DetailPanel
            selectedRegion={selectedRegion}
            selectedDish={selectedDish}
            onDishClick={handleDishClick}
          />
        </div>
      </div>
    </div>
  );
}
