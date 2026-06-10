import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Share2 } from 'lucide-react'
import * as api from '../api'
import type { FilmRoll } from '../types'

export function FilmRollList() {
  const navigate = useNavigate()
  const [filmRolls, setFilmRolls] = useState<FilmRoll[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchFilmRolls = async () => {
      try {
        setLoading(true)
        const data = await api.getRolls()
        setFilmRolls(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error('Failed to fetch film rolls:', err)
        setFilmRolls([])
      } finally {
        setLoading(false)
      }
    }
    fetchFilmRolls()
  }, [])

  const handleAddClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = e.currentTarget
    const rect = btn.getBoundingClientRect()
    const ripple = document.createElement('div')
    ripple.className = 'ripple-effect'
    const size = Math.max(rect.width, rect.height)
    ripple.style.width = ripple.style.height = `${size}px`
    ripple.style.left = `${e.clientX - rect.left - size / 2}px`
    ripple.style.top = `${e.clientY - rect.top - size / 2}px`
    btn.appendChild(ripple)
    setTimeout(() => {
      ripple.remove()
    }, 300)
    setTimeout(() => {
      navigate('/create')
    }, 150)
  }

  const handleShare = async (e: React.MouseEvent, shareLink: string) => {
    e.stopPropagation()
    const url = `${location.origin}/#/share/${shareLink}`
    try {
      await navigator.clipboard.writeText(url)
      alert('分享链接已复制到剪贴板')
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = url
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      alert('分享链接已复制到剪贴板')
    }
  }

  return (
    <div className="linen-bg min-h-screen relative" style={{ paddingTop: '120px', paddingLeft: '20px', paddingRight: '20px' }}>
      <nav
        className="glass fixed top-0 left-0 right-0 z-40 flex items-center justify-between"
        style={{ height: '72px', paddingLeft: '32px', paddingRight: '32px' }}
      >
        <h1 className="gradient-gold-text font-bold text-[28px]">胶卷回忆录</h1>
        <button
          onClick={handleAddClick}
          className="ripple-wrap gradient-gold rounded-full flex items-center justify-center cursor-pointer text-white text-2xl font-light select-none"
          style={{ width: '48px', height: '48px' }}
        >
          +
        </button>
      </nav>

      <div className="max-w-[1200px] mx-auto relative z-10">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="spinner-half" style={{ width: '40px', height: '40px' }}></div>
          </div>
        ) : filmRolls.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <img
              src="/favicon.svg"
              alt="empty"
              className="w-40 h-40 mb-6 opacity-60"
            />
            <p className="text-[#8A8A8A] text-[18px] font-light">还没有胶卷，点击右上角 + 创建第一卷吧</p>
          </div>
        ) : (
          <div
            className="grid gap-6 justify-center"
            style={{
              gridTemplateColumns: 'repeat(auto-fill, 280px)',
            }}
          >
            {filmRolls.map((roll, idx) => (
              <div
                key={roll.id}
                className="card-film stagger-in bg-white rounded-[12px] overflow-hidden flex flex-col relative"
                style={{
                  width: '280px',
                  height: '200px',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
                  animationDelay: `${idx * 0.15}s`,
                  ['@media (max-width: 768px)' as any]: {
                    width: 'calc(100vw - 40px)',
                    margin: 'auto',
                  },
                }}
              >
                <button
                  onClick={(e) => handleShare(e, roll.shareLink)}
                  className="absolute top-2 right-2 z-20 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center cursor-pointer hover:bg-white transition-colors shadow-sm"
                  title="分享"
                >
                  <Share2 size={14} className="text-[#8B6914]" />
                </button>

                <div className="thumb-wrap relative overflow-hidden" style={{ height: '60%' }}>
                  <img
                    src={roll.photos?.[0]?.url || '/favicon.svg'}
                    alt={roll.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="overlay absolute inset-0 flex items-center justify-center">
                    <button
                      onClick={() => navigate(`/edit/${roll.id}`)}
                      className="rounded-[6px] bg-white text-[#2C2C2C] text-[16px] px-4 py-2 font-medium cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      查看
                    </button>
                  </div>
                </div>

                <div className="flex flex-col justify-between" style={{ padding: '16px', height: '40%' }}>
                  <h3 className="text-[20px] font-light truncate" style={{ color: '#2C2C2C' }}>
                    {roll.title}
                  </h3>
                  <p className="text-[14px]" style={{ color: '#8A8A8A' }}>
                    共{roll.photos?.length || 0}张照片
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .max-w-\\[1200px\\] > div.grid {
            grid-template-columns: 1fr !important;
          }
          .max-w-\\[1200px\\] .card-film {
            width: calc(100vw - 40px) !important;
            margin: 0 auto !important;
          }
        }
      `}</style>
    </div>
  )
}

export default FilmRollList
