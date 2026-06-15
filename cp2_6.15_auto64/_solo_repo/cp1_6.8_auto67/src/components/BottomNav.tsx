import { useLocation, useNavigate } from 'react-router-dom'
import { Sparkles, Archive } from 'lucide-react'

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const isHome = location.pathname === '/'

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      style={{
        background: 'rgba(10,10,46,0.6)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <button
        onClick={() => navigate('/')}
        className={`flex flex-col items-center gap-0.5 px-6 py-1.5 rounded-xl transition-all ${
          isHome ? 'text-amber-400' : 'text-white/40 hover:text-white/60'
        }`}
      >
        <Sparkles size={20} />
        <span className="text-[10px]">时间星海</span>
      </button>
      <button
        onClick={() => navigate('/my-capsules')}
        className={`flex flex-col items-center gap-0.5 px-6 py-1.5 rounded-xl transition-all ${
          !isHome ? 'text-amber-400' : 'text-white/40 hover:text-white/60'
        }`}
      >
        <Archive size={20} />
        <span className="text-[10px]">我的胶囊</span>
      </button>
    </nav>
  )
}
