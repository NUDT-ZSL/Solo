import { useRef, useEffect, useMemo, useCallback, useState } from 'react'
import { Sun, CloudRain, Snowflake, CloudLightning, Droplets, Wind, Thermometer, Cloud } from 'lucide-react'
import useWeatherStore from '@/store/weatherStore'
import type { HourlyData } from '@/store/weatherStore'

const WEATHER_ICONS: Record<string, React.ReactNode> = {
  sunny: <Sun size={32} color="#FFD700" />,
  rainy: <CloudRain size={32} color="#4A90D9" />,
  snowy: <Snowflake size={32} color="#B0C4DE" />,
  thunder: <CloudLightning size={32} color="#FF4500" />,
}

const WEATHER_LABELS: Record<string, string> = {
  sunny: '晴天',
  rainy: '雨天',
  snowy: '雪天',
  thunder: '雷暴',
}

function Chart({ data }: { data: HourlyData[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hovered, setHovered] = useState<{ x: number; y: number; hour: number; temp: number; humidity: number } | null>(null)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || data.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const w = rect.width
    const h = rect.height
    const padL = 36
    const padR = 12
    const padT = 12
    const padB = 24
    const chartW = w - padL - padR
    const chartH = h - padT - padB

    ctx.fillStyle = '#333350'
    ctx.fillRect(0, 0, w, h)

    ctx.strokeStyle = '#555580'
    ctx.lineWidth = 0.5
    for (let i = 0; i <= 4; i++) {
      const y = padT + (chartH / 4) * i
      ctx.beginPath()
      ctx.moveTo(padL, y)
      ctx.lineTo(w - padR, y)
      ctx.stroke()
    }

    const tempMin = Math.min(...data.map((d) => d.temperature)) - 5
    const tempMax = Math.max(...data.map((d) => d.temperature)) + 5
    const humMin = 20
    const humMax = 100

    const toX = (i: number) => padL + (i / (data.length - 1)) * chartW
    const toYTemp = (v: number) => padT + chartH - ((v - tempMin) / (tempMax - tempMin)) * chartH
    const toYHum = (v: number) => padT + chartH - ((v - humMin) / (humMax - humMin)) * chartH

    ctx.fillStyle = '#555580'
    ctx.font = '9px Source Sans 3, sans-serif'
    ctx.textAlign = 'right'
    for (let i = 0; i <= 4; i++) {
      const val = tempMin + ((tempMax - tempMin) / 4) * (4 - i)
      ctx.fillText(val.toFixed(0) + '°', padL - 4, padT + (chartH / 4) * i + 3)
    }

    ctx.textAlign = 'center'
    for (let i = 0; i < data.length; i += 4) {
      ctx.fillText(data[i].hour + 'h', toX(i), h - 4)
    }

    ctx.beginPath()
    ctx.strokeStyle = '#FF6B6B'
    ctx.lineWidth = 2
    data.forEach((d, i) => {
      const x = toX(i)
      const y = toYTemp(d.temperature)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()

    data.forEach((d, i) => {
      ctx.beginPath()
      ctx.arc(toX(i), toYTemp(d.temperature), 3, 0, Math.PI * 2)
      ctx.fillStyle = '#FF6B6B'
      ctx.fill()
    })

    ctx.beginPath()
    ctx.strokeStyle = '#4A90D9'
    ctx.lineWidth = 2
    data.forEach((d, i) => {
      const x = toX(i)
      const y = toYHum(d.humidity)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()

    data.forEach((d, i) => {
      ctx.beginPath()
      ctx.arc(toX(i), toYHum(d.humidity), 3, 0, Math.PI * 2)
      ctx.fillStyle = '#4A90D9'
      ctx.fill()
    })
  }, [data])

  useEffect(() => {
    draw()
    const handleResize = () => draw()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [draw])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas || data.length === 0) return
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const padL = 36
      const padR = 12
      const chartW = rect.width - padL - padR
      const idx = Math.round(((x - padL) / chartW) * (data.length - 1))
      if (idx >= 0 && idx < data.length) {
        const d = data[idx]
        setHovered({ x: e.clientX, y: e.clientY, hour: d.hour, temp: d.temperature, humidity: d.humidity })
      }
    },
    [data],
  )

  return (
    <div style={{ position: 'relative' }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '160px', borderRadius: '6px' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHovered(null)}
      />
      <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '11px', color: '#999' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '10px', height: '3px', background: '#FF6B6B', borderRadius: '2px', display: 'inline-block' }} />
          温度
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '10px', height: '3px', background: '#4A90D9', borderRadius: '2px', display: 'inline-block' }} />
          湿度
        </span>
      </div>
      {hovered && (
        <div
          style={{
            position: 'fixed',
            left: hovered.x + 12,
            top: hovered.y - 30,
            background: '#1a1a2e',
            border: '1px solid #555580',
            borderRadius: '6px',
            padding: '6px 10px',
            fontSize: '11px',
            color: '#E0E0E0',
            pointerEvents: 'none',
            zIndex: 100,
          }}
        >
          <div style={{ color: '#999' }}>{hovered.hour}:00</div>
          <div style={{ color: '#FF6B6B' }}>温度: {hovered.temp.toFixed(1)}°C</div>
          <div style={{ color: '#4A90D9' }}>湿度: {hovered.humidity.toFixed(1)}%</div>
        </div>
      )}
    </div>
  )
}

