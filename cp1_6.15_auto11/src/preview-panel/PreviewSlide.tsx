import { useEffect, useRef } from 'react';
import { Slide, parseSplitContent, renderMarkdownToHtml } from '@/markdown-parser/parse';
import './PreviewSlide.css';

interface PreviewSlideProps {
  slides: Slide[];
  currentSlide: number;
  theme: string;
  isFullscreen?: boolean;
}

export default function PreviewSlide({ slides, currentSlide, theme, isFullscreen = false }: PreviewSlideProps) {
  const slideRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (slideRef.current) {
      slideRef.current.classList.remove('slide-enter');
      void slideRef.current.offsetWidth;
      slideRef.current.classList.add('slide-enter');
    }
  }, [currentSlide]);

  const currentSlideData = slides[currentSlide];

  if (!currentSlideData) {
    return (
      <div className={`preview-container theme-${theme} ${isFullscreen ? 'fullscreen' : ''}`}>
        <div className="slide-empty">
          <p>暂无幻灯片内容</p>
          <p className="hint">在左侧编辑区输入 Markdown，使用 --- 分隔幻灯片</p>
        </div>
      </div>
    );
  }

  const renderSlideContent = () => {
    if (currentSlideData.hasSplit) {
      const { left, right } = parseSplitContent(currentSlideData.rawContent);
      const leftHtml = renderMarkdownToHtml(left);
      const rightHtml = renderMarkdownToHtml(right);

      return (
        <div className="split-layout">
          <div className="split-left">
            <div dangerouslySetInnerHTML={{ __html: leftHtml }} />
          </div>
          <div className="split-right">
            <div dangerouslySetInnerHTML={{ __html: rightHtml }} />
          </div>
        </div>
      );
    }

    return <div dangerouslySetInnerHTML={{ __html: currentSlideData.content }} />;
  };

  return (
    <div className={`preview-container theme-${theme} ${isFullscreen ? 'fullscreen' : ''}`}>
      <div className="slide-wrapper">
        <div ref={slideRef} className="slide-content">
          {renderSlideContent()}
        </div>
      </div>
      {slides.length > 0 && (
        <div className="slide-indicator pulse">
          {currentSlide + 1} / {slides.length}
        </div>
      )}
    </div>
  );
}
