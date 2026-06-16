import { useState, useEffect } from 'react';
import MapView from './MapView';
import SchedulePanel from './SchedulePanel';
import type { DayItinerary } from './types';

function App() {
  const [cities, setCities] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [days, setDays] = useState(3);
  const [itinerary, setItinerary] = useState<DayItinerary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/cities')
      .then(res => res.json())
      .then(data => {
        setCities(data);
        if (data.length > 0) {
          setSelectedCity(data[0]);
        }
      })
      .catch(err => console.error('加载城市列表失败:', err));
  }, []);

  const handleSearch = () => {
    if (!selectedCity) return;
    setLoading(true);
    fetch(`/api/itinerary?city=${encodeURIComponent(selectedCity)}&days=${days}`)
      .then(res => res.json())
      .then(data => {
        setItinerary(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('生成行程失败:', err);
        setLoading(false);
      });
  };

  const handleReorder = (dayIndex: number, itemIndex: number, direction: 'up' | 'down') => {
    setItinerary(prev => {
      const newItinerary = [...prev];
      const daySchedule = [...newItinerary[dayIndex].schedule];
      
      const targetIndex = direction === 'up' ? itemIndex - 1 : itemIndex + 1;
      if (targetIndex < 0 || targetIndex >= daySchedule.length) return prev;
      
      [daySchedule[itemIndex], daySchedule[targetIndex]] = [daySchedule[targetIndex], daySchedule[itemIndex]];
      
      newItinerary[dayIndex] = {
        ...newItinerary[dayIndex],
        schedule: daySchedule
      };
      
      return newItinerary;
    });
  };

  return (
    <div className="app-container">
      <div className="schedule-panel">
        <div className="search-header">
          <h1>🗺️ 智能行程规划</h1>
          <div className="search-input-group">
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
            >
              {cities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            >
              {Array.from({ length: 14 }, (_, i) => i + 1).map(d => (
                <option key={d} value={d}>{d} 天</option>
              ))}
            </select>
            <button
              className="search-button"
              onClick={handleSearch}
              disabled={loading}
            >
              {loading ? '生成中...' : '搜索行程'}
            </button>
          </div>
        </div>
        <SchedulePanel itinerary={itinerary} onReorder={handleReorder} />
      </div>
      <div className="map-panel">
        <MapView itinerary={itinerary} />
      </div>
    </div>
  );
}

export default App;
