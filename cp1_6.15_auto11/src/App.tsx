import { useState, useEffect, useRef, useCallback } from 'react';
import Editor from '@/editor-panel/Editor';
import PreviewSlide from '@/preview-panel/PreviewSlide';
import { parseMarkdown, Slide } from '@/markdown-parser/parse';
import './App.css';

const DEFAULT_MARKDOWN = `# Markdown 幻灯片 🎯

欢迎使用 **Markdown Slides**！

在左侧编辑区输入 Markdown，右侧实时预览。

使用 \`---\` 分隔幻灯片页面。

---

## 功能特性 ✨

- 📝 支持 Markdown 语法
- 🎨 多种主题切换
- 📱 响应式设计
- 🚀 实时预览
- 💾 导出 HTML
- 🔗 一键分享

---

## 代码示例 💻

\`\`\`javascript
function greet(name) {
  console.log(\`Hello, \${name}!\`);
  return {
    message: 'Welcome to Markdown Slides',
    timestamp: Date.now()
  };
}

greet('World');
\`\`\`

---

## 两栏布局示例 📐

:split

### 左侧内容

- 这是左栏
- 支持 **Markdown**
- 可以放文字说明

### 右侧代码

\`\`\`python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

print(fibonacci(10))
\`\`\`

---

## 表格展示 📊

| 功能 | 状态 | 说明 |
|------|------|------|
| Markdown解析 | ✅ | 支持标准语法 |
| 代码高亮 | ✅ | highlight.js驱动 |
| 主题切换 | ✅ | 3种内置主题 |
| 全屏模式 | ✅ | 按F键进入 |

---

## 引用块 📚

> "简洁是复杂的终极形式。"
> 
> — 达·芬奇

---

## 开始使用 🚀

1. 在左侧编辑你的 Markdown
2. 用 \`---\` 分隔每一页
3. 按 **F** 键全屏播放
4. 左右键切换页面
5. 导出或分享你的作品

享受创作吧！ 🎉
`;

type Theme = 'dark' | 'tech' | 'warm';
type Tab = 'editor' | 'preview';

