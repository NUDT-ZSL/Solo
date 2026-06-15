import React, { useEffect, useRef } from 'react'
import { CityWeather } from '../types'
import { WeatherIcon } from './WeatherIcon'
import { weatherTypeLabels } from '../data'

interface WeatherCardProps {
  city: CityWeather | null
  isNight: boolean
}

const CHART_WIDTH = 300
const CHART_HEIGHT = 150
const PADDING = { top: 20, right: 15, bottom: 30, left: 40 }

export const WeatherCard: React.FC<WeatherCardProps> = ({ city, isNight }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!city || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = CHART_WIDTH * dpr
    canvas.height = CHART_HEIGHT * dpr
    canvas.style.width = `${CHART_WIDTH}px`
    canvas.style.height = `${CHART_HEIGHT}px`
    ctx.scale(dpr, dpr)

    ctx.clearRect(0, 0, CHART_WIDTH, CHART_HEIGHT)

    const plotWidth = CHART_WIDTH - PADDING.left - PADDING.right
    const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom

    const allTemps = city.hourlyTemp
    const allHumidity = city.hourlyHumidity
    const tempMin = Math.min(...allTemps) - 2
    const tempMax = Math.max(...allTemps) + 2
    const humMin = 0
    const humMax = 100

    const gridColor = isNight ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
    const textColor = isNight ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)'

    ctx.strokeStyle = gridColor
    ctx.lineWidth = 1

    for (let i = 0; i <= 4; i++) {
      const y = PADDING.top + (plotHeight / 4) * i
      ctx.beginPath()
      ctx.moveTo(PADDING.left, y)
      ctx.lineTo(CHART_WIDTH - PADDING.right, y)
      ctx.stroke()
    }

    ctx.fillStyle = textColor
    ctx.font = '10px sans-serif'
    ctx.textAlign = 'center'
    for (let i = 0; i <= 6; i += 2) {
      const x = PADDING.left + (plotWidth / 6) * i
      ctx.fillText(`${i * 4}:00`, x, CHART_HEIGHT - PADDING.bottom + 14)
    }

    const tempScale = (val: number) =>
      PADDING.top + plotHeight - ((val - tempMin) / (tempMax - tempMin)) * plotHeight
    const humScale = (val: number) =>
      PADDING.top + plotHeight - ((val - humMin) / (humMax - humMin)) * plotHeight
    const xScale = (i: number) => PADDING.left + (plotWidth / 23) * i

    ctx.beginPath()
    ctx.strokeStyle = '#2196F3'
    ctx.lineWidth = 2
    for (let i = 0; i < 24; i++) {
      const x = xScale(i)
      const y = tempScale(allTemps[i])
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()

    ctx.beginPath()
    ctx.strokeStyle = '#FF9800'
    ctx.lineWidth = 2
    for (let i = 0; i < 24; i++) {
      const x = xScale(i)
      const y = humScale(allHumidity[i])
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }, [city, isNight])

  if (!city) {
    return (
      <div className="card weather-card">
        <p style={{ color: isNight ? 'white' : '#2C3E50' }}>请点击地图上的城市查看天气信息</p>
      </div>
    )
  }

  return (
    <div className="card weather-card">
      <div className="weather-header">
        <div className="weather-icon-wrapper">
          <WeatherIcon weatherType={city.weatherType} />
        </div>
        <div className="weather-info">
          <h2 className="city-name">{city.name}</h2>
          <div className="weather-type">{weatherTypeLabels[city.weatherType]}</div>
          <div className="temp-humidity">
            <div>温度: <span>{city.temperature}°C</span></div>
            <div>湿度: <span>{city.humidity}%</span></div>
          </div>
          <div className="temp-humidity">
            <div>风速: <span>{city.windSpeed} km/h</span></div>
          </div>
        </div>
      </div>

      <div className="chart-container">
        <div className="chart-title">过去24小时温湿度趋势</div>
        <canvas ref={canvasRef} className="chart-canvas" />
        <div style={{ marginTop: 10, display: 'flex', gap: 16, fontSize: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: isNight ? '#B0BEC5' : '#616161' }}>
            <div style={{ width: 16, height: 3, background: '#2196F3', borderRadius: 2 }} />
            温度 (°C)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: isNight ? '#B0BEC5' : '#616161' }}>
            <div style={{ width: 16, height: 3, background: '#FF9800', borderRadius: 2 }} />
            湿度 (%)
          </div>
        </div>
      </div>
    </div>
  )
}
