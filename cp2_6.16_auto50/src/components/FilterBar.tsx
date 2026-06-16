import { useStore } from '@/store/useStore'

const filters: ('全部' | '进行中' | '已结束')[] = ['全部', '进行中', '已结束']

export default function FilterBar() {
  const { filter, setFilter } = useStore()

  return (
    <div className="flex gap-3 mb-6">
      {filters.map((f) => (
        <button
          key={f}
          onClick={() => setFilter(f)}
          className="transition-all duration-200"
          style={{
            width: 120,
            height: 36,
            borderRadius: 18,
            background: filter === f ? '#1976d2' : '#2a2a3e',
            color: filter === f ? '#fff' : '#b0b0b0',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {f}
        </button>
      ))}
    </div>
  )
}
