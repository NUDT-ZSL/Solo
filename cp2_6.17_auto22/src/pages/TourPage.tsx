import { useState, useMemo } from 'react';
import TourMap from '../components/TourMap';
import { useCitySearch, useArtists } from '../hooks/useData';
import { api } from '../api/api';
import type { TourCity } from '../types';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import { optimizeRoute } from '../utils/routeOptimizer';

export default function TourPage() {
  const { cities: dbCities, search: searchCity } = useCitySearch();
  const { artists, loading: artistsLoading } = useArtists();
  const [selectedArtist, setSelectedArtist] = useState<string>('');
  const [localCities, setLocalCities] = useState<TourCity[]>([]);
  const [citySearch, setCitySearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [newCityDate, setNewCityDate] = useState(dayjs().add(7, 'day').format('YYYY-MM-DD'));

  const filteredCities = useMemo(() => {
    if (!citySearch.trim()) return dbCities;
    return dbCities.filter(c => c.name.includes(citySearch));
  }, [citySearch, dbCities]);

  const handleMapClick = async (lat: number, lng: number) => {
    const name = prompt('请输入城市名称:');
    if (!name?.trim()) return;
    const newCity: TourCity = {
      id: uuidv4(),
      artistId: selectedArtist,
      name: name.trim(),
      lat,
      lng,
      popularity: Math.floor(Math.random() * 60) + 30,
      date: newCityDate
    };
    setLocalCities(prev => [...prev, newCity]);
    if (selectedArtist) {
      try { await api.addTourCity(selectedArtist, { ...newCity }); } catch { /* ignore */ }
    }
  };

  const handleSelectCity = (city: { name: string; lat: number; lng: number }) => {
    const newCity: TourCity = {
      id: uuidv4(),
      artistId: selectedArtist,
      name: city.name,
      lat: city.lat,
      lng: city.lng,
      popularity: Math.floor(Math.random() * 60) + 30,
      date: newCityDate
    };
    setLocalCities(prev => [...prev, newCity]);
    setCitySearch('');
    setShowDropdown(false);
    if (selectedArtist) {
      try { api.addTourCity(selectedArtist, { ...newCity }); } catch { /* ignore */ }
    }
  };

  const handleRemoveCity = (id: string) => {
    setLocalCities(prev => prev.filter(c => c.id !== id));
    api.deleteTourCity(id).catch(() => {});
  };

  const handleArtistChange = async (artistId: string) => {
    setSelectedArtist(artistId);
    if (artistId) {
      try {
        const data = await api.getTourCities(artistId);
        setLocalCities(data);
      } catch { setLocalCities([]); }
    } else {
      setLocalCities([]);
    }
  };

  const optimized = optimizeRoute(localCities);
  const totalDistance = optimized.reduce((sum, c, i) => {
    if (i === 0) return 0;
    const prev = optimized[i - 1];
    const dx = (c.lng - prev.lng) * 111;
    const dy = (c.lat - prev.lat) * 111;
    return sum + Math.sqrt(dx * dx + dy * dy);
  }, 0);

  return (
    <div className="container">
      <h1 className="page-title">🗺️ 巡演路线规划</h1>
      <p className="page-subtitle">点击地图或搜索添加巡演城市，自动生成最优路线</p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">选择音乐人</label>
          <select
            className="form-input"
            value={selectedArtist}
            onChange={e => handleArtistChange(e.target.value)}
            disabled={artistsLoading}
          >
            <option value="">选择音乐人（可选）</option>
            {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>

        <div className="form-group" style={{ margin: 0, position: 'relative' }}>
          <label className="form-label">搜索城市</label>
          <input
            className="form-input"
            placeholder="搜索城市名称..."
            value={citySearch}
            onChange={e => {
              setCitySearch(e.target.value);
              searchCity(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          />
          {showDropdown && (
            <div className="search-dropdown" style={{ top: 'calc(100% + 4px)' }}>
              {filteredCities.slice(0, 8).map(c => (
                <div
                  key={c.name}
                  className="search-item"
                  onMouseDown={() => handleSelectCity(c)}
                >
                  <span>📍 {c.name}</span>
                </div>
              ))}
              {filteredCities.length === 0 && (
                <div className="search-item"><span>未找到城市</span></div>
              )}
            </div>
          )}
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">演出日期</label>
          <input
            type="date"
            className="form-input"
            value={newCityDate}
            onChange={e => setNewCityDate(e.target.value)}
          />
        </div>
      </div>

      <TourMap
        cities={localCities}
        onMapClick={handleMapClick}
        onRemoveCity={handleRemoveCity}
        height="550px"
      />

      <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
        <div style={{
          background: 'var(--bg-secondary)',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid var(--border-color)'
        }}>
          <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>📊 路线概览</h3>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            城市数量：<strong style={{ color: 'var(--text-primary)' }}>{localCities.length}</strong>
          </div>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            估算总距离：<strong style={{ color: 'var(--text-primary)' }}>{totalDistance.toFixed(0)} km</strong>
          </div>
        </div>

        <div style={{
          background: 'var(--bg-secondary)',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          gridColumn: 'span 2'
        }}>
          <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>📍 路线顺序</h3>
          {optimized.length === 0 ? (
            <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              点击地图或搜索城市添加巡演站点
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {optimized.map((c, i) => (
                <div key={c.id} style={{
                  padding: '6px 12px',
                  background: 'rgba(139, 92, 246, 0.15)',
                  borderRadius: '8px',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  fontSize: '13px'
                }}>
                  {i + 1}. {c.name} <span style={{ color: 'var(--text-secondary)' }}>({dayjs(c.date).format('MM/DD')})</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
