import { useStore } from '@/store/useStore'
import FilterBar from '@/components/FilterBar'
import ActivityCard from '@/components/ActivityCard'
import { AlertCircle, RefreshCw } from 'lucide-react'

export default function ActivityList() {
  const { activities, filter, loading, error, fetchActivities } = useStore()

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
        <div
          className="flex flex-col items-center justify-center py-16 gap-4 rounded-xl mx-auto max-w-lg"
          style={{ background: '#1e1e2e', border: '1px solid #303040' }}
        >
          <div className="flex items-center gap-3 text-red-400">
            <AlertCircle size={28} />
            <span className="text-lg font-medium">加载活动失败</span>
          </div>
          <p className="text-sm text-[#78909c] text-center px-6">{error}</p>
          <button
            onClick={() => fetchActivities()}
            className="mt-2 h-10 px-6 rounded-full text-white text-sm transition-all duration-200 hover:scale-105 flex items-center gap-2"
            style={{ background: '#1976d2' }}
          >
            <RefreshCw size={16} />
            重新加载
          </button>
        </div>
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
