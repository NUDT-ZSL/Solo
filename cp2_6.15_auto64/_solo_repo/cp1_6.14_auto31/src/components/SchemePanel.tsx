import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { ColorScheme, HSL } from '../utils/colorUtils';
import { hslToHex, getContrastColor, copyToClipboard } from '../utils/colorUtils';

interface SchemePanelProps {
  schemes: readonly ColorScheme[];
  primary: HSL;
  onCopy?: (hex: string) => void;
}

const TOAST_SHOW_MS = 300;
const TOAST_HIDE_MS = 150;

type ToastKind = 'success' | 'error';

const ColorSwatch: React.FC<{
  color: HSL;
  onCopy?: (hex: string) => void;
}> = ({ color, onCopy }) => {
  const hex = hslToHex(color);
  const [toastState, setToastState] = useState<{
    visible: boolean;
    kind: ToastKind;
    message: string;
  }>({ visible: false, kind: 'success', message: '' });
  const toastTimer1 = useRef<number | null>(null);
  const toastTimer2 = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimer1.current) window.clearTimeout(toastTimer1.current);
      if (toastTimer2.current) window.clearTimeout(toastTimer2.current);
      toastTimer1.current = null;
      toastTimer2.current = null;
    };
  }, []);

  const showToast = useCallback((kind: ToastKind, message: string) => {
    if (toastTimer1.current) {
      window.clearTimeout(toastTimer1.current);
      toastTimer1.current = null;
    }
    if (toastTimer2.current) {
      window.clearTimeout(toastTimer2.current);
      toastTimer2.current = null;
    }
    setToastState({ visible: true, kind, message });
    toastTimer1.current = window.setTimeout(() => {
      setToastState((prev) => ({ ...prev, visible: false }));
      toastTimer2.current = window.setTimeout(() => {
        setToastState({ visible: false, kind: 'success', message: '' });
        toastTimer2.current = null;
      }, TOAST_HIDE_MS);
      toastTimer1.current = null;
    }, TOAST_SHOW_MS);
  }, []);

  const handleClick = useCallback(async () => {
    const ok = await copyToClipboard(hex);
    if (ok) {
      onCopy?.(hex);
      showToast('success', `已复制 ${hex}`);
    } else {
      try {
        const sel = window.getSelection();
        if (sel) {
          const range = document.createRange();
          const span = document.createElement('span');
          span.textContent = hex;
          span.style.position = 'fixed';
          span.style.top = '-100vh';
          span.style.left = '-100vw';
          span.style.userSelect = 'all';
          document.body.appendChild(span);
          range.selectNodeContents(span);
          sel.removeAllRanges();
          sel.addRange(range);
          document.body.removeChild(span);
        }
      } catch {
        // ignore
      }
      showToast('error', '自动复制失败，请手动复制');
    }
  }, [hex, onCopy, showToast]);

  const toastBg = toastState.kind === 'success' ? 'var(--success)' : 'var(--danger)';

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
          background: toastBg,
          opacity: toastState.visible ? 1 : 0,
          transform: `translateX(-50%) translateY(${toastState.visible ? '-4px' : '8px'})`,
          transition:
            toastState.visible
              ? `opacity ${TOAST_SHOW_MS}ms ease-out, transform ${TOAST_SHOW_MS}ms ease-out`
              : `opacity ${TOAST_HIDE_MS}ms ease-in, transform ${TOAST_HIDE_MS}ms ease-in`,
          pointerEvents: 'none',
        }}
      >
        {toastState.message || `已复制 ${hex}`}
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
