import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Lightbulb, Trophy } from 'lucide-react'
import { useIdeaStore } from './IdeaEngine'

export const NavBar: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const setShowPublishModal = useIdeaStore((s) => s.setShowPublishModal)

  const isGrid = location.pathname === '/'
  const isLeaderboard = location.pathname === '/leaderboard'

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/5"
      style={{
        background: 'linear-gradient(180deg, rgba(13,2,33,0.8), rgba(10,22,40,0.95))',
        backdropFilter: 'blur(20px)',
      }}
    >
      <div className="max-w-4xl mx-auto flex items-center justify-around py-3 px-6">
        <button
          onClick={() => setShowPublishModal(true)}
          className="flex flex-col items-center gap-1 group transition-all duration-300 hover:scale-110 active:scale-95"
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #FF2D9580, #00D4FF60)',
              boxShadow: '0 0 20px rgba(255,45,149,20), 0 0 20px rgba(0,212,255,20)',
            }}
          >
            <Lightbulb size={22} className="text-white" />
          </div>
          <span className="text-[10px] text-white/50 group-hover:text-white/80 transition-colors">
            发布创意
          </span>
        </button>

        <button
          onClick={() => navigate(isLeaderboard ? '/' : '/leaderboard')}
          className="flex flex-col items-center gap-1 group transition-all duration-300 hover:scale-110 active:scale-95"
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300"
            style={{
              background: isLeaderboard
                ? 'linear-gradient(135deg, #39FF1480, #00D4FF60)'
                : 'linear-gradient(135deg, rgba(57,255,20,0.15), rgba(0,212,255,0.1))',
              boxShadow: isLeaderboard
                ? '0 0 20px rgba(57,255,20,20), 0 0 20px rgba(0,212,255,20)'
                : 'none',
            }}
          >
            <Trophy
              size={22}
              className="transition-colors duration-300"
              style={{ color: isLeaderboard ? '#39FF14' : 'rgba(255,255,255,0.4)' }}
            />
          </div>
          <span
            className="text-[10px] transition-colors duration-300"
            style={{ color: isLeaderboard ? '#39FF14' : 'rgba(255,255,255,0.5)' }}
          >
            {isLeaderboard ? '返回网格' : '热度榜'}
          </span>
        </button>
      </div>
    </nav>
  )
}
