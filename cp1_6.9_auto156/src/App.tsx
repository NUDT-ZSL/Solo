import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, useParams, useNavigate } from 'react-router-dom';
import WordCloudCanvas from './WordCloudCanvas';
import Toolbar from './Toolbar';
import {
  WordBlock,
  extractKeywords,
  spiralLayout,
  COLOR_SCHEMES,
  FONT_OPTIONS,
} from './wordcloudUtils';

const SAMPLE_TEXT = `人工智能（Artificial Intelligence，简称AI）是计算机科学的一个分支，旨在创造能够执行通常需要人类智能的任务的机器。这些任务包括视觉感知、语音识别、决策制定和语言翻译等。人工智能的研究领域涵盖了机器学习、深度学习、自然语言处理、计算机视觉等多个子领域。近年来，随着计算能力的提升和大数据的普及，人工智能技术取得了飞速发展，在医疗、金融、教育、交通等各个行业得到了广泛应用。深度学习作为机器学习的一个重要分支，通过构建多层神经网络来模拟人脑的工作方式，在图像识别、语音处理等领域取得了突破性进展。未来，人工智能将继续深刻改变我们的生活方式和工作方式，推动人类社会迈向新的智能时代。`;

const EditPage: React.FC = () => {
  const [inputText, setInputText] = useState<string>(SAMPLE_TEXT);
  const [isUrl, setIsUrl] = useState<boolean>(false);
  const [words, setWords] = useState<WordBlock[]>([]);
  const [initialWords, setInitialWords] = useState<WordBlock[]>([]);
  const [colorSchemeIndex, setColorSchemeIndex] = useState<number>(0);
  const [previousColorSchemeIndex, setPreviousColorSchemeIndex] = useState<number>(0);
  const [colorTransitionProgress, setColorTransitionProgress] = useState<number>(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const exportTriggerRef = useRef<(() => string) | null>(null);
  const colorAnimRef = useRef<number>();

  const selectedWord = words.find(w => w.id === selectedId);
  const selectedFont = selectedWord?.fontFamily || FONT_OPTIONS[0];
  const selectedOpacity = selectedWord?.opacity ?? 1;

  useEffect(() => {
    const keywords = extractKeywords(SAMPLE_TEXT);
    const layout = spiralLayout(keywords, 0);
    setWords(layout);
    setInitialWords(JSON.parse(JSON.stringify(layout)));
  }, []);

  useEffect(() => {
    if (colorSchemeIndex !== previousColorSchemeIndex) {
      setColorTransitionProgress(0);
      const startTime = performance.now();
      const duration = 800;

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        setColorTransitionProgress(eased);

        if (progress < 1) {
          colorAnimRef.current = requestAnimationFrame(animate);
        } else {
          setPreviousColorSchemeIndex(colorSchemeIndex);
          setColorTransitionProgress(1);
        }
      };

      colorAnimRef.current = requestAnimationFrame(animate);
      return () => {
        if (colorAnimRef.current) cancelAnimationFrame(colorAnimRef.current);
      };
    }
  }, [colorSchemeIndex, previousColorSchemeIndex]);

  const fetchUrlContent = async (url: string): Promise<string> => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      doc.querySelectorAll('script, style, noscript, iframe').forEach(el => el.remove());
      const text = doc.body?.textContent || '';
      return text.replace(/\s+/g, ' ').trim();
    } catch (err) {
      throw new Error('无法获取该URL内容，请检查链接是否正确或尝试输入文本内容。可能由于跨域限制导致无法获取。');
    }
  };

  const handleGenerate = async () => {
    if (!inputText.trim()) return;

    setIsGenerating(true);
    setError(null);
    setShareLink(null);

    try {
      let text = inputText;

      if (isUrl) {
        const urlMatch = inputText.match(/https?:\/\/[^\s]+/);
        if (urlMatch) {
          text = await fetchUrlContent(urlMatch[0]);
        } else {
          setError('请输入有效的URL地址');
          setIsGenerating(false);
          return;
        }
      }

      const keywords = extractKeywords(text);
      if (keywords.length === 0) {
        setError('未能提取到有效关键词，请尝试输入更多内容');
        setIsGenerating(false);
        return;
      }

      const layout = spiralLayout(keywords, colorSchemeIndex);
      setWords(layout);
      setInitialWords(JSON.parse(JSON.stringify(layout)));
      setSelectedId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleColorSchemeChange = (index: number) => {
    if (index !== colorSchemeIndex) {
      setColorSchemeIndex(index);
    }
  };

  const handleFontChange = (font: string) => {
    if (!selectedId) return;
    const newWords = words.map(w =>
      w.id === selectedId ? { ...w, fontFamily: font } : w
    );
    setWords(newWords);
  };

  const handleOpacityChange = (opacity: number) => {
    if (!selectedId) return;
    const newWords = words.map(w =>
      w.id === selectedId ? { ...w, opacity } : w
    );
    setWords(newWords);
  };

  const handleSave = async () => {
    try {
      const saveData = {
        words: words.map(w => ({
          text: w.text,
          x: w.x,
          y: w.y,
          fontSize: w.fontSize,
          rotation: w.rotation,
          color: w.color,
          opacity: w.opacity,
          fontFamily: w.fontFamily,
        })),
        colorSchemeIndex,
      };

      const response = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saveData),
      });

      if (!response.ok) throw new Error('保存失败');
      const result = await response.json();
      setShareLink(result.url);
    } catch (err) {
      setError('保存失败，请稍后重试');
    }
  };

  const handleExport = () => {
    if (exportTriggerRef.current) {
      const dataUrl = exportTriggerRef.current();
      if (dataUrl) {
        const link = document.createElement('a');
        link.download = `wordcloud-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
      }
    }
  };

  const handleReset = () => {
    if (initialWords.length > 0) {
      setWords(JSON.parse(JSON.stringify(initialWords)));
      setSelectedId(null);
    }
  };

  const handleExportTrigger = useCallback((trigger: () => string) => {
    exportTriggerRef.current = trigger;
  }, []);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">词云拼贴</h1>
        <p className="app-subtitle">创建属于你的艺术词云</p>
      </header>
      <div className="main-content">
        <Toolbar
          inputText={inputText}
          onInputChange={setInputText}
          onGenerate={handleGenerate}
          isUrl={isUrl}
          onUrlToggle={setIsUrl}
          colorSchemeIndex={colorSchemeIndex}
          onColorSchemeChange={handleColorSchemeChange}
          selectedWordId={selectedId}
          selectedFont={selectedFont}
          onFontChange={handleFontChange}
          selectedOpacity={selectedOpacity}
          onOpacityChange={handleOpacityChange}
          onSave={handleSave}
          onExport={handleExport}
          onReset={handleReset}
          shareLink={shareLink}
          isGenerating={isGenerating}
          error={error}
        />
        <div className="canvas-wrapper">
          <WordCloudCanvas
            words={words}
            onWordsChange={setWords}
            selectedId={selectedId}
            onSelect={setSelectedId}
            colorSchemeIndex={colorSchemeIndex}
            previousColorSchemeIndex={previousColorSchemeIndex}
            colorTransitionProgress={colorTransitionProgress}
            readonly={false}
            onExportTrigger={handleExportTrigger}
          />
          <div className="canvas-hints">
            <span>💡 提示：拖拽移动 | Shift+滚轮缩放 | 右键旋转</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const ViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [words, setWords] = useState<WordBlock[]>([]);
  const [colorSchemeIndex, setColorSchemeIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/get/${id}`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('词云不存在或已过期');
          }
          throw new Error('加载失败');
        }
        const data = await response.json();
        const wordBlocks: WordBlock[] = data.words.map((w: any, idx: number) => ({
          ...w,
          id: `view-${idx}-${Math.random().toString(36).substr(2, 9)}`,
          frequency: 100 - idx,
        }));
        setWords(wordBlocks);
        setColorSchemeIndex(data.colorSchemeIndex || 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id]);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">词云拼贴 - 查看模式</h1>
        <button
          className="back-btn"
          onClick={() => navigate('/')}
        >
          ← 回到编辑器
        </button>
      </header>
      <div className="main-content view-mode">
        {loading && <div className="loading">加载中...</div>}
        {error && <div className="error-box">{error}</div>}
        {!loading && !error && (
          <div className="canvas-wrapper full-width">
            <WordCloudCanvas
              words={words}
              onWordsChange={() => {}}
              selectedId={null}
              onSelect={() => {}}
              colorSchemeIndex={colorSchemeIndex}
              previousColorSchemeIndex={colorSchemeIndex}
              colorTransitionProgress={1}
              readonly={true}
            />
          </div>
        )}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<EditPage />} />
      <Route path="/view/:id" element={<ViewPage />} />
    </Routes>
  );
};

export default App;
