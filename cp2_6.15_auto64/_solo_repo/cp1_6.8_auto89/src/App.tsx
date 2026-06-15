import { useEffect } from 'react'
import OceanCanvas from './OceanCanvas'
import BottleCard from './BottleCard'
import InputPanel from './InputPanel'
import Leaderboard from './Leaderboard'
import { useBottleStore } from './BottleEngine'
import { Waves, Trophy } from 'lucide-react'

export default function App() {
  const { activeTab, setActiveTab, setShowInputPanel, fetchWishes } = useBottleStore()

  useEffect(() => {
    fetchWishes()
    const interval = setInterval(fetchWishes, 15000)
    return () => clearInterval(interval)
  }, [fetchWishes])

  return (
    <div className="w-full h-full relative">
      <OceanCanvas />

      {activeTab === 'ocean' && (
        <button
          onClick={() => setShowInputPanel(true)}
          className="fixed z-20 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-float-up animate-pulse-glow w-16 h-16 rounded-full flex items-center justify-center transition-transform duration-200 hover:scale-110 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, rgba(100, 200, 255, 0.3), rgba(100, 200, 255, 0.6))',
            border: '1.5px solid rgba(100, 200, 255, 0.5)',
          }}
        >
          <span className="text-2xl">🧊</span>
        </button>
      )}

      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around py-2 px-4"
        style={{
          background: 'rgba(10, 22, 40, 0.7)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <button
          onClick={() => setActiveTab('ocean')}
          className="flex flex-col items-center gap-0.5 px-6 py-1 rounded-xl transition-all duration-200"
          style={{
            color: activeTab === 'ocean' ? '#4FC3F7' : 'rgba(255,255,255,0.4)',
            background: activeTab === 'ocean' ? 'rgba(79, 195, 247, 0.1)' : 'transparent',
          }}
        >
          <Waves size={20} />
          <span className="text-xs">心愿海域</span>
        </button>
        <button
          onClick={() => setActiveTab('leaderboard')}
          className="flex flex-col items-center gap-0.5 px-6 py-1 rounded-xl transition-all duration-200"
          style={{
            color: activeTab === 'leaderboard' ? '#FFD700' : 'rgba(255,255,255,0.4)',
            background: activeTab === 'leaderboard' ? 'rgba(255, 215, 0, 0.1)' : 'transparent',
          }}
        >
          <Trophy size={20} />
          <span className="text-xs">已点亮榜</span>
        </button>
      </nav>

      <BottleCard />
      <InputPanel />
      {activeTab === 'leaderboard' && <Leaderboard />}
    </div>
  )
}
