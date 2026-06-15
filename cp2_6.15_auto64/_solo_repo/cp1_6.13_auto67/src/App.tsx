import { useState, useEffect } from 'react'
import TemplateSelector from './templateSelector'
import Editor from './editor'
import ViewPage from './viewPage'
import { Template } from './mockData'

type Route =
  | { name: 'home' }
  | { name: 'editor'; template: Template }
  | { name: 'published'; shortId: string; showModal: boolean }
  | { name: 'view'; shortId: string }

function parseHash(): Route {
  const hash = window.location.hash.replace(/^#/, '')
  if (!hash || hash === '/') return { name: 'home' }
  if (hash.startsWith('/p/')) {
    const shortId = hash.slice(3)
    return { name: 'view', shortId }
  }
  return { name: 'home' }
}

export default function App() {
  const [route, setRoute] = useState<Route>(parseHash)
  const [publishedData, setPublishedData] = useState<{ shortId: string } | null>(null)

  useEffect(() => {
    const onHashChange = () => {
      setRoute(parseHash())
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const navigate = (path: string) => {
    window.location.hash = path
  }

  // 首页 - 模板选择
  if (route.name === 'home') {
    return (
      <TemplateSelector
        onSelect={(template) => {
          setRoute({ name: 'editor', template })
        }}
      />
    )
  }

  // 编辑页
  if (route.name === 'editor') {
    return (
      <>
        <Editor
          template={route.template}
          onBack={() => setRoute({ name: 'home' })}
          onPublished={(shortId) => {
            setPublishedData({ shortId })
            setRoute({ name: 'published', shortId, showModal: true })
          }}
        />
        {/* 发布成功弹窗 */}
        {publishedData && route.name === 'published' && route.showModal && (
          <div
            onClick={() => setRoute({ name: 'published', shortId: publishedData.shortId, showModal: false })}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(4px)',
              zIndex: 999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'fadeIn 0.2s ease-out'
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: 400,
                maxWidth: '90%',
                background: '#ffffff',
                borderRadius: 20,
                padding: 32,
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                textAlign: 'center',
                animation: 'scaleIn 0.25s ease-out'
              }}
            >
              <div style={{
                width: 72,
                height: 72,
                borderRadius: 20,
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 36,
                margin: '0 auto 20px',
                boxShadow: '0 8px 24px rgba(59,130,246,0.35)'
              }}>
                🎉
              </div>
              <h2 style={{
                fontSize: 24,
                fontWeight: 800,
                color: '#1e293b',
                marginBottom: 8
              }}>
                海报发布成功！
              </h2>
              <p style={{
                fontSize: 14,
                color: '#64748b',
                marginBottom: 20,
                lineHeight: 1.6
              }}>
                已生成专属短链接，分享给朋友们参加活动吧
              </p>

              <div style={{
                background: '#f1f5f9',
                borderRadius: 12,
                padding: '14px 16px',
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                justifyContent: 'space-between'
              }}>
                <div style={{
                  flex: 1,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#334155',
                  textAlign: 'left',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {window.location.origin}/#/p/{publishedData.shortId}
                </div>
                <button
                  onClick={() => {
                    const link = `${window.location.origin}/#/p/${publishedData.shortId}`
                    navigator.clipboard?.writeText(link)
                    alert('链接已复制到剪贴板！')
                  }}
                  style={{
                    padding: '8px 14px',
                    background: '#3b82f6',
                    color: '#ffffff',
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 600,
                    flexShrink: 0
                  }}
                >
                  复制
                </button>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => {
                    setRoute({ name: 'editor', template: route.template })
                  }}
                  style={{
                    flex: 1,
                    padding: '13px',
                    background: '#f1f5f9',
                    color: '#475569',
                    borderRadius: 12,
                    fontSize: 14,
                    fontWeight: 600
                  }}
                >
                  继续编辑
                </button>
                <button
                  onClick={() => navigate(`/p/${publishedData.shortId}`)}
                  style={{
                    flex: 1,
                    padding: '13px',
                    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                    color: '#ffffff',
                    borderRadius: 12,
                    fontSize: 14,
                    fontWeight: 700,
                    boxShadow: '0 4px 16px rgba(59,130,246,0.35)'
                  }}
                >
                  预览海报 →
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  // 已发布弹窗关闭后仍保持在编辑页
  if (route.name === 'published') {
    return null
  }

  // 查看页
  if (route.name === 'view') {
    return (
      <ViewPage
        shortId={route.shortId}
        onBackToHome={() => navigate('/')}
      />
    )
  }

  return null
}