export default function App() {
  const [markdown, setMarkdown] = useState(DEFAULT_MARKDOWN);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [theme, setTheme] = useState<Theme>('dark');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [splitRatio, setSplitRatio] = useState(0.5);
  const [isDragging, setIsDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('editor');
  const [shareLink, setShareLink] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const parsedSlides = parseMarkdown(markdown);
      setSlides(parsedSlides);
      if (currentSlide >= parsedSlides.length && parsedSlides.length > 0) {
        setCurrentSlide(parsedSlides.length - 1);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [markdown]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') {
        if (!isFullscreen && slides.length > 0) {
          setIsFullscreen(true);
        }
        return;
      }

      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
        return;
      }

      if (isFullscreen) {
        if (e.key === 'ArrowRight' || e.key === ' ') {
          e.preventDefault();
          setCurrentSlide((prev) => Math.min(prev + 1, slides.length - 1));
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setCurrentSlide((prev) => Math.max(prev - 1, 0));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, slides.length]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const shared = urlParams.get('s');
    if (shared) {
      try {
        const decoded = atob(shared);
        setMarkdown(decoded);
      } catch {
        console.error('Failed to decode shared content');
      }
    }
  }, []);

  const handleMarkdownChange = useCallback((value: string) => {
    setMarkdown(value);
  }, []);

  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      let ratio = x / rect.width;
      ratio = Math.max(0.3, Math.min(0.7, ratio));
      setSplitRatio(ratio);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging]);

  const generateShareLink = useCallback(() => {
    const encoded = btoa(unescape(encodeURIComponent(markdown)));
    const url = `${window.location.origin}${window.location.pathname}?s=${encoded}`;
    setShareLink(url);
    setShowShareModal(true);
  }, [markdown]);

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [shareLink]);

  const exportHtml = useCallback(() => {
    const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Markdown Slides</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .slide-container {
      width: 100vw;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px;
      transition: background-color 0.4s, color 0.4s;
    }
    .slide {
      max-width: 900px;
      width: 100%;
      animation: fadeIn 0.3s ease;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateX(20px); }
      to { opacity: 1; transform: translateX(0); }
    }
    .slide h1 { font-size: 2.5rem; margin-bottom: 1rem; }
    .slide h2 { font-size: 2rem; margin-bottom: 0.8rem; }
    .slide h3 { font-size: 1.5rem; margin-bottom: 0.6rem; }
    .slide p { font-size: 1.1rem; line-height: 1.8; margin-bottom: 1rem; }
    .slide ul, .slide ol { font-size: 1.1rem; line-height: 1.8; margin-bottom: 1rem; padding-left: 2rem; }
    .slide li { margin-bottom: 0.5rem; }
    .slide code { padding: 2px 6px; border-radius: 4px; font-size: 0.95em; }
    .slide pre { border-radius: 8px; padding: 16px; overflow-x: auto; margin: 1rem 0; }
    .slide pre code { padding: 0; }
    .slide blockquote { border-left: 4px solid; padding-left: 16px; margin: 16px 0; opacity: 0.9; }
    .slide table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
    .slide th, .slide td { border: 1px solid; padding: 8px 12px; text-align: left; }
    .indicator {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      padding: 6px 14px;
      background: rgba(0,0,0,0.4);
      color: #fff;
      font-size: 13px;
      border-radius: 20px;
      backdrop-filter: blur(8px);
    }
    .nav-btn {
      position: fixed;
      top: 50%;
      transform: translateY(-50%);
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(0,0,0,0.4);
      color: #fff;
      border: none;
      cursor: pointer;
      font-size: 18px;
      backdrop-filter: blur(8px);
      transition: background 0.2s;
    }
    .nav-btn:hover { background: rgba(0,0,0,0.6); }
    .nav-prev { left: 20px; }
    .nav-next { right: 20px; }
    .split-layout { display: flex; gap: 40px; }
    .split-left, .split-right { flex: 1; min-width: 0; }
    .theme-dark { background: linear-gradient(135deg, #1e1e2e, #2d2d44); color: #cdd6f4; }
    .theme-dark h1, .theme-dark h2, .theme-dark h3 { color: #f5c2e7; }
    .theme-dark code { background: rgba(0,0,0,0.6); color: #a6e3a1; }
    .theme-dark pre { background: rgba(0,0,0,0.6) !important; }
    .theme-dark blockquote { border-color: #89b4fa; color: #a6adc8; }
    .theme-dark th, .theme-dark td { border-color: #45475a; }
    .theme-dark th { background: rgba(137,180,250,0.2); }
    .theme-tech { background: linear-gradient(135deg, #0f172a, #1e3a5f); color: #e2e8f0; }
    .theme-tech h1, .theme-tech h2, .theme-tech h3 { color: #38bdf8; }
    .theme-tech code { background: rgba(0,0,0,0.6); color: #4ade80; }
    .theme-tech pre { background: rgba(0,0,0,0.6) !important; border: 1px solid rgba(56,189,248,0.3); }
    .theme-tech blockquote { border-color: #38bdf8; color: #94a3b8; }
    .theme-tech th, .theme-tech td { border-color: #334155; }
    .theme-tech th { background: rgba(56,189,248,0.2); }
    .theme-warm { background: linear-gradient(135deg, #2d2419, #4a3728); color: #f5f0e6; }
    .theme-warm h1, .theme-warm h2, .theme-warm h3 { color: #fbbf24; }
    .theme-warm code { background: rgba(0,0,0,0.6); color: #86efac; }
    .theme-warm pre { background: rgba(0,0,0,0.6) !important; }
    .theme-warm blockquote { border-color: #fbbf24; color: #d6d3d1; }
    .theme-warm th, .theme-warm td { border-color: #57534e; }
    .theme-warm th { background: rgba(251,191,36,0.2); }
    @media (max-width: 768px) {
      .slide h1 { font-size: 1.8rem; }
      .slide h2 { font-size: 1.4rem; }
      .split-layout { flex-direction: column; gap: 20px; }
      .nav-btn { display: none; }
    }
  </style>
</head>
<body class="theme-${theme}">
  <div class="slide-container">
    <div class="slide" id="slide"></div>
  </div>
  <button class="nav-btn nav-prev" onclick="prevSlide()">◀</button>
  <button class="nav-btn nav-next" onclick="nextSlide()">▶</button>
  <div class="indicator" id="indicator"></div>

  <script>
    const slidesData = ${JSON.stringify(slides)};
    let current = 0;

    function renderSlide() {
      const slide = slidesData[current];
      if (!slide) return;
      
      const slideEl = document.getElementById('slide');
      
      if (slide.hasSplit) {
        const parts = slide.rawContent.split(':split');
        slideEl.innerHTML = '<div class="split-layout"><div class="split-left">' + 
          marked.parse(parts[0].trim()) + '</div><div class="split-right">' + 
          marked.parse(parts.slice(1).join(':split').trim()) + '</div></div>';
      } else {
        slideEl.innerHTML = slide.content;
      }
      
      document.querySelectorAll('pre code').forEach(block => {
        hljs.highlightElement(block);
      });
      
      document.getElementById('indicator').textContent = (current + 1) + ' / ' + slidesData.length;
    }

    function nextSlide() {
      if (current < slidesData.length - 1) {
        current++;
        renderSlide();
      }
    }

    function prevSlide() {
      if (current > 0) {
        current--;
        renderSlide();
      }
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        nextSlide();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevSlide();
      }
    });

    renderSlide();
  </script>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'slides.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [slides, theme]);

  const themeOptions: { value: Theme; label: string; color: string }[] = [
    { value: 'dark', label: '深色极简', color: '#1e1e2e' },
    { value: 'tech', label: '科技蓝', color: '#0f172a' },
    { value: 'warm', label: '暖色学术', color: '#2d2419' },
  ];

  return (
    <div className={`app theme-${theme}`}>
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">📝 Markdown Slides</h1>
        </div>
        <div className="header-right">
          <div className="theme-switcher">
            {themeOptions.map((t) => (
              <button
                key={t.value}
                className={`theme-btn ${theme === t.value ? 'active' : ''}`}
                onClick={() => setTheme(t.value)}
                title={t.label}
              >
                <span
                  className="theme-color-dot"
                  style={{ backgroundColor: t.color }}
                />
                <span className="theme-label">{t.label}</span>
              </button>
            ))}
          </div>
          <button className="action-btn" onClick={generateShareLink}>
            🔗 分享
          </button>
          <button className="action-btn" onClick={exportHtml}>
            💾 导出
          </button>
          {!isMobile && slides.length > 0 && (
            <button className="action-btn primary" onClick={() => setIsFullscreen(true)}>
              ⛶ 全屏 (F)
            </button>
          )}
        </div>
      </header>

      {isMobile ? (
        <div className="mobile-layout">
          <div className="mobile-tabs">
            <button
              className={`tab-btn ${activeTab === 'editor' ? 'active' : ''}`}
              onClick={() => setActiveTab('editor')}
            >
              编辑器
            </button>
            <button
              className={`tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
              onClick={() => setActiveTab('preview')}
            >
              预览
            </button>
          </div>
          <div className="mobile-content">
            {activeTab === 'editor' && <Editor value={markdown} onChange={handleMarkdownChange} />}
            {activeTab === 'preview' && (
              <div className="mobile-preview-wrapper">
                <PreviewSlide
                  slides={slides}
                  currentSlide={currentSlide}
                  theme={theme}
                  isFullscreen={false}
                />
                <div className="mobile-nav">
                  <button
                    className="nav-arrow"
                    onClick={() => setCurrentSlide((p) => Math.max(0, p - 1))}
                    disabled={currentSlide === 0}
                  >
                    ◀
                  </button>
                  <span className="mobile-page">
                    {currentSlide + 1} / {slides.length || 0}
                  </span>
                  <button
                    className="nav-arrow"
                    onClick={() => setCurrentSlide((p) => Math.min(slides.length - 1, p + 1))}
                    disabled={slides.length === 0 || currentSlide === slides.length - 1}
                  >
                    ▶
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="main-content" ref={containerRef}>
          <div className="panel editor-panel" style={{ width: `${splitRatio * 100}%` }}>
            <Editor value={markdown} onChange={handleMarkdownChange} />
          </div>
          <div
            className={`splitter ${isDragging ? 'dragging' : ''}`}
            onMouseDown={handleMouseDown}
          />
          <div className="panel preview-panel" style={{ width: `${(1 - splitRatio) * 100}%` }}>
            <PreviewSlide
              slides={slides}
              currentSlide={currentSlide}
              theme={theme}
              isFullscreen={false}
            />
            <div className="preview-nav">
              <button
                className="nav-arrow"
                onClick={() => setCurrentSlide((p) => Math.max(0, p - 1))}
                disabled={currentSlide === 0}
              >
                ◀
              </button>
              <button
                className="nav-arrow"
                onClick={() => setCurrentSlide((p) => Math.min(slides.length - 1, p + 1))}
                disabled={slides.length === 0 || currentSlide === slides.length - 1}
              >
                ▶
              </button>
            </div>
          </div>
        </div>
      )}

      {isFullscreen && slides.length > 0 && (
        <div className="fullscreen-overlay">
          <PreviewSlide
            slides={slides}
            currentSlide={currentSlide}
            theme={theme}
            isFullscreen={true}
          />
          <button
            className="fullscreen-exit"
            onClick={() => setIsFullscreen(false)}
            title="退出全屏 (Esc)"
          >
            ✕
          </button>
          <button
            className="fullscreen-nav fullscreen-prev"
            onClick={() => setCurrentSlide((p) => Math.max(0, p - 1))}
            disabled={currentSlide === 0}
          >
            ◀
          </button>
          <button
            className="fullscreen-nav fullscreen-next"
            onClick={() => setCurrentSlide((p) => Math.min(slides.length - 1, p + 1))}
            disabled={currentSlide === slides.length - 1}
          >
            ▶
          </button>
        </div>
      )}

      {showShareModal && (
        <div className="modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>分享幻灯片</h3>
            <p className="modal-desc">复制以下链接分享给他人：</p>
            <div className="share-link-input">
              <input type="text" value={shareLink} readOnly />
              <button className="copy-btn" onClick={copyToClipboard}>
                {copySuccess ? '✓ 已复制' : '复制'}
              </button>
            </div>
            <p className="modal-tip">提示：链接中包含编码后的 Markdown 内容，可直接打开查看。</p>
            <button className="modal-close" onClick={() => setShowShareModal(false)}>
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
