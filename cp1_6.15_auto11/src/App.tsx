import { useState, useEffect, useRef, useCallback } from 'react';
import Editor, { EditorRef } from '@/editor-panel/Editor';
import PreviewSlide from '@/preview-panel/PreviewSlide';
import { parseMarkdown, Slide } from '@/markdown-parser/parse';
import LZString from 'lz-string';
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
  const [shareError, setShareError] = useState('');
  const editorRef = useRef<EditorRef>(null);
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
    const sharedV2 = urlParams.get('s2');
    if (sharedV2) {
      try {
        const decompressed = LZString.decompressFromEncodedURIComponent(sharedV2);
        if (decompressed) {
          setMarkdown(decompressed);
        }
      } catch {
        console.error('Failed to decode shared content v2');
      }
    } else if (shared) {
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

  const handleTabChange = useCallback((tab: Tab) => {
    if (tab === 'preview' && editorRef.current) {
      const selection = editorRef.current.getSelection();
      sessionStorage.setItem('editor-selection-start', String(selection.start));
      sessionStorage.setItem('editor-selection-end', String(selection.end));
    }
    setActiveTab(tab);
    if (tab === 'editor' && editorRef.current) {
      setTimeout(() => {
        const start = parseInt(sessionStorage.getItem('editor-selection-start') || '0', 10);
        const end = parseInt(sessionStorage.getItem('editor-selection-end') || '0', 10);
        if (editorRef.current) {
          editorRef.current.setSelection(start, end);
          editorRef.current.focus();
        }
      }, 100);
    }
  }, []);

  const generateShareLink = useCallback(() => {
    const MAX_URL_LENGTH = 2000;
    const baseUrl = `${window.location.origin}${window.location.pathname}`;
    
    const compressed = LZString.compressToEncodedURIComponent(markdown);
    const url = `${baseUrl}?s2=${compressed}`;

    if (url.length > MAX_URL_LENGTH) {
      setShareError(`内容过长（${url.length}字符），超过URL限制${MAX_URL_LENGTH}字符，无法生成分享链接。请导出HTML文件分享。`);
      setShareLink(url);
      setShowShareModal(true);
      return;
    }

    setShareError('');
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

  const collectStyles = useCallback((): string => {
    const styles: string[] = [];

    for (let i = 0; i < document.styleSheets.length; i++) {
      const styleSheet = document.styleSheets[i];
      try {
        const rules = styleSheet.cssRules || styleSheet.rules;
        if (!rules) continue;

        let sheetCss = '';
        for (let j = 0; j < rules.length; j++) {
          const rule = rules[j];
          sheetCss += rule.cssText + '\n';
        }
        styles.push(sheetCss);
      } catch (e) {
        console.warn('Cannot access stylesheet:', styleSheet.href);
      }
    }

    const styleElements = document.querySelectorAll('style');
    styleElements.forEach((styleEl) => {
      styles.push(styleEl.textContent || '');
    });

    return styles.join('\n');
  }, []);

  const exportHtml = useCallback(() => {
    const allStyles = collectStyles();

    const slidesExportData = slides.map((slide) => ({
      content: slide.content,
      hasSplit: slide.hasSplit,
      leftHtml: slide.leftHtml || '',
      rightHtml: slide.rightHtml || '',
    }));

    const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Markdown Slides</title>
  <style>
    ${allStyles}
  </style>
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
    .preview-container {
      position: relative;
      width: 100vw;
      height: 100vh;
      display: flex;
      flex-direction: column;
      border-radius: 0;
      box-shadow: none;
    }
    .slide-wrapper {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px;
      overflow: hidden;
    }
    .slide-content {
      width: 100%;
      max-width: 900px;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .slide-content.slide-enter {
      animation: slideIn 0.2s ease-out;
    }
    @keyframes slideIn {
      from { opacity: 0; transform: translateX(30px); }
      to { opacity: 1; transform: translateX(0); }
    }
    .slide-content h1 { font-size: 2.5rem; margin-bottom: 1rem; }
    .slide-content h2 { font-size: 2rem; margin-bottom: 0.8rem; }
    .slide-content h3 { font-size: 1.5rem; margin-bottom: 0.6rem; }
    .slide-content p { font-size: 1.1rem; line-height: 1.8; margin-bottom: 1rem; }
    .slide-content ul, .slide-content ol { font-size: 1.1rem; line-height: 1.8; margin-bottom: 1rem; padding-left: 2rem; }
    .slide-content li { margin-bottom: 0.5rem; }
    .slide-content strong { font-weight: 700; }
    .slide-content em { font-style: italic; }
    .slide-content img { max-width: 100%; border-radius: 8px; }
    .slide-content hr { border: none; border-top: 1px solid rgba(255,255,255,0.2); margin: 1.5rem 0; }
    .slide-indicator {
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      padding: 6px 14px;
      background: rgba(0, 0, 0, 0.4);
      color: #cdd6f4;
      font-size: 13px;
      font-weight: 500;
      border-radius: 20px;
      backdrop-filter: blur(8px);
    }
    .pulse { animation: pulse 1.5s ease-in-out infinite; }
    @keyframes pulse {
      0%, 100% { opacity: 0.6; }
      50% { opacity: 1; }
    }
    .split-layout { display: flex; gap: 40px; height: 100%; align-items: flex-start; }
    .split-left, .split-right { flex: 1; min-width: 0; }
    .nav-btn {
      position: fixed;
      top: 50%;
      transform: translateY(-50%);
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: rgba(0,0,0,0.4);
      color: #fff;
      border: none;
      cursor: pointer;
      font-size: 18px;
      backdrop-filter: blur(8px);
      transition: all 0.2s ease;
      z-index: 100;
    }
    .nav-btn:hover:not(:disabled) { background: rgba(0,0,0,0.6); transform: translateY(-50%) scale(1.1); }
    .nav-btn:disabled { opacity: 0.3; cursor: not-allowed; }
    .nav-prev { left: 30px; }
    .nav-next { right: 30px; }
    .fullscreen-exit {
      position: fixed;
      top: 20px;
      right: 20px;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: none;
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
      cursor: pointer;
      font-size: 18px;
      z-index: 101;
      transition: all 0.2s ease;
    }
    .fullscreen-exit:hover { background: rgba(255, 255, 255, 0.2); }
    @media (max-width: 768px) {
      .slide-wrapper { padding: 20px; }
      .slide-content h1 { font-size: 1.8rem; }
      .slide-content h2 { font-size: 1.4rem; }
      .split-layout { flex-direction: column; gap: 20px; }
      .nav-btn { display: none; }
    }
  </style>
</head>
<body class="theme-${theme}">
  <div class="preview-container theme-${theme} fullscreen">
    <div class="slide-wrapper">
      <div id="slide-content" class="slide-content"></div>
    </div>
    <div id="indicator" class="slide-indicator pulse">1 / 1</div>
  </div>
  <button class="nav-btn nav-prev" id="prevBtn" onclick="prevSlide()">◀</button>
  <button class="nav-btn nav-next" id="nextBtn" onclick="nextSlide()">▶</button>

  <script>
    const slidesData = ${JSON.stringify(slidesExportData)};
    let current = 0;

    function renderSlide() {
      const slide = slidesData[current];
      if (!slide) return;
      
      const slideEl = document.getElementById('slide-content');
      slideEl.classList.remove('slide-enter');
      void slideEl.offsetWidth;
      slideEl.classList.add('slide-enter');
      
      if (slide.hasSplit && slide.leftHtml && slide.rightHtml) {
        slideEl.innerHTML = '<div class="split-layout"><div class="split-left">' + 
          slide.leftHtml + '</div><div class="split-right">' + 
          slide.rightHtml + '</div></div>';
      } else {
        slideEl.innerHTML = slide.content;
      }
      
      document.getElementById('indicator').textContent = (current + 1) + ' / ' + slidesData.length;
      document.getElementById('prevBtn').disabled = current === 0;
      document.getElementById('nextBtn').disabled = current === slidesData.length - 1;
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
  }, [slides, theme, collectStyles]);

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
              onClick={() => handleTabChange('editor')}
            >
              编辑器
            </button>
            <button
              className={`tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
              onClick={() => handleTabChange('preview')}
            >
              预览
            </button>
          </div>
          <div className="mobile-content">
            <div className={`mobile-panel ${activeTab === 'editor' ? 'active' : ''}`}>
              <Editor ref={editorRef} value={markdown} onChange={handleMarkdownChange} />
            </div>
            <div className={`mobile-panel ${activeTab === 'preview' ? 'active' : ''}`}>
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
            </div>
          </div>
        </div>
      ) : (
        <div className="main-content" ref={containerRef}>
          <div className="panel editor-panel" style={{ width: `${splitRatio * 100}%` }}>
            <Editor ref={editorRef} value={markdown} onChange={handleMarkdownChange} />
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
            {shareError ? (
              <div className="share-error">
                <p className="error-text">⚠️ {shareError}</p>
              </div>
            ) : (
              <>
                <p className="modal-desc">复制以下链接分享给他人：</p>
                <div className="share-link-input">
                  <input type="text" value={shareLink} readOnly />
                  <button className="copy-btn" onClick={copyToClipboard}>
                    {copySuccess ? '✓ 已复制' : '复制'}
                  </button>
                </div>
                <p className="modal-tip">提示：链接中包含编码后的 Markdown 内容，可直接打开查看。</p>
              </>
            )}
            <button className="modal-close" onClick={() => setShowShareModal(false)}>
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
