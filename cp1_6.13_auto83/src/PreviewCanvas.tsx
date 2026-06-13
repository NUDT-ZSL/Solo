import { useRef, useCallback, useEffect } from 'react';
import { sampleTexts, fontList, type FontItem } from './fontData';

interface PreviewCanvasProps {
  selectedFont: string;
  fontWeight: number;
  fontSize: number;
  lineHeight: number;
  textType: 'english' | 'chinese' | 'symbols';
  compareMode: boolean;
  compareFonts: string[];
  compareFontSizes: number[];
  compareLineHeights: number[];
  fading: 'in' | 'out' | 'none';
  fontItem: FontItem | undefined;
  onFontWeightChange: (weight: number) => void;
  onFontSizeChange: (size: number) => void;
  onLineHeightChange: (height: number) => void;
  onTextTypeChange: (textType: 'english' | 'chinese' | 'symbols') => void;
  onCompareFontSizeChange: (index: number, size: number) => void;
  onCompareLineHeightChange: (index: number, height: number) => void;
}

function ColumnContent({
  fontName,
  fontWeight,
  fontSize,
  lineHeight,
  textType,
  fontType,
}: {
  fontName: string;
  fontWeight: number;
  fontSize: number;
  lineHeight: number;
  textType: 'english' | 'chinese' | 'symbols';
  fontType: string;
}) {
  const text = sampleTexts[textType];
  return (
    <div
      className="preview-text-block"
      style={{
        fontFamily: `'${fontName}', ${fontType}`,
        fontWeight,
        fontSize: `${fontSize}px`,
        lineHeight,
      }}
    >
      <p
        className="preview-label"
        style={{
          fontSize: '12px',
          fontWeight: 400,
          fontFamily: 'inherit',
          opacity: 0.5,
          marginBottom: '8px',
        }}
      >
        {fontName} — {fontWeight} / {fontSize}px
      </p>
      {textType === 'symbols' ? (
        <p style={{ letterSpacing: '0.1em' }}>{text}</p>
      ) : (
        <p>{text}</p>
      )}
    </div>
  );
}

