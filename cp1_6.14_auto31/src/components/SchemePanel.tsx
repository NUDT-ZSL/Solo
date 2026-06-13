import React, { useState, useCallback } from 'react';
import type { ColorScheme, HSL } from '../utils/colorUtils';
import { hslToHex, getContrastColor } from '../utils/colorUtils';

interface SchemePanelProps {
  schemes: ColorScheme[];
  primary: HSL;
  onCopy?: (hex: string) => void;
}

const ColorSwatch: React.FC<{
  color: HSL;
  onCopy?: (hex: string) => void;
}> = ({ color, onCopy }) => {
  const hex = hslToHex(color);
  const [showToast, setShowToast] = useState(false);

  const handleClick = useCallback(async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(hex);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = hex;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setShowToast(true);
      onCopy?.(hex);
      setTimeout(() => setShowToast(false), 800);
    } catch {
      // ignore
    }
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
      <div className={`copy-toast ${showToast ? 'show' : ''}`}>
        已复制 {hex}
      </div>
    </div>
  );
};

const SchemePanel: React.FC<SchemePanelProps> = ({ schemes, onCopy }) => {
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
                  onCopy={onCopy}
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
