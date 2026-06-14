import { useStore } from '@/store'
import { useEffect, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts'

const tagColorMap: Record<string, string> = {
  health: '#00b894',
  study: '#6c5ce7',
  creative: '#fdcb6e',
  life: '#74b9ff',
}

const radarLabels: Record<string, string> = {
  physical: '体能',
  intelligence: '智力',
  creativity: '创意',
  social: '社交',
  discipline: '纪律',
  emotion: '情绪',
}

type Period = 'weekly' | 'monthly'

export default function StatsPanel() {
  const { stats, fetchStats } = useStore()
  const [period, setPeriod] = useState<Period>('weekly')

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  if (!stats) return null

  const barData = stats[period].map((s) => ({
    name: s.name,
    completionRate: s.completionRate,
    fill: tagColorMap[s.tag] || '#74b9ff',
  }))

  const radarData = Object.entries(stats.radar).map(([key, value]) => ({
    dimension: radarLabels[key] || key,
    value,
    fullMark: 100,
  }))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-sm font-bold text-gray-700 tracking-wide flex items-center gap-2 mb-4">
          <span className="w-1 h-4 rounded-full bg-gradient-to-b from-[#fdcb6e] to-[#e17055]" />
          成就看板
        </h3>

        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 w-fit">
          {(['weekly', 'monthly'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className="px-4 py-1.5 rounded-md text-xs font-semibold transition-all duration-200"
              style={{
                background: period === p ? '#ffffff' : 'transparent',
                color: period === p ? '#1a1a2e' : '#6b7280',
                boxShadow: period === p ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              {p === 'weekly' ? '本周' : '本月'}
            </button>
          ))}
        </div>

        <div className="mt-4">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={barData} margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
              <XAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
                interval={0}
                width={80}
              />
              <YAxis
                type="number"
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${v}%`}
              />
              <Tooltip
                formatter={(value: number) => [`${value}%`, '完成率']}
                contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', fontSize: 12 }}
              />
              <Bar dataKey="completionRate" radius={[4, 4, 0, 0]} barSize={100 / Math.max(barData.length, 1)}>
                {barData.map((entry, index) => (
                  <rect key={index} fill={entry.fill} rx={4} ry={4} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-gray-700 tracking-wide flex items-center gap-2 mb-4">
          <span className="w-1 h-4 rounded-full bg-gradient-to-b from-[#6c5ce7] to-[#74b9ff]" />
          能力维度
        </h3>

        <ResponsiveContainer width="100%" height={300}>
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
            <PolarGrid stroke="#9ca3af" strokeOpacity={0.3} />
            <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 12, fill: '#6b7280' }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} />
            <Radar
              name="能力值"
              dataKey="value"
              stroke="#6c5ce7"
              fill="#6c5ce7"
              fillOpacity={0.2}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
