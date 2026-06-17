import { formatDate } from '@/utils/dataHelper'

interface RecordCardProps {
  record: {
    date: string
    songs: string[]
    avgPitch: number
    avgRhythm: number
    avgExpression: number
    memberCount: number
  }
}

const bars = [
  { label: '音准', key: 'avgPitch' as const, color: '#42a5f5' },
  { label: '节奏', key: 'avgRhythm' as const, color: '#66bb6a' },
  { label: '表现力', key: 'avgExpression' as const, color: '#ab47bc' },
]

export default function RecordCard({ record }: RecordCardProps) {
  return (
    <div
      className="flex flex-col justify-between"
      style={{
        width: '100%',
        height: 160,
        background: 'linear-gradient(135deg, #f3e5f5, #e1bee7)',
        borderRadius: 12,
        padding: 16,
        color: '#333333',
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{formatDate(record.date)}</span>
        <span className="text-sm font-medium truncate ml-4">{record.songs[0]}</span>
      </div>

      <div className="flex flex-col gap-1">
        {bars.map((bar) => (
          <div key={bar.key} className="flex items-center gap-2">
            <span className="text-xs shrink-0 w-16">
              {bar.label}: {record[bar.key].toFixed(0)}
            </span>
            <div
              className="flex-1"
              style={{
                height: 14,
                background: '#e0e0e0',
                borderRadius: 7,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: 14,
                  width: `${record[bar.key]}%`,
                  background: bar.color,
                  borderRadius: 7,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs">参演人数: {record.memberCount}</span>
        <div className="flex gap-2">
          {record.songs.map((song) => (
            <span
              key={song}
              className="flex items-center justify-center text-white text-xs px-2"
              style={{
                height: 24,
                background: '#9575cd',
                borderRadius: 12,
                whiteSpace: 'nowrap',
              }}
            >
              {song}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
