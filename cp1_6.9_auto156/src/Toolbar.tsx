import React, { useState, useRef } from 'react';
import { COLOR_SCHEMES, FONT_OPTIONS } from './wordcloudUtils';

interface ToolbarProps {
  inputText: string;
  onInputChange: (text: string) => void;
  onGenerate: () => void;
  isUrl: boolean;
  onUrlToggle: (isUrl: boolean) => void;
  colorSchemeIndex: number;
  onColorSchemeChange: (index: number) => void;
  selectedWordId: string | null;
  selectedFont: string;
  onFontChange: (font: string) => void;
  selectedOpacity: number;
  onOpacityChange: (opacity: number) => void;
  onSave: () => void;
  onExport: () => void;
  onReset: () => void;
  shareLink: string | null;
  isGenerating: boolean;
  error: string | null;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
  buttonId: string;
}

const Toolbar: React.FC<ToolbarProps> = ({
  inputText,
  onInputChange,
  onGenerate,
  isUrl,
  onUrlToggle,
  colorSchemeIndex,
  onColorSchemeChange,
  selectedWordId,
  selectedFont,
  onFontChange,
  selectedOpacity,
  onOpacityChange,
  onSave,
  onExport,
  onReset,
  shareLink,
  isGenerating,
  error,
}) => {
  const [pulses, setPulses] = useState<{ [key: number]: boolean }>({});
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [copied, setCopied] = useState(false);
  const rippleIdRef = useRef(0);

  const handleColorClick = (index: number) => {
    onColorSchemeChange(index);
    setPulses(prev => ({ ...prev, [index]: true }));
    setTimeout(() => {
      setPulses(prev => ({ ...prev, [index]: false }));
    }, 300);
  };

  const createRipple = (e: React.MouseEvent<HTMLButtonElement>, buttonId: string) => {
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = rippleIdRef.current++;
    
    setRipples(prev => [...prev, { id, x, y, buttonId }]);
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== id));
    }, 400);
  };

  const handleCopyLink = async () => {
    if (shareLink) {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleResetClick = () => {
    if (window.confirm('确认重置吗？所有手动调整将丢失。')) {
      onReset();
    }
  };

  return (
    <div className="toolbar">
      <div className="toolbar-section">
        <label className="toolbar-label">输入内容</label>
        <div className="input-mode-toggle">
          <button
            className={`mode-btn ${!isUrl ? 'active' : ''}`}
            onClick={() => onUrlToggle(false)}
          >
            文本
          </button>
          <button
            className={`mode-btn ${isUrl ? 'active' : ''}`}
            onClick={() => onUrlToggle(true)}
          >
            URL
          </button>
        </div>
        <textarea
          className="text-input"
          placeholder={isUrl ? '粘贴网页URL链接...' : '输入文字或粘贴URL...'}
          value={inputText}
          onChange={(e) => onInputChange(e.target.value)}
          rows={6}
          maxLength={5000}
        />
        <div className="char-count">{inputText.length}/5000</div>
        {error && <div className="error-message">{error}</div>}
        <button
          className="primary-btn generate-btn"
          onClick={(e) => { createRipple(e, 'generate'); onGenerate(); }}
          disabled={!inputText.trim() || isGenerating}
        >
          {isGenerating ? '生成中...' : '生成词云'}
          {ripples.filter(r => r.buttonId === 'generate').map(ripple => (
            <span
              key={ripple.id}
              className="ripple"
              style={{ left: ripple.x, top: ripple.y }}
            />
          ))}
        </button>
      </div>

      <div className="toolbar-section">
        <label className="toolbar-label">配色方案</label>
        <div className="color-swatches">
          {COLOR_SCHEMES.map((scheme, index) => (
            <button
              key={index}
              className={`color-swatch ${colorSchemeIndex === index ? 'selected' : ''} ${pulses[index] ? 'pulse' : ''}`}
              style={{
                background: `linear-gradient(135deg, ${scheme.start} 0%, ${scheme.end} 100%)`,
              }}
              onClick={() => handleColorClick(index)}
              title={scheme.name}
            />
          ))}
        </div>
        <div className="color-scheme-name">
          {COLOR_SCHEMES[colorSchemeIndex].name}
        </div>
      </div>

      <div className="toolbar-section">
        <label className="toolbar-label">
          词块样式 {!selectedWordId && <span className="hint">（请先选择词块）</span>}
        </label>
        <div className="control-group">
          <label className="control-label">字体</label>
          <select
            className="font-select"
            value={selectedFont}
            onChange={(e) => onFontChange(e.target.value)}
            disabled={!selectedWordId}
          >
            {FONT_OPTIONS.map(font => (
              <option key={font} value={font}>{font}</option>
            ))}
          </select>
        </div>
        <div className="control-group">
          <label className="control-label">
            透明度: {selectedOpacity.toFixed(2)}
          </label>
          <input
            type="range"
            min="0.2"
            max="1.0"
            step="0.05"
            value={selectedOpacity}
            onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
            disabled={!selectedWordId}
            className="opacity-slider"
          />
        </div>
      </div>

      <div className="toolbar-section actions">
        <button
          className="primary-btn"
          onClick={(e) => { createRipple(e, 'save'); onSave(); }}
        >
          保存并分享
          {ripples.filter(r => r.buttonId === 'save').map(ripple => (
            <span
              key={ripple.id}
              className="ripple"
              style={{ left: ripple.x, top: ripple.y }}
            />
          ))}
        </button>
        <button
          className="primary-btn"
          onClick={(e) => { createRipple(e, 'export'); onExport(); }}
        >
          导出PNG
          {ripples.filter(r => r.buttonId === 'export').map(ripple => (
            <span
              key={ripple.id}
              className="ripple"
              style={{ left: ripple.x, top: ripple.y }}
            />
          ))}
        </button>
        <button
          className="secondary-btn"
          onClick={handleResetClick}
        >
          重置布局
        </button>
      </div>

      {shareLink && (
        <div className="share-link-section">
          <label className="toolbar-label">分享链接</label>
          <div className="share-link-wrapper">
            <input
              type="text"
              className="share-link-input"
              value={shareLink}
              readOnly
            />
            <button
              className="copy-btn"
              onClick={handleCopyLink}
            >
              {copied ? '已复制!' : '复制'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Toolbar;
