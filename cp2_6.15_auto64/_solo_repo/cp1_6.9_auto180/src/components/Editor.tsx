import { useState, useEffect, useMemo } from 'react'
import { analyzeEmotion, hslToString, WEATHERS, EMOTIONS } from '../types'
import EmotionParticle from './EmotionParticle'

interface EditorProps {
  uuid: string
  onSave: (content: string, weather: string, mood: number) => Promise<void>
  readOnly?: boolean
}

function Editor({ uuid, onSave, readOnly = false }: EditorProps) {
  const [content, setContent] = useState('')
  const [weather, setWeather] = useState(WEATHERS[0].icon)
  const [mood, setMood] = useState(3)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  const emotion = useMemo(() => analyzeEmotion(content), [content])

  const primaryEmotionInfo = EMOTIONS.find(e => e.type === emotion.primaryEmotion)!

  const borderColor = content.trim().length > 0
    ? hslToString(emotion.hue, emotion.saturation, emotion.lightness, 0.9)
    : 'rgba(255,255,255,0.15)'

  const handleSubmit = async () => {
    if (!content.trim() || saving) return
    setSaving(true)
    setSavedMsg('')
    try {
      await onSave(content, weather, mood)
      setContent('')
      setSavedMsg('胶囊保存成功！')
      setTimeout(() => setSavedMsg(''), 2000)
    } catch (err) {
      console.error(err)
      setSavedMsg('保存失败，请重试')
      setTimeout(() => setSavedMsg(''), 2000)
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !readOnly) {
        handleSubmit()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, weather, mood, saving, readOnly])

  const renderStars = (value: number, onSelect?: (v: number) => void) => {
    const stars: JSX.Element[] = []
    for (let i = 1; i <= 5; i++) {
      let fill: 'full' | 'half' | 'empty' = 'empty'
      if (value >= i) fill = 'full'
      else if (value >= i - 0.5) fill = 'half'
      stars.push(
        <span
          key={i}
          onClick={() => onSelect?.(i)}
          style={{
            cursor: onSelect && !readOnly ? 'pointer' : 'default',
            fontSize: '26px',
            marginRight: '2px',
            userSelect: 'none',
            transition: 'transform 0.15s',
            display: 'inline-block',
          }}
          onMouseEnter={(e) => { if (onSelect && !readOnly) (e.currentTarget as HTMLElement).style.transform = 'scale(1.15)' }}
          onMouseLeave={(e) => { if (onSelect) (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
        >
          <span style={{ position: 'relative', display: 'inline-block' }}>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>★</span>
            <span
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                overflow: 'hidden',
                width: fill === 'full' ? '100%' : fill === 'half' ? '50%' : '0%',
                color: hslToString(emotion.hue, 90, 60, 1),
                textShadow: `0 0 8px ${hslToString(emotion.hue, 90, 60, 0.6)}`,
              }}
            >★</span>
          </span>
        </span>
      )
    }
    return stars
  }

  if (readOnly) {
    return (
      <div style={{
        height: '100%',
        padding: '40px 32px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '24px',
        backdropFilter: 'blur(10px)',
        background: 'rgba(255,255,255,0.04)',
        borderLeft: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{
          fontSize: '48px',
          opacity: 0.4,
        }}>🔒</div>
        <div style={{
          fontSize: '22px',
          fontWeight: 600,
          color: 'rgba(255,255,255,0.8)',
        }}>只读模式</div>
        <div style={{
          fontSize: '14px',
          color: 'rgba(255,255,255,0.5)',
          textAlign: 'center',
          maxWidth: '300px',
          lineHeight: 1.8,
        }}>
          这是一个分享的时空胶囊<br />
          您可以浏览和查看，但无法编辑
        </div>
        <div style={{
          marginTop: '16px',
          padding: '12px 20px',
          borderRadius: '10px',
          background: 'rgba(255,255,255,0.05)',
          fontSize: '12px',
          color: 'rgba(255,255,255,0.4)',
          fontFamily: 'monospace',
          wordBreak: 'break-all',
          maxWidth: '320px',
        }}>
          UUID: {uuid}
        </div>
      </div>
    )
  }

  return (
    <div style={{
      height: '100%',
      padding: '28px 30px',
      display: 'flex',
      flexDirection: 'column',
      gap: '18px',
      backdropFilter: 'blur(10px)',
      background: 'rgba(255,255,255,0.06)',
      borderLeft: '1px solid rgba(255,255,255,0.06)',
      overflowY: 'auto',
    }}>
      <div>
        <h2 style={{
          fontSize: '22px',
          fontWeight: 700,
          marginBottom: '4px',
          background: `linear-gradient(90deg, ${hslToString(emotion.hue, emotion.saturation, 65, 1)}, #fff)`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>今日情绪胶囊</h2>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
          写下此刻的心情，它将化为永恒的光粒
        </p>
      </div>

      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{
          fontSize: '13px',
          color: 'rgba(255,255,255,0.6)',
          padding: '6px 12px',
          borderRadius: '8px',
          background: hslToString(emotion.hue, emotion.saturation, 40, 0.2),
          border: `1px solid ${hslToString(emotion.hue, emotion.saturation, 50, 0.3)}`,
        }}>
          主情绪：<strong style={{ color: hslToString(emotion.hue, 90, 70, 1) }}>{primaryEmotionInfo.name}</strong>
        </div>
        <div style={{
          fontSize: '12px',
          color: 'rgba(255,255,255,0.5)',
        }}>
          强度 {emotion.intensity}/10
        </div>
      </div>

      <div style={{
        borderRadius: '12px',
        overflow: 'hidden',
        border: `1px solid ${hslToString(emotion.hue, emotion.saturation, 50, 0.25)}`,
      }}>
        <EmotionParticle
          hue={emotion.hue}
          saturation={emotion.saturation}
          lightness={emotion.lightness}
          intensity={emotion.intensity}
          width={360}
          height={160}
          playKey={content.length > 0 ? content.length : 0}
        />
      </div>

      <div>
        <label style={{
          display: 'block',
          fontSize: '13px',
          color: 'rgba(255,255,255,0.65)',
          marginBottom: '8px',
          fontWeight: 500,
        }}>心情指数</label>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '10px 14px',
          borderRadius: '10px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          {renderStars(mood, setMood)}
          <span style={{
            fontSize: '13px',
            color: 'rgba(255,255,255,0.5)',
            marginLeft: '8px',
          }}>
            {mood} 星
          </span>
        </div>
      </div>

      <div>
        <label style={{
          display: 'block',
          fontSize: '13px',
          color: 'rgba(255,255,255,0.65)',
          marginBottom: '8px',
          fontWeight: 500,
        }}>今日天气</label>
        <div style={{
          display: 'flex',
          gap: '6px',
          flexWrap: 'wrap',
          padding: '10px',
          borderRadius: '10px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          {WEATHERS.map(w => (
            <button
              key={w.icon}
              onClick={() => setWeather(w.icon)}
              title={w.name}
              style={{
                width: '42px',
                height: '42px',
                fontSize: '22px',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                background: weather === w.icon
                  ? hslToString(emotion.hue, emotion.saturation, 50, 0.3)
                  : 'rgba(255,255,255,0.03)',
                borderWidth: '2px',
                borderStyle: 'solid',
                borderColor: weather === w.icon
                  ? hslToString(emotion.hue, emotion.saturation, 60, 0.8)
                  : 'rgba(255,255,255,0.06)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (weather !== w.icon) {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'
                }
              }}
              onMouseLeave={(e) => {
                if (weather !== w.icon) {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'
                }
              }}
            >
              {w.icon}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '140px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
        }}>
          <label style={{
            fontSize: '13px',
            color: 'rgba(255,255,255,0.65)',
            fontWeight: 500,
          }}>日记内容</label>
          <span style={{
            fontSize: '12px',
            color: content.length > 480 ? '#ff7675' : 'rgba(255,255,255,0.4)',
            fontFamily: 'monospace',
          }}>
            {content.length}/500
          </span>
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, 500))}
          placeholder="今天发生了什么？写下你的情绪，让它化作光粒..."
          style={{
            flex: 1,
            resize: 'none',
            padding: '16px 18px',
            fontSize: '14px',
            lineHeight: 1.75,
            color: '#e0e0e0',
            background: 'rgba(0,0,0,0.25)',
            border: `2px solid ${borderColor}`,
            borderRadius: '12px',
            outline: 'none',
            boxShadow: content.trim().length > 0
              ? `0 0 20px ${hslToString(emotion.hue, emotion.saturation, 50, 0.2)}`
              : 'none',
            transition: 'border-color 0.3s, box-shadow 0.3s',
            fontFamily: 'inherit',
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
        <button
          onClick={handleSubmit}
          disabled={!content.trim() || saving}
          style={{
            flex: 1,
            padding: '13px 20px',
            fontSize: '15px',
            fontWeight: 600,
            color: '#fff',
            background: !content.trim() || saving
              ? 'rgba(255,255,255,0.08)'
              : `linear-gradient(135deg, ${hslToString(emotion.hue, emotion.saturation, 50, 1)}, ${hslToString((emotion.hue + 40) % 360, emotion.saturation, 50, 1)})`,
            border: 'none',
            borderRadius: '8px',
            cursor: !content.trim() || saving ? 'not-allowed' : 'pointer',
            transition: 'transform 0.1s, opacity 0.2s',
            opacity: !content.trim() || saving ? 0.6 : 1,
            letterSpacing: '1px',
          }}
          onMouseEnter={(e) => {
            if (content.trim() && !saving) {
              (e.currentTarget as HTMLElement).style.background = `linear-gradient(135deg, ${hslToString(emotion.hue, emotion.saturation, 55, 1)}, ${hslToString((emotion.hue + 40) % 360, emotion.saturation, 55, 1)})`
            }
          }}
          onMouseLeave={(e) => {
            if (content.trim() && !saving) {
              (e.currentTarget as HTMLElement).style.background = `linear-gradient(135deg, ${hslToString(emotion.hue, emotion.saturation, 50, 1)}, ${hslToString((emotion.hue + 40) % 360, emotion.saturation, 50, 1)})`
            }
          }}
          onMouseDown={(e) => {
            if (content.trim() && !saving) {
              (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'
            }
          }}
          onMouseUp={(e) => {
            (e.currentTarget as HTMLElement).style.transform = 'scale(1)'
          }}
          onMouseOut={(e) => {
            (e.currentTarget as HTMLElement).style.transform = 'scale(1)'
          }}
        >
          {saving ? '封装中...' : '✦ 封存为胶囊 ✦'}
        </button>
      </div>

      {savedMsg && (
        <div style={{
          padding: '10px 14px',
          textAlign: 'center',
          borderRadius: '8px',
          background: savedMsg.includes('成功')
            ? 'rgba(46, 213, 115, 0.15)'
            : 'rgba(255, 118, 117, 0.15)',
          color: savedMsg.includes('成功') ? '#2ed573' : '#ff7675',
          fontSize: '13px',
          fontWeight: 500,
          animation: 'fadeIn 0.3s',
        }}>
          {savedMsg}
        </div>
      )}

      <div style={{
        marginTop: 'auto',
        padding: '12px 14px',
        borderRadius: '10px',
        background: 'rgba(0,0,0,0.2)',
        border: '1px solid rgba(255,255,255,0.05)',
        fontSize: '11.5px',
        color: 'rgba(255,255,255,0.35)',
        lineHeight: 1.7,
      }}>
        <div>💡 情绪词汇会影响粒子颜色：</div>
        <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
          {EMOTIONS.slice(0, 6).map(e => (
            <span key={e.type} style={{
              padding: '3px 8px',
              borderRadius: '4px',
              background: hslToString(e.hue, 70, 45, 0.2),
              color: hslToString(e.hue, 80, 70, 1),
            }}>{e.name}</span>
          ))}
        </div>
        <div style={{ marginTop: '8px' }}>⌨️ Ctrl/Cmd + Enter 快速封存</div>
      </div>
    </div>
  )
}

export default Editor