export default function WeatherPanel() {
  const panelOpen = useWeatherStore((s) => s.panelOpen)
  const togglePanel = useWeatherStore((s) => s.togglePanel)
  const weatherState = useWeatherStore((s) => s.weatherState)
  const metrics = useWeatherStore((s) => s.weatherMetrics)
  const historyData = useWeatherStore((s) => s.historyData)
  const isMobile = useWeatherStore((s) => s.isMobile)

  const currentWeather = weatherState.current
  const gameTime = weatherState.gameTime

  const chartData = useMemo(() => {
    if (historyData.length > 0) return historyData
    const mock: HourlyData[] = []
    for (let i = 0; i < 24; i++) {
      const phase = ((i - 14) * Math.PI) / 12
      mock.push({
        hour: i,
        temperature: Math.round((20 + 15 * Math.cos(phase)) * 10) / 10,
        humidity: Math.round((62.5 - 32.5 * Math.cos(phase)) * 10) / 10,
      })
    }
    return mock
  }, [historyData])

  const hourStr = `${Math.floor(gameTime).toString().padStart(2, '0')}:${Math.floor((gameTime % 1) * 60).toString().padStart(2, '0')}`

  if (isMobile) {
    return (
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: panelOpen ? '200px' : '48px',
        background: '#252540',
        overflowX: 'auto',
        overflowY: panelOpen ? 'auto' : 'hidden',
        transition: 'height 0.3s ease-out',
        zIndex: 50,
        borderTop: '1px solid #555580',
      }}>
        <div
          onClick={togglePanel}
          style={{
            textAlign: 'center',
            padding: '10px',
            cursor: 'pointer',
            fontSize: '12px',
            color: '#999',
          }}
        >
          {panelOpen ? '▼ 收起气象数据' : '▲ 展开气象数据'}
        </div>
        {panelOpen && (
          <div style={{ display: 'flex', gap: '16px', padding: '0 12px 12px', minWidth: 'max-content' }}>
            <div style={{ minWidth: '100px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#999' }}>天气</div>
              <div>{WEATHER_ICONS[currentWeather]}</div>
              <div style={{ fontSize: '12px', color: '#E0E0E0' }}>{WEATHER_LABELS[currentWeather]}</div>
            </div>
            <div style={{ minWidth: '80px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#999' }}>温度</div>
              <Thermometer size={20} color="#FF6B6B" />
              <div style={{ fontSize: '14px', color: '#FF6B6B' }}>{metrics.temperature.toFixed(1)}°C</div>
            </div>
            <div style={{ minWidth: '80px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#999' }}>湿度</div>
              <Droplets size={20} color="#4A90D9" />
              <div style={{ fontSize: '14px', color: '#4A90D9' }}>{metrics.humidity.toFixed(1)}%</div>
            </div>
            <div style={{ minWidth: '80px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#999' }}>风速</div>
              <Wind size={20} color="#87CEEB" />
              <div style={{ fontSize: '14px', color: '#87CEEB' }}>{metrics.windSpeed.toFixed(1)}</div>
            </div>
            <div style={{ minWidth: '80px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#999' }}>降水</div>
              <Cloud size={20} color="#9ACD32" />
              <div style={{ fontSize: '14px', color: '#9ACD32' }}>{metrics.precipitation.toFixed(1)}%</div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{
      position: 'fixed',
      left: 0,
      top: 0,
      bottom: 0,
      width: panelOpen ? '280px' : '0px',
      background: '#252540',
      overflow: 'hidden',
      transition: 'width 0.3s ease-out',
      zIndex: 50,
      boxShadow: '2px 0 12px rgba(0,0,0,0.3)',
    }}>
      <div style={{
        width: '280px',
        padding: '20px 16px',
        height: '100%',
        overflowY: 'auto',
        boxSizing: 'border-box',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}>
          <h2 style={{
            fontFamily: 'Rajdhani, sans-serif',
            fontSize: '18px',
            fontWeight: 600,
            color: '#E0E0E0',
            margin: 0,
          }}>
            气象数据
          </h2>
          <button
            onClick={togglePanel}
            style={{
              background: 'none',
              border: 'none',
              color: '#999',
              cursor: 'pointer',
              fontSize: '18px',
              padding: '4px',
            }}
          >
            ✕
          </button>
        </div>

        <div style={{
          textAlign: 'center',
          marginBottom: '20px',
          padding: '16px',
          background: 'rgba(0,0,0,0.2)',
          borderRadius: '10px',
        }}>
          <div style={{ marginBottom: '8px' }}>{WEATHER_ICONS[currentWeather]}</div>
          <div style={{ fontSize: '20px', fontWeight: 600, color: '#E0E0E0', fontFamily: 'Rajdhani, sans-serif' }}>
            {WEATHER_LABELS[currentWeather]}
          </div>
          <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
            游戏时间 {hourStr}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          <MetricRow icon={<Thermometer size={16} color="#FF6B6B" />} label="温度" value={`${metrics.temperature.toFixed(1)}°C`} color="#FF6B6B" />
          <MetricRow icon={<Droplets size={16} color="#4A90D9" />} label="湿度" value={`${metrics.humidity.toFixed(1)}%`} color="#4A90D9" />
          <MetricRow icon={<Wind size={16} color="#87CEEB" />} label="风速" value={`${metrics.windSpeed.toFixed(1)} km/h`} color="#87CEEB" />
          <MetricRow icon={<Cloud size={16} color="#9ACD32" />} label="降水概率" value={`${metrics.precipitation.toFixed(1)}%`} color="#9ACD32" />
        </div>

        <div>
          <h3 style={{
            fontFamily: 'Rajdhani, sans-serif',
            fontSize: '14px',
            fontWeight: 600,
            color: '#999',
            marginBottom: '8px',
          }}>
            24小时趋势
          </h3>
          <Chart data={chartData} />
        </div>
      </div>
    </div>
  )
}

function MetricRow({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '8px 12px',
      background: 'rgba(0,0,0,0.15)',
      borderRadius: '8px',
    }}>
      {icon}
      <span style={{ fontSize: '12px', color: '#999', flex: 1 }}>{label}</span>
      <span style={{ fontSize: '14px', fontWeight: 600, color, fontFamily: 'Rajdhani, sans-serif' }}>{value}</span>
    </div>
  )
}
