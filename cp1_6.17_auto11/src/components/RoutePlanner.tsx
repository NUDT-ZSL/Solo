import React, { useState, useEffect, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from 'react-leaflet';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import L from 'leaflet';
import type { Attraction, DayPlan, WeatherInfo } from '../types';
import {
  calculateDayDistance,
  isDistanceExceeded,
  getWeatherIcon,
  getDailyLuggageTip,
  type DailyLuggageTip,
} from '../business/tripEngine';
import { attractionApi, weatherApi } from '../services/api';

import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface RoutePlannerProps {
  days: DayPlan[];
  onDaysChange: (days: DayPlan[]) => void;
  selectedDay: number;
  onDaySelect: (day: number) => void;
}

function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 12, { duration: 0.5 });
  }, [center, map]);
  return null;
}

const RoutePlanner: React.FC<RoutePlannerProps> = ({
  days,
  onDaysChange,
  selectedDay,
  onDaySelect,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Attraction[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [weatherList, setWeatherList] = useState<WeatherInfo[]>([]);
  const [hoveredWeatherIdx, setHoveredWeatherIdx] = useState<number | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const currentDay = days[selectedDay] || days[0];
  const attractions = currentDay?.attractions || [];
  const distance = currentDay?.totalDistance || 0;
  const distanceExceeded = isDistanceExceeded(distance);

  const mapCenter: [number, number] =
    attractions.length > 0
      ? [attractions[0].coordinates.lat, attractions[0].coordinates.lng]
      : [39.9042, 116.4074];

  const polylinePositions = attractions.map((a) => [
    a.coordinates.lat,
    a.coordinates.lng,
  ]) as [number, number][];

  useEffect(() => {
    const fetchAttractions = async () => {
      if (searchQuery.trim()) {
        try {
          const data = await attractionApi.search(searchQuery);
          setSearchResults(data.attractions);
        } catch (err) {
          console.error('Search failed:', err);
        }
      } else {
        setSearchResults([]);
      }
    };
    const timer = setTimeout(fetchAttractions, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const fetchWeather = async () => {
      if (attractions.length > 0) {
        try {
          const city = attractions[0].city;
          const data = await weatherApi.getByCity(city);
          setWeatherList(data.weather);
        } catch (err) {
          console.error('Weather fetch failed:', err);
        }
      }
    };
    fetchWeather();
  }, [attractions.length > 0 ? attractions[0].city : '']);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddAttraction = (attraction: Attraction) => {
    const newDays = [...days];
    if (!newDays[selectedDay]) {
      newDays[selectedDay] = {
        day: selectedDay + 1,
        date: '',
        attractions: [],
        totalDistance: 0,
      };
    }
    newDays[selectedDay] = {
      ...newDays[selectedDay],
      attractions: [...newDays[selectedDay].attractions, attraction],
    };
    newDays[selectedDay].totalDistance = calculateDayDistance(
      newDays[selectedDay].attractions
    );
    onDaysChange(newDays);
    setSearchQuery('');
    setShowSearch(false);
  };

  const handleRemoveAttraction = (index: number) => {
    const newDays = [...days];
    newDays[selectedDay].attractions.splice(index, 1);
    newDays[selectedDay].totalDistance = calculateDayDistance(
      newDays[selectedDay].attractions
    );
    onDaysChange(newDays);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const newDays = [...days];
    const items = Array.from(newDays[selectedDay].attractions);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    newDays[selectedDay].attractions = items;
    newDays[selectedDay].totalDistance = calculateDayDistance(items);
    onDaysChange(newDays);
  };

  const progressPercentage = Math.min((distance / 30) * 100, 100);

  return (
    <div className="route-planner">
      <div className="planner-header">
        <h3 className="planner-title">🗺️ 路线规划</h3>
        <div className="day-tabs">
          {days.map((day, idx) => (
            <button
              key={idx}
              className={`day-tab ${selectedDay === idx ? 'active' : ''}`}
              onClick={() => onDaySelect(idx)}
            >
              Day {idx + 1}
            </button>
          ))}
          <button
            className="day-tab add-day"
            onClick={() => {
              const newDay: DayPlan = {
                day: days.length + 1,
                date: '',
                attractions: [],
                totalDistance: 0,
              };
              onDaysChange([...days, newDay]);
            }}
          >
            +
          </button>
        </div>
      </div>

      <div className="map-container">
        <MapContainer
          center={mapCenter}
          zoom={12}
          style={{ height: '100%', width: '100%', borderRadius: '10px' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {attractions.map((attraction, idx) => (
            <Marker
              key={attraction.id}
              position={[attraction.coordinates.lat, attraction.coordinates.lng]}
            >
              <Popup>
                <div className="marker-popup">
                  <strong>{attraction.name}</strong>
                  <p>{attraction.city}</p>
                  <span className="marker-order">{idx + 1}</span>
                </div>
              </Popup>
            </Marker>
          ))}
          {polylinePositions.length > 1 && (
            <Polyline
              positions={polylinePositions}
              color="#388E3C"
              weight={3}
              opacity={0.7}
              dashArray="10, 10"
            />
          )}
          <MapController center={mapCenter} />
        </MapContainer>
      </div>

      <div className="distance-indicator">
        <span className="distance-label">今日行程距离</span>
        <div className="progress-bar">
          <div
            className={`progress-fill ${distanceExceeded ? 'warning' : ''}`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <span className={`distance-value ${distanceExceeded ? 'warning' : ''}`}>
          {distance.toFixed(1)} km
          {distanceExceeded && ' ⚠️'}
        </span>
      </div>

      <div className="attraction-search" ref={searchRef}>
        <div className="search-input-wrapper">
          <input
            type="text"
            placeholder="搜索景点或城市..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearch(true);
            }}
            onFocus={() => setShowSearch(true)}
            className="search-input"
          />
          <span className="search-icon">🔍</span>
        </div>
        {showSearch && searchResults.length > 0 && (
          <div className="search-results">
            {searchResults.map((attraction) => (
              <div
                key={attraction.id}
                className="search-result-item"
                onClick={() => handleAddAttraction(attraction)}
              >
                <img src={attraction.thumbnail} alt={attraction.name} />
                <div className="result-info">
                  <span className="result-name">{attraction.name}</span>
                  <span className="result-city">{attraction.city} · {attraction.category}</span>
                </div>
                <span className="add-btn">+ 添加</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="attractions-list">
        <h4>当日景点 (拖拽排序)</h4>
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="attractions">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="droppable-list"
              >
                {attractions.length === 0 ? (
                  <div className="empty-state">
                    <p>暂无景点，请搜索并添加</p>
                  </div>
                ) : (
                  attractions.map((attraction, index) => (
                    <Draggable
                      key={attraction.id}
                      draggableId={attraction.id}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`draggable-item ${
                            snapshot.isDragging ? 'dragging' : ''
                          }`}
                        >
                          <span className="item-order">{index + 1}</span>
                          <img src={attraction.thumbnail} alt={attraction.name} />
                          <div className="item-info">
                            <span className="item-name">{attraction.name}</span>
                            <span className="item-city">{attraction.city}</span>
                          </div>
                          <button
                            className="remove-btn"
                            onClick={() => handleRemoveAttraction(index)}
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </Draggable>
                  ))
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      <div className="weather-section">
        <h4>🌤️ 天气预报与行李建议</h4>
        <div className="weather-list">
          {weatherList.length > 0 ? (
            weatherList.map((weather, idx) => {
              const tip = getDailyLuggageTip(weather);
              const isHovered = hoveredWeatherIdx === idx;
              return (
                <div
                  key={idx}
                  className="weather-card"
                  onMouseEnter={() => setHoveredWeatherIdx(idx)}
                  onMouseLeave={() => setHoveredWeatherIdx(null)}
                >
                  <div className="weather-card-header">
                    <span className="weather-date">{weather.date.slice(5)}</span>
                  </div>
                  <div className="weather-card-main">
                    <span className="weather-icon">{getWeatherIcon(weather.condition)}</span>
                    <span className="weather-temp">
                      {weather.tempHigh}° / {weather.tempLow}°
                    </span>
                  </div>
                  {tip && (
                    <div className="luggage-tip-wrapper">
                      <span className="luggage-tip-tag">
                        {tip.shortTip}
                      </span>
                      {isHovered && tip && (
                        <div className="luggage-tip-tooltip">
                          <div className="tooltip-title">{tip.detailTitle}</div>
                          <ul className="tooltip-items">
                            {tip.items.map((item, i) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <span className="weather-empty">添加景点后显示天气预报与行李建议</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoutePlanner;
