import { InstrumentType, InstrumentSelectorProps } from '@/types'

const instruments: { type: InstrumentType; name: string; color: string }[] = [
  { type: 'piano', name: '钢琴', color: 'var(--color-piano)' },
  { type: 'violin', name: '小提琴', color: 'var(--color-violin)' },
  { type: 'cello', name: '大提琴', color: 'var(--color-cello)' },
  { type: 'flute', name: '长笛', color: 'var(--color-flute)' },
  { type: 'percussion', name: '打击乐', color: 'var(--color-percussion)' },
]

export default function InstrumentSelector({ onSelect }: InstrumentSelectorProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-4xl font-bold text-white mb-12">选择你的乐器</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {instruments.map((instrument) => (
          <button
            key={instrument.type}
            onClick={() => onSelect(instrument.type)}
            className="p-8 rounded-2xl text-white font-semibold text-lg transition-all duration-300 hover:scale-105 hover:shadow-xl"
            style={{ backgroundColor: instrument.color }}
          >
            {instrument.name}
          </button>
        ))}
      </div>
    </div>
  )
}
