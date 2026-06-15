import React from 'react'
import TimelineEditor from './components/TimelineEditor'
import SubtitlePreview from './components/SubtitlePreview'

const App: React.FC = () => {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#121212',
        padding: '24px',
        boxSizing: 'border-box',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <header
          style={{
            textAlign: 'center',
            marginBottom: '28px',
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: '28px',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #b388ff 0%, #4db6ac 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '-0.5px',
            }}
          >
            歌词排版与动态字幕生成器
          </h1>
          <p
            style={{
              margin: '8px 0 0 0',
              color: '#757575',
              fontSize: '14px',
            }}
          >
            上传歌词 · 拖拽调整时间轴 · 实时预览 · 一键导出
          </p>
        </header>

        <main
          style={{
            display: 'flex',
            gap: '20px',
            alignItems: 'flex-start',
          }}
        >
          <TimelineEditor />
          <SubtitlePreview />
        </main>
      </div>
    </div>
  )
}

export default App
