import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { TemplateElement } from './mockData'

interface ViewPageProps {
  shortId: string
  onBackToHome: () => void
}

interface PosterData {
  shortId: string
  templateId: string
  gradient: { from: string; to: string }
  elements: TemplateElement[]
  width: number
  height: number
  registrationCount?: number
}

const CANVAS_W = 600
const CANVAS_H = 900

export default function ViewPage({ shortId, onBackToHome }: ViewPageProps) {
  const [poster, setPoster] = useState<PosterData | null>(null)
  const [loading, setLoading] = useState(true)
  const [registrationCount, setRegistrationCount] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [isRegistered, setIsRegistered] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const [showToolbarMobile, setShowToolbarMobile] = useState(false)
  const [formData, setFormData] = useState({ name: '', phone: '', peopleCount: '1' })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [showToast, setShowToast] = useState('')
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 响应式检测
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // 加载海报数据
  useEffect(() => {
    const loadPoster = async () => {
      try {
        const res = await axios.get(`/api/poster/${shortId}`)
        if (res.data.success) {
          const data = res.data.data
          setPoster(data)
          setRegistrationCount(data.registrationCount || 0)
        }
      } catch (err) {
        console.error('加载海报失败:', err)
      } finally {
        setLoading(false)
      }
    }
    loadPoster()
  }, [shortId])

  // 每秒轮询报名数
  useEffect(() => {
    if (!poster) return

    const pollCount = async () => {
      try {
        const res = await axios.get(`/api/poster/${shortId}/count`)
        if (res.data.success) {
          setRegistrationCount(res.data.data.count)
        }
      } catch (err) {
        // 静默失败
      }
    }

    pollTimerRef.current = setInterval(pollCount, 1000)
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    }
  }, [shortId, poster])

  // 提交报名
  const handleSubmit = async () => {
    setFormError('')
    if (!formData.name.trim()) { setFormError('请输入姓名'); return }
    if (!/^1\d{10}$/.test(formData.phone.trim())) { setFormError('请输入正确的手机号'); return }
    if (!formData.peopleCount || Number(formData.peopleCount) < 1) { setFormError('请输入正确的人数'); return }

    setSubmitting(true)
    try {
      const res = await axios.post(`/api/register/${shortId}`, formData)
      if (res.data.success) {
        setIsRegistered(true)
        setShowForm(false)
        setRegistrationCount(res.data.data.count)
        setShowToast(res.data.data.alreadyRegistered ? '您已经报名过了' : '报名成功！')
        setTimeout(() => setShowToast(''), 2500)
      }
    } catch (err: any) {
      setFormError(err?.response?.data?.error || '报名失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    )
  }

  if (!poster) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        gap: 16
      }}>
        <div style={{ fontSize: 56 }}>😢</div>
        <div style={{ fontSize: 18, color: '#64748b' }}>海报不存在或已被删除</div>
        <button onClick={onBackToHome} style={{
          padding: '10px 24px',
          background: '#3b82f6',
          color: '#fff',
          borderRadius: 12,
          fontSize: 14,
          fontWeight: 600
        }}>
          返回首页
        </button>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: isMobile ? '#f3f4f6' : '#e5e7eb',
      padding: isMobile ? 0 : '30px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      position: 'relative',
      overflowX: 'hidden'
    }}>
      {/* 顶部导航 - 桌面端 */}
      {!isMobile && (
        <div style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          width: '100%',
          maxWidth: 720,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          marginBottom: 20,
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(10px)',
          borderRadius: 16,
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)'
        }}>
          <button onClick={onBackToHome} style={{
            background: 'transparent',
            color: '#475569',
            fontSize: 13,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            borderRadius: 10
          }}>
            ← 创建我的海报
          </button>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 13,
            color: '#64748b',
            fontWeight: 500
          }}>
            <span>👥</span>
            <span>已有 <b style={{ color: '#3b82f6', fontSize: 15 }}>{registrationCount}</b> 人报名</span>
          </div>
        </div>
      )}

      {/* 海报画布 */}
      <div style={{
        width: isMobile ? '100%' : 600,
        maxWidth: isMobile ? '100%' : 600,
        position: 'relative',
        flexShrink: 0
      }}>
        <div
          style={{
            width: '100%',
            aspectRatio: `${CANVAS_W} / ${CANVAS_H}`,
            background: `linear-gradient(160deg, ${poster.gradient.from} 0%, ${poster.gradient.to} 100%)`,
            position: 'relative',
            overflow: 'hidden',
            boxShadow: isMobile ? 'none' : '0 30px 80px rgba(0,0,0,0.2)',
            borderRadius: isMobile ? 0 : 20
          }}
        >
          {[...poster.elements].sort((a, b) => a.zIndex - b.zIndex).map((el) => (
            <div
              key={el.id}
              style={{
                position: 'absolute',
                left: `${(el.x / CANVAS_W) * 100}%`,
                top: `${(el.y / CANVAS_H) * 100}%`,
                width: `${(el.width / CANVAS_W) * 100}%`,
                height: `${(el.height / CANVAS_H) * 100}%`,
                opacity: el.opacity,
                zIndex: el.zIndex
              }}
            >
              {el.type === 'text' && (
                <div style={{
                  width: '100%',
                  height: '100%',
                  fontSize: `${(el.fontSize || 20) / CANVAS_W * 100}vw`,
                  fontWeight: el.fontWeight || 400,
                  color: el.color || '#1f2937',
                  lineHeight: 1.3,
                  display: 'flex',
                  alignItems: 'center',
                  overflow: 'hidden',
                  wordBreak: 'break-word'
                }}>
                  {el.content || ''}
                </div>
              )}
              {el.type === 'image' && el.src && (
                <img
                  src={el.src}
                  alt=""
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: 8
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 移动端底部工具栏 - 折叠为浮动按钮 */}
      {isMobile && (
        <>
          <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(to top, rgba(255,255,255,1) 60%, rgba(255,255,255,0))',
            padding: '24px 20px 20px',
            zIndex: 40,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            pointerEvents: 'none'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 12,
              color: '#64748b',
              pointerEvents: 'auto'
            }}>
              <button
                onClick={onBackToHome}
                style={{
                  padding: '6px 14px',
                  background: 'rgba(255,255,255,0.9)',
                  borderRadius: 20,
                  fontSize: 12,
                  color: '#475569',
                  fontWeight: 500,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                }}
              >
                🏠 首页
              </button>
              <div style={{
                padding: '6px 14px',
                background: 'rgba(255,255,255,0.9)',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                color: '#475569',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
              }}>
                👥 {registrationCount} 人已报名
              </div>
            </div>
          </div>

          {/* 展开工具栏按钮 */}
          <button
            onClick={() => setShowToolbarMobile((v) => !v)}
            style={{
              position: 'fixed',
              bottom: 80,
              left: 16,
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: '#ffffff',
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
              zIndex: 45,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              transform: showToolbarMobile ? 'rotate(45deg)' : 'rotate(0)',
              transition: 'transform ease-out 0.3s'
            }}
          >
            ⚙️
          </button>

          {/* 移动端浮动展开的工具栏 */}
          {showToolbarMobile && (
            <div style={{
              position: 'fixed',
              bottom: 136,
              left: 16,
              background: '#ffffff',
              borderRadius: 16,
              padding: 12,
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
              zIndex: 45,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              minWidth: 150,
              animation: 'fadeIn 0.2s ease-out'
            }} onClick={(e) => e.stopPropagation()}>
              <button onClick={onBackToHome} style={{
                padding: '10px 12px',
                borderRadius: 10,
                background: '#f8fafc',
                fontSize: 13,
                color: '#334155',
                textAlign: 'left',
                fontWeight: 500
              }}>
                🎨 创建海报
              </button>
              <button onClick={() => {
                navigator.clipboard?.writeText(window.location.href)
                setShowToast('链接已复制！')
                setTimeout(() => setShowToast(''), 2000)
              }} style={{
                padding: '10px 12px',
                borderRadius: 10,
                background: '#f8fafc',
                fontSize: 13,
                color: '#334155',
                textAlign: 'left',
                fontWeight: 500
              }}>
                📋 复制链接
              </button>
            </div>
          )}
        </>
      )}

      {/* 右下角报名按钮 */}
      <button
        onClick={() => !isRegistered && setShowForm(true)}
        disabled={isRegistered}
        style={{
          position: 'fixed',
          right: isMobile ? 16 : 30,
          bottom: isMobile ? 24 : 30,
          padding: isRegistered
            ? (isMobile ? '12px 20px' : '14px 28px')
            : (isMobile ? '14px 22px' : '16px 32px'),
          background: isRegistered
            ? 'linear-gradient(135deg, #9ca3af, #6b7280)'
            : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
          color: '#ffffff',
          borderRadius: 16,
          fontSize: isMobile ? 14 : 15,
          fontWeight: 700,
          boxShadow: isRegistered
            ? '0 4px 16px rgba(156,163,175,0.4)'
            : '0 6px 24px rgba(59,130,246,0.45)',
          zIndex: 60,
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? 6 : 8,
          animation: isRegistered ? 'none' : 'pulse 2s ease-out infinite'
        }}
      >
        {isRegistered ? (
          <>
            ✅ 已报名
            <span style={{
              background: 'rgba(255,255,255,0.2)',
              padding: '2px 8px',
              borderRadius: 10,
              fontSize: isMobile ? 11 : 12,
              fontWeight: 600
            }}>
              {registrationCount}人
            </span>
          </>
        ) : (
          <>
            🎉 我要参加
            <span style={{
              background: 'rgba(255,255,255,0.2)',
              padding: '2px 8px',
              borderRadius: 10,
              fontSize: isMobile ? 11 : 12,
              fontWeight: 600
            }}>
              {registrationCount}人
            </span>
          </>
        )}
      </button>

      {/* 报名表单弹窗 */}
      {showForm && (
        <div
          onClick={() => setShowForm(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: isMobile ? '100%' : 420,
              maxWidth: '100%',
              background: '#ffffff',
              borderRadius: isMobile ? '24px 24px 0 0' : 16,
              padding: isMobile ? '28px 24px 36px' : 28,
              boxShadow: isMobile ? '0 -10px 40px rgba(0,0,0,0.2)' : '0 20px 60px rgba(0,0,0,0.3)',
              transform: showForm ? 'translateY(0)' : 'translateY(100%)',
              transition: 'transform ease-out 0.3s',
              animation: isMobile ? 'slideUp 0.3s ease-out' : 'scaleIn 0.2s ease-out'
            }}
          >
            {!isMobile && (
              <button
                onClick={() => setShowForm(false)}
                style={{
                  position: 'absolute',
                  top: 14,
                  right: 14,
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: '#f1f5f9',
                  color: '#64748b',
                  fontSize: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ✕
              </button>
            )}

            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: 'linear-gradient(135deg, #dbeafe, #ede9fe)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                margin: '0 auto 12px'
              }}>
                🎊
              </div>
              <h3 style={{
                fontSize: 20,
                fontWeight: 800,
                color: '#1e293b',
                marginBottom: 6
              }}>
                活动报名
              </h3>
              <p style={{ fontSize: 13, color: '#64748b' }}>
                填写以下信息即可报名参加
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  姓名 *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="请输入您的姓名"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: `1.5px solid ${formError && !formData.name ? '#ef4444' : '#e2e8f0'}`,
                    borderRadius: 12,
                    fontSize: 14,
                    transition: 'all ease-out 0.3s',
                    background: '#f9fafb'
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#3b82f6')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  手机号 *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="请输入11位手机号"
                  maxLength={11}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: `1.5px solid ${formError && !/^1\d{10}$/.test(formData.phone) ? '#ef4444' : '#e2e8f0'}`,
                    borderRadius: 12,
                    fontSize: 14,
                    transition: 'all ease-out 0.3s',
                    background: '#f9fafb'
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#3b82f6')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  报名人数 *
                </label>
                <input
                  type="number"
                  value={formData.peopleCount}
                  onChange={(e) => setFormData({ ...formData, peopleCount: e.target.value })}
                  min={1}
                  max={20}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: `1.5px solid ${formError && Number(formData.peopleCount) < 1 ? '#ef4444' : '#e2e8f0'}`,
                    borderRadius: 12,
                    fontSize: 14,
                    transition: 'all ease-out 0.3s',
                    background: '#f9fafb'
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#3b82f6')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
                />
              </div>

              {formError && (
                <div style={{
                  padding: '10px 12px',
                  background: '#fef2f2',
                  color: '#dc2626',
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 500
                }}>
                  ⚠️ {formError}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  marginTop: 6,
                  padding: '14px',
                  background: submitting
                    ? '#93c5fd'
                    : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                  color: '#ffffff',
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: 700,
                  boxShadow: submitting
                    ? 'none'
                    : '0 4px 16px rgba(59,130,246,0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }}
              >
                {submitting ? (
                  <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> 提交中...</>
                ) : (
                  '✅ 确认报名'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast 提示 */}
      {showToast && (
        <div style={{
          position: 'fixed',
          top: 30,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(30,41,59,0.92)',
          color: '#ffffff',
          padding: '10px 20px',
          borderRadius: 24,
          fontSize: 13,
          fontWeight: 500,
          zIndex: 200,
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          animation: 'fadeInDown 0.3s ease-out'
        }}>
          {showToast}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 6px 24px rgba(59,130,246,0.45); }
          50% { transform: scale(1.04); box-shadow: 0 8px 32px rgba(59,130,246,0.6); }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeInDown {
          from { opacity: 0; transform: translate(-50%, -20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  )
}
