import React, { useEffect, useRef, useCallback } from 'react'
import { CityWeather, Airflow } from '../types'

interface MapViewProps {
  cities: CityWeather[]
  selectedCityId: string | null
  onCityClick: (cityId: string) => void
  isNight: boolean
}

const MAP_WIDTH = 600
const MAP_HEIGHT = 400
const CITY_RADIUS = 6
const MAX_AIRFLOWS = 5

const CHINA_PATH: [number, number][] = [
  [120, 80], [180, 50], [250, 45], [320, 60], [380, 55], [440, 40],
  [500, 60], [540, 90], [560, 140], [570, 200], [550, 260], [520, 300],
  [480, 340], [430, 360], [380, 370], [330, 360], [280, 370], [230, 355],
  [180, 330], [140, 290], [110, 240], [90, 190], [85, 140], [100, 100], [120, 80]
]

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return [0, 0, 0]
  return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
}

function interpolateColor(color1: string, color2: string, factor: number): string {
  const [r1, g1, b1] = hexToRgb(color1)
  const [r2, g2, b2] = hexToRgb(color2)
  const r = Math.round(r1 + (r2 - r1) * factor)
  const g = Math.round(g1 + (g2 - g1) * factor)
  const b = Math.round(b1 + (b2 - b1) * factor)
  return `rgb(${r},${g},${b})`
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  color: string
) {
  const headLen = 8
  const angle = Math.atan2(toY - fromY, toX - fromX)

  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = 2

  ctx.beginPath()
  ctx.moveTo(fromX, fromY)
  ctx.lineTo(toX, toY)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(toX, toY)
  ctx.lineTo(toX - headLen * Math.cos(angle - Math.PI / 6), toY - headLen * Math.sin(angle - Math.PI / 6))
  ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI / 6), toY - headLen * Math.sin(angle + Math.PI / 6))
  ctx.closePath()
  ctx.fill()
}