export default function PreviewCanvas({
  selectedFont,
  fontWeight,
  fontSize,
  lineHeight,
  textType,
  compareMode,
  compareFonts,
  compareFontSizes,
  compareLineHeights,
  fading,
  fontItem,
  onFontWeightChange,
  onFontSizeChange,
  onLineHeightChange,
  onTextTypeChange,
  onCompareFontSizeChange,
  onCompareLineHeightChange,
}: PreviewCanvasProps) {
  const columnRefs = useRef<(HTMLDivElement | null)[]>([]);
  const syncLock = useRef(false);
  const rafId = useRef<number | null>(null);

  const allFonts = compareMode ? [selectedFont, ...compareFonts] : [selectedFont];
  const allSizes = compareMode ? [fontSize, ...compareFontSizes] : [fontSize];
  const allHeights = compareMode ? [lineHeight, ...compareLineHeights] : [lineHeight];

  const getFontType = (name: string) => {
    const item = fontList.find((f) => f.name === name);
    return item?.type ?? 'sans-serif';
  };

  const syncScrollTo = useCallback((sourceIdx: number) => {
    const source = columnRefs.current[sourceIdx];
    if (!source) return;
    const top = source.scrollTop;
    columnRefs.current.forEach((ref, i) => {
      if (i !== sourceIdx && ref) {
        ref.scrollTop = top;
      }
    });
  }, []);

  const handleColumnScroll = useCallback(
    (idx: number) => {
      if (syncLock.current) return;
      syncLock.current = true;
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        syncScrollTo(idx);
        syncLock.current = false;
        rafId.current = null;
      });
    },
    [syncScrollTo]
  );

  useEffect(() => {
    columnRefs.current = columnRefs.current.slice(0, allFonts.length);
  }, [allFonts.length]);

  useEffect(() => {
    return () => {
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
    };
  }, []);

  const setColumnRef = (idx: number) => (el: HTMLDivElement | null) => {
    columnRefs.current[idx] = el;
  };

  const fadingClass =
    fading === 'out' ? 'fading-out' : fading === 'in' ? 'fading-in' : '';

  const metaWeights = fontItem?.weights ?? [];
  const metaWeightRange = metaWeights.length
    ? `${metaWeights[0]}–${metaWeights[metaWeights.length - 1]}`
    : '—';

  return (
    <div className="preview-canvas-container">
      <div className="meta-card">
        <div className="meta-info">
          <h3 className="meta-font-name">{selectedFont}</h3>
          <p className="meta-detail">
            字重范围: {metaWeightRange} | 字符集: {fontItem?.charset ?? '—'}
          </p>
        </div>
        <div className="meta-controls">
          <label className="slider-group">
            <span>字重</span>
            <input
              type="range"
              min={100}
              max={900}
              step={100}
              value={fontWeight}
              onChange={(e) => onFontWeightChange(Number(e.target.value))}
              className="custom-slider"
            />
            <span className="slider-value">{fontWeight}</span>
          </label>
          <label className="slider-group">
            <span>字号</span>
            <input
              type="range"
              min={12}
              max={72}
              step={1}
              value={fontSize}
              onChange={(e) => onFontSizeChange(Number(e.target.value))}
              className="custom-slider"
            />
            <span className="slider-value">{fontSize}px</span>
          </label>
          <label className="slider-group">
            <span>行高</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={lineHeight}
              onChange={(e) => onLineHeightChange(Number(e.target.value))}
              className="custom-slider"
            />
            <span className="slider-value">{lineHeight.toFixed(1)}</span>
          </label>
        </div>
      </div>

      <div className="text-type-selector">
        <select
          value={textType}
          onChange={(e) =>
            onTextTypeChange(e.target.value as 'english' | 'chinese' | 'symbols')
          }
          className="text-type-select"
        >
          <option value="english">英文诗歌</option>
          <option value="chinese">中文散文</option>
          <option value="symbols">数字与符号</option>
        </select>
      </div>

      <div
        className={`preview-canvas ${fadingClass}`}
        style={{
          width: compareMode ? '100%' : '595px',
          height: '842px',
        }}
      >
        {compareMode ? (
          <div className="compare-columns">
            {allFonts.map((fontName, i) => (
              <div
                key={`${fontName}-${i}`}
                className="compare-column"
                style={{
                  width: `${100 / allFonts.length}%`,
                  borderRight:
                    i < allFonts.length - 1 ? '2px solid #d1d5db' : 'none',
                }}
              >
                <div className="compare-column-controls">
                  <div className="compare-font-label">{fontName}</div>
                  <label className="slider-group compact">
                    <span>字号</span>
                    <input
                      type="range"
                      min={12}
                      max={72}
                      step={1}
                      value={allSizes[i] ?? 16}
                      onChange={(e) =>
                        onCompareFontSizeChange(i, Number(e.target.value))
                      }
                      className="custom-slider"
                    />
                    <span className="slider-value">{allSizes[i] ?? 16}px</span>
                  </label>
                  <label className="slider-group compact">
                    <span>行高</span>
                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={0.1}
                      value={allHeights[i] ?? 1.6}
                      onChange={(e) =>
                        onCompareLineHeightChange(i, Number(e.target.value))
                      }
                      className="custom-slider"
                    />
                    <span className="slider-value">
                      {(allHeights[i] ?? 1.6).toFixed(1)}
                    </span>
                  </label>
                </div>
                <div
                  className="compare-scroll-area"
                  ref={setColumnRef(i)}
                  onScroll={() => handleColumnScroll(i)}
                >
                  <ColumnContent
                    fontName={fontName}
                    fontWeight={fontWeight}
                    fontSize={allSizes[i] ?? 16}
                    lineHeight={allHeights[i] ?? 1.6}
                    textType={textType}
                    fontType={getFontType(fontName)}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="single-preview">
            <ColumnContent
              fontName={selectedFont}
              fontWeight={fontWeight}
              fontSize={fontSize}
              lineHeight={lineHeight}
              textType={textType}
              fontType={fontItem?.type ?? 'sans-serif'}
            />
          </div>
        )}
      </div>
    </div>
  );
}
