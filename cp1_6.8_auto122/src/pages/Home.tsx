import { useEffect } from 'react'
import NavBar from '@/components/NavBar'
import WeatherHeatmap from '@/components/WeatherHeatmap'
import { MoodCardList, AddMoodForm } from '@/components/MoodCard'
import DiaryModal from '@/components/DiaryModal'
import PieChart from '@/components/PieChart'
import { useMoodStore } from '@/store'

export default function Home() {
  const { loadRecords, stats, isFormOpen, isModalOpen } = useMoodStore()

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  return (
    <div className="app-root">
      <NavBar />

      <main className="main-content">
        <section className="glass-panel p-6 mb-8">
          <WeatherHeatmap />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <section className="lg:col-span-3">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white/80">心情记录</h2>
            </div>
            <MoodCardList />
          </section>

          <aside className="lg:col-span-1">
            <div className="glass-panel p-6 sticky top-24">
              <PieChart stats={stats} />
            </div>
          </aside>
        </div>
      </main>

      {isModalOpen && <DiaryModal />}
      {isFormOpen && <AddMoodForm />}
    </div>
  )
}
