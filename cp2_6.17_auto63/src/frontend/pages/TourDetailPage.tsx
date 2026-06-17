import { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import dayjs from 'dayjs'
import TourMap from '../components/TourMap'
import SongList from '../components/SongList'
import type { City, Song, Tour, TourReport } from '../../shared/types'

type PanelTab = 'songs' | 'cities' | 'report'

export default function TourDetailPage() {
  const { tourId } = useParams<{ tourId: string }>()
  const [tour, setTour] = useState<Tour | null>(null)
  const [cities, setCities] = useState<City[]>([])
  const [songs, setSongs] = useState<Song[]>([])
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<PanelTab>('songs')
  const [report, setReport] = useState<TourReport | null>(null)
  const [editingCity, setEditingCity] = useState<City | null>(null)
  const [showAddCity, setShowAddCity] = useState(false)
  const [wsConnected, setWsConnected] = useState(false)

  const [cityForm, setCityForm] = useState({
    name: '',
    date: dayjs().format('YYYY-MM-DD'),
    venue: '',
    latitude: 39.9042,
    longitude: 116.4074,
    notes: '',
    targetDuration: 90,
    audienceCount: 0,
  })

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:5000')
    ws.onopen = () => setWsConnected(true)
    ws.onclose = () => setWsConnected(false)
    ws.onmessage = (event) => {
      const { type, payload } = JSON.parse(event.data)
      if (type.startsWith('city:')) {
        loadCities()
      } else if (type.startsWith('song:')) {
        loadSongs()
      }
    }
    return () => ws.close()
  }, [tourId])

  const loadTour = useCallback(async () => {
    if (!tourId) return
    const res = await axios.get(`/api/tours/${tourId}`)
    setTour(res.data)
    setCities(res.data.cities || [])
    if (res.data.cities?.length > 0 && !selectedCityId) {
      const sorted = [...res.data.cities].sort((a: City, b: City) =>
        dayjs(a.date).valueOf() - dayjs(b.date).valueOf()
      )
      setSelectedCityId(sorted[0].id)
    }
  }, [tourId, selectedCityId])

  const loadCities = useCallback(async () => {
    if (!tourId) return
    const res = await axios.get(`/api/tours/${tourId}`)
    setCities(res.data.cities || [])
  }, [tourId])

  const loadSongs = useCallback(async () => {
    const res = await axios.get('/api/songs')
    setSongs(res.data)
  }, [])

  const loadReport = useCallback(async () => {
    if (!tourId) return
    const res = await axios.get(`/api/tours/${tourId}/report`)
    setReport(res.data)
  }, [tourId])

  useEffect(() => {
    loadTour()
    loadSongs()
  }, [loadTour, loadSongs])

  useEffect(() => {
    if (activeTab === 'report') {
      loadReport()
    }
  }, [activeTab, loadReport])

  const sortedCities = useMemo(() => {
    return [...cities].sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf())
  }, [cities])

  const selectedCity = useMemo(() => {
    return cities.find(c => c.id === selectedCityId) || null
  }, [cities, selectedCityId])

  const assignedSongs = useMemo(() => {
    if (!selectedCity) return []
    return selectedCity.songIds
      .map(id => songs.find(s => s.id === id))
      .filter((s): s is Song => !!s)
  }, [selectedCity, songs])

  const getTotalDuration = (city: City) => {
    return city.songIds.reduce((sum, sid) => {
      const song = songs.find(s => s.id === sid)
      return sum + (song?.duration || 0)
    }, 0)
  }

  const isDurationWarning = (city: City) => {
    const total = getTotalDuration(city)
    return Math.abs(total - city.targetDuration) > 2
  }

  const handleReorderSongs = async (newOrder: string[]) => {
    if (!tourId || !selectedCityId) return
    await axios.put(`/api/tours/${tourId}/cities/${selectedCityId}/songs`, {
      songIds: newOrder,
    })
    loadCities()
  }

  const handleRemoveSong = async (songId: string) => {
    if (!selectedCity || !tourId) return
    const newIds = selectedCity.songIds.filter(id => id !== songId)
    await axios.put(`/api/tours/${tourId}/cities/${selectedCity.id}/songs`, {
      songIds: newIds,
    })
    loadCities()
  }

  const handleAddSong = async (songId: string) => {
    if (!selectedCity || !tourId) return
    const newIds = [...selectedCity.songIds, songId]
    await axios.put(`/api/tours/${tourId}/cities/${selectedCity.id}/songs`, {
      songIds: newIds,
    })
    loadCities()
  }

  const handleEditCity = (city: City) => {
    setEditingCity(city)
    setCityForm({
      name: city.name,
      date: city.date,
      venue: city.venue,
      latitude: city.latitude,
      longitude: city.longitude,
      notes: city.notes,
      targetDuration: city.targetDuration,
      audienceCount: city.audienceCount || 0,
    })
  }

  const handleDeleteCity = async (cityId: string) => {
    if (!tourId) return
    if (!confirm('确定删除这个城市节点？')) return
    await axios.delete(`/api/tours/${tourId}/cities/${cityId}`)
    loadCities()
    if (selectedCityId === cityId) {
      setSelectedCityId(null)
    }
  }

  const handleSaveCity = async () => {
    if (!tourId) return
    if (!cityForm.name || !cityForm.date) {
      alert('请填写城市名和日期')
      return
    }
    if (editingCity) {
      await axios.put(`/api/tours/${tourId}/cities/${editingCity.id}`, cityForm)
    } else {
      await axios.post(`/api/tours/${tourId}/cities`, cityForm)
    }
    setEditingCity(null)
    setShowAddCity(false)
    loadCities()
    resetCityForm()
  }

  const resetCityForm = () => {
    setCityForm({
      name: '',
      date: dayjs().format('YYYY-MM-DD'),
      venue: '',
      latitude: 39.9042,
      longitude: 116.4074,
      notes: '',
      targetDuration: 90,
      audienceCount: 0,
    })
  }

  const closeModal = () => {
    setEditingCity(null)
    setShowAddCity(false)
    resetCityForm()
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div>
          <div className="app-title">🎸 {tour?.name || '音乐人巡演管理系统'}</div>
          <div style={{ fontSize: 12, color: '#a1a1aa', marginTop: 2 }}>
            {wsConnected ? '🟢 实时同步已连接' : '🔴 连接断开'} · {cities.length} 个城市
          </div>
        </div>
        <div className="header-actions">
          <button
            className="btn btn-secondary"
            onClick={() => { setShowAddCity(true); setEditingCity(null); resetCityForm() }}
          >
            ➕ 添加城市
          </button>
        </div>
      </header>

      <div className="main-content">
        <div className="map-section">
          <TourMap
            cities={cities}
            songs={songs}
            selectedCityId={selectedCityId}
            onSelectCity={setSelectedCityId}
            onEditCity={handleEditCity}
            onDeleteCity={handleDeleteCity}
          />
        </div>

        <div className="panel-section">
          <div className="panel-tabs">
            <button
              className={`panel-tab ${activeTab === 'songs' ? 'active' : ''}`}
              onClick={() => setActiveTab('songs')}
            >
              🎵 曲目
            </button>
            <button
              className={`panel-tab ${activeTab === 'cities' ? 'active' : ''}`}
              onClick={() => setActiveTab('cities')}
            >
              🗺️ 路线
            </button>
            <button
              className={`panel-tab ${activeTab === 'report' ? 'active' : ''}`}
              onClick={() => setActiveTab('report')}
            >
              📊 报告
            </button>
          </div>

          <div className="panel-content">
            {activeTab === 'songs' && (
              <div>
                {!selectedCity ? (
                  <div style={{ color: '#a1a1aa', textAlign: 'center', padding: 32 }}>
                    请先从地图或路线列表选择一个城市
                  </div>
                ) : (
                  <>
                    <div className="section-title">
                      <span>{selectedCity.name} - 曲目编排</span>
                    </div>
                    <SongList
                      songs={assignedSongs}
                      assignedSongIds={selectedCity.songIds}
                      targetDuration={selectedCity.targetDuration}
                      onReorder={handleReorderSongs}
                      onRemove={handleRemoveSong}
                      onAddFromLibrary={handleAddSong}
                      allSongs={songs}
                    />
                  </>
                )}
              </div>
            )}

            {activeTab === 'cities' && (
              <div>
                <div className="section-title">
                  <span>巡演城市列表</span>
                </div>
                {sortedCities.length === 0 ? (
                  <div style={{ color: '#a1a1aa', textAlign: 'center', padding: 32 }}>
                    还没有城市，点击右上角添加
                  </div>
                ) : (
                  sortedCities.map(city => (
                    <div
                      key={city.id}
                      className={`city-list-item ${selectedCityId === city.id ? 'active' : ''} ${isDurationWarning(city) ? 'warning' : ''}`}
                      onClick={() => setSelectedCityId(city.id)}
                    >
                      <div className="city-name">
                        📍 {city.name}
                        {isDurationWarning(city) && (
                          <span style={{ color: '#ef4444', marginLeft: 8, fontSize: 12 }}>
                            ⚠️ 时长异常
                          </span>
                        )}
                      </div>
                      <div className="city-info">
                        <span>📅 {dayjs(city.date).format('MM/DD')}</span>
                        <span>🏟️ {city.venue}</span>
                        <span>🎵 {city.songIds.length}首</span>
                        <span>⏱️ {getTotalDuration(city).toFixed(1)}分</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: 12, minHeight: 32 }}
                          onClick={(e) => { e.stopPropagation(); handleEditCity(city) }}
                        >
                          ✏️ 编辑
                        </button>
                        <button
                          className="btn btn-danger"
                          style={{ padding: '6px 12px', fontSize: 12, minHeight: 32 }}
                          onClick={(e) => { e.stopPropagation(); handleDeleteCity(city.id) }}
                        >
                          🗑️ 删除
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'report' && (
              <div>
                <div className="section-title">
                  <span>巡演报告</span>
                </div>
                {!report ? (
                  <div style={{ color: '#a1a1aa', textAlign: 'center', padding: 32 }}>
                    加载中...
                  </div>
                ) : (
                  <>
                    <div className="stat-card">
                      <div className="stat-label">🚗 总里程</div>
                      <div className="stat-value">{report.totalDistance.toLocaleString()} km</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-label">👥 累计观演人次</div>
                      <div className="stat-value">{report.totalAudience.toLocaleString()}</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-label">🏟️ 巡演城市数</div>
                      <div className="stat-value">{report.cityReports.length}</div>
                    </div>

                    <div className="section-title" style={{ fontSize: 15, marginTop: 20 }}>
                      <span>各城市数据</span>
                    </div>
                    {report.cityReports.map((cr, idx) => (
                      <div key={idx} className="report-item">
                        <div className="report-item-name">📍 {cr.cityName}</div>
                        <div className="report-item-stats">
                          👥 {cr.audienceCount.toLocaleString()} 人 · 🎵 {cr.songCount} 首歌
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {(editingCity || showAddCity) && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">
              {editingCity ? '✏️ 编辑城市' : '➕ 添加城市'}
            </div>

            <div className="form-group">
              <label className="form-label">城市名称 *</label>
              <input
                className="form-input"
                value={cityForm.name}
                onChange={(e) => setCityForm({ ...cityForm, name: e.target.value })}
                placeholder="如：北京"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">演出日期 *</label>
                <input
                  type="date"
                  className="form-input"
                  value={cityForm.date}
                  onChange={(e) => setCityForm({ ...cityForm, date: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">目标演出时长（分钟）</label>
                <input
                  type="number"
                  className="form-input"
                  value={cityForm.targetDuration}
                  onChange={(e) => setCityForm({ ...cityForm, targetDuration: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">场地名称</label>
              <input
                className="form-input"
                value={cityForm.venue}
                onChange={(e) => setCityForm({ ...cityForm, venue: e.target.value })}
                placeholder="如：北京工人体育馆"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">纬度</label>
                <input
                  type="number"
                  step="0.0001"
                  className="form-input"
                  value={cityForm.latitude}
                  onChange={(e) => setCityForm({ ...cityForm, latitude: Number(e.target.value) })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">经度</label>
                <input
                  type="number"
                  step="0.0001"
                  className="form-input"
                  value={cityForm.longitude}
                  onChange={(e) => setCityForm({ ...cityForm, longitude: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">预计观演人次</label>
              <input
                type="number"
                className="form-input"
                value={cityForm.audienceCount}
                onChange={(e) => setCityForm({ ...cityForm, audienceCount: Number(e.target.value) })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">备注</label>
              <textarea
                className="form-textarea"
                value={cityForm.notes}
                onChange={(e) => setCityForm({ ...cityForm, notes: e.target.value })}
                placeholder="演出注意事项、嘉宾安排等..."
              />
            </div>

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={closeModal}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleSaveCity}>
                {editingCity ? '保存修改' : '添加城市'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
