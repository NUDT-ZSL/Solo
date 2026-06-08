import { useMessageStore } from '@/store/useMessageStore'
import { useNavigate } from 'react-router-dom'
import { Mic, BarChart3 } from 'lucide-react'

export default function NavBar() {
  const setRecordModalOpen = useMessageStore((s) => s.setRecordModalOpen)
  const navigate = useNavigate()

  return (
    <nav
      className="glass fixed bottom-0 left-0 z-50 flex w-full items-center justify-center gap-4 px-4 md:gap-6"
      style={{ height: '56px' }}
    >
      <div className="mx-auto flex items-center gap-3 md:gap-5">
        <button
          onClick={() => setRecordModalOpen(true)}
          className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white/90 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_24px_rgba(255,215,0,0.4)] md:px-5 md:py-2.5 md:text-base"
          style={{
            background: 'rgba(255,215,0,0.12)',
            border: '1px solid rgba(255,215,0,0.3)',
            textShadow: '0 0 12px rgba(255,215,0,0.5)',
            minHeight: '44px',
            fontFamily: '"Space Mono", monospace',
          }}
        >
          <Mic size={18} className="md:hidden" />
          <Mic size={20} className="hidden md:inline" />
          <span>录制留言</span>
        </button>

        <button
          onClick={() => navigate('/stats')}
          className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white/90 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_24px_rgba(255,69,0,0.4)] md:px-5 md:py-2.5 md:text-base"
          style={{
            background: 'rgba(255,69,0,0.12)',
            border: '1px solid rgba(255,69,0,0.3)',
            textShadow: '0 0 12px rgba(255,69,0,0.5)',
            minHeight: '44px',
            fontFamily: '"Space Mono", monospace',
          }}
        >
          <BarChart3 size={18} className="md:hidden" />
          <BarChart3 size={20} className="hidden md:inline" />
          <span>情感图谱</span>
        </button>
      </div>

      <style>{`
        @media (min-width: 768px) {
          nav { height: 64px !important; }
        }
      `}</style>
    </nav>
  )
}
