import { useState, useEffect } from 'react';
import { UIStyleConfig, ThemeMode } from '../types';

interface PreviewCardProps {
  onClose: () => void;
  uiStyleConfig: UIStyleConfig;
  translationText: string;
}

export default function PreviewCard({ onClose, uiStyleConfig, translationText }: PreviewCardProps) {
  const [theme, setTheme] = useState<ThemeMode>('dark');

  const getThemeAdjustedStyles = () => {
    if (theme === 'light') {
      return {
        dialogBgColor: uiStyleConfig.dialogBgColor === '#333333' ? '#ffffff' : uiStyleConfig.dialogBgColor,
        textColor: uiStyleConfig.textColor === '#ffffff' ? '#333333' : uiStyleConfig.textColor,
        bodyBg: '#f0f0f5'
      };
    }
    return {
      dialogBgColor: uiStyleConfig.dialogBgColor,
      textColor: uiStyleConfig.textColor,
      bodyBg: '#222222'
    };
  };

  const adjustedStyles = getThemeAdjustedStyles();

  const displayText = translationText || '选中一条文本进行预览...';

  return (
    <div className="preview-card">
      <div className="preview-card-header">
        <div className="preview-card-title">🎬 实时预览</div>
        <div className="preview-card-actions">
          <div className="theme-toggle">
            <button
              className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
              onClick={() => setTheme('light')}
            >
              ☀️ 浅色
            </button>
            <button
              className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
              onClick={() => setTheme('dark')}
            >
              🌙 深色
            </button>
          </div>
          <button className="preview-close-btn" onClick={onClose}>
            ×
          </button>
        </div>
      </div>
      <div
        className={`preview-body theme-${theme}`}
        style={{ backgroundColor: adjustedStyles.bodyBg }}
      >
        <div className="dialog-preview">
          <div
            className="avatar-placeholder"
            style={{
              width: `${uiStyleConfig.avatarSize}px`,
              height: `${uiStyleConfig.avatarSize}px`,
              fontSize: `${Math.floor(uiStyleConfig.avatarSize * 0.375)}px`
            }}
          >
            NPC
          </div>
          <div
            className="text-bubble"
            style={{
              backgroundColor: adjustedStyles.dialogBgColor,
              color: adjustedStyles.textColor,
              fontSize: `${uiStyleConfig.fontSize}px`,
              lineHeight: uiStyleConfig.lineHeight,
              padding: `${uiStyleConfig.padding}px`,
              borderRadius: `${uiStyleConfig.borderRadius}px`
            }}
          >
            {displayText}
          </div>
        </div>
      </div>
    </div>
  );
}
