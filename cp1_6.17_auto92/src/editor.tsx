import React, { useMemo, useRef } from 'react'
import { useAppStore } from './store'
import { themes } from './theme'
import { parseMarkdown, renderContent } from './parser'

interface EditorProps {
  onExportSuccess?: () => void
}

const Editor: React.FC<EditorProps> = ({ onExportSuccess }) => {
  const {
    content,
    setContent,
    themeIndex,
    setThemeIndex,
    getCurrentTheme,
    slides,
    isExporting,
    setIsExporting
  } = useAppStore()

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [exportProgress, setExportProgress] = React.useState(0)

  const theme = getCurrentTheme()
  const lineNumbers = useMemo(() => {
    const lines = content.split('\n').length
    return Array.from({ length: lines }, (_, i) => i + 1)
  }, [content])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
  }

  const handleScroll = () => {
    if (textareaRef.current) {
      const lineNumbersEl = textareaRef.current.parentElement?.querySelector('.line-numbers') as HTMLDivElement | null
      if (lineNumbersEl) {
        lineNumbersEl.scrollTop = textareaRef.current.scrollTop
      }
    }
  }

  const buildExportHTML = (): string => {
    const slidesHTML = slides.map((slide, idx) => {
      const linesHTML = slide.lines.map((line) => {
        switch (line.type) {
          case 'h1':
            return `<h1 class="sm-h1" style="color:${theme.titleColor};border-bottom:3px solid ${theme.primary}">${renderContent(line.content)}</h1>`
          case 'h2':
            return `<h2 class="sm-h2" style="color:${theme.titleColor}">${renderContent(line.content)}</h2>`
          case 'h3':
            return `<h3 class="sm-h3" style="color:${theme.primary}">${renderContent(line.content)}</h3>`
          case 'list':
            return `<div class="sm-list" style="color:${theme.textColor}"><span class="sm-bullet" style="color:${theme.primary}">•</span><span>${renderContent(line.content)}</span></div>`
          case 'code':
            return `<div class="sm-code">${line.content}</div>`
          case 'text':
            return `<p class="sm-text" style="color:${theme.textColor}">${renderContent(line.content)}</p>`
          case 'empty':
            return `<div class="sm-empty"></div>`
          default:
            return ''
        }
      }).join('')
      return `<div class="sm-slide" data-idx="${idx}" style="background:${theme.background}">${linesHTML}</div>`
    }).join('')

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SlideMaker Export</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
      background: #1a1a1a;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .sm-container {
      position: relative;
      width: min(90vw, calc(85vh * 16 / 9));
      aspect-ratio: 16/9;
    }
    .sm-slide {
      width: 100%;
      height: 100%;
      border-radius: 8px;
      padding: 60px 70px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
      display: none;
      flex-direction: column;
      opacity: 0;
      transform: translateX(30px);
      animation: smFadeIn 0.4s ease-out forwards;
    }
    .sm-slide.active { display: flex; }
    @keyframes smFadeIn {
      to { opacity: 1; transform: translateX(0); }
    }
    .sm-h1 {
      font-size: 2.5rem;
      font-weight: 700;
      padding-bottom: 12px;
      margin-bottom: 24px;
      margin-top: 8px;
    }
    .sm-h2 {
      font-size: 1.8rem;
      font-weight: 600;
      margin-bottom: 16px;
      margin-top: 8px;
    }
    .sm-h3 {
      font-size: 1.3rem;
      font-weight: 600;
      margin-bottom: 12px;
      margin-top: 8px;
    }
    .sm-text {
      font-size: 1.1rem;
      line-height: 1.8;
      margin: 8px 0;
    }
    .sm-list {
      font-size: 1.1rem;
      padding-left: 28px;
      position: relative;
      margin: 8px 0;
    }
    .sm-bullet {
      position: absolute;
      left: 8px;
      font-weight: bold;
    }
    .sm-code {
      display: inline-block;
      background: #f5f5f5;
      padding: 4px 10px;
      border-radius: 4px;
      font-family: Consolas, Monaco, monospace;
      font-size: 1rem;
      color: #c7254e;
      margin: 8px 0;
    }
    .sm-empty { height: 12px; }
    .sm-nav {
      position: fixed;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 16px;
      align-items: center;
      z-index: 100;
    }
    .sm-btn {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      border: none;
      cursor: pointer;
      background: ${theme.primary};
      color: #fff;
      font-size: 22px;
      font-weight: bold;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .sm-btn:disabled { background: rgba(255,255,255,0.15); cursor: not-allowed; opacity: 0.5; }
    .sm-btn:not(:disabled):active { transform: scale(0.95); }
    .sm-page-info {
      background: rgba(0,0,0,0.6);
      color: #fff;
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 14px;
      min-width: 70px;
      text-align: center;
    }
    code {
      background: #f5f5f5;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: Consolas, Monaco, monospace;
      color: #c7254e;
    }
  </style>
</head>
<body>
  <div class="sm-container">
    ${slidesHTML}
  </div>
  <div class="sm-nav">
    <button class="sm-btn" id="prevBtn" title="上一页 (←)">‹</button>
    <div class="sm-page-info" id="pageInfo">1 / ${slides.length}</div>
    <button class="sm-btn" id="nextBtn" title="下一页 (→)">›</button>
  </div>
  <script>
    (function() {
      const slides = document.querySelectorAll('.sm-slide');
      const prevBtn = document.getElementById('prevBtn');
      const nextBtn = document.getElementById('nextBtn');
      const pageInfo = document.getElementById('pageInfo');
      let current = 0;
      const total = slides.length;

      function show(idx) {
        current = Math.max(0, Math.min(idx, total - 1));
        slides.forEach((s, i) => {
          if (i === current) {
            s.classList.add('active');
            s.style.animation = 'none';
            void s.offsetWidth;
            s.style.animation = '';
          } else {
            s.classList.remove('active');
          }
        });
        pageInfo.textContent = (current + 1) + ' / ' + total;
        prevBtn.disabled = current === 0;
        nextBtn.disabled = current >= total - 1;
      }

      prevBtn.addEventListener('click', () => show(current - 1));
      nextBtn.addEventListener('click', () => show(current + 1));
      document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === ' ') {
          e.preventDefault();
          show(current + 1);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          show(current - 1);
        }
      });

      show(0);
    })();
  </script>
