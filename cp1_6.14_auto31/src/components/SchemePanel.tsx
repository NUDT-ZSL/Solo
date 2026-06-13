import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { ColorScheme, HSL } from '../utils/colorUtils';
import { hslToHex, getContrastColor, copyToClipboard } from '../utils/colorUtils';

interface SchemePanelProps {
  schemes: readonly ColorScheme[];
  primary: HSL;
  onCopy?: (hex: string) => void;
}

const TOAST_DURATION = 300;

const ColorSwatch: React.FC<{
  color: HSL;
  onCopy?: (hex: string) => void;
}> = ({ color, onCopy }) => {
  const hex = hslToHex(color);
  const [toastState, setToastState] = useState<'idle' | 'show' | 'hiding'>('idle');
  const toastTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimer.current) {
        window.clearTimeout(toastTimer.current);
        toastTimer.current = null;
      }
    };
  }, []);

  const handleClick = useCallback(async () => {
    if (toastTimer.current) {
      window.clearTimeout(toastTimer.current);
      toastTimer.current = null;
    }
    const ok = await copyToClipboard(hex);
    if (ok) {
      onCopy?.(hex);
    }
    setToastState('show');
    toastTimer.current = window.setTimeout(() => {
      setToastState('hiding');
      toastTimer.current = window.setTimeout(() => {
        setToastState('idle');
        toastTimer.current = null;
      }, 120);
    }, TOAST_DURATION);
  }, [hex, onCopy]);

  return (
    <div
      className="color-swatch"
      style={{
        backgroundColor: hex,
        border: `1px solid ${getContrastColor(hex)}22`,
      }}
      onClick={handleClick}
      title={`点击复制 ${hex}`}
    >
      <div
        className="copy-toast"
        style={{
          opacity: toastState === 'idle' ? 0 : 1,
          transform: `translateX(-50%) translateY(${toastState === 'show' ? '-4px' : '8px'})`,
          transition:
            toastState === 'show'
              ? `opacity ${TOAST_DURATION}ms ease-out, transform ${TOAST_DURATION}ms ease-out`
              : `opacity 120ms ease-in, transform 120ms ease-in`,
          pointerEvents: 'none',
        }}
      >
        已复制 {hex}
      </div>
    </div>
  );
};

const SchemePanel: React.FC<SchemePanelProps> = ({ schemes }) => {
  return (
    <div className="schemes-section">
      <div className="section-title">
        <span>🎨</span>
        <span>配色方案</span>
      </div>
      <div className="schemes-container">
        {schemes.map((scheme) => (
          <div key={scheme.type} className="scheme-card">
            <div className="scheme-name">{scheme.name}</div>
            <div className="scheme-colors">
              {scheme.colors.map((color, idx) => (
                <ColorSwatch
                  key={`${scheme.type}-${idx}`}
                  color={color}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SchemePanel;
