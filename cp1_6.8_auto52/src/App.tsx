import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import MysteryWall from '@/pages/MysteryWall'
import SolvedPage from '@/pages/SolvedPage'
import { Sparkles, Trophy } from 'lucide-react'

function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const current = location.pathname === '/solved' ? 'solved' : 'wall'

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 glass-card rounded-none border-x-0 border-b-0">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto">
        <button
          onClick={() => navigate('/')}
          className={`flex flex-col items-center gap-1 px-6 py-2 rounded-xl transition-all duration-300 ${
            current === 'wall'
              ? 'text-warm-yellow'
              : 'text-white/30 hover:text-white/50'
          }`}
        >
          <Sparkles size={20} className={current === 'wall' ? 'drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]' : ''} />
          <span className="text-[10px] tracking-wider">谜语墙</span>
        </button>

        <button
          onClick={() => navigate('/solved')}
          className={`flex flex-col items-center gap-1 px-6 py-2 rounded-xl transition-all duration-300 ${
            current === 'solved'
              ? 'text-cyan-green'
              : 'text-white/30 hover:text-white/50'
          }`}
        >
          <Trophy size={20} className={current === 'solved' ? 'drop-shadow-[0_0_6px_rgba(52,211,153,0.5)]' : ''} />
          <span className="text-[10px] tracking-wider">已破解</span>
        </button>
      </div>
    </nav>
  )
}

export default function App() {
  return (
    <Router>
      <div className="w-full h-full relative">
        <Routes>
          <Route path="/" element={<MysteryWall />} />
          <Route path="/solved" element={<SolvedPage />} />
        </Routes>
        <BottomNav />
      </div>
    </Router>
  )
}
