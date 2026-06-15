import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Music, Users, Calendar, Clock } from 'lucide-react'
import StageCard from '../components/StageCard'
import { useWebSocket } from '../context/WebSocketContext'
import { useUser } from '../context/UserContext'
import type { Stage } from '../../shared/types'

const StageListPage = () => {
  const [stages, setStages] = useState<Stage[]>([])
  const [loading, setLoading] = useState(true)
  const { isConnected, onlineCount } = useWebSocket()
  const { nickname, setNickname } = useUser()
  const [isEditingNickname, setIsEditingNickname] = useState(false)
  const [tempNickname, setTempNickname] = useState(nickname)

  useEffect(() => {
    fetchStages()
  }, [])

  const fetchStages = async () => {
    try {
      const response = await fetch('/api/stages')
      const data = await response.json()
      const sortedStages = data.sort((a: Stage, b: Stage) => 
        new Date(a.performanceTime).getTime() - new Date(b.performanceTime).getTime()
      )
      setStages(sortedStages)
    } catch (error) {
      console.error('Failed to fetch stages:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleNicknameSubmit = () => {
    if (tempNickname.trim()) {
      setNickname(tempNickname.trim())
    }
    setIsEditingNickname(false)
  }

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-white text-xl animate-pulse">加载中...</div>
      </div>
    )
  }

  return (
    <div className="w-full h-full overflow-y-auto scrollbar-hide" style={{ background: 'linear-gradient(135deg, #1a0033 0%, #0d0221 100%)' }}>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <header className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #e040fb, #00e5ff)' }}>
                <Music className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white mb-1">
                  虚拟音乐节
                </h1>
                <p className="text-gray-400">探索精彩演出，铸造专属门票</p>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 glass-effect px-4 py-2 rounded-full">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                <span className="text-white text-sm">
                  <Users className="inline w-4 h-4 mr-1" />
                  {onlineCount} 人在线
                </span>
              </div>
              
              <div className="glass-effect px-4 py-2 rounded-full">
                {isEditingNickname ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={tempNickname}
                      onChange={(e) => setTempNickname(e.target.value)}
                      className="bg-transparent text-white text-sm border-b border-white/30 focus:outline-none focus:border-white/80 w-32"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleNicknameSubmit()}
                    />
                    <button onClick={handleNicknameSubmit} className="text-white/70 hover:text-white text-sm">
                      确定
                    </button>
                  </div>
                ) : (
                  <span 
                    className="text-white text-sm cursor-pointer hover:text-white/80"
                    onClick={() => {
                      setTempNickname(nickname)
                      setIsEditingNickname(true)
                    }}
                  >
                    {nickname}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="glass-effect rounded-2xl p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-5 h-5 text-white/70" />
              <span className="text-white/70">演出时间表</span>
            </div>
            <div className="flex gap-8 overflow-x-auto scrollbar-hide pb-2">
              {stages.map((stage) => (
                <Link 
                  key={stage.id}
                  to={`/stage/${stage.id}`}
                  className="flex-shrink-0 flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-colors"
                >
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                    style={{ backgroundColor: stage.backgroundColor }}
                  >
                    {stage.artistName.charAt(0)}
                  </div>
                  <div>
                    <div className="text-white font-medium">{stage.artistName}</div>
                    <div className="text-white/50 text-sm flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(stage.performanceTime)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </header>

        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <span className="w-1 h-8 rounded-full" style={{ background: 'linear-gradient(135deg, #e040fb, #00e5ff)' }} />
          全部演出
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 pb-12">
          {stages.map((stage) => (
            <StageCard key={stage.id} stage={stage} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default StageListPage