export const MapView: React.FC<MapViewProps> = ({
  cities,
  selectedCityId,
  onCityClick,
  isNight,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const airflowsRef = useRef<Airflow[]>([])
  const animationRef = useRef<number>(0)
  const pulseTimeRef = useRef<number>(0)

  const initAirflows = useCallback(() => {
    const airflows: Airflow[] = []
    for (let i = 0; i < MAX_AIRFLOWS; i++) {
      const targetCity = cities[Math.floor(Math.random() * cities.length)]
      const x = Math.random() * (MAP_WIDTH - 100) + 50
      const y = Math.random() * (MAP_HEIGHT - 100) + 50
      const angle = Math.random() * Math.PI * 2
      const speed = targetCity ? targetCity.windSpeed / 10 + 0.5 : 1
      airflows.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        speed: targetCity ? targetCity.windSpeed : 10,
        targetCity: targetCity.id,
      })
    }
    airflowsRef.current = airflows
  }, [cities])

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const scaleX = MAP_WIDTH / rect.width
      const scaleY = MAP_HEIGHT / rect.height
      const x = (e.clientX - rect.left) * scaleX
      const y = (e.clientY - rect.top) * scaleY

      for (const city of cities) {
        const dist = Math.sqrt((x - city.x) ** 2 + (y - city.y) ** 2)
        if (dist <= CITY_RADIUS + 10) {
          onCityClick(city.id)
          return
        }
      }
    },
    [cities, onCityClick]
  )

  useEffect(() => {
    initAirflows()
  }, [initAirflows])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = MAP_WIDTH * dpr
    canvas.height = MAP_HEIGHT * dpr
    canvas.style.width = '100%'
    canvas.style.height = 'auto'
    ctx.scale(dpr, dpr)

    const bgColorDay = '#E8F5E9'
    const bgColorNight = '#0D47A1'
    const mapFillDay = '#C8E6C9'
    const mapFillNight = '#1565C0'
    const mapStrokeDay = '#81C784'
    const mapStrokeNight = '#42A5F5'
    const textColorDay = '#2E7D32'
    const textColorNight = '#BBDEFB'

    let lastTime = performance.now()

    const render = (currentTime: number) => {
      const deltaTime = Math.min((currentTime - lastTime) / 16.67, 3)
      lastTime = currentTime
      pulseTimeRef.current += deltaTime * 0.04

      ctx.clearRect(0, 0, MAP_WIDTH, MAP_HEIGHT)

      ctx.fillStyle = isNight ? bgColorNight : bgColorDay
      ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT)

      ctx.beginPath()
      CHINA_PATH.forEach(([px, py], i) => {
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      })
      ctx.closePath()
      ctx.fillStyle = isNight ? mapFillNight : mapFillDay
      ctx.fill()
      ctx.strokeStyle = isNight ? mapStrokeNight : mapStrokeDay
      ctx.lineWidth = 2
      ctx.stroke()

      const airflows = airflowsRef.current
      for (const airflow of airflows) {
        const targetCity = cities.find((c) => c.id === airflow.targetCity)
        if (!targetCity) continue

        const dx = targetCity.x - airflow.x
        const dy = targetCity.y - airflow.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist > 1) {
          const speedFactor = targetCity.windSpeed / 10 + 0.3
          airflow.vx += (dx / dist) * 0.05 * deltaTime
          airflow.vy += (dy / dist) * 0.05 * deltaTime
          const curSpeed = Math.sqrt(airflow.vx * airflow.vx + airflow.vy * airflow.vy)
          if (curSpeed > speedFactor) {
            airflow.vx = (airflow.vx / curSpeed) * speedFactor
            airflow.vy = (airflow.vy / curSpeed) * speedFactor
          }
        }

        airflow.x += airflow.vx * deltaTime
        airflow.y += airflow.vy * deltaTime

        if (airflow.x < 20 || airflow.x > MAP_WIDTH - 20) {
          airflow.vx *= -1
          airflow.x = Math.max(20, Math.min(MAP_WIDTH - 20, airflow.x))
        }
        if (airflow.y < 20 || airflow.y > MAP_HEIGHT - 20) {
          airflow.vy *= -1
          airflow.y = Math.max(20, Math.min(MAP_HEIGHT - 20, airflow.y))
        }

        const arrowLength = Math.max(15, targetCity.windSpeed * 2)
        const angle = Math.atan2(airflow.vy, airflow.vx)
        const endX = airflow.x + Math.cos(angle) * arrowLength
        const endY = airflow.y + Math.sin(angle) * arrowLength

        const colorFactor = Math.min(targetCity.windSpeed / 30, 1)
        const arrowColor = interpolateColor('#4FC3F7', '#E53935', colorFactor)

        drawArrow(ctx, airflow.x, airflow.y, endX, endY, arrowColor)
      }

      for (const city of cities) {
        const isSelected = city.id === selectedCityId

        if (isSelected) {
          const pulseProgress = (pulseTimeRef.current % 1.5) / 1.5
          const pulseRadius = CITY_RADIUS + pulseProgress * (10 - CITY_RADIUS)
          const alpha = 0.8 * (1 - pulseProgress)

          ctx.beginPath()
          ctx.arc(city.x, city.y, pulseRadius, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`
          ctx.lineWidth = 3
          ctx.stroke()

          ctx.beginPath()
          ctx.arc(city.x, city.y, pulseRadius * 0.7, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(255, 193, 7, ${alpha * 0.6})`
          ctx.lineWidth = 2
          ctx.stroke()
        }

        ctx.beginPath()
        ctx.arc(city.x, city.y, CITY_RADIUS, 0, Math.PI * 2)
        ctx.fillStyle = isSelected ? '#FFD700' : '#FF6B6B'
        ctx.fill()
        ctx.strokeStyle = isSelected ? '#FFA000' : '#E53935'
        ctx.lineWidth = 2
        ctx.stroke()

        ctx.fillStyle = isNight ? textColorNight : textColorDay
        ctx.font = 'bold 12px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(city.name, city.x, city.y + CITY_RADIUS + 16)
      }

      animationRef.current = requestAnimationFrame(render)
    }

    animationRef.current = requestAnimationFrame(render)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [cities, selectedCityId, isNight])

  return (
    <div className="card map-container">
      <h3 className="map-title">中国城市天气分布</h3>
      <canvas
        ref={canvasRef}
        className="map-canvas"
        onClick={handleClick}
        style={{ cursor: 'pointer' }}
      />
      <div className="legend">
        <div className="legend-title">图例</div>
        <div className="legend-item">
          <div className="legend-color" style={{ background: '#4FC3F7' }} />
          低风速 (0-10 km/h)
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ background: 'linear-gradient(to right, #4FC3F7, #E53935)' }} />
          中风速 (10-20 km/h)
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ background: '#E53935' }} />
          高风速 (20-30 km/h)
        </div>
        <div style={{ marginTop: 8 }}>
          <div className="legend-item">
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FF6B6B' }} />
            城市标记
          </div>
          <div className="legend-item">
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FFD700' }} />
            选中城市
          </div>
        </div>
      </div>
    </div>
  )
}
