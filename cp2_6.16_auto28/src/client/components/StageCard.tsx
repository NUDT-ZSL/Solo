import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Play, Pause, Clock, Calendar } from 'lucide-react'
import type { Stage } from '../../shared/types'

interface StageCardProps {
  stage: Stage
}

const StageCard = ({ stage }: StageCardProps) => {
  const [isHovering, setIsHovering] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0.3
    }
  }, [])

  useEffect(() => {
    if (!audioRef.current) return
    
    if (isHovering && stage.audioUrl) {
      audioRef.current.play().then(() => {
        setIsPlaying(true)
      }).catch(() => {
        setIsPlaying(false)
      })
    } else {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlaying(false)
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
      setIsPlaying(false)
    }
  }, [isHovering, stage.audioUrl])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric'
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getPerformanceStatus = () => {
    const now = new Date()
    const perfTime = new Date(stage.performanceTime)
    const diffHours = (perfTime.getTime() - now.getTime()) / (1000 * 60 * 60)
    
    if (diffHours < 0 && diffHours > -2) return { text: '正在演出', color: '#00ff88' }
    if (diffHours < 24) return { text: '即将开始', color: '#ffaa00' }
    return { text: '即将到来', color: '#00e5ff' }
  }

  const status = getPerformanceStatus()

  return (
    <Link 
      to={`/stage/${stage.id}`}
      className="gradient-border block cursor-pointer"
      style={{ width: '280px', height: '360px' }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div 
        className="w-full h-full rounded-2xl overflow-hidden relative"
        style={{ 
          background: `linear-gradient(135deg, ${stage.backgroundColor}dd 0%, #0d0221 100%)`,
        }}
      >
        <audio ref={audioRef} src={stage.audioUrl} loop />
        
        <div className="absolute inset-0 overflow-hidden">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full opacity-30"
              style={{
                width: `${4 + Math.random() * 8}px`,
                height: `${4 + Math.random() * 8}px`,
                backgroundColor: stage.backgroundColor,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 2}s`
              }}
            />
          ))}
        </div>

        <div className="relative h-full flex flex-col justify-between p-5">
          <div className="flex justify-between items-start">
            <div 
              className="w-16 h-16 rounded-xl overflow-hidden border-2 border-white/30"
              style={{ backgroundColor: stage.backgroundColor }}
            >
              <img 
                src={stage.artistAvatar} 
                alt={stage.artistName}
                className="w-full h-full object-cover"
              />
            </div>
            <div 
              className="px-3 py-1 rounded-full text-xs font-medium"
              style={{ backgroundColor: status.color + '30', color: status.color }}
            >
              {status.text}
            </div>
          </div>

          <div className="glass-effect rounded-xl p-4">
            <h3 className="text-white font-bold text-lg mb-1">{stage.name}</h3>
            <p className="text-white/70 text-sm mb-3">{stage.artistName}</p>
            
            <div className="flex items-center gap-4 text-white/50 text-xs">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(stage.performanceTime)}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTime(stage.performanceTime)}
              </div>
            </div>
          </div>

          <div className={`flex items-center justify-center gap-2 transition-all duration-300 ${isHovering ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {isPlaying ? (
              <Pause className="w-6 h-6 text-white" />
            ) : (
              <Play className="w-6 h-6 text-white" />
            )}
            <span className="text-white text-sm font-medium">
              {isPlaying ? '正在试听' : '点击试听'}
            </span>
          </div>
        </div>

        {isPlaying && (
          <div className="absolute bottom-4 left-4 right-4 flex items-end gap-1 h-8 justify-center">
            {Array.from({ length: 32 }).map((_, i) => (
              <div
                key={i}
                className="w-1 rounded-full"
                style={{
                  background: 'linear-gradient(to top, #e040fb, #00e5ff)',
                  height: `${30 + Math.random() * 70}%`,
                  animation: `pulse 0.5s ease-in-out infinite`,
                  animationDelay: `${i * 0.03}s`
                }}
              />
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}

export default StageCard
