import { useStore } from '@/store/useStore'
import FilterBar from '@/components/FilterBar'
import ActivityCard from '@/components/ActivityCard'

export default function ActivityList() {
  const { activities, filter, loading, error } = useStore()

  const filtered =
    filter === '全部' ? activities : activities.filter((a) => a.status === filter)

  if (loading) {
    return (
      <div>
        <FilterBar />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-xl animate-pulse"
              style={{ width: 320, minHeight: 360, background: '#1e1e2e' }}
            />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <FilterBar />
        <div className="text-center text-red-400 py-12">{error}</div>
      </div>
    )
  }

  return (
    <div>
      <FilterBar />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtered.map((activity) => (
          <ActivityCard key={activity.id} activity={activity} />
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="text-center text-[#78909c] py-12">暂无活动</div>
      )}
    </div>
  )
}
