import { useEffect, useState } from 'react'
import axios from 'axios'
import { Template } from './mockData'

interface TemplateSelectorProps {
  onSelect: (template: Template) => void
}

export default function TemplateSelector({ onSelect }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [flippedCard, setFlippedCard] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await axios.get('/api/templates')
        if (res.data.success) {
          setTemplates(res.data.data)
        }
      } catch (err) {
        console.error('加载模板失败:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchTemplates()
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', padding: '40px 20px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '50px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            background: 'rgba(255,255,255,0.7)',
            padding: '8px 18px',
            borderRadius: '20px',
            marginBottom: '16px',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)'
          }}>
            <span style={{ fontSize: '20px' }}>🎨</span>
            <span style={{ fontSize: '14px', color: '#4b5563', fontWeight: 500 }}>EventCanva 海报设计工具</span>
          </div>
          <h1 style={{
            fontSize: '42px',
            fontWeight: 800,
            color: '#1e293b',
            marginBottom: '14px',
            letterSpacing: '-0.5px'
          }}>
            选择一个模板开始创作
          </h1>
          <p style={{ fontSize: '17px', color: '#64748b', lineHeight: 1.6 }}>
            3 款精心设计的海报模板，hover 卡片即可预览详情，点击立即使用
          </p>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '40px',
          flexWrap: 'wrap',
          padding: '20px 0'
        }} className="template-container">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              className={`template-card ${flippedCard === tpl.id ? 'flipped' : ''}`}
              onMouseEnter={() => setFlippedCard(tpl.id)}
              onMouseLeave={() => setFlippedCard(null)}
              onClick={() => onSelect(tpl)}
            >
              {/* 正面 - 预览图 */}
              <div
                className="template-card-face front"
                style={{
                  background: `linear-gradient(160deg, ${tpl.gradient.from} 0%, ${tpl.gradient.to} 100%)`,
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                {tpl.elements.map((el) => {
                  const scaleX = 220 / 600
                  const scaleY = 330 / 900
                  if (el.type === 'text') {
                    return (
                      <div
                        key={el.id}
                        style={{
                          position: 'absolute',
                          left: el.x * scaleX,
                          top: el.y * scaleY,
                          width: el.width * scaleX,
                          height: el.height * scaleY,
                          fontSize: (el.fontSize || 20) * scaleX,
                          fontWeight: el.fontWeight || 400,
                          color: el.color || '#1f2937',
                          lineHeight: 1.3,
                          display: 'flex',
                          alignItems: 'center',
                          opacity: el.opacity,
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {el.content}
                      </div>
                    )
                  }
                  if (el.type === 'image' && el.src) {
                    return (
                      <img
                        key={el.id}
                        src={el.src}
                        alt=""
                        style={{
                          position: 'absolute',
                          left: el.x * scaleX,
                          top: el.y * scaleY,
                          width: el.width * scaleX,
                          height: el.height * scaleY,
                          objectFit: 'cover',
                          borderRadius: '6px',
                          opacity: el.opacity
                        }}
                      />
                    )
                  }
                  if (el.type === 'image' && !el.src) {
                    return (
                      <div
                        key={el.id}
                        style={{
                          position: 'absolute',
                          left: el.x * scaleX,
                          top: el.y * scaleY,
                          width: el.width * scaleX,
                          height: el.height * scaleY,
                          background: 'rgba(255,255,255,0.35)',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'rgba(0,0,0,0.25)',
                          fontSize: '16px',
                          opacity: el.opacity
                        }}
                      >
                        🖼️
                      </div>
                    )
                  }
                  return null
                })}
              </div>

              {/* 背面 - 详情信息 */}
              <div className="template-card-face back">
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  background: `linear-gradient(135deg, ${tpl.gradient.from}, ${tpl.gradient.to})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '26px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}>
                  {tpl.id === 'template-1' ? '🌿' : tpl.id === 'template-2' ? '🧡' : '💼'}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                    {tpl.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                    600 × 900 px
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: tpl.gradient.from,
                    border: '2px solid #ffffff',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
                  }} />
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: tpl.gradient.to,
                    border: '2px solid #ffffff',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
                  }} />
                </div>
                <div style={{
                  marginTop: 'auto',
                  width: '100%',
                  padding: '12px 0',
                  background: 'linear-gradient(135deg, #dbeafe, #ede9fe)',
                  borderRadius: '12px',
                  textAlign: 'center',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#1e40af',
                  letterSpacing: '0.5px'
                }}>
                  点击使用 →
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{
          marginTop: '60px',
          textAlign: 'center',
          display: 'flex',
          justifyContent: 'center',
          gap: '40px',
          flexWrap: 'wrap'
        }}>
          {[
            { icon: '⚡', title: '快速创建', desc: '3分钟生成精美海报' },
            { icon: '🎯', title: '无需设计', desc: '拖动即可编辑排版' },
            { icon: '📱', title: '一键分享', desc: '生成短链接随时传播' }
          ].map((item, idx) => (
            <div key={idx} style={{
              background: 'rgba(255,255,255,0.6)',
              backdropFilter: 'blur(8px)',
              padding: '18px 24px',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
            }}>
              <span style={{ fontSize: '28px' }}>{item.icon}</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', marginBottom: '2px' }}>{item.title}</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
