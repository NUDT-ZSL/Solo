import React, { useMemo } from 'react'
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
  Cell,
} from 'recharts'
import { HeatmapData } from '../api'

const EMOTION_COLORS: Record<string, string> = {
  happy: '#E53E3E',
  sad: '#3182CE',
  anxious: '#DD6B20',
  calm: '#38A169',
  excited: '#D53F8C',
}

const EMOTION_LABELS: Record<string, string> = {
  happy: '开心',
  sad: '伤心',
  anxious: '焦虑',
  calm: '平静',
  excited: '兴奋',
}

const DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

interface HeatmapProps {
  data: HeatmapData[]
}

interface ScatterPoint {
  hour: number
  dayIndex: number
  day: string
  emotion: string | null
  z: number
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    payload: ScatterPoint
  }>
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="custom-tooltip">
        <div className="tooltip-label">{data.day} {data.hour}:00</div>
        <div>{data.emotion ? EMOTION_LABELS[data.emotion] : '无记录'}</div>
      </div>
    )
  }
  return null
}

const Heatmap: React.FC<HeatmapProps> = ({ data }) => {
  const scatterData: ScatterPoint[] = useMemo(() => {
    const result: ScatterPoint[] = []
    DAYS.forEach((dayName, dayIdx) => {
      for (let hour = 0; hour < 24; hour++) {
        const found = data.find(d => d.day === dayName && d.hour === hour)
        result.push({
          hour,
          dayIndex: dayIdx,
          day: dayName,
          emotion: found?.emotion || null,
          z: 100,
        })
      }
    })
    return result
  }, [data])

  return (
    <div className="chart-card">
      <h3 className="chart-title">每周情绪热力图</h3>
      <ResponsiveContainer width="100%" height={320}>
        <ScatterChart
          margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis
            type="number"
            dataKey="hour"
            name="小时"
            domain={[0, 23]}
            ticks={[0, 3, 6, 9, 12, 15, 18, 21]}
            tick={{ fontSize: 11, fill: '#718096' }}
            axisLine={{ stroke: '#E2E8F0' }}
            label={{ value: '小时', position: 'insideBottom', offset: -5, fontSize: 11, fill: '#718096' }}
          />
          <YAxis
            type="number"
            dataKey="dayIndex"
            name="星期"
            domain={[0, 6]}
            ticks={[0, 1, 2, 3, 4, 5, 6]}
            tick={{ fontSize: 11, fill: '#718096' }}
            axisLine={{ stroke: '#E2E8F0' }}
            tickFormatter={(value: number) => DAYS[value] || ''}
            width={50}
          />
          <ZAxis type="number" dataKey="z" range={[400, 400]} />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#CBD5E0', strokeWidth: 1 }} />
          <Scatter name="情绪" data={scatterData} shape="square">
            {scatterData.map((entry, index) => {
              const color = entry.emotion ? EMOTION_COLORS[entry.emotion] : '#EDF2F7'
              return <Cell key={`cell-${index}`} fill={color} />
            })}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}

export default Heatmap
