import React, { useState, useCallback, useEffect } from 'react';
import { Palette, Type, Ruler, RotateCcw, Sparkles } from 'lucide-react';
import ColorExtractor from './components/ColorExtractor';
import TypePreview from './components/TypePreview';
import SpacingRuler from './components/SpacingRuler';
import CodeExport from './components/CodeExport';
import HistoryPanel from './components/HistoryPanel';
import Toolbar from './components/Toolbar';
import CollapsibleCard from './components/CollapsibleCard';
import type {
  ColorToken,
  TypographyToken,
  GuideLine,
  SpacingValue,
  DesignTokens,
  HistoryItem,
} from './types';
import {
  DEFAULT_TYPOGRAPHY,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  MAX_HISTORY,
} from './types';
import { generateId } from './utils/colorUtils';
import './App.css';

const App: React.FC = () => {
  const [colors, setColors] = useState<ColorToken[]>([]);
  const [typography, setTypography] = useState<TypographyToken>(DEFAULT_TYPOGRAPHY);
  const [guidelines, setGuidelines] = useState<GuideLine[]>([]);
  const [spacings, setSpacings] = useState<SpacingValue[]>([]);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [rulerVisible, setRulerVisible] = useState(false);

  const addToHistory = useCallback(
    (tokens: DesignTokens) => {
      const item: HistoryItem = {
        id: generateId(),
        timestamp: Date.now(),
        tokens,
      };
      setHistory((prev) => [item, ...prev].slice(0, MAX_HISTORY));
    },
    [],
  );

  useEffect(() => {
    if (colors.length > 0 || guidelines.length > 0) {
      const debounce = setTimeout(() => {
        addToHistory({
          colors,
          typography,
          guidelines,
          spacings,
          uploadedImage,
        });
      }, 3000);
      return () => clearTimeout(debounce);
    }
  }, [colors, guidelines, typography, spacings, uploadedImage, addToHistory]);

  const handleColorsExtracted = useCallback(
    (newColors: ColorToken[], imageUrl: string) => {
      setColors(newColors);
      setUploadedImage(imageUrl);
    },
    [],
  );

  const handleReset = () => {
    setColors([]);
    setTypography(DEFAULT_TYPOGRAPHY);
    setGuidelines([]);
    setSpacings([]);
    setUploadedImage(null);
    setRulerVisible(false);
  };

  const handleRestoreHistory = (item: HistoryItem) => {
    setColors(item.tokens.colors);
    setTypography(item.tokens.typography);
    setGuidelines(item.tokens.guidelines);
    setSpacings(item.tokens.spacings);
    setUploadedImage(item.tokens.uploadedImage);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-title">
          <Sparkles size={20} />
          <h1>Design Tokens Studio</h1>
        </div>
        <button className="reset-btn" onClick={handleReset} title="重置所有状态">
          <RotateCcw size={16} />
          重置
        </button>
      </header>

      <div className="app-body">
        <aside className="sidebar">
          <CollapsibleCard
            title="颜色提取"
            icon={<Palette size={16} />}
            defaultOpen
          >
            <ColorExtractor
              colors={colors}
              onColorsExtracted={handleColorsExtracted}
            />
          </CollapsibleCard>

          <CollapsibleCard
            title="字体预览"
            icon={<Type size={16} />}
            defaultOpen
          >
            <TypePreview typography={typography} onChange={setTypography} />
          </CollapsibleCard>

          <CollapsibleCard
            title="间距标尺"
            icon={<Ruler size={16} />}
            defaultOpen
          >
            <SpacingRuler
              guidelines={guidelines}
              spacings={spacings}
              visible={rulerVisible}
              onGuidelinesChange={setGuidelines}
              onSpacingsChange={setSpacings}
            />
          </CollapsibleCard>
        </aside>

        <main className="main-area">
          <Toolbar
            colors={colors}
            typography={typography}
            rulerVisible={rulerVisible}
            onToggleRuler={() => setRulerVisible(!rulerVisible)}
          />

          <div className="preview-area">
            {uploadedImage && (
              <div className="image-preview">
                <img src={uploadedImage} alt="上传的设计稿" />
              </div>
            )}

            <div
              className={`typography-canvas ${
                typography.showGrid ? 'grid-bg' : ''
              }`}
              style={{ width: CANVAS_WIDTH, minHeight: CANVAS_HEIGHT }}
            >
              <p
                style={{
                  fontFamily: `'${typography.fontFamily}', sans-serif`,
                  fontSize: `${typography.fontSize}px`,
                  fontWeight: typography.fontWeight,
                  lineHeight: typography.lineHeight,
                }}
              >
                {typography.text}
              </p>
            </div>

            {rulerVisible && (
              <div className="ruler-overlay" style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
                {guidelines.map((guideline) =>
                  guideline.type === 'horizontal' ? (
                    <div
                      key={guideline.id}
                      className="overlay-guideline horizontal"
                      style={{ top: guideline.position }}
                    />
                  ) : (
                    <div
                      key={guideline.id}
                      className="overlay-guideline vertical"
                      style={{ left: guideline.position }}
                    />
                  ),
                )}
                {spacings.map((spacing) => {
                  const fromLine = guidelines.find((g) => g.id === spacing.fromId);
                  const toLine = guidelines.find((g) => g.id === spacing.toId);
                  if (!fromLine || !toLine) return null;
                  if (spacing.orientation === 'horizontal') {
                    const midY = (fromLine.position + toLine.position) / 2;
                    return (
                      <div
                        key={spacing.id}
                        className="overlay-spacing-label horizontal"
                        style={{ top: midY - 12 }}
                      >
                        {spacing.distance}px
                      </div>
                    );
                  } else {
                    const midX = (fromLine.position + toLine.position) / 2;
                    return (
                      <div
                        key={spacing.id}
                        className="overlay-spacing-label vertical"
                        style={{ left: midX - 20 }}
                      >
                        {spacing.distance}px
                      </div>
                    );
                  }
                })}
              </div>
            )}
          </div>

          <div className="bottom-panels">
            <CodeExport
              colors={colors}
              typography={typography}
              spacings={spacings}
            />
            <HistoryPanel history={history} onRestore={handleRestoreHistory} />
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
