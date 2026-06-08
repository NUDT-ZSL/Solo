import React from 'react'
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts'
import { RadarData } from '../api'

interface ActivityRadarProps {
  data: RadarData[]
}

const ActivityRadar: React.FC<ActivityRadarProps> = ({ data }) => {
  const displayData = data.length > 0
    ? data
    : [
        { activity: '运动', count: 0 },
        { activity: '阅读', count: 0 },
        { activity: '社交', count: 0 },
        { activity: '工作', count: 0 },
        { activity: '学习', count: 0 },
      ]

  return (
    <div className="chart-card">
      <h3 className="chart-title">活动偏好雷达图</h3>
      <ResponsiveContainer width="100%" height={320}>
        <RadarChart data={displayData} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="#E2E8F0" />
          <PolarAngleAxis
            dataKey="activity"
            tick={{ fontSize: 12, fill: '#4A5568' }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 'auto']}
            tick={{ fontSize: 10, fill: '#A0AEC0' }}
            axisLine={{ stroke: '#E2E8F0' }}
          />
          <Radar
            name="使用次数"
            dataKey="count"
            stroke="#4FD1C5"
            fill="#4FD1C5"
            fillOpacity={0.3}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default ActivityRadar