</body>
</html>`
  }

  const handleExport = () => {
    if (isExporting) return
    setIsExporting(true)
    setExportProgress(0)

    const duration = 500
    const startTime = performance.now()

    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      setExportProgress(progress * 100)

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        const html = buildExportHTML()
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const filename = `slidemaker-${timestamp}.html`
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        setTimeout(() => {
          setIsExporting(false)
          setExportProgress(0)
          onExportSuccess?.()
        }, 200)
      }
    }

    requestAnimationFrame(animate)
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        background: '#fff'
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        <div
          className="line-numbers"
          style={{
            background: '#1e1e1e',
            color: '#858585',
            padding: '20px 12px 20px 16px',
            textAlign: 'right',
            fontFamily: 'Consolas, "Courier New", monospace',
            fontSize: '14px',
            lineHeight: '22px',
            overflow: 'hidden',
            userSelect: 'none',
            minWidth: '48px',
            borderRight: '1px solid #2d2d2d'
          }}
        >
          {lineNumbers.map(n => (
            <div key={n}>{n}</div>
          ))}
        </div>
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onScroll={handleScroll}
          spellCheck={false}
          placeholder="在这里输入 Markdown 内容...\n使用 --- 分隔幻灯片"
          style={{
            flex: 1,
            background: '#1e1e1e',
            color: '#d4d4d4',
            border: 'none',
            outline: 'none',
            resize: 'none',
            padding: '20px 24px',
            fontFamily: 'Consolas, "Courier New", monospace',
            fontSize: '14px',
            lineHeight: '22px',
            overflow: 'auto',
            whiteSpace: 'pre',
            tabSize: 2
          }}
        />
      </div>

      <div
        style={{
          padding: '14px 20px',
          background: '#f8f9fa',
          borderTop: '1px solid #e9ecef',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
          minHeight: '64px',
          position: 'relative'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            color: '#666',
            fontWeight: 500
          }}
        >
          <span>主题:</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            {themes.map((t, idx) => (
              <button
                key={t.name}
                onClick={() => setThemeIndex(idx)}
                title={t.name}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  border: themeIndex === idx ? `2px solid #333` : '2px solid transparent',
                  cursor: 'pointer',
                  background: `linear-gradient(135deg, ${t.primary} 0%, ${t.accent} 100%)`,
                  padding: 0,
                  transition: 'all 0.15s ease',
                  boxShadow: themeIndex === idx ? `0 0 0 3px ${t.primary}30` : 'none',
                  transform: 'scale(1)'
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'scale(0.95)'
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'scale(1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)'
                }}
              />
            ))}
          </div>
          <span
            style={{
              marginLeft: '8px',
              color: theme.primary,
              fontWeight: 600,
              transition: 'color 0.5s ease-in-out'
            }}
          >
            {theme.name}
          </span>
        </div>

        <div style={{ flex: 1 }} />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '12px',
            color: '#888'
          }}
        >
          <span>{slides.length} 张幻灯片</span>
          <span>|</span>
          <span>{content.split('\n').length} 行</span>
        </div>

        <button
          onClick={handleExport}
          disabled={isExporting}
          style={{
            padding: '10px 22px',
            borderRadius: '6px',
            border: 'none',
            cursor: isExporting ? 'not-allowed' : 'pointer',
            background: isExporting ? '#a5d6a7' : theme.buttonBg,
            color: theme.buttonText,
            fontSize: '14px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.5s ease-in-out, transform 0.1s ease',
            opacity: isExporting ? 0.9 : 1,
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseDown={(e) => {
            if (!isExporting) e.currentTarget.style.transform = 'scale(0.95)'
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
          }}
        >
          <span
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              height: '100%',
              background: '#4CAF50',
              width: `${exportProgress}%`,
              transition: 'width 0.05s linear',
              opacity: 0.35
            }}
          />
          <span style={{ position: 'relative', zIndex: 1 }}>
            {isExporting ? '导出中...' : '⬇ 导出 HTML'}
          </span>
        </button>
      </div>
    </div>
  )
}

export default Editor
