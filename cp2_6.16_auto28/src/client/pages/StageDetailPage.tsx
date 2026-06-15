import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Calendar, Clock, Users, Ticket, Play, Pause } from 'lucide-react'
import SpectrumVisualizer from '../components/SpectrumVisualizer'
import TicketSVG from '../components/TicketSVG'
import ParticleBackground from '../components/ParticleBackground'
import ChatArea from '../components/ChatArea'
import { useWebSocket } from '../context/WebSocketContext'
import { useUser } from '../context/UserContext'
import type { Stage, Ticket as TicketType } from '../../shared/types'

const StageDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const [stage, setStage] = useState<Stage | null>(null)
  const [ticket, setTicket] = useState<TicketType | null>(null)
  const [loading, setLoading] = useState(true)
  const [isMinting, setIsMinting] = useState(false)
  const [showTicket, setShowTicket] = useState(false)
  const [isPerformanceMode, setIsPerformanceMode] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const { joinRoom, leaveRoom, isConnected, onlineCount } = useWebSocket()
  const { userId, nickname } = useUser()

  useEffect(() => {
    if (id) {
      fetchStage()
      checkExistingTicket()
      joinRoom(id)
    }

    return () => {
      if (id) {
        leaveRoom(id)
      }
    }
  }, [id])

  const fetchStage = async () => {
    try {
      const response = await fetch(`/api/stages/${id}`)
      const data = await response.json()
      setStage(data)
      
      const now = new Date()
      const perfTime = new Date(data.performanceTime)
      const diffHours = (perfTime.getTime() - now.getTime()) / (1000 * 60 * 60)
      if (diffHours < 2 && diffHours > -2) {
        setIsPerformanceMode(true)
      }
    } catch (error) {
      console.error('Failed to fetch stage:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkExistingTicket = async () => {
    const storedTicket = localStorage.getItem(`ticket_${id}`)
    if (storedTicket) {
      setTicket(JSON.parse(storedTicket))
    }
  }

  const handleMintTicket = async () => {
    if (!stage || !userId) return
    
    setIsMinting(true)
    try {
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          stageId: stage.id,
          nickname
        })
      })
      
      const ticketData = await response.json()
      setTicket(ticketData)
      localStorage.setItem(`ticket_${id}`, JSON.stringify(ticketData))
      setShowTicket(true)
    } catch (error) {
      console.error('Failed to mint ticket:', error)
    } finally {
      setIsMinting(false)
    }
  }

  const toggleAudio = () => {
    if (!audioRef.current) return
    
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play().catch(console.error)
    }
    setIsPlaying(!isPlaying)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1a0033 0%, #0d0221 100%)' }}>
        <div className="text-white text-xl animate-pulse">加载中...</div>
      </div>
    )
  }

  if (!stage) {
    return (
      <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1a0033 0%, #0d0221 100%)' }}>
        <div className="text-white text-xl">舞台不存在</div>
      </div>
    )
  }

  if (isPerformanceMode && ticket) {
    return (
      <div className="w-full h-full relative overflow-hidden">
        <ParticleBackground 
          color={stage.backgroundColor}
          gradientStart={stage.backgroundColor}
          gradientEnd="#00e5ff"
        />
        <audio ref={audioRef} src={stage.audioUrl} loop />
        
        <div className="absolute top-0 left-0 right-0 z-10 p-6">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span>返回列表</span>
            </Link>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 glass-effect px-4 py-2 rounded-full">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                <span className="text-white text-sm">
                  <Users className="inline w-4 h-4 mr-1" />
                  {onlineCount} 人在线
                </span>
              </div>
              
              <button
                onClick={toggleAudio}
                className="glass-effect px-4 py-2 rounded-full flex items-center gap-2 text-white hover:bg-white/20 transition-colors"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span className="text-sm">{isPlaying ? '暂停' : '播放'}</span>
              </button>
            </div>
          </div>
          
          <div className="text-center mt-8">
            <h1 className="text-5xl font-bold text-white mb-2" style={{ textShadow: '0 0 40px rgba(224, 64, 251, 0.5)' }}>
              {stage.name}
            </h1>
            <p className="text-white/70 text-xl">{stage.artistName}</p>
            <div className="flex items-center justify-center gap-6 mt-4 text-white/60">
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {formatDate(stage.performanceTime)}
              </span>
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {formatTime(stage.performanceTime)}
              </span>
            </div>
          </div>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 z-10">
          <ChatArea stageId={stage.id} />
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full overflow-y-auto scrollbar-hide" style={{ background: 'linear-gradient(135deg, #1a0033 0%, #0d0221 100%)' }}>
      <div className="p-6">
        <Link to="/" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors mb-6">
          <ArrowLeft className="w-5 h-5" />
          <span>返回列表</span>
        </Link>
        
        <div className="max-w-6xl mx-auto">
          <div className="glass-effect rounded-3xl p-8 mb-8">
            <div className="flex flex-col md:flex-row gap-8">
              <div className="flex-shrink-0">
                <div 
                  className="w-48 h-48 rounded-2xl overflow-hidden border-4 border-white/20"
                  style={{ backgroundColor: stage.backgroundColor }}
                >
                  <img 
                    src={stage.artistAvatar} 
                    alt={stage.artistName}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              
              <div className="flex-1">
                <h1 className="text-4xl font-bold text-white mb-2">{stage.name}</h1>
                <p className="text-white/70 text-xl mb-4">{stage.artistName}</p>
                
                <div className="flex flex-wrap gap-4 mb-6 text-white/60">
                  <span className="flex items-center gap-2 glass-effect px-4 py-2 rounded-full">
                    <Calendar className="w-4 h-4" />
                    {formatDate(stage.performanceTime)}
                  </span>
                  <span className="flex items-center gap-2 glass-effect px-4 py-2 rounded-full">
                    <Clock className="w-4 h-4" />
                    {formatTime(stage.performanceTime)}
                  </span>
                  <span className="flex items-center gap-2 glass-effect px-4 py-2 rounded-full">
                    <Users className="w-4 h-4" />
                    {onlineCount} 人在线
                  </span>
                </div>
                
                {ticket ? (
                  <div className="flex gap-4">
                    <button
                      onClick={() => setShowTicket(true)}
                      className="btn-gradient px-8 py-3 flex items-center gap-2"
                    >
                      <Ticket className="w-5 h-5" />
                      查看我的门票
                    </button>
                    {isPerformanceMode && (
                      <button
                        onClick={() => setIsPerformanceMode(true)}
                        className="btn-gradient px-8 py-3 flex items-center gap-2"
                        style={{ background: 'linear-gradient(135deg, #00e5ff, #00ff88)' }}
                      >
                        <Play className="w-5 h-5" />
                        进入演出
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={handleMintTicket}
                    disabled={isMinting}
                    className="btn-gradient px-8 py-3 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isMinting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        铸造中...
                      </>
                    ) : (
                      <>
                        <Ticket className="w-5 h-5" />
                        铸造门票
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
          
          <div className="glass-effect rounded-3xl p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-4">实时频谱可视化</h2>
            <SpectrumVisualizer audioUrl={stage.audioUrl} />
          </div>
          
          {ticket && (
            <div className="glass-effect rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">实时聊天</h2>
                <span className="text-white/50 text-sm">与其他持票观众互动</span>
              </div>
              <ChatArea stageId={stage.id} compact />
            </div>
          )}
        </div>
      </div>
      
      {showTicket && ticket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="relative">
            <button
              onClick={() => setShowTicket(false)}
              className="absolute -top-12 right-0 text-white/70 hover:text-white transition-colors"
            >
              ✕ 关闭
            </button>
            <TicketSVG 
              nickname={ticket.nickname}
              stageName={stage.name}
              date={formatDate(stage.performanceTime)}
              seatNumber={ticket.seatNumber}
              hash={ticket.hash}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default StageDetailPage
