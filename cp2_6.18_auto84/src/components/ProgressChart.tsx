import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts'
import type { ScoreRecord } from '../types'
import {
  buildRadarData,
  buildPitchLineData,
  buildRhythmLineData
} from '../utils/dataHelper'

interface ProgressChartProps {
  records: ScoreRecord[]
}

export default function ProgressChart({ records }: ProgressChartProps) {
  const sortedRecords = [...records].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )
  const latest = sortedRecords[sortedRecords.length - 1]
  const radarData = buildRadarData(latest)
  const pitchData = buildPitchLineData(sortedRecords)
  const rhythmData = buildRhythmLineData(sortedRecords)

  return (
    <div className="charts-container">
      <div className="chart-card radar-card">
        <h3 className="chart-title">综合能力雷达图</h3>
        <ResponsiveContainer width="100%" height={280}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="#444" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: '#e0e0e0', fontSize: 13 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#888', fontSize: 11 }} />
            <Legend wrapperStyle={{ color: '#e0e0e0', paddingBottom: 8 }} />
            <Radar
              name="评分"
              dataKey="score"
              stroke="#7c4dff"
              fill="#7c4dff"
              fillOpacity={0.3}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-column">
        <div className="chart-card">
          <h3 className="chart-title">音准得分趋势</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={pitchData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="date" tick={{ fill: '#aaa', fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fill: '#aaa', fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#16213e',
                  border: '1px solid #7c4dff',
                  borderRadius: 8,
                  color: '#e0e0e0'
                }}
              />
              <Legend wrapperStyle={{ color: '#e0e0e0', fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="score"
                name="音准"
                stroke="#42a5f5"
                strokeWidth={2}
                dot={{ fill: '#ffffff', r: 3, strokeWidth: 2, stroke: '#42a5f5' }}
                activeDot={{ r: 5, fill: '#ffffff', stroke: '#42a5f5' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-card">
          <h3 className="chart-title">节奏得分趋势</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={rhythmData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="date" tick={{ fill: '#aaa', fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fill: '#aaa', fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#16213e',
                  border: '1px solid #7c4dff',
                  borderRadius: 8,
                  color: '#e0e0e0'
                }}
              />
              <Legend wrapperStyle={{ color: '#e0e0e0', fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="score"
                name="节奏"
                stroke="#42a5f5"
                strokeWidth={2}
                dot={{ fill: '#ffffff', r: 3, strokeWidth: 2, stroke: '#42a5f5' }}
                activeDot={{ r: 5, fill: '#ffffff', stroke: '#42a5f5' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
