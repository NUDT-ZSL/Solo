import { useState } from 'react'
import Plant from './Plant'
import Diary from './Diary'
import Chart from './Chart'
import type { Plant as PlantType, LogEntry, DailySnapshot, PlantType as PlantTypeEnum, WeatherType } from './types'
import './App.css'

export default function App() {
  const [plant, setPlant] = useState<PlantType | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [snapshots, setSnapshots] = useState<DailySnapshot[]>([])
  const [showInit, setShowInit] = useState(true)
  const [plantName, setPlantName] = useState('')
  const [plantType, setPlantType] = useState<PlantTypeEnum>('绿萝')
  const [showLogForm, setShowLogForm] = useState(false)
  const [water, setWater] = useState(150)
  const [light, setLight] = useState(6)
  const [weather, setWeather] = useState<WeatherType>('晴')
  const [description, setDescription] = useState('')
  const [exporting, setExporting] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleInit = async () => {
    if (!plantName.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/plant/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: plantName, type: plantType })
      })
      const data = await res.json()
      setPlant(data)
      setShowInit(false)
      setLogs([])
      setSnapshots([])
    } finally {
      setLoading(false)
    }
  }

  const handleAddLog = async () => {
    if (!plant) return
    setLoading(true)
    try {
      const res = await fetch('/api/plant/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plantId: plant.id,
          water,
          light,
          weather,
          description
        })
      })
      const data = await res.json()
      setPlant(data.plant)
      setLogs(prev => [data.log, ...prev])
      setSnapshots(prev => [...prev, {
        plantId: plant.id,
        date: data.log.date,
        stemHeight: data.log.stemHeight,
        leafCount: data.log.leafCount,
        water,
        light,
        stage: data.log.stage
      }])
      setShowLogForm(false)
      setDescription('')
      setWater(150)
      setLight(6)
      setWeather('晴')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    if (!plant) return
    setExporting(true)
    await new Promise(r => setTimeout(r, 1000))
    try {
      const res = await fetch(`/api/plant/${plant.id}/data`)
      const data = await res.json()
      const exportData = {
        plant,
        logs: data.logs,
        snapshots: data.snapshots,
        exportedAt: new Date().toISOString()
      }
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const dateStr = new Date().toISOString().slice(0, 10)
      a.href = url
      a.download = `${plant.name}_${dateStr}.json`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="app-container">
      <div className="plant-section">
        {showInit ? (
          <div className="init-panel">
            <div className="pot-empty">
              {!plant && <div className="seed" />}
            </div>
            <div className="init-form">
              <h2>开始种植</h2>
              <input
                type="text"
                placeholder="给你的植物起个名字..."
                value={plantName}
                onChange={e => setPlantName(e.target.value)}
                className="text-input"
              />
              <select
                value={plantType}
                onChange={e => setPlantType(e.target.value as PlantTypeEnum)}
                className="select-input"
              >
                <option value="绿萝">绿萝</option>
                <option value="多肉">多肉</option>
                <option value="龟背竹">龟背竹</option>
              </select>
              <button
                className="primary-btn"
                onClick={handleInit}
                disabled={loading || !plantName.trim()}
              >
                {loading ? '正在播种...' : '播种'}
              </button>
            </div>
          </div>
        ) : plant ? (
          <Plant plant={plant} />
        ) : null}
      </div>

      <div className="diary-section">
        {plant && (
          <>
            <div className="plant-card">
              <div className="plant-card-header">
                <h2>{plant.name}</h2>
                <span className="plant-type">{plant.type}</span>
              </div>
              <div className="plant-meta">
                <div className="meta-item">
                  <span>阶段</span>
                  <strong>{getStageLabel(plant.stage)}</strong>
                </div>
                <div className="meta-item">
                  <span>生长天数</span>
                  <strong>{plant.growthDays} 天</strong>
                </div>
              </div>
              <div className="progress-group">
                <div className="progress-item">
                  <label>总浇水量</label>
                  <div className="progress-bar">
                    <div
                      className="progress-fill water"
                      style={{ width: `${Math.min(100, plant.totalWater / 20)}%` }}
                    />
                  </div>
                  <span className="progress-value">{plant.totalWater} ml</span>
                </div>
                <div className="progress-item">
                  <label>总光照时长</label>
                  <div className="progress-bar">
                    <div
                      className="progress-fill light"
                      style={{ width: `${Math.min(100, plant.totalLight / 5)}%` }}
                    />
                  </div>
                  <span className="progress-value">{plant.totalLight} 小时</span>
                </div>
              </div>
              <div className="card-actions">
                <button
                  className="primary-btn"
                  onClick={() => setShowLogForm(!showLogForm)}
                  disabled={loading}
                >
                  {showLogForm ? '取消' : '添加日志'}
                </button>
                <button
                  className="secondary-btn"
                  onClick={handleExport}
                  disabled={exporting}
                >
                  {exporting ? (
                    <span className="spinner" />
                  ) : '导出JSON'}
                </button>
              </div>
            </div>

            {showLogForm && (
              <div className="log-form">
                <div className="form-row">
                  <label>浇水量: {water}ml</label>
                  <input
                    type="range"
                    min="50"
                    max="500"
                    value={water}
                    onChange={e => setWater(Number(e.target.value))}
                    className="slider"
                  />
                </div>
                <div className="form-row">
                  <label>光照时长: {light}小时</label>
                  <input
                    type="range"
                    min="1"
                    max="12"
                    value={light}
                    onChange={e => setLight(Number(e.target.value))}
                    className="slider"
                  />
                </div>
                <div className="form-row">
                  <label>天气状况</label>
                  <select
                    value={weather}
                    onChange={e => setWeather(e.target.value as WeatherType)}
                    className="select-input"
                  >
                    <option value="晴">晴 ☀️</option>
                    <option value="多云">多云 ⛅</option>
                    <option value="阴">阴 ☁️</option>
                    <option value="雨">雨 🌧️</option>
                  </select>
                </div>
                <div className="form-row">
                  <label>观察描述</label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value.slice(0, 500))}
                    placeholder="记录今天的观察..."
                    maxLength={500}
                    className="textarea-input"
                  />
                  <span className="char-count">{description.length}/500</span>
                </div>
                <button
                  className="primary-btn full-width"
                  onClick={handleAddLog}
                  disabled={loading}
                >
                  {loading ? '提交中...' : '提交日志'}
                </button>
              </div>
            )}

            {snapshots.length > 0 && <Chart snapshots={snapshots} />}

            <Diary logs={logs} />
          </>
        )}
      </div>
    </div>
  )
}

function getStageLabel(stage: string): string {
  switch (stage) {
    case 'seed': return '种子'
    case 'sprout': return '幼苗'
    case 'growing': return '成长'
    case 'mature': return '成熟'
    default: return stage
  }
}
