import { useState, useCallback } from 'react';
import Canvas from '@/components/Canvas';
import Toolbar from '@/components/Toolbar';
import { CardElement, TEMPLATES } from '@/types';
import { checkElementsOverflow, exportToPNG } from '@/utils/exportImage';

const DEFAULT_ELEMENTS: CardElement[] = [
  { id: 'avatar', type: 'avatar', x: 40, y: 60, width: 80, height: 80, content: '' },
  { id: 'name', type: 'name', x: 180, y: 70, width: 300, height: 40, content: '张三' },
  { id: 'position', type: 'position', x: 180, y: 120, width: 300, height: 24, content: '高级产品设计师 | 创意总监' },
  {
    id: 'contact',
    type: 'contact',
    x: 40,
    y: 260,
    width: 320,
    height: 80,
    content: 'zhangsan@example.com|+86 138 0000 0000|www.zhangsan.design',
  },
  { id: 'social', type: 'social', x: 40, y: 320, width: 200, height: 30, content: '' },
];

function App() {
  const [elements, setElements] = useState<CardElement[]>(DEFAULT_ELEMENTS);
  const [activeTemplateId, setActiveTemplateId] = useState<string>('professional');
  const [backgroundColor, setBackgroundColor] = useState<string>(TEMPLATES[0].backgroundColor);
  const [fontSize, setFontSize] = useState<number>(28);
  const [margin, setMargin] = useState<number>(16);
  const [isFading, setIsFading] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const activeTemplate = TEMPLATES.find((t) => t.id === activeTemplateId) || TEMPLATES[0];

  const handleElementPositionChange = useCallback((id: string, x: number, y: number) => {
    setElements((prev) =>
      prev.map((el) => (el.id === id ? { ...el, x, y } : el)),
    );
  }, []);

  const handleTemplateChange = useCallback((templateId: string) => {
    const template = TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;

    setIsFading(true);
    setTimeout(() => {
      setActiveTemplateId(templateId);
      setBackgroundColor(template.backgroundColor);
      setMargin(template.spacing);
      setElements((prev) =>
        prev.map((el) => {
          const pos = template.elementPositions[el.type];
          if (pos) {
            return { ...el, x: pos.x, y: pos.y };
          }
          return el;
        }),
      );
      setTimeout(() => setIsFading(false), 150);
    }, 150);
  }, []);

  const handleExport = useCallback(async () => {
    if (checkElementsOverflow(elements)) {
      window.alert('部分元素超出了画布边界，请调整后再导出。');
      return;
    }

    setIsExporting(true);
    try {
      const canvasEl = document.getElementById('card-canvas');
      if (canvasEl) {
        await exportToPNG(canvasEl, () => {});
      }
    } catch (error) {
      console.error('导出出错:', error);
    } finally {
      setIsExporting(false);
    }
  }, [elements]);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>个性化数字名片生成器</h1>
        <p>拖拽元素自由排版，一键导出高清名片</p>
      </header>

      <main className="app-main">
        <div className="canvas-area">
          <Canvas
            elements={elements}
            backgroundColor={backgroundColor}
            fontSize={fontSize}
            margin={margin}
            activeTemplate={activeTemplate}
            isFading={isFading}
            onElementPositionChange={handleElementPositionChange}
          />
        </div>

        <Toolbar
          activeTemplate={activeTemplate}
          backgroundColor={backgroundColor}
          fontSize={fontSize}
          margin={margin}
          isExporting={isExporting}
          onTemplateChange={handleTemplateChange}
          onBackgroundColorChange={setBackgroundColor}
          onFontSizeChange={setFontSize}
          onMarginChange={setMargin}
          onExport={handleExport}
        />
      </main>

      {isExporting && (
        <div className="export-overlay">
          <div className="export-loading">
            <span className="loading-spinner" />
            <p>正在生成高清图片...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
