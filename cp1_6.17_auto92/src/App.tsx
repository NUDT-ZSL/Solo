import React from 'react'
import Editor from './editor'
import Slider from './slider'
import { useAppStore } from './store'

const App: React.FC = () => {
  const isFullscreen = useAppStore((s) => s.isFullscreen)
  const theme = useAppStore((s) => s.getCurrentTheme())

  const layoutStyle: React.CSSProperties = {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#fafafa',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    overflow: 'hidden'
  }

  const headerStyle: React.CSSProperties = {
    padding: '14px 28px',
    background: '#fff',
    borderBottom: '1px solid #e9ecef',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    zIndex: 10,
    flexShrink: 0,
    transition: 'background-color 0.5s ease-in-out, border-color 0.5s ease-in-out'
  }

  const logoStyle: React.CSSProperties = {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.accent} 100%)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 700,
    fontSize: '16px',
    transition: 'background 0.5s ease-in-out'
  }

  const titleStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: 700,
    color: '#1a1a1a',
    margin: 0,
    lineHeight: 1.2,
    transition: 'color 0.5s ease-in-out'
  }

  const subtitleStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#888',
    margin: '2px 0 0 0',
    transition: 'color 0.5s ease-in-out'
  }

  const statusDotStyle: React.CSSProperties = {
    display: 'inline-block',
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: '#4CAF50',
    marginRight: '4px',
    transition: 'background-color 0.5s ease-in-out'
  }

  const statusTextStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    color: '#999',
    transition: 'color 0.5s ease-in-out'
  }

  const contentStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
    minHeight: 0,
    width: '100%',
    maxWidth: '100%',
    margin: '0 auto'
  }

  const editorPaneStyle: React.CSSProperties = {
    flex: '1 1 0',
    height: '100%',
    overflow: 'hidden',
    display: 'flex',
    minWidth: '380px'
  }

  const dividerStyle: React.CSSProperties = {
    width: '3px',
    background: '#E0E0E0',
    flexShrink: 0
  }

  const previewPaneStyle: React.CSSProperties = {
    flex: '1 1 0',
    height: '100%',
    overflow: 'hidden',
    display: 'flex',
    minWidth: '420px'
  }

  if (isFullscreen) {
    return (
      <div style={layoutStyle}>
        <Slider />
      </div>
    )
  }

  return (
    <div style={layoutStyle} className="app-container">
      <header style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={logoStyle}>S</div>
          <div>
            <h1 style={titleStyle}>SlideMaker</h1>
            <p style={subtitleStyle}>Markdown 转幻灯片演示文稿编辑器</p>
          </div>
        </div>
        <div style={statusTextStyle}>
          <span style={statusDotStyle} />
          实时预览已启用
        </div>
      </header>

      <div style={contentStyle} className="content-wrapper">
        <div style={editorPaneStyle} className="editor-pane">
          <Editor />
        </div>
        <div style={dividerStyle} className="divider" />
        <div style={previewPaneStyle} className="preview-pane">
          <Slider />
        </div>
      </div>

      <style>{`
        @keyframes slideFadeIn {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        * {
          box-sizing: border-box;
        }

        html, body, #root {
          width: 100%;
          height: 100%;
          margin: 0;
          padding: 0;
        }

        textarea::-webkit-scrollbar {
          width: 10px;
        }
        textarea::-webkit-scrollbar-track {
          background: #1e1e1e;
        }
        textarea::-webkit-scrollbar-thumb {
          background: #3e3e3e;
          border-radius: 5px;
        }
        textarea::-webkit-scrollbar-thumb:hover {
          background: #4e4e4e;
        }

        textarea:focus {
          outline: none;
        }

        textarea::placeholder {
          color: #555;
        }

        .line-numbers::-webkit-scrollbar {
          display: none;
        }

        @media (min-width: 1024px) {
          .content-wrapper {
            max-width: 2000px;
            margin: 0 auto;
            width: 100%;
            padding: 0 20px;
          }
          .editor-pane {
            flex: 0 0 50%;
            max-width: 50%;
          }
          .preview-pane {
            flex: 0 0 50%;
            max-width: 50%;
          }
        }

        @media (min-width: 1440px) {
          .content-wrapper {
            max-width: 2400px;
            padding: 0 40px;
          }
          .editor-pane {
            flex: 0 0 48%;
            max-width: 48%;
          }
          .preview-pane {
            flex: 0 0 52%;
            max-width: 52%;
          }
        }

        @media (min-width: 1920px) {
          .content-wrapper {
            max-width: 2800px;
            padding: 0 60px;
          }
          .editor-pane {
            flex: 0 0 45%;
            max-width: 45%;
          }
          .preview-pane {
            flex: 0 0 55%;
            max-width: 55%;
          }
        }

        @media (max-width: 1023px) {
          .content-wrapper {
            flex-direction: column;
            padding: 0;
          }
          .divider {
            width: 100% !important;
            height: 3px !important;
          }
          .editor-pane,
          .preview-pane {
            min-width: 100% !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          .editor-pane {
            flex: 0 0 45%;
            max-height: 45%;
          }
          .preview-pane {
            flex: 1 1 auto;
            min-height: 0;
          }
        }
      `}</style>
    </div>
  )
}

export default App
