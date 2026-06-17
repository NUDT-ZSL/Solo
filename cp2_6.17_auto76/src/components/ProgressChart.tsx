import { ScoreRecord, toRadarData, toLineData, formatDate } from '@/utils/dataHelper'
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface ProgressChartProps {
  scores: ScoreRecord[]
}

const tooltipStyle = {
  contentStyle: { backgroundColor: '#16213e', border: 'none', borderRadius: 8, color: '#e0e0e0' },
  labelStyle: { color: '#e0e0e0' },
  itemStyle: { color: '#e0e0e0' },
}

export default function ProgressChart({ scores }: ProgressChartProps) {
  if (scores.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        暂无数据
      </div>
    )
  }

  const sorted = [...scores].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const latestScore = sorted[sorted.length - 1]
  const radarData = toRadarData(latestScore)
  const pitchData = toLineData(scores, 'pitch')
  const rhythmData = toLineData(scores, 'rhythm')

  return (
    <div className="flex flex-col md:flex-row gap-4 w-full">
      <div className="w-full md:w-[40%] flex items-center justify-center" style={{ background: 'transparent' }}>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="#2a2a4a" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: '#e0e0e0', fontSize: 13 }} />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#8a8a9a', fontSize: 11 }} axisLine={false} />
            <Radar dataKey="value" stroke="#7c4dff" fill="#7c4dff" fillOpacity={0.3} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="w-full md:w-[60%] flex flex-col gap-4">
        <div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={pitchData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fill: '#8a8a9a', fontSize: 11 }}
                axisLine={{ stroke: '#2a2a4a' }}
                tickLine={false}
              />
              <YAxis domain={[0, 100]} tick={{ fill: '#8a8a9a', fontSize: 11 }} axisLine={{ stroke: '#2a2a4a' }} tickLine={false} />
              <Tooltip {...tooltipStyle} />
              <Legend wrapperStyle={{ color: '#e0e0e0' }} />
              <Line
                type="monotone"
                dataKey="score"
                name="音准"
                stroke="#42a5f5"
                strokeWidth={2}
                dot={{ fill: '#fff', stroke: '#42a5f5', strokeWidth: 2, r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={rhythmData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fill: '#8a8a9a', fontSize: 11 }}
                axisLine={{ stroke: '#2a2a4a' }}
                tickLine={false}
              />
              <YAxis domain={[0, 100]} tick={{ fill: '#8a8a9a', fontSize: 11 }} axisLine={{ stroke: '#2a2a4a' }} tickLine={false} />
              <Tooltip {...tooltipStyle} />
              <Legend wrapperStyle={{ color: '#e0e0e0' }} />
              <Line
                type="monotone"
                dataKey="score"
                name="节奏"
                stroke="#42a5f5"
                strokeWidth={2}
                dot={{ fill: '#fff', stroke: '#42a5f5', strokeWidth: 2, r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
